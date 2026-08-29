import { Claim, SoFActivity, DeductionItem, OwnerComparison, EmailFollowup } from "@/lib/types";

export async function getClaims(params?: {
  status?: string;
  claimType?: string;
  client?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<Claim[]> {
  try {
    const query = new URLSearchParams();
    if (params?.status && params.status !== "All") query.set("status", params.status);
    if (params?.claimType && params.claimType !== "All") query.set("claimType", params.claimType);
    if (params?.client && params.client !== "All") query.set("client", params.client);
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    const res = await fetch(`/api/claims?${query.toString()}`, {
      cache: "no-store"
    });
    if (!res.ok) throw new Error("Failed to fetch claims");
    const data = await res.json();
    return data.claims || [];
  } catch (error) {
    console.error("API getClaims error:", error);
    return [];
  }
}

export async function getClaimById(id: string): Promise<Claim | null> {
  try {
    const res = await fetch(`/api/claims/${id}`, {
      cache: "no-store"
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.claim || null;
  } catch (error) {
    console.error(`API getClaimById(${id}) error:`, error);
    return null;
  }
}

export async function createClaim(claimData: Partial<Claim>): Promise<Claim> {
  const res = await fetch("/api/claims", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(claimData)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create claim");
  }

  const data = await res.json();
  return data.claim;
}

export async function updateClaim(id: string, updates: Partial<Claim>): Promise<Claim> {
  const res = await fetch(`/api/claims/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update claim");
  }

  const data = await res.json();
  return data.claim;
}

export async function deleteClaim(id: string): Promise<boolean> {
  const res = await fetch(`/api/claims/${id}`, {
    method: "DELETE"
  });
  return res.ok;
}

export async function getOwnerComparison(claimId: string): Promise<OwnerComparison | undefined> {
  try {
    const res = await fetch(`/api/claims/${claimId}/owner-comparison`, { cache: "no-store" });
    if (!res.ok) return undefined;
    const data = await res.json();
    return data.comparison;
  } catch (e) {
    return undefined;
  }
}

export async function saveOwnerComparison(claimId: string, comp: Partial<OwnerComparison>): Promise<OwnerComparison> {
  const res = await fetch(`/api/claims/${claimId}/owner-comparison`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(comp)
  });
  if (!res.ok) throw new Error("Failed to save owner comparison");
  const data = await res.json();
  return data.comparison;
}

export async function getMissingDocsCheck(claimId: string): Promise<any> {
  const res = await fetch(`/api/claims/${claimId}/missing-docs`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to check missing documents");
  return await res.json();
}

export async function getClaimChasers(claimId: string): Promise<EmailFollowup[]> {
  try {
    const res = await fetch(`/api/claims/${claimId}/chasers`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.chasers || [];
  } catch (e) {
    return [];
  }
}

export async function sendClaimChaser(claimId: string, chaser: Partial<EmailFollowup>): Promise<EmailFollowup> {
  const res = await fetch(`/api/claims/${claimId}/chasers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(chaser)
  });
  if (!res.ok) throw new Error("Failed to dispatch claim follow-up");
  const data = await res.json();
  return data.chaser;
}

export async function addSoFActivity(claimId: string, activity: Omit<SoFActivity, "id">): Promise<Claim> {
  const claim = await getClaimById(claimId);
  if (!claim) throw new Error("Claim not found");

  const newActivity: SoFActivity = {
    ...activity,
    id: `act-${Date.now()}`
  };

  const updatedActivities = [...(claim.activities || []), newActivity];
  return await updateClaim(claimId, { activities: updatedActivities });
}

export async function updateSoFActivity(claimId: string, activityId: string, updates: Partial<SoFActivity>): Promise<Claim> {
  const claim = await getClaimById(claimId);
  if (!claim) throw new Error("Claim not found");

  const updatedActivities = (claim.activities || []).map((a) =>
    a.id === activityId ? { ...a, ...updates } : a
  );

  return await updateClaim(claimId, { activities: updatedActivities });
}

export async function deleteSoFActivity(claimId: string, activityId: string): Promise<Claim> {
  const claim = await getClaimById(claimId);
  if (!claim) throw new Error("Claim not found");

  const updatedActivities = (claim.activities || []).filter((a) => a.id !== activityId);
  return await updateClaim(claimId, { activities: updatedActivities });
}

export const addActivity = addSoFActivity;
export const updateActivity = updateSoFActivity;
export const deleteActivity = deleteSoFActivity;
