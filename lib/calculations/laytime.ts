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
import { aggregateDeductions, calculateActivityDeduction, calculateGrossMinutes } from "./deductions";
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
 * Calculates laytime and demurrage for a single berth.
 */
export function calculateBerthLaytime(
  berth: Berth,
  activities: SoFActivity[],
  demurrageRatePerDay: number,
  assumptions: CalculationAssumptions = DEFAULT_ASSUMPTIONS
): BerthCalculation {
  // Filter activities for this berth
  const berthActivities = activities.filter((a) => a.berthId === berth.id);

  // Allowed laytime = (Cargo Quantity / Load Rate) in days -> convert to minutes
  const allowedDays = berth.loadRate > 0 && berth.quantity > 0 ? berth.quantity / berth.loadRate : 1;
  const allowedLaytimeMinutes = Math.round(allowedDays * 24 * 60);

  // Gross elapsed & deductions
  let grossElapsedMinutes = 0;
  let netLaytimeUsedMinutes = 0;

  for (const act of berthActivities) {
    const { grossMinutes, countedMinutes } = calculateActivityDeduction(act);
    grossElapsedMinutes += grossMinutes;
    netLaytimeUsedMinutes += countedMinutes;
  }

  const deductionMinutes = Math.max(grossElapsedMinutes - netLaytimeUsedMinutes, 0);

  // Time Exceeded or Time Saved
  const timeExceededMinutes = Math.max(netLaytimeUsedMinutes - allowedLaytimeMinutes, 0);
  const timeSavedMinutes = Math.max(allowedLaytimeMinutes - netLaytimeUsedMinutes, 0);

  // Demurrage / Despatch amounts
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
  const berthCalculations: BerthCalculation[] = (port.berths || []).map((berth) =>
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
): ClaimCalculation {
  const ports = claim.ports || [];
  const activities = claim.activities || [];
  const deductions = claim.deductions || [];
  const demurrageRate = Number(claim.demurrageRatePerDay) || 0;

  const portCalculations: PortCalculation[] = ports.map((port) =>
    calculatePortLaytime(port, activities, demurrageRate, assumptions)
  );

  let totalGrossMinutes = activities.reduce(
    (acc, a) => acc + calculateGrossMinutes(a.startTime, a.stopTime),
    0
  );

  if (totalGrossMinutes === 0 && claim.layday && claim.voyageEndDate) {
    totalGrossMinutes = calculateGrossMinutes(claim.layday, claim.voyageEndDate);
  }

  let totalAllowedMinutes = portCalculations.reduce(
    (acc, p) => acc + p.totalAllowedMinutes,
    0
  );
  if (totalAllowedMinutes === 0 && totalGrossMinutes > 0) {
    totalAllowedMinutes = 1440; // 24 hours fallback
  }

  // Deductions from deduction records + activity percentage counts
  let deductionMinutesFromItems = 0;
  for (const d of deductions) {
    deductionMinutesFromItems += Math.round((d.deductionHours || 0) * 60);
  }
  for (const act of activities) {
    if (act.percentageCounted < 100 && act.durationMinutes) {
      deductionMinutesFromItems += Math.round(act.durationMinutes * (1 - act.percentageCounted / 100));
    }
  }

  const totalNetLaytimeMinutes = Math.max(totalGrossMinutes - deductionMinutesFromItems, 0);
  const totalDeductionsMinutes = deductionMinutesFromItems;

  const netDemurrageMinutes = Math.max(totalNetLaytimeMinutes - totalAllowedMinutes, 0);
  const netDespatchMinutes = Math.max(totalAllowedMinutes - totalNetLaytimeMinutes, 0);

  const ratePerMinute = demurrageRate / (24 * 60);
  let calculatedDemurrageAmount = Math.round(netDemurrageMinutes * ratePerMinute * 100) / 100;
  let calculatedDespatchAmount = Math.round(netDespatchMinutes * (ratePerMinute / 2) * 100) / 100;

  if (portCalculations.length > 0) {
    const portDemurrage = portCalculations.reduce((acc, p) => acc + p.totalDemurrageAmount, 0);
    const portDespatch = portCalculations.reduce((acc, p) => acc + p.totalDespatchAmount, 0);
    if (portDemurrage > 0 || portDespatch > 0) {
      calculatedDemurrageAmount = portDemurrage;
      calculatedDespatchAmount = portDespatch;
    }
  }

  const finalPayableAmount = Math.max(
    calculatedDemurrageAmount - calculatedDespatchAmount,
    0
  );

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
    timebarCompliance: {
      noticeDeadline: timebarCompliance.noticeDeadline,
      noticeSubmitted: timebarCompliance.noticeSubmitted,
      isNoticeValid: timebarCompliance.isNoticeValid,
      claimDeadline: timebarCompliance.claimDeadline,
      claimSubmitted: timebarCompliance.claimSubmitted,
      isClaimValid: timebarCompliance.isClaimValid,
      isTimebarred: timebarCompliance.isTimebarred,
    },
    assumptions,
  };
}

function formatMinutes(mins: number): string {
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}h ${pad(m)}m`;
}
