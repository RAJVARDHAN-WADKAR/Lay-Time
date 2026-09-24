import { CalculationAssumptions } from "@/lib/types";
import {
  getStoreSettings,
  updateStoreSettings,
  resetClientStore
} from "@/lib/mock/clientStore";

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
  return getStoreSettings();
}

export const getSettings = getAssumptions;

export async function saveAssumptions(assumptions: CalculationAssumptions): Promise<CalculationAssumptions> {
  return updateStoreSettings(assumptions);
}

export const updateSettings = saveAssumptions;

export async function resetSettings(): Promise<CalculationAssumptions> {
  return updateStoreSettings(DEFAULT_SETTINGS);
}

export async function resetAllDataToZero(): Promise<boolean> {
  resetClientStore();
  return true;
}
