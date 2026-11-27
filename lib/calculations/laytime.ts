import {
  Berth,
  BerthCalculation,
  CalculationAssumptions,
  Claim,
  ClaimCalculation,
  DailyLaytimeBreakdownRow,
  LaytimeDayRule,
  MaritimeHoliday,
  Port,
  PortCalculation,
  SoFActivity
} from "@/lib/types";
import {
  aggregateDeductions,
  calculateActivityDeduction,
  calculateDeductionsWithoutDoubleCount,
  calculateGrossMinutes,
  formatMinutes
} from "./deductions";
import { calculateTimebarCompliance } from "./timebar";
import { findHolidayForDate, inferCountryAndTimezone } from "./holidayUtils";
import { findActivityOverlaps, sortActivitiesChronologically } from "./discrepancies";

export const DEFAULT_ASSUMPTIONS: CalculationAssumptions = {
  laytimeRule: "OOD_AOD",
  weekendRule: "SHEX",
  noticeGracePeriodHours: 6,
  currency: "USD",
  roundingPrecisionMinutes: 1,
  ocrConfidenceThreshold: 0.8,
  applyWeatherWorkingDay24CH: true,
  defaultDemurrageRate: 25000,
  defaultDespatchRate: 12500,
  workingHours: "24 Hours SHINC",
  onceOnDemurrageDefault: true,
  overlapPolicy: "block",
  defaultNoticeTimebarDays: 30,
  defaultClaimTimebarDays: 90
};

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const tz = timeZone || "UTC";
  if (!dtfCache.has(tz)) {
    try {
      dtfCache.set(
        tz,
        new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          weekday: "short",
          hourCycle: "h23"
        })
      );
    } catch {
      dtfCache.set(
        tz,
        new Intl.DateTimeFormat("en-US", {
          timeZone: "UTC",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          weekday: "short",
          hourCycle: "h23"
        })
      );
    }
  }
  return dtfCache.get(tz)!;
}

export function getLocalDateParts(
  utcMs: number,
  timeZone: string = "UTC"
): { date: string; weekdayNum: number; weekdayName: string } {
  const parts = getFormatter(timeZone).formatToParts(new Date(utcMs));
  let year = "1970";
  let month = "01";
  let day = "01";
  let weekdayName = "Thu";
  for (const p of parts) {
    if (p.type === "year") year = p.value;
    else if (p.type === "month") month = p.value;
    else if (p.type === "day") day = p.value;
    else if (p.type === "weekday") weekdayName = p.value;
  }
  const weekdayNum = WEEKDAY_MAP[weekdayName] ?? new Date(utcMs).getUTCDay();
  return {
    date: `${year}-${month}-${day}`,
    weekdayNum,
    weekdayName
  };
}

export interface LocalDaySegment {
  startMs: number;
  stopMs: number;
  minutes: number;
  localDate: string;
  weekdayNum: number;
  weekdayName: string;
}

/**
 * Splits a UTC interval [startMs, stopMs] at exact port-local calendar midnight boundaries.
 */
export function splitIntervalByPortLocalDay(
  startMs: number,
  stopMs: number,
  timeZone: string = "UTC"
): LocalDaySegment[] {
  if (!Number.isFinite(startMs) || !Number.isFinite(stopMs) || stopMs <= startMs) {
    return [];
  }

  const segments: LocalDaySegment[] = [];
  let cur = startMs;

  while (cur < stopMs) {
    const curParts = getLocalDateParts(cur, timeZone);
    // Probe up to +26h ahead (covers shortest 23h and longest 25h DST days safely)
    let lo = cur;
    let hi = Math.min(stopMs, cur + 26 * 60 * 60 * 1000);

    if (getLocalDateParts(hi - 1, timeZone).date === curParts.date) {
      // Entire chunk up to hi stays in curParts.date
      const segEnd = hi;
      const mins = Math.round((segEnd - cur) / 60000);
      if (mins > 0) {
        segments.push({
          startMs: cur,
          stopMs: segEnd,
          minutes: mins,
          localDate: curParts.date,
          weekdayNum: curParts.weekdayNum,
          weekdayName: curParts.weekdayName
        });
      }
      cur = segEnd;
      continue;
    }

    // Binary search exact minute transition out of curParts.date
    while (hi - lo > 60000) {
      const mid = lo + Math.floor((hi - lo) / 120000) * 60000;
      const checkPoint = mid === lo ? lo + 60000 : mid;
      if (getLocalDateParts(checkPoint, timeZone).date === curParts.date) {
        lo = checkPoint;
      } else {
        hi = checkPoint;
      }
    }

    const segEnd = Math.min(stopMs, hi);
    const mins = Math.round((segEnd - cur) / 60000);
    if (mins > 0) {
      segments.push({
        startMs: cur,
        stopMs: segEnd,
        minutes: mins,
        localDate: curParts.date,
        weekdayNum: curParts.weekdayNum,
        weekdayName: curParts.weekdayName
      });
    }
    cur = segEnd;
  }

  return segments;
}

