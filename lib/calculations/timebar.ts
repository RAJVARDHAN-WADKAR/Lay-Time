import { CalculationAssumptions, Claim } from "@/lib/types";
import { getTodayIso } from "@/lib/utils/dateRules";

export interface PeriodThresholds {
  criticalDays: number;
  approachingDays: number;
}

export interface TimebarResult {
  noticeDeadline: string;
  noticeSubmitted: string;
  isNoticeValid: boolean;
  isNoticeSubmittedOnTime: boolean;
  noticeAlarmLevel: "Normal" | "Approaching" | "Critical" | "Expired";
  noticeDaysRemaining: number;
  noticeDaysAllowed: number;
  claimDeadline: string;
  claimSubmitted: string;
  isClaimValid: boolean;
  claimAlarmLevel: "Normal" | "Approaching" | "Critical" | "Expired";
  claimDaysRemaining: number;
  claimDaysAllowed: number;
  isTimebarred: boolean;
  isSubmittedOnTime: boolean;
  isBaseDateEstimated: boolean;
  differsFromDefault: boolean;
  computedUiStatus: "Safe" | "Approaching" | "Urgent" | "Timebarred";
  noticeThresholds: PeriodThresholds;
  claimThresholds: PeriodThresholds;
  summaryReason: string;
  statusBadgeText: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Parse a YYYY-MM-DD or ISO timestamp strictly as UTC midnight (date-only comparison).
 */
export function parseYmdUtcMs(input?: string | null): number {
  if (!input) return NaN;
  const trimmed = String(input).trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return Date.UTC(year, month - 1, day);
    }
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return NaN;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Add calendar days to a YYYY-MM-DD / ISO date using UTC date-only math (handles leap years & month ends).
 */
export function addDaysYmd(baseInput: string, days: number): string | null {
  const baseMs = parseYmdUtcMs(baseInput);
  if (isNaN(baseMs)) return null;
  const target = new Date(baseMs + days * MS_PER_DAY);
  return target.toISOString().split("T")[0];
}

/**
 * Single configurable threshold formula scaled proportionally to the period length.
 * Defaults: Critical <= max(5, ceil(period * 10%)), Approaching <= ceil(period * 30%).
 */
export function calculatePeriodThresholds(
  periodDays: number,
  assumptions: Partial<CalculationAssumptions> = {}
): PeriodThresholds {
  const safeDays = Math.max(1, Number(periodDays) || 1);
  const criticalPct = Number(assumptions.timebarCriticalPct ?? 0.1);
  const approachingPct = Number(assumptions.timebarApproachingPct ?? 0.3);

  const criticalDays = Math.min(safeDays, Math.max(5, Math.ceil(safeDays * criticalPct)));
  const approachingDays = Math.max(criticalDays + 1, Math.ceil(safeDays * approachingPct));
  return { criticalDays, approachingDays };
}

/**
 * Resolve claim > client/account > global default for noticeDays and claimDays.
 */
export function resolveTimebarDays(
  claim: Claim,
  assumptions: Partial<CalculationAssumptions> = {}
): {
  noticeDaysAllowed: number;
  claimDaysAllowed: number;
  globalClaimDefault: number;
  differsFromDefault: boolean;
} {
  const globalNoticeDefault = Number(assumptions.defaultNoticeTimebarDays) || 30;
  const globalClaimDefault = Number(assumptions.defaultClaimTimebarDays) || 90;

  const acctDefaultsMap = assumptions.accountTimebarDefaults || {};
  const acctEntry =
    (claim.accountName ? acctDefaultsMap[claim.accountName] : undefined) ||
    (claim.clientId ? acctDefaultsMap[claim.clientId] : undefined) ||
    Object.entries(acctDefaultsMap).find(
      ([k]) =>
        (claim.accountName && k.toLowerCase() === claim.accountName.toLowerCase()) ||
        (claim.clientId && k.toLowerCase() === claim.clientId.toLowerCase())
    )?.[1];

  const claimNotice = Number(claim.noticeTimebarDays);
  const claimDays = Number(claim.claimTimebarDays);

  const noticeDaysAllowed =
    claimNotice > 0
      ? claimNotice
      : Number(acctEntry?.noticeDays) > 0
      ? Number(acctEntry!.noticeDays)
      : globalNoticeDefault;

  const claimDaysAllowed =
    claimDays > 0
      ? claimDays
      : Number(acctEntry?.claimDays) > 0
      ? Number(acctEntry!.claimDays)
      : globalClaimDefault;

  const differsFromDefault =
    claim.claimDaysSource === "imported" && claimDaysAllowed !== globalClaimDefault;

  return {
    noticeDaysAllowed,
    claimDaysAllowed,
    globalClaimDefault,
    differsFromDefault
  };
}

/**
 * Single authoritative calculation engine for evaluating timebar compliance across
 * Timebar Monitor, Dashboards, Notifications, and Claim Details.
 */
export function calculateTimebarCompliance(
  claim: Claim,
  assumptions: Partial<CalculationAssumptions> = {},
  options?: { todayYmd?: string }
): TimebarResult {
  const { noticeDaysAllowed, claimDaysAllowed, differsFromDefault } = resolveTimebarDays(claim, assumptions);
  const noticeThresholds = calculatePeriodThresholds(noticeDaysAllowed, assumptions);
  const claimThresholds = calculatePeriodThresholds(claimDaysAllowed, assumptions);

  const todayYmd = options?.todayYmd || getTodayIso();
  const todayMs = parseYmdUtcMs(todayYmd);

  // Base-date resolution: primary = voyageEndDate; fallback = instructionReceivedDate -> charterpartyDate -> layday
  let baseDate: string | undefined = claim.voyageEndDate || undefined;
  let isBaseDateEstimated = Boolean(claim.baseDateEstimated);
  if (!baseDate) {
    baseDate = claim.instructionReceivedDate || claim.charterpartyDate || claim.layday || undefined;
    if (baseDate) {
      isBaseDateEstimated = true;
    }
  }

  const isClosedOrPaid =
    Boolean(claim.claimClosed) ||
    Boolean(claim.paymentConcluded) ||
    (Boolean(claim.claimStatus) &&
      (claim.claimStatus.includes("Closed") ||
        claim.claimStatus.includes("Paid") ||
        claim.claimStatus.includes("Write Off") ||
        claim.claimStatus.includes("Nil Demurrage")));

  // --- NOTICE WINDOW ---
  let noticeDeadlineStr = "—";
  let isNoticeValid = true;
  let isNoticeSubmittedOnTime = false;
  let noticeDaysRemaining = 0;

  if (baseDate) {
    const noticeDeadline = addDaysYmd(baseDate, noticeDaysAllowed);
    if (noticeDeadline) {
      noticeDeadlineStr = noticeDeadline;
      const deadlineMs = parseYmdUtcMs(noticeDeadline);
      noticeDaysRemaining = Math.round((deadlineMs - todayMs) / MS_PER_DAY);

      if (claim.noticeReceivedDate) {
        const noticeSubMs = parseYmdUtcMs(claim.noticeReceivedDate);
        if (!isNaN(noticeSubMs)) {
          if (noticeSubMs <= deadlineMs) {
            isNoticeSubmittedOnTime = true;
            isNoticeValid = true;
          } else {
            isNoticeSubmittedOnTime = false;
            isNoticeValid = false;
          }
        }
      } else if (!isClosedOrPaid && noticeDaysRemaining < 0) {
        isNoticeValid = false;
      }
    }
  }

  let noticeAlarmLevel: TimebarResult["noticeAlarmLevel"] = "Normal";
  if (isNoticeSubmittedOnTime || isClosedOrPaid) {
    noticeAlarmLevel = "Normal";
  } else if (claim.noticeReceivedDate && !isNoticeValid) {
    noticeAlarmLevel = "Expired";
  } else if (noticeDeadlineStr !== "—") {
    if (noticeDaysRemaining < 0) noticeAlarmLevel = "Expired";
    else if (noticeDaysRemaining <= noticeThresholds.criticalDays) noticeAlarmLevel = "Critical";
    else if (noticeDaysRemaining <= noticeThresholds.approachingDays) noticeAlarmLevel = "Approaching";
  }

  // --- CLAIM WINDOW ---
  let claimDeadlineStr = "—";
  let isClaimValid = true;
  let claimDaysRemaining = 0;
  let isSubmittedOnTime = false;

  const filedDateStr = claim.claimFiledDate || claim.claimReceivedDate;
  const hasExplicitDeadline = Boolean(claim.claimTimebarDate && /^\d{4}-\d{2}-\d{2}/.test(claim.claimTimebarDate));

  if (baseDate) {
    const computedDeadline = addDaysYmd(baseDate, claimDaysAllowed);
    if (computedDeadline) {
      claimDeadlineStr = computedDeadline;
    }
  } else if (hasExplicitDeadline) {
    claimDeadlineStr = claim.claimTimebarDate!.slice(0, 10);
    isBaseDateEstimated = true;
  }

  if (claimDeadlineStr !== "—") {
    const deadlineMs = parseYmdUtcMs(claimDeadlineStr);
    claimDaysRemaining = Math.round((deadlineMs - todayMs) / MS_PER_DAY);

    if (filedDateStr) {
      const filedMs = parseYmdUtcMs(filedDateStr);
      if (!isNaN(filedMs)) {
        if (filedMs <= deadlineMs) {
          isSubmittedOnTime = true;
          isClaimValid = true;
        } else {
          isSubmittedOnTime = false;
          isClaimValid = false;
        }
      }
    } else if (!isClosedOrPaid && claimDaysRemaining < 0) {
      // Only expires when deadline actually passed (< 0), never just because filedDate is blank
      isClaimValid = false;
    }
  }

  let isTimebarred = false;
  let claimAlarmLevel: TimebarResult["claimAlarmLevel"] = "Normal";
  let statusBadgeText = "Active";

  if (isSubmittedOnTime) {
    statusBadgeText = "Submitted on time";
    claimAlarmLevel = "Normal";
    isTimebarred = false;
  } else if (isClosedOrPaid) {
    statusBadgeText = claim.claimStatus || "Closed";
    claimAlarmLevel = "Normal";
    isTimebarred = false;
  } else if (
    claim.timebarred ||
    (filedDateStr && !isClaimValid) ||
    (claimDeadlineStr !== "—" && claimDaysRemaining < 0)
  ) {
    isTimebarred = true;
    claimAlarmLevel = "Expired";
    statusBadgeText = "TIMEBARRED";
  } else if (claimDeadlineStr !== "—") {
    if (claimDaysRemaining <= claimThresholds.criticalDays) {
      claimAlarmLevel = "Critical";
      statusBadgeText = `${claimDaysRemaining}d remaining (Urgent)`;
    } else if (claimDaysRemaining <= claimThresholds.approachingDays) {
      claimAlarmLevel = "Approaching";
      statusBadgeText = `${claimDaysRemaining}d remaining (Approaching)`;
    } else {
      claimAlarmLevel = "Normal";
      statusBadgeText = `${claimDaysRemaining}d remaining`;
    }
  } else {
    statusBadgeText = "No Base Date";
  }

  // Unified UI status derived strictly from the same engine alarm levels
  const computedUiStatus: TimebarResult["computedUiStatus"] =
    isTimebarred || claimAlarmLevel === "Expired"
      ? "Timebarred"
      : claimAlarmLevel === "Critical" || noticeAlarmLevel === "Critical"
      ? "Urgent"
      : claimAlarmLevel === "Approaching" || noticeAlarmLevel === "Approaching"
      ? "Approaching"
      : "Safe";

  const summaryReason = isSubmittedOnTime
    ? "Claim submitted within allowed C/P timebars."
    : isTimebarred
    ? "Timebar expired: contractual claim deadline elapsed."
    : claimDeadlineStr === "—"
    ? "No base date recorded; timebar countdown pending voyage end / C/P date."
    : `Timebar active: ${claimDaysRemaining} days remaining (${claimDaysAllowed}d window).`;

  return {
    noticeDeadline: noticeDeadlineStr,
    noticeSubmitted: claim.noticeReceivedDate || "—",
    isNoticeValid,
    isNoticeSubmittedOnTime,
    noticeAlarmLevel,
    noticeDaysRemaining,
    noticeDaysAllowed,
    claimDeadline: claimDeadlineStr,
    claimSubmitted: filedDateStr || "—",
    isClaimValid,
    claimAlarmLevel,
    claimDaysRemaining,
    claimDaysAllowed,
    isTimebarred,
    isSubmittedOnTime,
    isBaseDateEstimated,
    differsFromDefault,
    computedUiStatus,
    noticeThresholds,
    claimThresholds,
    summaryReason,
    statusBadgeText
  };
}
