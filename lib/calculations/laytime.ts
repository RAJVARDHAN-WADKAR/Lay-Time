import {
  Berth,
  BerthCalculation,
  CalculationAssumptions,
  Claim,
  ClaimCalculation,
  Port,
  PortCalculation,
  SoFActivity,
} from "@/lib/types";
import {
  aggregateDeductions,
  calculateActivityDeduction,
  calculateDeductionsWithoutDoubleCount,
  calculateGrossMinutes,
  formatMinutes,
} from "./deductions";
import { calculateTimebarCompliance } from "./timebar";

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
};

/**
 * 6.1 SHEX vs SHINC:
 * Exclude Sundays (and local holidays) under SHEX, UNLESS on demurrage
 * ("once on demurrage, always on demurrage", unless contractual clause specifies "unless used").
 * Test case: NOR tendered Friday 14:00, 6h turn time -> laytime begins Friday 20:00.
 * Saturday counts. Sunday 00:00 to 24:00 excluded under SHEX. Laytime resumes Monday 00:00.
 */
export function calculateShexWeekendExclusions(
  startTime: string,
  stopTime: string,
  weekendRule: "SHEX" | "SHINC" | "FHEX" | "FHINC" | string = "SHEX",
  isOnDemurrage: boolean = false
): { excludedMinutes: number; details: string[] } {
  if (weekendRule === "SHINC" || weekendRule === "FHINC" || isOnDemurrage) {
    return { excludedMinutes: 0, details: [] };
  }

  const start = new Date(startTime).getTime();
  const stop = new Date(stopTime).getTime();
  if (isNaN(start) || isNaN(stop) || stop <= start) {
    return { excludedMinutes: 0, details: [] };
  }

  let excludedMinutes = 0;
  const details: string[] = [];

  let curTime = start;
  while (curTime < stop) {
    const curDate = new Date(curTime);
    const dayOfWeek = curDate.getUTCDay(); // 0 = Sunday
    // Advance by hour or to end of interval
    const nextHour = new Date(curTime + 60 * 60 * 1000);
    const stepEnd = Math.min(nextHour.getTime(), stop);
    const stepMinutes = Math.round((stepEnd - curTime) / 60000);

    if (dayOfWeek === 0) {
      excludedMinutes += stepMinutes;
    }
    curTime = stepEnd;
  }

  if (excludedMinutes > 0) {
    details.push(`SHEX Exclusion: ${excludedMinutes} minutes excluded for Sunday periods.`);
  }

  return { excludedMinutes, details };
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
  const factor = apply24CH ? 1.0 : (8.0 / 24.0);
  const effectivePct = Math.min(Math.max(percentageInterrupted, 0), 100) / 100;
  return Math.round(interruptionMinutes * factor * effectivePct);
}

/**
 * 6.5 Overlapping SoF events:
 * Returns an error and excludes duplicate minutes from total net time.
 */