export function isWorkingActivity(act: SoFActivity): boolean {
  const cat = String(act.deductionCategory || "").toLowerCase();
  if (
    cat === "rain" ||
    cat === "weather" ||
    cat === "weather delay" ||
    cat === "strike" ||
    cat === "equipment breakdown" ||
    cat === "shore breakdown" ||
    cat === "waiting for berth" ||
    cat === "shifting" ||
    cat === "crew change"
  ) {
    return false;
  }
  const name = String(act.activityName || "").toLowerCase();
  if (
    name.includes("load") ||
    name.includes("discharg") ||
    name.includes("pump") ||
    name.includes("cargo") ||
    name.includes("hoses") ||
    name.includes("operation")
  ) {
    return !name.includes("suspend") && !name.includes("stopp") && !name.includes("complet");
  }
  return false;
}

export function isWeatherActivity(act: SoFActivity): boolean {
  const cat = String(act.deductionCategory || "").toLowerCase();
  const name = String(act.activityName || "").toLowerCase();
  return (
    cat === "rain" ||
    cat === "weather" ||
    cat === "weather delay" ||
    name.includes("rain") ||
    name.includes("weather") ||
    name.includes("squall") ||
    name.includes("storm")
  );
}

export function isDayRuleExcluded(
  dayRule: LaytimeDayRule,
  weekdayNum: number,
  holiday: MaritimeHoliday | null
): { excepted: boolean; isUnlessUsed: boolean; reasonLabel: string } {
  const isHoliday = Boolean(holiday);
  const holLabel = holiday ? `Holiday: ${holiday.name}` : "";

  switch (dayRule) {
    case "SHINC":
    case "FHINC":
      return { excepted: false, isUnlessUsed: false, reasonLabel: "Included" };
    case "SHEX":
      if (isHoliday || weekdayNum === 0) {
        return {
          excepted: true,
          isUnlessUsed: false,
          reasonLabel: isHoliday ? holLabel : "Sunday excepted (SHEX)"
        };
      }
      return { excepted: false, isUnlessUsed: false, reasonLabel: "Counted" };
    case "SHEXUU":
      if (isHoliday || weekdayNum === 0) {
        return {
          excepted: true,
          isUnlessUsed: true,
          reasonLabel: isHoliday ? `${holLabel} (SHEXUU)` : "Sunday excepted unless used (SHEXUU)"
        };
      }
      return { excepted: false, isUnlessUsed: true, reasonLabel: "Counted" };
    case "FHEX":
      if (isHoliday || weekdayNum === 5) {
        return {
          excepted: true,
          isUnlessUsed: false,
          reasonLabel: isHoliday ? holLabel : "Friday excepted (FHEX)"
        };
      }
      return { excepted: false, isUnlessUsed: false, reasonLabel: "Counted" };
    case "FHEXUU":
      if (isHoliday || weekdayNum === 5) {
        return {
          excepted: true,
          isUnlessUsed: true,
          reasonLabel: isHoliday ? `${holLabel} (FHEXUU)` : "Friday excepted unless used (FHEXUU)"
        };
      }
      return { excepted: false, isUnlessUsed: true, reasonLabel: "Counted" };
    case "SSHEX":
      if (isHoliday || weekdayNum === 6 || weekdayNum === 0) {
        return {
          excepted: true,
          isUnlessUsed: false,
          reasonLabel: isHoliday
            ? holLabel
            : `${WEEKDAY_NAMES[weekdayNum]} excepted (SSHEX)`
        };
      }
      return { excepted: false, isUnlessUsed: false, reasonLabel: "Counted" };
  }
}

/**
 * Legacy helper preserved for backward-compatible callers, now powered by port-local segmentation & full DayRule.
 */
export function calculateShexWeekendExclusions(
  startTime: string,
  stopTime: string,
  dayRule: LaytimeDayRule | string = "SHEX",
  isOnDemurrage: boolean = false,
  options?: {
    timeZone?: string;
    countryCode?: string;
    portId?: string;
    holidays?: MaritimeHoliday[];
    isWorking?: boolean;
  }
): { excludedMinutes: number; details: string[] } {
  const rule = (dayRule || "SHEX").toUpperCase() as LaytimeDayRule;
  if (rule === "SHINC" || rule === "FHINC" || isOnDemurrage) {
    return { excludedMinutes: 0, details: [] };
  }

  const startMs = new Date(startTime).getTime();
  const stopMs = new Date(stopTime).getTime();
  if (isNaN(startMs) || isNaN(stopMs) || stopMs <= startMs) {
    return { excludedMinutes: 0, details: [] };
  }

  const segments = splitIntervalByPortLocalDay(startMs, stopMs, options?.timeZone || "UTC");
  let excludedMinutes = 0;
  const reasons = new Set<string>();

  for (const seg of segments) {
    const hol = findHolidayForDate(
      options?.holidays || [],
      seg.localDate,
      options?.portId,
      options?.countryCode
    );
    const check = isDayRuleExcluded(rule, seg.weekdayNum, hol);
    if (check.excepted) {
      if (check.isUnlessUsed && options?.isWorking) {
        continue;
      }
      excludedMinutes += seg.minutes;
      reasons.add(check.reasonLabel);
    }
  }

  return {
    excludedMinutes,
    details: excludedMinutes > 0 ? Array.from(reasons) : []
  };
}

