import { Claim, SoFActivity, DeductionItem } from "@/lib/types";
import { getStorageItem, setStorageItem } from "./storage";
import { createNotification } from "./notifications";

const STORAGE_KEY = "demurrage_claims";
const delay = (ms: number = 50) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getClaims(): Promise<Claim[]> {
  await delay();
  return getStorageItem<Claim[]>(STORAGE_KEY, []);
}

export async function getClaimById(id: string): Promise<Claim | null> {
  await delay();
  const claims = getStorageItem<Claim[]>(STORAGE_KEY, []);
  const claim = claims.find((c) => c.id === id);
  return claim ? JSON.parse(JSON.stringify(claim)) : null;
}

export async function createClaim(claimData: Omit<Claim, "id" | "createdAt" | "updatedAt">): Promise<Claim> {
  await delay(100);
  const claims = getStorageItem<Claim[]>(STORAGE_KEY, []);
  const year = new Date().getFullYear();
  const nextNum = String(claims.length + 1).padStart(3, "0");
  const newId = `CLM-${year}-${nextNum}`;
  const now = new Date().toISOString();

  const newClaim: Claim = {
    ...claimData,
    id: newId,
    createdAt: now,
    updatedAt: now,
    daysOpen: claimData.daysOpen ?? 0,
    claimClosed: claimData.claimClosed ?? false,
    ports: claimData.ports || [],
    activities: claimData.activities || [],
    deductions: claimData.deductions || [],
    documentLinks: claimData.documentLinks || [],
  };

  const updatedClaims = [newClaim, ...claims];
  setStorageItem(STORAGE_KEY, updatedClaims);

  // Trigger dynamic notification
  try {
    await createNotification({
      title: "New Claim Created",
      message: `Claim ${newId} for vessel ${newClaim.shipName || "New Vessel"} was registered.`,
      type: "claim",
      claimId: newId,
      claimName: newClaim.claimName,
    });
  } catch (e) {
    console.error("Failed to create notification", e);
  }

  return JSON.parse(JSON.stringify(newClaim));
}

export async function updateClaim(id: string, updates: Partial<Claim>): Promise<Claim> {
  await delay(80);
  const claims = getStorageItem<Claim[]>(STORAGE_KEY, []);
  const index = claims.findIndex((c) => c.id === id);
  if (index === -1) throw new Error(`Claim ${id} not found`);

  const prevStatus = claims[index].claimStatus;

  claims[index] = {
    ...claims[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  setStorageItem(STORAGE_KEY, claims);

  // If status changed, notify
  if (updates.claimStatus && updates.claimStatus !== prevStatus) {
    try {
      await createNotification({
        title: "Claim Status Updated",
        message: `Claim ${id} status changed from ${prevStatus} to ${updates.claimStatus}.`,
        type: "claim",
        claimId: id,
        claimName: claims[index].claimName,
      });
    } catch (e) {
      console.error(e);
    }
  }

  return JSON.parse(JSON.stringify(claims[index]));
}

export async function deleteClaim(id: string): Promise<boolean> {
  await delay(80);
  const claims = getStorageItem<Claim[]>(STORAGE_KEY, []);
  const target = claims.find((c) => c.id === id);
  const filtered = claims.filter((c) => c.id !== id);
  setStorageItem(STORAGE_KEY, filtered);

  if (target) {
    try {
      await createNotification({
        title: "Claim Removed",
        message: `Claim ${id} (${target.shipName}) was deleted.`,
        type: "claim",
        claimId: id,
      });
    } catch (e) {
      console.error(e);
    }
  }

  return true;
}

export async function addActivity(claimId: string, activity: Omit<SoFActivity, "id">): Promise<SoFActivity> {
  await delay(50);
  const claims = getStorageItem<Claim[]>(STORAGE_KEY, []);
  const claim = claims.find((c) => c.id === claimId);
  if (!claim) throw new Error(`Claim ${claimId} not found`);

  const newActivity: SoFActivity = {
    ...activity,
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    claimId,
  };

  if (!claim.activities) claim.activities = [];
  claim.activities.push(newActivity);
  claim.updatedAt = new Date().toISOString();

  setStorageItem(STORAGE_KEY, claims);
  return JSON.parse(JSON.stringify(newActivity));
}

export async function updateActivity(
  claimId: string,
  activityId: string,
  updates: Partial<SoFActivity>
): Promise<SoFActivity> {
  await delay(50);
  const claims = getStorageItem<Claim[]>(STORAGE_KEY, []);
  const claim = claims.find((c) => c.id === claimId);
  if (!claim || !claim.activities) throw new Error("Claim or activities not found");

  const actIndex = claim.activities.findIndex((a) => a.id === activityId);
  if (actIndex === -1) throw new Error(`Activity ${activityId} not found`);

  claim.activities[actIndex] = {
    ...claim.activities[actIndex],
    ...updates,
    isCorrected: true,
  };
  claim.updatedAt = new Date().toISOString();

  setStorageItem(STORAGE_KEY, claims);
  return JSON.parse(JSON.stringify(claim.activities[actIndex]));
}

export async function deleteActivity(claimId: string, activityId: string): Promise<boolean> {
  await delay(50);
  const claims = getStorageItem<Claim[]>(STORAGE_KEY, []);
  const claim = claims.find((c) => c.id === claimId);
  if (!claim || !claim.activities) return false;

  claim.activities = claim.activities.filter((a) => a.id !== activityId);
  claim.updatedAt = new Date().toISOString();

  setStorageItem(STORAGE_KEY, claims);
  return true;
}

export async function addDeduction(claimId: string, deduction: Omit<DeductionItem, "id">): Promise<DeductionItem> {
  await delay(50);
  const claims = getStorageItem<Claim[]>(STORAGE_KEY, []);
  const claim = claims.find((c) => c.id === claimId);
  if (!claim) throw new Error(`Claim ${claimId} not found`);

  const newDeduction: DeductionItem = {
    ...deduction,
    id: `ded-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    claimId,
  };

  if (!claim.deductions) claim.deductions = [];
  claim.deductions.push(newDeduction);
  claim.updatedAt = new Date().toISOString();

  setStorageItem(STORAGE_KEY, claims);
  return JSON.parse(JSON.stringify(newDeduction));
}

export async function deleteDeduction(claimId: string, deductionId: string): Promise<boolean> {
  await delay(50);
  const claims = getStorageItem<Claim[]>(STORAGE_KEY, []);
  const claim = claims.find((c) => c.id === claimId);
  if (!claim || !claim.deductions) return false;

  claim.deductions = claim.deductions.filter((d) => d.id !== deductionId);
  claim.updatedAt = new Date().toISOString();

  setStorageItem(STORAGE_KEY, claims);
  return true;
}

export async function clearAllClaims(): Promise<void> {
  await delay(50);
  setStorageItem(STORAGE_KEY, []);
}

export async function resetMockClaims(): Promise<void> {
  await delay(50);
  setStorageItem(STORAGE_KEY, []);
}