export function detectAndExcludeSoFOverlaps(activities: SoFActivity[]): {
  cleanActivities: SoFActivity[];
  overlapErrors: string[];
  totalOverlappingMinutes: number;
} {
  const overlapErrors: string[] = [];
  let totalOverlappingMinutes = 0;

  const valid = [...activities].filter(
    (a) => a.startTime && a.stopTime && !isNaN(new Date(a.startTime).getTime()) && !isNaN(new Date(a.stopTime).getTime())
  ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  for (let i = 0; i < valid.length - 1; i++) {
    const a1 = valid[i];
    const a2 = valid[i + 1];

    if ((a1.berthId && a2.berthId && a1.berthId === a2.berthId) || (!a1.berthId && !a2.berthId)) {
      const s1 = new Date(a1.startTime).getTime();
      const e1 = new Date(a1.stopTime).getTime();
      const s2 = new Date(a2.startTime).getTime();
      const e2 = new Date(a2.stopTime).getTime();

      const overlapStart = Math.max(s1, s2);
      const overlapEnd = Math.min(e1, e2);

      if (overlapEnd > overlapStart) {
        const overlapMins = Math.round((overlapEnd - overlapStart) / 60000);
        totalOverlappingMinutes += overlapMins;
        overlapErrors.push(
          `Overlapping SoF activities: "${a1.activityName}" and "${a2.activityName}" overlap by ${overlapMins} minutes. Duplicate minutes excluded.`
        );
      }
    }
  }

  return {
    cleanActivities: valid,
    overlapErrors,
    totalOverlappingMinutes
  };
}

/**
 * 6.3 Multi-port reversible vs non-reversible:
 * - If Reversible: laytime allowed across all ports is pooled; demurrage/despatch is computed ONCE on total time used minus total time allowed.
 * - If Non-reversible: each port is calculated independently; despatch at load port CANNOT offset demurrage at discharge port.
 */
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
    // Non-reversible: each port calculated independently; despatch at load port CANNOT offset demurrage at discharge port
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

/**
 * Calculates laytime and demurrage for a single berth.
 * 6.4: When loadRate or cargoQuantity is missing, returns a validation error instead of silently defaulting.
 */
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

  for (const act of berthActivities) {
    const { grossMinutes, countedMinutes } = calculateActivityDeduction(act);
    grossElapsedMinutes += grossMinutes;
    netLaytimeUsedMinutes += countedMinutes;
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
    validationError,
  };
}

/**
 * Calculates laytime and demurrage for a port by aggregating its berths.
 */
export function calculatePortLaytime(
  port: Port,
  activities: SoFActivity[],
  demurrageRatePerDay: number,
  assumptions: CalculationAssumptions = DEFAULT_ASSUMPTIONS
): PortCalculation {
  const berthCalculations = (port.berths || []).map((berth) =>
    calculateBerthLaytime(berth, activities, demurrageRatePerDay, assumptions)
  );

  const totalAllowedMinutes = berthCalculations.reduce(
    (acc, b) => acc + b.allowedLaytimeMinutes,
    0
  );
  const totalNetUsedMinutes = berthCalculations.reduce(
    (acc, b) => acc + b.netLaytimeUsedMinutes,
    0
  );
  const totalDemurrageAmount = berthCalculations.reduce(
    (acc, b) => acc + (b.overriddenDemurrage !== undefined ? b.overriddenDemurrage : b.demurrageAmount),
    0
  );
  const totalDespatchAmount = berthCalculations.reduce(
    (acc, b) => acc + b.despatchAmount,
    0
  );

  return {
    portId: port.id,
    portName: port.name || "Port",
    portType: port.portType || "Discharge Port",
    totalAllowedMinutes,
    totalNetUsedMinutes,
    totalDemurrageAmount: Math.round(totalDemurrageAmount * 100) / 100,
    totalDespatchAmount: Math.round(totalDespatchAmount * 100) / 100,
    berthCalculations,
  };
}

/**
 * Calculates complete Claim Laytime Summary across all ports & berths.
 */
