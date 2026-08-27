import { CalculationAssumptions } from "@/lib/types";
import { DEFAULT_ASSUMPTIONS } from "@/lib/calculations";
import { getStorageItem, setStorageItem } from "./storage";
import { clearAllClaims } from "./claims";
import { clearAllDocuments } from "./documents";
import { clearAllUsers } from "./users";
import { clearAllNotifications, createNotification } from "./notifications";

const STORAGE_KEY = "demurrage_settings";
const delay = (ms: number = 50) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getSettings(): Promise<CalculationAssumptions> {
  await delay();
  return getStorageItem<CalculationAssumptions>(STORAGE_KEY, { ...DEFAULT_ASSUMPTIONS });
}

export async function updateSettings(
  updates: Partial<CalculationAssumptions>
): Promise<CalculationAssumptions> {
  await delay(50);
  const current = getStorageItem<CalculationAssumptions>(STORAGE_KEY, { ...DEFAULT_ASSUMPTIONS });
  const updated = { ...current, ...updates };
  setStorageItem(STORAGE_KEY, updated);

  try {
    await createNotification({
      title: "Settings Updated",
      message: "System calculation parameters and company details have been updated.",
      type: "system",
    });
  } catch (e) {
    console.error(e);
  }

  return { ...updated };
}

export async function resetSettings(): Promise<CalculationAssumptions> {
  await delay(50);
  setStorageItem(STORAGE_KEY, { ...DEFAULT_ASSUMPTIONS });
  return { ...DEFAULT_ASSUMPTIONS };
}

export async function resetAllDataToZero(): Promise<void> {
  await delay(80);
  await Promise.all([
    clearAllClaims(),
    clearAllDocuments(),
    clearAllUsers(),
    clearAllNotifications(),
    resetSettings(),
  ]);
}
