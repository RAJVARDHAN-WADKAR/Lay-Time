import { Claim, SoFActivity, DeductionItem, OwnerComparison, EmailFollowup } from "@/lib/types";
import {
  getStoreClaims,
  getStoreClaimById,
  createStoreClaim,
  updateStoreClaim,
  deleteStoreClaim,
  addStoreActivity,
  updateStoreActivity,
  deleteStoreActivity,
  getStoreOwnerComparison,
  saveStoreOwnerComparison,
  getStoreClaimChasers,
  sendStoreClaimChaser
} from "@/lib/mock/clientStore";

export async function getClaims(params?: {
  status?: string;
  claimType?: string;
  client?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<Claim[]> {
  return getStoreClaims(params);
}

export async function getClaimById(id: string): Promise<Claim | null> {
  return getStoreClaimById(id);
}

export async function createClaim(claimData: Partial<Claim>): Promise<Claim> {
  return createStoreClaim(claimData);
}

export async function updateClaim(id: string, updates: Partial<Claim>): Promise<Claim> {
  return updateStoreClaim(id, updates);
}

export async function deleteClaim(id: string): Promise<boolean> {
  return deleteStoreClaim(id);
}

export async function getOwnerComparison(claimId: string): Promise<OwnerComparison | undefined> {
  return getStoreOwnerComparison(claimId);
}

export async function saveOwnerComparison(claimId: string, comp: Partial<OwnerComparison>): Promise<OwnerComparison> {
  return saveStoreOwnerComparison(claimId, comp);
}

export async function getMissingDocsCheck(claimId: string): Promise<any> {
  const claim = getStoreClaimById(claimId);
  const activities = claim?.activities || [];
  const ports = claim?.ports || [];
  const documents = claim?.documents || [];

  const missing: string[] = [];
  if (!claim?.documentLinks || claim.documentLinks.length === 0) {
    missing.push("Statement of Facts (SoF)");
  }
  if (!claim?.charterpartyDate) {
    missing.push("Charterparty Agreement");
  }
  if (!claim?.noticeReceivedDate) {
    missing.push("Notice of Readiness (NOR)");
  }
  if (ports.length > 1) {
    missing.push("Prorata Allocation Worksheets");
  }

  return {
    claimId,
    missingDocuments: missing,
    hasCriticalMissing: missing.length > 0,
    checkTimestamp: new Date().toISOString()
  };
}

export async function getClaimChasers(claimId: string): Promise<EmailFollowup[]> {
  return getStoreClaimChasers(claimId);
}

export async function sendClaimChaser(claimId: string, chaser: Partial<EmailFollowup>): Promise<EmailFollowup> {
  return sendStoreClaimChaser(claimId, chaser);
}

export async function addSoFActivity(claimId: string, activity: Omit<SoFActivity, "id">): Promise<Claim> {
  return addStoreActivity(claimId, activity);
}

export async function updateSoFActivity(claimId: string, activityId: string, updates: Partial<SoFActivity>): Promise<Claim> {
  return updateStoreActivity(claimId, activityId, updates);
}

export async function deleteSoFActivity(claimId: string, activityId: string): Promise<Claim> {
  return deleteStoreActivity(claimId, activityId);
}

export const addActivity = addSoFActivity;
export const updateActivity = updateSoFActivity;
export const deleteActivity = deleteSoFActivity;