export function calculateClaimLaytime(
  claim: Claim,
  assumptions: CalculationAssumptions = DEFAULT_ASSUMPTIONS
): ClaimCalculation & { validationErrors?: string[]; overlapErrors?: string[]; multiPortSummary?: MultiPortCalculationResult } {
  const ports = claim.ports || [];
  const rawActivities = claim.activities || [];
  const deductions = claim.deductions || [];
  const demurrageRate = Number(claim.demurrageRatePerDay) || 0;
  const ratePerMinute = demurrageRate / (24 * 60);

  // 6.5 Detect and exclude overlapping SoF events
  const { cleanActivities, overlapErrors, totalOverlappingMinutes } = detectAndExcludeSoFOverlaps(rawActivities);
  const activities = cleanActivities;

  // 6.4 Validate missing loadRate and cargoQuantity
  const validationErrors: string[] = [];
  for (const p of ports) {
    for (const b of (p.berths || [])) {
      if (!b.loadRate || b.loadRate <= 0) {
        validationErrors.push(`Port "${p.name}", Berth "${b.name}": loadRate is missing or zero.`);
      }
      if (!b.quantity || b.quantity <= 0) {
        validationErrors.push(`Port "${p.name}", Berth "${b.name}": cargoQuantity is missing or zero.`);
      }
    }
  }

  let totalGrossMinutes = activities.reduce(
    (acc, a) =>
      acc +
      (a.durationMinutes !== undefined && a.durationMinutes !== null
        ? a.durationMinutes
        : calculateGrossMinutes(a.startTime, a.stopTime)),
    0
  );

  if (totalGrossMinutes === 0 && claim.layday && claim.voyageEndDate) {
    totalGrossMinutes = calculateGrossMinutes(claim.layday, claim.voyageEndDate);
  }

  // Activity deductions
  let activityDeductionsMinutes = 0;
  for (const act of activities) {
    const { deductedMinutes } = calculateActivityDeduction(act);
    activityDeductionsMinutes += deductedMinutes;
  }

  // 6.1 SHEX weekend exclusions
  let shexExclusions = 0;
  for (const act of activities) {
    if (act.startTime && act.stopTime) {
      const shex = calculateShexWeekendExclusions(act.startTime, act.stopTime, assumptions.weekendRule, false);
      shexExclusions += shex.excludedMinutes;
    }
  }

  // Deduction records without double counting
  const recordDeductionsMinutes = calculateDeductionsWithoutDoubleCount(deductions, activities);

  const totalDeductionsMinutes = activityDeductionsMinutes + recordDeductionsMinutes + shexExclusions;
  // Exclude duplicate overlap minutes from net laytime used
  const totalNetLaytimeMinutes = Math.max(totalGrossMinutes - totalDeductionsMinutes - totalOverlappingMinutes, 0);

  // Allowed laytime: from berths if present, else fallback
  let totalAllowedMinutes = 4320;
  const berthMinutesSum = ports.reduce((acc, p) => {
    return acc + (p.berths || []).reduce((bAcc, b) => {
      if (b.loadRate > 0 && b.quantity > 0) {
        return bAcc + Math.round((b.quantity / b.loadRate) * 1440);
      }
      return bAcc;
    }, 0);
  }, 0);
  if (berthMinutesSum > 0) {
    totalAllowedMinutes = berthMinutesSum;
  }

  const claimStatusStr = String(claim.claimStatus || (claim as any).claim_status || "");
  const isNilClaim = claimStatusStr.includes("Nil Demurrage") || claimStatusStr.includes("No Claim");

  const filedOrBillable =
    Number(claim.claimFiledAmount) > 0
      ? Number(claim.claimFiledAmount)
      : Number(claim.billableAmount) > 0
      ? Number(claim.billableAmount)
      : 0;

  let calculatedDemurrageAmount = 0;
  let calculatedDespatchAmount = 0;
  let netDemurrageMinutes = 0;
  let netDespatchMinutes = 0;

  if (isNilClaim) {
    calculatedDemurrageAmount = 0;
    calculatedDespatchAmount = 0;
    netDemurrageMinutes = 0;
    netDespatchMinutes = 0;
  } else if (filedOrBillable > 0) {
    calculatedDemurrageAmount = filedOrBillable;
    netDemurrageMinutes = ratePerMinute > 0 ? Math.round(calculatedDemurrageAmount / ratePerMinute) : 0;
    netDespatchMinutes = 0;
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

  // Port and Berth calculations
  const portCalculations: PortCalculation[] = ports.map((port) => {
    return calculatePortLaytime(port, activities, demurrageRate, assumptions);
  });

  // 6.3 Multi-port calculation summary
  const multiPortRule = assumptions.laytimeRule === "REVERSIBLE" ? "REVERSIBLE" : "NON_REVERSIBLE";
  const multiPortSummary = calculateMultiPortLaytime(portCalculations, ratePerMinute, multiPortRule);

  const timebarCompliance = calculateTimebarCompliance(claim, assumptions);

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
    assumptions,
    validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
    overlapErrors: overlapErrors.length > 0 ? overlapErrors : undefined,
    multiPortSummary
  };
}