/**
 * 6.2 Weather Working Day (24CH):
 * Deduct weather interruptions in exact 24-consecutive-hour proportion.
 */
export function calculateWeatherInterruption(
  interruptionMinutes: number,
  percentageInterrupted: number = 100,
  apply24CH: boolean = true
): number {
  if (interruptionMinutes <= 0) return 0;
  const factor = apply24CH ? 1.0 : 8.0 / 24.0;
  const effectivePct = Math.min(Math.max(percentageInterrupted, 0), 100) / 100;
  return Math.round(interruptionMinutes * factor * effectivePct);
}

const DEDUCTION_CATEGORY_PRIORITY: Record<string, number> = {
  Strike: 5,
  Breakdowns: 4,
  "Equipment breakdown": 4,
  "Shore Breakdown": 4,
  Weather: 3,
  "Weather Delay": 3,
  Rain: 3,
  Shifting: 2,
  Other: 1,
  Others: 1,
  "Normal Operations": 0
};

export interface TimelineSlice {
  activity: SoFActivity;
  startMs: number;
  stopMs: number;
}

/**
 * 6.5 Overlap detection & Sweep-Line non-overlapping timeline builder.
 * Guarantees each wall-clock minute is counted AT MOST ONCE.
 * Exception/deduction events override counted time; overlapping deductions count once by severity/category priority.
 */
export function detectAndExcludeSoFOverlaps(activities: SoFActivity[]): {
  cleanActivities: SoFActivity[];
  overlapErrors: string[];
  totalOverlappingMinutes: number;
} {
  const { sorted, sameBerthOverlaps, affectedMinutesUnion } = findActivityOverlaps(activities);
  const overlapErrors = sameBerthOverlaps.map(
    (p) =>
      `Overlapping SoF events on same berth: "${p.actA.activityName}" and "${p.actB.activityName}" overlap by ${p.overlapMinutes} minutes.`
  );

  return {
    cleanActivities: sorted,
    overlapErrors,
    totalOverlappingMinutes: affectedMinutesUnion
  };
}

function getCategoryPriority(act: SoFActivity): number {
  const cat = String(act.deductionCategory || "Normal Operations");
  if (cat in DEDUCTION_CATEGORY_PRIORITY) return DEDUCTION_CATEGORY_PRIORITY[cat];
  return 1;
}

function isExceptionEvent(act: SoFActivity): boolean {
  const pct = Number(act.percentageCounted ?? 100);
  const cat = String(act.deductionCategory || "Normal Operations");
  return pct < 100 || (cat !== "Normal Operations" && !isWorkingActivity(act));
}

function compareSweepWinner(a: SoFActivity, b: SoFActivity): number {
  const excA = isExceptionEvent(a) ? 1 : 0;
  const excB = isExceptionEvent(b) ? 1 : 0;
  if (excA !== excB) return excB - excA; // Exception wins over purely counted event

  const effA = (Number(a.percentageCounted ?? 100) / 100) * (Number(a.prorata ?? 100) / 100);
  const effB = (Number(b.percentageCounted ?? 100) / 100) * (Number(b.prorata ?? 100) / 100);
  if (excA === 1 && effA !== effB) {
    return effA - effB; // Lower counted ratio (higher deduction) wins
  }

  const prioDiff = getCategoryPriority(b) - getCategoryPriority(a);
  if (prioDiff !== 0) return prioDiff;

  if (effA !== effB) return effB - effA; // For multiple counted working events, higher counted/prorata wins
  return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
}

export function buildSweepLineTimeline(activities: SoFActivity[]): TimelineSlice[] {
  const valid = sortActivitiesChronologically(
    (activities || []).filter((a) => {
      const s = new Date(a.startTime).getTime();
      const e = new Date(a.stopTime).getTime();
      return !isNaN(s) && !isNaN(e) && e > s;
    })
  );

  if (valid.length === 0) return [];

  const pointsSet = new Set<number>();
  const parsed = valid.map((a) => {
    const startMs = new Date(a.startTime).getTime();
    const stopMs = new Date(a.stopTime).getTime();
    pointsSet.add(startMs);
    pointsSet.add(stopMs);
    return { activity: a, startMs, stopMs };
  });

  const points = Array.from(pointsSet).sort((x, y) => x - y);
  const slices: TimelineSlice[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const segStart = points[i];
    const segStop = points[i + 1];
    if (segStop <= segStart) continue;

    const covering = parsed
      .filter((p) => p.startMs <= segStart && p.stopMs >= segStop)
      .map((p) => p.activity);

    if (covering.length === 0) continue;

    covering.sort(compareSweepWinner);
    const winner = covering[0];

    const last = slices[slices.length - 1];
    if (last && last.activity.id === winner.id && last.stopMs === segStart) {
      last.stopMs = segStop;
    } else {
      slices.push({
        activity: winner,
        startMs: segStart,
        stopMs: segStop
      });
    }
  }

  return slices;
}

