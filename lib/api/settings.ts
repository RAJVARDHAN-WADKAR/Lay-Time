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
  const res = await fetch("/api/settings", {
    method: "GET",
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" }
  });
  if (!res.ok) {
    if (res.status === 403) return DEFAULT_SETTINGS;
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load settings (HTTP ${res.status})`);
  }
  const data = await res.json();
  return data.settings || DEFAULT_SETTINGS;
}

export const getSettings = getAssumptions;

export async function saveAssumptions(assumptions: CalculationAssumptions): Promise<CalculationAssumptions> {
  const res = await fetch("/api/settings", {
    method: "PUT",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(assumptions)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to save settings");
  }
  return data.settings || assumptions;
}

export const updateSettings = saveAssumptions;

export async function resetSettings(): Promise<CalculationAssumptions> {
  return saveAssumptions(DEFAULT_SETTINGS);
}

export async function resetAllDataToZero(): Promise<boolean> {
  await saveAssumptions(DEFAULT_SETTINGS);
  return true;
}
