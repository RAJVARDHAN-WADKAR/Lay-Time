import { CalculationAssumptions, Claim } from "@/lib/types";

export interface TimebarResult {
  noticeDeadline: string;
  noticeSubmitted: string;
  isNoticeValid: boolean;
  noticeAlarmLevel: "Normal" | "Approaching" | "Critical" | "Expired";
  noticeDaysRemaining: number;
  claimDeadline: string;
  claimSubmitted: string;
  isClaimValid: boolean;
  claimAlarmLevel: "Normal" | "Approaching" | "Critical" | "Expired";
  claimDaysRemaining: number;
  isTimebarred: boolean;
  isSubmittedOnTime: boolean;
  isBaseDateEstimated: boolean;
  summaryReason: string;
  statusBadgeText: string;
}

/**
 * Pure calculation function for evaluating timebar compliance.
 * Implements real-time deadline calculation, fallback to Instruction Received / C/P date,
 * and live days remaining (= deadline - TODAY).
 */
export function calculateTimebarCompliance(
  claim: Claim,
  assumptions: Partial<CalculationAssumptions> = {}
): TimebarResult {
  const noticeDaysAllowed = claim.noticeTimebarDays || 30;
  // Per Section 5.3: Claim timebar days default to 45 (or 90 for selected accounts)
  const claimDaysAllowed = claim.claimTimebarDays || 45;

  const now = new Date();
  const todayTime = new Date(now.toISOString().split("T")[0]).getTime();

  // Notice base date fallback: voyageEndDate -> layday -> instructionReceivedDate -> charterpartyDate
  let noticeBaseDate = claim.voyageEndDate || claim.layday;
  let isNoticeBaseEstimated = false;
  if (!noticeBaseDate) {
    noticeBaseDate = claim.instructionReceivedDate || claim.charterpartyDate;
    if (noticeBaseDate) isNoticeBaseEstimated = true;
  }
  const noticeBaseTime = noticeBaseDate ? new Date(noticeBaseDate).getTime() : NaN;

  let noticeDeadlineStr = "—";
  let isNoticeValid = true;
  let noticeDaysRemaining = 0;

  if (!isNaN(noticeBaseTime)) {
    const noticeDeadlineDate = new Date(noticeBaseTime + noticeDaysAllowed * 24 * 60 * 60 * 1000);
    if (!isNaN(noticeDeadlineDate.getTime())) {
      noticeDeadlineStr = noticeDeadlineDate.toISOString().split("T")[0];
      const deadlineMs = noticeDeadlineDate.getTime();
      if (claim.noticeReceivedDate) {
        const noticeSubmittedTime = new Date(claim.noticeReceivedDate).getTime();
        if (!isNaN(noticeSubmittedTime)) {
          isNoticeValid = noticeSubmittedTime <= deadlineMs;
        }
      }
      noticeDaysRemaining = Math.round((deadlineMs - todayTime) / (24 * 60 * 60 * 1000));
    }
  }

  // Claim base date fallback: voyageEndDate -> layday -> instructionReceivedDate -> charterpartyDate
  let claimBaseDate = claim.voyageEndDate || claim.layday;
  let isClaimBaseEstimated = false;
  if (!claimBaseDate) {
    claimBaseDate = claim.instructionReceivedDate || claim.charterpartyDate;
    if (claimBaseDate) isClaimBaseEstimated = true;
  }
  const claimBaseTime = claimBaseDate ? new Date(claimBaseDate).getTime() : NaN;

  let claimDeadlineStr = "—";
  let isClaimValid = true;
  let claimDaysRemaining = 0;
  let isSubmittedOnTime = false;

  const isClosedOrPaid =
    Boolean(claim.claimClosed) ||
    Boolean(claim.paymentConcluded) ||
    (Boolean(claim.claimStatus) && (
      claim.claimStatus.includes("Closed") ||
      claim.claimStatus.includes("Paid") ||
      claim.claimStatus.includes("Write Off") ||
      claim.claimStatus.includes("Nil Demurrage")
    ));

  if (!isNaN(claimBaseTime)) {
    const claimDeadlineDate = new Date(claimBaseTime + claimDaysAllowed * 24 * 60 * 60 * 1000);
    if (!isNaN(claimDeadlineDate.getTime())) {
      claimDeadlineStr = claimDeadlineDate.toISOString().split("T")[0];
      const deadlineMs = claimDeadlineDate.getTime();

      const filedDateStr = (claim as any).claimFiledDate || claim.claimReceivedDate;
      if (filedDateStr) {
        const filedTime = new Date(filedDateStr).getTime();
        if (!isNaN(filedTime)) {
          if (filedTime <= deadlineMs) {
            isSubmittedOnTime = true;
            isClaimValid = true;
          } else {
            isClaimValid = false;
          }
        }
      } else if (isClosedOrPaid) {
        isClaimValid = true;
      }

      // days remaining (= deadline - TODAY)
      claimDaysRemaining = Math.round((deadlineMs - todayTime) / (24 * 60 * 60 * 1000));
    }
  }

  let isTimebarred = false;
  let statusBadgeText = "Active";

  if (isSubmittedOnTime) {
    statusBadgeText = "Submitted on time";
    isTimebarred = false;
  } else if (isClosedOrPaid) {
    statusBadgeText = claim.claimStatus || "Closed";
    isTimebarred = false;
  } else if (claim.timebarred || (claimDaysRemaining < 0 && claimDeadlineStr !== "—")) {
    isTimebarred = true;
    statusBadgeText = "TIMEBARRED";
  } else if (claimDaysRemaining <= 7 && claimDeadlineStr !== "—") {
    statusBadgeText = `${claimDaysRemaining}d remaining (Urgent)`;
  } else if (claimDeadlineStr !== "—") {
    statusBadgeText = `${claimDaysRemaining}d remaining`;
  }

  const claimAlarmLevel: TimebarResult["claimAlarmLevel"] = isSubmittedOnTime
    ? "Normal"
    : isClosedOrPaid
    ? "Normal"
    : isTimebarred
    ? "Expired"
    : claimDaysRemaining <= 7
    ? "Critical"
    : claimDaysRemaining <= 30
    ? "Approaching"
    : "Normal";

  const noticeAlarmLevel: TimebarResult["noticeAlarmLevel"] = noticeDaysRemaining <= 0
    ? "Expired"
    : noticeDaysRemaining <= 5
    ? "Critical"
    : noticeDaysRemaining <= 14
    ? "Approaching"
    : "Normal";

  let summaryReason = isSubmittedOnTime
    ? "Claim submitted within allowed C/P timebars."
    : isTimebarred
    ? "Timebar expired: claim deadline elapsed without filing."
    : `Timebar active: ${claimDaysRemaining} days remaining until contractual deadline.`;

  return {
    noticeDeadline: noticeDeadlineStr,
    noticeSubmitted: claim.noticeReceivedDate || "—",
    isNoticeValid,
    noticeAlarmLevel,
    noticeDaysRemaining,
    claimDeadline: claimDeadlineStr,
    claimSubmitted: (claim as any).claimFiledDate || claim.claimReceivedDate || "—",
    isClaimValid,
    claimAlarmLevel,
    claimDaysRemaining,
    isTimebarred,
    isSubmittedOnTime,
    isBaseDateEstimated: isClaimBaseEstimated || isNoticeBaseEstimated,
    summaryReason,
    statusBadgeText
  };
}