export interface MultiPortCalculationResult {
  rule: "REVERSIBLE" | "NON_REVERSIBLE";
  ports: PortCalculation[];
  totalDemurrageAmount: number;
  totalDespatchAmount: number;
  finalPayableAmount: number;
}

export function calculateMultiPortLaytime(
  ports: PortCalculation[],
  ratePerMinute: number,
  rule: "REVERSIBLE" | "NON_REVERSIBLE" = "NON_REVERSIBLE"
): MultiPortCalculationResult {
  if (rule === "REVERSIBLE") {
    const pooledAllowed = ports.reduce((acc, p) => acc + p.totalAllowedMinutes, 0);
    const pooledUsed = ports.reduce((acc, p) => acc + p.totalNetUsedMinutes, 0);
    const netMinutes = pooledUsed - pooledAllowed;

    let totalDemurrageAmount = 0;
    let totalDespatchAmount = 0;

    if (netMinutes > 0) {
      totalDemurrageAmount = Math.round(netMinutes * ratePerMinute * 100) / 100;
    } else if (netMinutes < 0) {
      totalDespatchAmount = Math.round(Math.abs(netMinutes) * (ratePerMinute / 2) * 100) / 100;
    }

    const finalPayableAmount = Math.max(0, totalDemurrageAmount - totalDespatchAmount);
    return {
      rule,
      ports,
      totalDemurrageAmount,
      totalDespatchAmount,
      finalPayableAmount
    };
  } else {
    let totalDemurrageAmount = 0;
    let totalDespatchAmount = 0;

    for (const p of ports) {
      const netMinutes = p.totalNetUsedMinutes - p.totalAllowedMinutes;
      if (netMinutes > 0) {
        totalDemurrageAmount += Math.round(netMinutes * ratePerMinute * 100) / 100;
      } else if (netMinutes < 0) {
        totalDespatchAmount += Math.round(Math.abs(netMinutes) * (ratePerMinute / 2) * 100) / 100;
      }
    }

    const finalPayableAmount = Math.round(totalDemurrageAmount * 100) / 100;

    return {
      rule,
      ports,
      totalDemurrageAmount,
      totalDespatchAmount,
      finalPayableAmount
    };
  }
}

export function calculateBerthLaytime(
  berth: Berth,
  activities: SoFActivity[],
  demurrageRatePerDay: number,
  assumptions: CalculationAssumptions = DEFAULT_ASSUMPTIONS
): BerthCalculation & { validationError?: string } {
  const berthActivities = activities.filter((a) => a.berthId === berth.id);

  let validationError: string | undefined = undefined;
  if (!berth.loadRate || berth.loadRate <= 0 || !berth.quantity || berth.quantity <= 0) {
    validationError = `Missing loadRate or cargoQuantity for berth "${berth.name || berth.id}". Allowed laytime cannot be accurately determined.`;
  }

  const allowedDays = berth.loadRate > 0 && berth.quantity > 0 ? berth.quantity / berth.loadRate : 0;
  const allowedLaytimeMinutes = Math.round(allowedDays * 24 * 60);

  let grossElapsedMinutes = 0;
  let netLaytimeUsedMinutes = 0;

  const berthSlices = buildSweepLineTimeline(berthActivities);
  for (const slice of berthSlices) {
    const mins = Math.round((slice.stopMs - slice.startMs) / 60000);
    if (mins <= 0) continue;
    grossElapsedMinutes += mins;
    const pct = Math.min(Math.max(slice.activity.percentageCounted ?? 100, 0), 100) / 100;
    const pro = Math.min(Math.max(slice.activity.prorata ?? 100, 0), 100) / 100;
    netLaytimeUsedMinutes += Math.round(mins * pct * pro);
  }

  const deductionMinutes = Math.max(grossElapsedMinutes - netLaytimeUsedMinutes, 0);
  const timeExceededMinutes = Math.max(netLaytimeUsedMinutes - allowedLaytimeMinutes, 0);
  const timeSavedMinutes = Math.max(allowedLaytimeMinutes - netLaytimeUsedMinutes, 0);

  const ratePerMinute = demurrageRatePerDay / (24 * 60);
  const demurrageAmount = Math.round(timeExceededMinutes * ratePerMinute * 100) / 100;
  const despatchAmount = Math.round(timeSavedMinutes * (ratePerMinute / 2) * 100) / 100;

  const deductionsByCategory = aggregateDeductions(berthActivities);

  return {
    berthId: berth.id,
    berthName: berth.name || "Berth",
    cargoQuantity: berth.quantity || 0,
    loadRate: berth.loadRate || 0,
    allowedLaytimeMinutes,
    allowedLaytimeFormatted: formatMinutes(allowedLaytimeMinutes),
    grossElapsedMinutes,
    grossElapsedFormatted: formatMinutes(grossElapsedMinutes),
    deductionMinutes,
    deductionFormatted: formatMinutes(deductionMinutes),
    netLaytimeUsedMinutes,
    netLaytimeUsedFormatted: formatMinutes(netLaytimeUsedMinutes),
    timeExceededMinutes,
    timeSavedMinutes,
    demurrageAmount,
    despatchAmount,
    deductionsByCategory,
    isProrataOverridden: berth.isProrataOverridden,
    validationError
  };
}

