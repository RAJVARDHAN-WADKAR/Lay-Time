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
  summaryReason: string;
}

/**
 * Pure calculation function for evaluating timebar compliance.
 */
export function calculateTimebarCompliance(
  claim: Claim,
  assumptions: Partial<CalculationAssumptions> = {}
): TimebarResult {
  const noticeDaysAllowed = claim.noticeTimebarDays || 30;
  const claimDaysAllowed = claim.claimTimebarDays || 90;

  const noticeBaseDate = claim.voyageEndDate || claim.layday || claim.charterpartyDate;
  const noticeBaseTime = noticeBaseDate ? new Date(noticeBaseDate).getTime() : NaN;

  let noticeDeadlineStr = "—";
  let isNoticeValid = true;
  let noticeDaysRemaining = 0;

  if (!isNaN(noticeBaseTime)) {
    const noticeDeadlineDate = new Date(noticeBaseTime + noticeDaysAllowed * 24 * 60 * 60 * 1000);
    if (!isNaN(noticeDeadlineDate.getTime())) {
      noticeDeadlineStr = noticeDeadlineDate.toISOString().split("T")[0];
      if (claim.noticeReceivedDate) {
        const noticeSubmittedTime = new Date(claim.noticeReceivedDate).getTime();
        if (!isNaN(noticeSubmittedTime)) {
          isNoticeValid = noticeSubmittedTime <= noticeDeadlineDate.getTime();
          noticeDaysRemaining = Math.round(
            (noticeDeadlineDate.getTime() - noticeSubmittedTime) / (24 * 60 * 60 * 1000)
          );
        }
      }
    }
  }

  const claimBaseDate = claim.voyageEndDate || claim.layday || claim.charterpartyDate;
  const claimBaseTime = claimBaseDate ? new Date(claimBaseDate).getTime() : NaN;

  let claimDeadlineStr = "—";
  let isClaimValid = true;
  let claimDaysRemaining = 0;

  if (!isNaN(claimBaseTime)) {
    const claimDeadlineDate = new Date(claimBaseTime + claimDaysAllowed * 24 * 60 * 60 * 1000);
    if (!isNaN(claimDeadlineDate.getTime())) {
      claimDeadlineStr = claimDeadlineDate.toISOString().split("T")[0];
      if (claim.claimReceivedDate) {
        const claimSubmittedTime = new Date(claim.claimReceivedDate).getTime();
        if (!isNaN(claimSubmittedTime)) {
          isClaimValid = claimSubmittedTime <= claimDeadlineDate.getTime();
          claimDaysRemaining = Math.round(
            (claimDeadlineDate.getTime() - claimSubmittedTime) / (24 * 60 * 60 * 1000)
          );
        }
      }
    }
  }

  const isTimebarred =
    claim.timebarred === true ||
    (!isNoticeValid && noticeDeadlineStr !== "—") ||
    (!isClaimValid && claimDeadlineStr !== "—");

  const noticeAlarmLevel: TimebarResult["noticeAlarmLevel"] = !isNoticeValid || noticeDaysRemaining <= 0
    ? "Expired"
    : noticeDaysRemaining <= 5
    ? "Critical"
    : noticeDaysRemaining <= 14
    ? "Approaching"
    : "Normal";

  const claimAlarmLevel: TimebarResult["claimAlarmLevel"] = !isClaimValid || claimDaysRemaining <= 0
    ? "Expired"
    : claimDaysRemaining <= 10
    ? "Critical"
    : claimDaysRemaining <= 25
    ? "Approaching"
    : "Normal";

  let summaryReason = "Claim submitted within allowed C/P timebars.";
  if (!isNoticeValid && !isClaimValid && noticeDeadlineStr !== "—") {
    summaryReason = `Both Notice and Claim submission are timebarred.`;
  } else if (!isNoticeValid && noticeDeadlineStr !== "—") {
    summaryReason = `Notice of Claim submitted late by ${Math.abs(noticeDaysRemaining)} days.`;
  } else if (!isClaimValid && claimDeadlineStr !== "—") {
    summaryReason = `Formal Claim submission exceeded C/P timebar by ${Math.abs(claimDaysRemaining)} days.`;
  }

  return {
    noticeDeadline: noticeDeadlineStr,
    noticeSubmitted: claim.noticeReceivedDate || "—",
    isNoticeValid,
    noticeAlarmLevel,
    noticeDaysRemaining,
    claimDeadline: claimDeadlineStr,
    claimSubmitted: claim.claimReceivedDate || "—",
    isClaimValid,
    claimAlarmLevel,
    claimDaysRemaining,
    isTimebarred,
    summaryReason,
  };
}
