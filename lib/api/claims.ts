import { Claim, SoFActivity, OwnerComparison, EmailFollowup } from "@/lib/types";

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
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load claims (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.claims || [];
}

export async function getClaimsWithTimebarDefaults(params?: {
  limit?: number;
}): Promise<{ claims: Claim[]; timebarDefaults: Record<string, any> }> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", params.limit.toString());

  const res = await fetch(`/api/claims?${query.toString()}`, {
    method: "GET",
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load claims (HTTP ${res.status})`);
  }

  const data = await res.json();
  return {
    claims: data.claims || [],
    timebarDefaults: data.timebarDefaults || {}
  };
}

export async function getClaimById(id: string): Promise<any | null> {
  const res = await fetch(`/api/claims/${encodeURIComponent(id)}`, {
    method: "GET",
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" }
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch claim (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.claim || null;
}

export async function createClaim(claimData: Partial<Claim>): Promise<Claim> {
  const res = await fetch("/api/claims", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(claimData)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to create claim");
  }
  return data.claim;
}

export async function updateClaim(id: string, updates: Partial<Claim>): Promise<Claim> {
  const res = await fetch(`/api/claims/${encodeURIComponent(id)}`, {
    method: "PUT",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to update claim");
  }
  return data.claim;
}

export async function deleteClaim(id: string): Promise<boolean> {
  const res = await fetch(`/api/claims/${encodeURIComponent(id)}`, {
    method: "DELETE",
    cache: "no-store"
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to delete claim");
  }
  return true;
}

export async function syncTrackerCsv(): Promise<{
  success: boolean;
  inserted: number;
  skipped: number;
  errors: string[];
  message?: string;
}> {
  const res = await fetch("/api/tracker/sync", {
    method: "POST",
    cache: "no-store"
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Tracker sync failed (HTTP ${res.status})`);
  }
  return {
    success: true,
    inserted: data.inserted ?? 0,
    skipped: data.skipped ?? 0,
    errors: Array.isArray(data.errors) ? data.errors : [],
    message: data.message
  };
}

export async function getOwnerComparison(claimId: string): Promise<OwnerComparison | undefined> {
  const res = await fetch(`/api/claims/${encodeURIComponent(claimId)}/owner-comparison`, {
    cache: "no-store"
  });
  if (!res.ok) return undefined;
  const data = await res.json();
  return data.comparison;
}

export async function saveOwnerComparison(claimId: string, comp: Partial<OwnerComparison>): Promise<OwnerComparison> {
  const res = await fetch(`/api/claims/${encodeURIComponent(claimId)}/owner-comparison`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(comp)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to save owner comparison");
  return data.comparison;
}

export async function getMissingDocsCheck(claimId: string): Promise<any> {
  try {
    const res = await fetch(`/api/claims/${encodeURIComponent(claimId)}/missing-docs`, {
      cache: "no-store"
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return { claimId, missingDocuments: [], hasCriticalMissing: false };
}

export async function getClaimChasers(claimId: string): Promise<EmailFollowup[]> {
  try {
    const res = await fetch(`/api/claims/${encodeURIComponent(claimId)}/chasers`, {
      cache: "no-store"
    });
    if (res.ok) {
      const data = await res.json();
      return data.chasers || [];
    }
  } catch {}
  return [];
}

export async function sendClaimChaser(claimId: string, chaser: Partial<EmailFollowup>): Promise<EmailFollowup> {
  const res = await fetch(`/api/claims/${encodeURIComponent(claimId)}/chasers`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(chaser)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to send chaser");
  return data.chaser;
}

export async function addSoFActivity(claimId: string, activity: Omit<SoFActivity, "id">): Promise<any> {
  const res = await fetch(`/api/claims/${encodeURIComponent(claimId)}/sof`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(activity)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to add activity");
  return data.claim || data.activity || data;
}

export async function updateSoFActivity(claimId: string, activityId: string, updates: Partial<SoFActivity>): Promise<any> {
  const res = await fetch(`/api/claims/${encodeURIComponent(claimId)}/sof/${encodeURIComponent(activityId)}`, {
    method: "PUT",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to update activity");
  return data.claim || data.activity || data;
}

export async function deleteSoFActivity(claimId: string, activityId: string): Promise<any> {
  const res = await fetch(`/api/claims/${encodeURIComponent(claimId)}/sof/${encodeURIComponent(activityId)}`, {
    method: "DELETE",
    cache: "no-store"
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to delete activity");
  return data.claim || data;
}

export const addActivity = addSoFActivity;
export const updateActivity = updateSoFActivity;
export const deleteActivity = deleteSoFActivity;
