import { Claim, SoFActivity, DeductionItem, OwnerComparison, EmailFollowup } from "@/lib/types";

export async function getClaims(params?: {
  status?: string;
  claimType?: string;
  client?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  page?: number;
  limit?: number;
}): Promise<any[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.claimType) query.set("claimType", params.claimType);
  if (params?.search) query.set("search", params.search);
  if (params?.sortBy) query.set("sortBy", params.sortBy);
  if (params?.sortOrder) query.set("sortOrder", params.sortOrder);
  if (params?.page) query.set("page", params.page.toString());
  if (params?.limit) query.set("limit", params.limit.toString());

  const res = await fetch(`/api/claims?${query.toString()}`, {
    method: "GET",
    headers: { "Cache-Control": "no-cache" }
  });

  if (!res.ok) {
    throw new Error("Failed to load claims");
  }

  const data = await res.json();
  return data.claims || [];
}

export async function getClaimById(id: string): Promise<any | null> {
  const res = await fetch(`/api/claims/${id}`, {
    method: "GET",
    headers: { "Cache-Control": "no-cache" }
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to fetch claim");
  }

  const data = await res.json();
  return data.claim || null;
}

export async function createClaim(claimData: Partial<Claim>): Promise<Claim> {
  const res = await fetch("/api/claims", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(claimData)
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to create claim");
  }
  return data.claim;
}

export async function updateClaim(id: string, updates: Partial<Claim>): Promise<Claim> {
  const res = await fetch(`/api/claims/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to update claim");
  }
  return data.claim;
}

export async function deleteClaim(id: string): Promise<boolean> {
  const res = await fetch(`/api/claims/${id}`, {
    method: "DELETE"
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to delete claim");
  }
  return true;
}

export async function getOwnerComparison(claimId: string): Promise<OwnerComparison | undefined> {
  try {
    const res = await fetch(`/api/claims/${claimId}/owner-comparison`);
    if (res.ok) {
      const data = await res.json();
      return data.comparison;
    }
  } catch {}
  return undefined;
}

export async function saveOwnerComparison(claimId: string, comp: Partial<OwnerComparison>): Promise<OwnerComparison> {
  const res = await fetch(`/api/claims/${claimId}/owner-comparison`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(comp)
  });
  const data = await res.json();
  return data.comparison;
}

export async function getMissingDocsCheck(claimId: string): Promise<any> {
  try {
    const res = await fetch(`/api/claims/${claimId}/missing-docs`);
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return { claimId, missingDocuments: [], hasCriticalMissing: false };
}

export async function getClaimChasers(claimId: string): Promise<EmailFollowup[]> {
  try {
    const res = await fetch(`/api/claims/${claimId}/chasers`);
    if (res.ok) {
      const data = await res.json();
      return data.chasers || [];
    }
  } catch {}
  return [];
}

export async function sendClaimChaser(claimId: string, chaser: Partial<EmailFollowup>): Promise<EmailFollowup> {
  const res = await fetch(`/api/claims/${claimId}/chasers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(chaser)
  });
  const data = await res.json();
  return data.chaser;
}

export async function addSoFActivity(claimId: string, activity: Omit<SoFActivity, "id">): Promise<any> {
  const res = await fetch(`/api/claims/${claimId}/sof`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(activity)
  });
  return await res.json();
}

export async function updateSoFActivity(claimId: string, activityId: string, updates: Partial<SoFActivity>): Promise<any> {
  const res = await fetch(`/api/claims/${claimId}/sof/${activityId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });
  return await res.json();
}

export async function deleteSoFActivity(claimId: string, activityId: string): Promise<any> {
  const res = await fetch(`/api/claims/${claimId}/sof/${activityId}`, {
    method: "DELETE"
  });
  return await res.json();
}

export const addActivity = addSoFActivity;
export const updateActivity = updateSoFActivity;
export const deleteActivity = deleteSoFActivity;
