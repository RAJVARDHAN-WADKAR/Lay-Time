import { RacCase, RacCalculation } from "@/lib/types";

export async function getRacCases(params?: {
  status?: string;
  racType?: string;
  client?: string;
  claimId?: string;
  search?: string;
}): Promise<RacCase[]> {
  try {
    const query = new URLSearchParams();
    if (params?.status && params.status !== "All") query.set("status", params.status);
    if (params?.racType && params.racType !== "All") query.set("racType", params.racType);
    if (params?.client && params.client !== "All") query.set("client", params.client);
    if (params?.claimId) query.set("claimId", params.claimId);
    if (params?.search) query.set("search", params.search);

    const res = await fetch(`/api/rac/cases?${query.toString()}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.cases || [];
  } catch (error) {
    console.error("API getRacCases error:", error);
    return [];
  }
}

export async function getRacCaseById(id: string): Promise<RacCase | null> {
  try {
    const res = await fetch(`/api/rac/cases/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.case || null;
  } catch (error) {
    return null;
  }
}

export async function createRacCase(racData: Partial<RacCase>): Promise<RacCase> {
  const res = await fetch("/api/rac/cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(racData)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create RAC case");
  }

  const data = await res.json();
  return data.case;
}

export async function updateRacCase(id: string, updates: Partial<RacCase>): Promise<RacCase> {
  const res = await fetch(`/api/rac/cases/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update RAC case");
  }

  const data = await res.json();
  return data.case;
}

export async function deleteRacCase(id: string): Promise<boolean> {
  const res = await fetch(`/api/rac/cases/${id}`, {
    method: "DELETE"
  });
  return res.ok;
}

export async function runRacCalculation(
  racCaseIdOrPayload: string | { racCaseId: string; [key: string]: any },
  calculationInput?: any
): Promise<{ calculation: RacCalculation }> {
  let payload: any;
  if (typeof racCaseIdOrPayload === "object") {
    payload = racCaseIdOrPayload;
  } else {
    payload = {
      racCaseId: racCaseIdOrPayload,
      ...calculationInput
    };
  }

  const res = await fetch("/api/rac/calculations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to run RAC calculation");
  }

  const data = await res.json();
  return { calculation: data.calculation };
}
