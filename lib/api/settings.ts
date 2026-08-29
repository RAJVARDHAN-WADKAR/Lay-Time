import { CalculationAssumptions } from "@/lib/types";

export const DEFAULT_SETTINGS: CalculationAssumptions = {
  laytimeRule: "OOD_AOD",
  weekendRule: "SHEX",
  noticeGracePeriodHours: 6,
  currency: "USD",
  roundingPrecisionMinutes: 1,
  ocrConfidenceThreshold: 0.8,
  applyWeatherWorkingDay24CH: true,
  defaultDemurrageRate: 25000,
  defaultDespatchRate: 12500,
  workingHours: "24 Hours SHINC"
};

export async function getAssumptions(): Promise<CalculationAssumptions> {
  try {
    const res = await fetch("/api/settings", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch settings");
    const data = await res.json();
    return data.settings;
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
}

export const getSettings = getAssumptions;

export async function saveAssumptions(assumptions: CalculationAssumptions): Promise<CalculationAssumptions> {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(assumptions)
  });
  if (!res.ok) throw new Error("Failed to save settings");
  const data = await res.json();
  return data.settings;
}

export const updateSettings = saveAssumptions;

export async function resetSettings(): Promise<CalculationAssumptions> {
  return await saveAssumptions(DEFAULT_SETTINGS);
}

export async function resetAllDataToZero(): Promise<boolean> {
  try {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_zero" })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}
