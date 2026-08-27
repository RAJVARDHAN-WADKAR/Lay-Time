import { DeductionCategory, DeductionRecord, SoFActivity } from "@/lib/types";

/**
 * Calculates the gross duration in minutes between two ISO datetime strings.
 */
export function calculateGrossMinutes(startTime: string, stopTime: string): number {
  if (!startTime || !stopTime) return 0;
  const start = new Date(startTime).getTime();
  const stop = new Date(stopTime).getTime();
  if (isNaN(start) || isNaN(stop) || stop <= start) return 0;
  return Math.round((stop - start) / (1000 * 60));
}

/**
 * Calculates deduction details for a single Statement of Facts activity.
 * Counted minutes = grossMinutes * (percentageCounted / 100) * (prorata / 100)
 * Deducted minutes = grossMinutes - countedMinutes
 */
export function calculateActivityDeduction(activity: SoFActivity): {
  grossMinutes: number;
  countedMinutes: number;
  deductedMinutes: number;
  category: DeductionCategory;
} {
  const grossMinutes = calculateGrossMinutes(activity.startTime, activity.stopTime);
  const percentage = Math.min(Math.max(activity.percentageCounted ?? 100, 0), 100);
  const prorata = Math.min(Math.max(activity.prorata ?? 100, 0), 100);

  const effectivePercentage = (percentage * prorata) / 10000;
  const countedMinutes = Math.round(grossMinutes * effectivePercentage);
  const deductedMinutes = grossMinutes - countedMinutes;

  return {
    grossMinutes,
    countedMinutes,
    deductedMinutes,
    category: activity.deductionCategory || "Other",
  };
}

/**
 * Aggregates deductions across a set of activities grouped by deduction category.
 */
export function aggregateDeductions(activities: SoFActivity[]): DeductionRecord[] {
  const map: Record<string, { gross: number; counted: number; deducted: number }> = {
    "Weather Delay": { gross: 0, counted: 0, deducted: 0 },
    Weather: { gross: 0, counted: 0, deducted: 0 },
    Rain: { gross: 0, counted: 0, deducted: 0 },
    "Shore Breakdown": { gross: 0, counted: 0, deducted: 0 },
    "Crew Change": { gross: 0, counted: 0, deducted: 0 },
    "Idle Time": { gross: 0, counted: 0, deducted: 0 },
    Shifting: { gross: 0, counted: 0, deducted: 0 },
    "Waiting for berth": { gross: 0, counted: 0, deducted: 0 },
    "Equipment breakdown": { gross: 0, counted: 0, deducted: 0 },
    "Port closure": { gross: 0, counted: 0, deducted: 0 },
    Strike: { gross: 0, counted: 0, deducted: 0 },
    Holiday: { gross: 0, counted: 0, deducted: 0 },
    Other: { gross: 0, counted: 0, deducted: 0 },
    Others: { gross: 0, counted: 0, deducted: 0 },
    Custom: { gross: 0, counted: 0, deducted: 0 },
  };

  for (const act of activities) {
    const { grossMinutes, countedMinutes, deductedMinutes, category } = calculateActivityDeduction(act);
    const catKey = category || "Other";
    if (!map[catKey]) {
      map[catKey] = { gross: 0, counted: 0, deducted: 0 };
    }
    map[catKey].gross += grossMinutes;
    map[catKey].counted += countedMinutes;
    map[catKey].deducted += deductedMinutes;
  }

  const result: DeductionRecord[] = [];
  for (const [cat, data] of Object.entries(map)) {
    if (data.deducted > 0 || data.gross > 0) {
      const percentageDeducted = data.gross > 0 ? (data.deducted / data.gross) * 100 : 0;
      result.push({
        category: cat as DeductionCategory,
        durationMinutes: data.gross,
        durationFormatted: formatMinutes(data.gross),
        percentageDeducted: Math.round(percentageDeducted * 10) / 10,
        netDeductionMinutes: data.deducted,
        proratedDeductionMinutes: data.deducted,
      });
    }
  }

  return result;
}

function formatMinutes(mins: number): string {
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}h ${pad(m)}m`;
}
