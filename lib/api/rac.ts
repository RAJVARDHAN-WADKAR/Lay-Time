import { RacCase, RacCalculation } from "@/lib/types";

export async function getRacCases(params?: {
  status?: string;
  racType?: string;
  client?: string;
  claimId?: string;
  search?: string;
}): Promise<RacCase[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.racType) query.set("racType", params.racType);
  if (params?.client) query.set("client", params.client);
  if (params?.claimId) query.set("claimId", params.claimId);
  if (params?.search) query.set("search", params.search);

  const res = await fetch(`/api/rac/cases?${query.toString()}`, {
    method: "GET",
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load RAC cases (HTTP ${res.status})`);
  }

  const data = await res.json();
  return Array.isArray(data.cases) ? data.cases : [];
}

export async function getRacCaseById(id: string): Promise<RacCase | null> {
  const res = await fetch(`/api/rac/cases/${encodeURIComponent(id)}`, {
    method: "GET",
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" }
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch RAC case (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.case || null;
}

export async function createRacCase(racData: Partial<RacCase>): Promise<RacCase> {
  const res = await fetch("/api/rac/cases", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(racData)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to create RAC case");
  }
  return data.case;
}

export async function updateRacCase(id: string, updates: Partial<RacCase>): Promise<RacCase> {
  const res = await fetch(`/api/rac/cases/${encodeURIComponent(id)}`, {
    method: "PUT",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to update RAC case");
  }
  return data.case;
}

export async function deleteRacCase(id: string): Promise<boolean> {
  const res = await fetch(`/api/rac/cases/${encodeURIComponent(id)}`, {
    method: "DELETE",
    cache: "no-store"
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to delete RAC case");
  }
  return true;
}

export async function runRacCalculation(
  racCaseIdOrPayload: string | { racCaseId: string; [key: string]: any },
  calculationInput?: any
): Promise<{ calculation: RacCalculation }> {
  const payload =
    typeof racCaseIdOrPayload === "object"
      ? racCaseIdOrPayload
      : { racCaseId: racCaseIdOrPayload, ...(calculationInput || {}) };

  const res = await fetch("/api/rac/calculations", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to compute RAC calculation");
  }
  return { calculation: data.calculation };
}