export function calculatePortLaytime(
  port: Port,
  activities: SoFActivity[],
  demurrageRatePerDay: number,
  assumptions: CalculationAssumptions = DEFAULT_ASSUMPTIONS
): PortCalculation {
  const berthCalculations = (port.berths || []).map((berth) =>
    calculateBerthLaytime(berth, activities, demurrageRatePerDay, assumptions)
  );

  const totalAllowedMinutes = berthCalculations.reduce((acc, b) => acc + b.allowedLaytimeMinutes, 0);
  const totalNetUsedMinutes = berthCalculations.reduce((acc, b) => acc + b.netLaytimeUsedMinutes, 0);
  const totalDemurrageAmount = berthCalculations.reduce(
    (acc, b) => acc + (b.overriddenDemurrage !== undefined ? b.overriddenDemurrage : b.demurrageAmount),
    0
  );
  const totalDespatchAmount = berthCalculations.reduce((acc, b) => acc + b.despatchAmount, 0);

  return {
    portId: port.id,
    portName: port.name || "Port",
    portType: port.portType || "Discharge Port",
    totalAllowedMinutes,
    totalNetUsedMinutes,
    totalDemurrageAmount: Math.round(totalDemurrageAmount * 100) / 100,
    totalDespatchAmount: Math.round(totalDespatchAmount * 100) / 100,
    berthCalculations
  };
}

/**
 * Complete Laytime Calculation Engine supporting:
 * - Typed DayRule (SHINC, SHEX, SHEXUU, FHINC, FHEX, FHEXUU, SSHEX)
 * - Port-local timezone day segmentation + SQLite holidays lookup
 * - Notice grace period + 24CH weather working day
 * - Once on demurrage, always on demurrage (per-claim switch)
 * - Missing required setting validation errors (no silent defaults when explicitly omitted)
 */
export function calculateClaimLaytime(
  claim: Claim,
  assumptions?: Partial<CalculationAssumptions>,
  holidays: MaritimeHoliday[] = []
): ClaimCalculation & {
  validationErrors?: string[];
  overlapErrors?: string[];
  multiPortSummary?: MultiPortCalculationResult;
} {
  const validationErrors: string[] = [];

  // 2.5 Strict required setting checks (if caller passes an incomplete assumptions object, report missing fields explicitly)
  const resolvedDayRule = (claim.dayRule || assumptions?.weekendRule || DEFAULT_ASSUMPTIONS.weekendRule) as LaytimeDayRule;
  if (assumptions && assumptions.weekendRule === undefined && !claim.dayRule) {
    validationErrors.push("Missing required setting: dayRule (weekendRule) must be specified.");
  }

  const resolvedNoticeGraceHours =
    claim.noticeGracePeriodHours ?? assumptions?.noticeGracePeriodHours ?? DEFAULT_ASSUMPTIONS.noticeGracePeriodHours;
  if (assumptions && assumptions.noticeGracePeriodHours === undefined && claim.noticeGracePeriodHours === undefined) {
    validationErrors.push("Missing required setting: noticeGracePeriodHours must be specified.");
  }

  const resolvedApply24CH =
    claim.applyWeatherWorkingDay24CH ??
    assumptions?.applyWeatherWorkingDay24CH ??
    DEFAULT_ASSUMPTIONS.applyWeatherWorkingDay24CH;
  if (
    assumptions &&
    assumptions.applyWeatherWorkingDay24CH === undefined &&
    claim.applyWeatherWorkingDay24CH === undefined
  ) {
    validationErrors.push("Missing required setting: applyWeatherWorkingDay24CH must be specified.");
  }

  const effectiveAssumptions: CalculationAssumptions = {
    ...DEFAULT_ASSUMPTIONS,
    ...(assumptions || {}),
    weekendRule: resolvedDayRule,
    noticeGracePeriodHours: resolvedNoticeGraceHours,
    applyWeatherWorkingDay24CH: resolvedApply24CH
  };

  const onceOnDemurrage = claim.onceOnDemurrage ?? effectiveAssumptions.onceOnDemurrageDefault ?? true;
  const overlapPolicy = (claim.overlapPolicy || effectiveAssumptions.overlapPolicy || "block") as
    | "block"
    | "exception_wins";
  const ports = claim.ports || [];
  const rawActivities = claim.activities || [];
  const deductions = claim.deductions || [];
  const demurrageRate = Number(claim.demurrageRatePerDay) || 0;
  const ratePerMinute = demurrageRate / (24 * 60);

  const overlapScan = findActivityOverlaps(rawActivities);
  const activities = overlapScan.sorted;
  const overlapErrors = overlapScan.sameBerthOverlaps.map(
    (p) =>
      `Conflict on same berth: "${p.actA.activityName}" overlaps with "${p.actB.activityName}" by ${p.overlapMinutes} minutes.`
  );
  const overlapAffectedMinutes = overlapScan.affectedMinutesUnion;
  const overlapBlocked =
    overlapScan.sameBerthOverlaps.length > 0 &&
    overlapPolicy === "block" &&
    !claim.overlapOverrideReason;

  if (overlapBlocked) {
    validationErrors.push(
      `Calculation blocked under overlapPolicy="block": ${overlapScan.sameBerthOverlaps.length} same-berth overlap(s) totaling ${overlapAffectedMinutes} minutes. Fix overlaps in SoF or switch policy to "exception_wins".`
    );
  }

  for (const p of ports) {
    for (const b of p.berths || []) {
      if (!b.loadRate || b.loadRate <= 0) {
        validationErrors.push(`Port "${p.name}", Berth "${b.name}": loadRate is missing or zero.`);
      }
      if (!b.quantity || b.quantity <= 0) {
        validationErrors.push(`Port "${p.name}", Berth "${b.name}": cargoQuantity is missing or zero.`);
      }
    }
  }

  // Allowed laytime from berths if present, else fallback 72h (4320m)
  let totalAllowedMinutes = 4320;
  const berthMinutesSum = ports.reduce((acc, p) => {
    return (
      acc +
      (p.berths || []).reduce((bAcc, b) => {
        if (b.loadRate > 0 && b.quantity > 0) {
          return bAcc + Math.round((b.quantity / b.loadRate) * 1440);
        }
        return bAcc;
      }, 0)
    );
  }, 0);
  if (berthMinutesSum > 0) {
    totalAllowedMinutes = berthMinutesSum;
  }

  // Determine Notice Grace window (if NOR tendered exists and noticeGracePeriodHours > 0)
  const norEvent = activities.find((a) =>
    String(a.activityName || "").toLowerCase().includes("nor tendered")
  );
  const norStartMs = norEvent ? new Date(norEvent.startTime).getTime() : NaN;
  const graceWindowEndMs =
    !isNaN(norStartMs) && resolvedNoticeGraceHours > 0
      ? norStartMs + resolvedNoticeGraceHours * 60 * 60 * 1000
      : NaN;

  // Per-day breakdown accumulator
  const dailyMap = new Map<
    string,
    {
      date: string;
      weekday: string;
      timezone: string;
      countedMinutes: number;
      excludedMinutes: number;
      onDemurrageMinutes: number;
      reasons: Set<string>;
      holidaysMatched: Set<string>;
    }
  >();

  let totalGrossMinutes = 0;
  let totalCountedFromEvents = 0;
  let noticeGraceMinutesExcluded = 0;

  const ensureDayBucket = (date: string, weekday: string, timezone: string) => {
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        weekday,
        timezone,
        countedMinutes: 0,
        excludedMinutes: 0,
        onDemurrageMinutes: 0,
        reasons: new Set<string>(),
        holidaysMatched: new Set<string>()
      });
    }
    return dailyMap.get(date)!;
  };

  const timelineSlices = overlapBlocked ? [] : buildSweepLineTimeline(activities);

  for (const slice of timelineSlices) {
    const act = slice.activity;
    const startMs = slice.startMs;
    const stopMs = slice.stopMs;
    if (isNaN(startMs) || isNaN(stopMs) || stopMs <= startMs) continue;

    const linkedPort = ports.find((p) => p.id === act.portId) || ports[0];
    const inferredLocale = inferCountryAndTimezone(linkedPort?.name);
    const portTimezone =
      linkedPort?.timezone || claim.portTimezone || inferredLocale.timezone || "UTC";
    const portCountryCode =
      linkedPort?.countryCode || claim.countryCode || inferredLocale.countryCode;

    const actWorking = isWorkingActivity(act);
    const actWeather = isWeatherActivity(act);
    const prorataFactor = Math.min(Math.max(act.prorata ?? 100, 0), 100) / 100;
    const rawPctFactor = Math.min(Math.max(act.percentageCounted ?? 100, 0), 100) / 100;

    // Effective counted fraction considering 24CH setting for weather interruptions
    let countedRatio = rawPctFactor * prorataFactor;
    if (actWeather && !resolvedApply24CH && rawPctFactor < 1) {
      // Under 8h working day instead of 24CH, only 8/24 of the weather deduction reduces laytime
      const deductedFraction = 1 - rawPctFactor;
      const adjustedPct = 1 - deductedFraction * (8 / 24);
      countedRatio = adjustedPct * prorataFactor;
    }

    const daySegments = splitIntervalByPortLocalDay(startMs, stopMs, portTimezone);
    for (const seg of daySegments) {
      const bucket = ensureDayBucket(seg.localDate, seg.weekdayName, portTimezone);
      totalGrossMinutes += seg.minutes;

      const hol = findHolidayForDate(holidays, seg.localDate, linkedPort?.id, portCountryCode);
      const dayCheck = isDayRuleExcluded(resolvedDayRule, seg.weekdayNum, hol);

      // Notice grace check for non-working events inside [norStart, graceWindowEnd]
      let graceCutMinutes = 0;
      let postGraceMinutes = seg.minutes;
      if (!isNaN(graceWindowEndMs) && !actWorking && seg.startMs < graceWindowEndMs && act !== norEvent) {
        graceCutMinutes = Math.min(
          seg.minutes,
          Math.max(0, Math.round((Math.min(seg.stopMs, graceWindowEndMs) - seg.startMs) / 60000))
        );
        postGraceMinutes = seg.minutes - graceCutMinutes;
      }

      if (graceCutMinutes > 0) {
        bucket.excludedMinutes += graceCutMinutes;
        bucket.reasons.add(`Notice grace period (${resolvedNoticeGraceHours}h)`);
        noticeGraceMinutesExcluded += graceCutMinutes;
      }

      if (postGraceMinutes <= 0) continue;

      const alreadyOnDemurrage = onceOnDemurrage && totalCountedFromEvents >= totalAllowedMinutes;

      if (alreadyOnDemurrage) {
        const demCounted = Math.round(postGraceMinutes * prorataFactor);
        const demExcluded = postGraceMinutes - demCounted;
        totalCountedFromEvents += demCounted;
        bucket.countedMinutes += demCounted;
        bucket.excludedMinutes += demExcluded;
        bucket.onDemurrageMinutes += demCounted;
        bucket.reasons.add("On demurrage (once on demurrage)");
        continue;
      }

      // Check day rule (or UU working exception)
      if (dayCheck.excepted && !(dayCheck.isUnlessUsed && actWorking)) {
        bucket.excludedMinutes += postGraceMinutes;
        bucket.reasons.add(dayCheck.reasonLabel);
        if (hol) bucket.holidaysMatched.add(`${hol.date}:${hol.name}`);
        continue;
      }

      // Potential counted minutes under percentage & 24CH
      const candidateCounted = Math.round(postGraceMinutes * countedRatio);

      // Check if we cross laytime expiry during this segment AND onceOnDemurrage is enabled
      if (
        onceOnDemurrage &&
        totalCountedFromEvents < totalAllowedMinutes &&
        totalCountedFromEvents + candidateCounted > totalAllowedMinutes &&
        candidateCounted > 0
      ) {
        const minsUntilExpiry = totalAllowedMinutes - totalCountedFromEvents;
        const fractionUsedPreExpiry = minsUntilExpiry / candidateCounted;
        const preWallMins = Math.round(postGraceMinutes * fractionUsedPreExpiry);
        const postWallMins = Math.max(0, postGraceMinutes - preWallMins);

        const preExcluded = Math.max(0, preWallMins - minsUntilExpiry);
        const postDemCounted = Math.round(postWallMins * prorataFactor);
        const postDemExcluded = postWallMins - postDemCounted;

        totalCountedFromEvents += minsUntilExpiry + postDemCounted;
        bucket.countedMinutes += minsUntilExpiry + postDemCounted;
        bucket.excludedMinutes += preExcluded + postDemExcluded;
        bucket.onDemurrageMinutes += postDemCounted;
        if (preExcluded > 0) {
          bucket.reasons.add(act.deductionCategory || act.activityName);
        }
        if (postDemCounted > 0) {
          bucket.reasons.add("On demurrage (once on demurrage)");
        }
      } else {
        const segExcluded = postGraceMinutes - candidateCounted;
        totalCountedFromEvents += candidateCounted;
        bucket.countedMinutes += candidateCounted;
        bucket.excludedMinutes += segExcluded;
        if (dayCheck.excepted && dayCheck.isUnlessUsed && actWorking) {
          bucket.reasons.add(`Unless used (working event): ${dayCheck.reasonLabel}`);
          if (hol) bucket.holidaysMatched.add(`${hol.date}:${hol.name}`);
        } else if (segExcluded > 0) {
          bucket.reasons.add(act.deductionCategory || act.activityName);
        } else {
          bucket.reasons.add("Counted operations");
        }
      }
    }
  }

  if (!overlapBlocked && totalGrossMinutes === 0 && claim.layday && claim.voyageEndDate) {
    totalGrossMinutes = calculateGrossMinutes(claim.layday, claim.voyageEndDate);
    totalCountedFromEvents = totalGrossMinutes;
  }

  // Standalone deduction records (without double counting SoF activities)
  const recordDeductionsMinutes = overlapBlocked
    ? 0
    : calculateDeductionsWithoutDoubleCount(deductions, activities);

  const totalNetLaytimeMinutes = overlapBlocked
    ? 0
    : Math.max(totalCountedFromEvents - recordDeductionsMinutes, 0);
  const totalDeductionsMinutes = Math.max(totalGrossMinutes - totalNetLaytimeMinutes, 0);

  const dailyBreakdown: DailyLaytimeBreakdownRow[] = Array.from(dailyMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: d.date,
      weekday: d.weekday,
      timezone: d.timezone,
      countedMinutes: d.countedMinutes,
      excludedMinutes: d.excludedMinutes,
      onDemurrageMinutes: d.onDemurrageMinutes,
      reasons: Array.from(d.reasons),
      holidaysMatched: Array.from(d.holidaysMatched)
    }));

  const uniqueHolidaysExcluded = new Set<string>();
  for (const row of dailyBreakdown) {
    if (row.excludedMinutes > 0) {
      for (const h of row.holidaysMatched) uniqueHolidaysExcluded.add(h);
    }
  }

  const claimStatusStr = String(claim.claimStatus || (claim as any).claim_status || "");
  const isNilClaim = claimStatusStr.includes("Nil Demurrage") || claimStatusStr.includes("No Claim");

  let calculatedDemurrageAmount = 0;
  let calculatedDespatchAmount = 0;
  let netDemurrageMinutes = 0;
  let netDespatchMinutes = 0;

  if (isNilClaim || overlapBlocked) {
    calculatedDemurrageAmount = 0;
    calculatedDespatchAmount = 0;
  } else {
    netDemurrageMinutes = Math.max(totalNetLaytimeMinutes - totalAllowedMinutes, 0);
    netDespatchMinutes = Math.max(totalAllowedMinutes - totalNetLaytimeMinutes, 0);
    calculatedDemurrageAmount = Math.round(netDemurrageMinutes * ratePerMinute * 100) / 100;
    calculatedDespatchAmount = Math.round(netDespatchMinutes * (ratePerMinute / 2) * 100) / 100;
  }

  const isOverridden = Boolean(claim.isOverridden || (claim as any).is_overridden);
  const overriddenDemurrage =
    (claim as any).overriddenDemurrage ?? (claim as any).overridden_demurrage;
  const finalPayableAmount =
    isOverridden && overriddenDemurrage !== null && overriddenDemurrage !== undefined
      ? Number(overriddenDemurrage)
      : Math.max(calculatedDemurrageAmount - calculatedDespatchAmount, 0);

  const portCalculations: PortCalculation[] = ports.map((port) =>
    calculatePortLaytime(port, activities, demurrageRate, effectiveAssumptions)
  );

  const multiPortRule = effectiveAssumptions.laytimeRule === "REVERSIBLE" ? "REVERSIBLE" : "NON_REVERSIBLE";
  const multiPortSummary = calculateMultiPortLaytime(portCalculations, ratePerMinute, multiPortRule);
  const timebarCompliance = calculateTimebarCompliance(claim, effectiveAssumptions);

  return {
    claimId: claim.id,
    claimName: claim.claimName,
    demurrageRatePerDay: demurrageRate,
    totalGrossMinutes,
    totalDeductionsMinutes,
    totalNetLaytimeMinutes,
    totalAllowedMinutes,
    netDemurrageMinutes,
    netDespatchMinutes,
    calculatedDemurrageAmount: Math.round(calculatedDemurrageAmount * 100) / 100,
    calculatedDespatchAmount: Math.round(calculatedDespatchAmount * 100) / 100,
    finalPayableAmount: Math.round(finalPayableAmount * 100) / 100,
    portCalculations,
    timebarCompliance,
    assumptions: effectiveAssumptions,
    dayRule: resolvedDayRule,
    holidaysExcludedCount: uniqueHolidaysExcluded.size,
    onceOnDemurrage,
    noticeGraceMinutesExcluded,
    dailyBreakdown,
    overlapPolicy,
    overlapBlocked,
    overlapAffectedMinutes,
    validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
    overlapErrors: overlapErrors.length > 0 ? overlapErrors : undefined,
    multiPortSummary
  };
}
