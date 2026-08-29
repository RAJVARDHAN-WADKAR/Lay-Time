import { OilChemCalculation } from "@/lib/types";

export async function getOilChemCalculations(): Promise<OilChemCalculation[]> {
  try {
    const res = await fetch("/api/oil-chem", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.calculations || [];
  } catch (e) {
    return [];
  }
}

export async function calculateOilChemPumping(inputData: any): Promise<OilChemCalculation> {
  const res = await fetch("/api/oil-chem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputData)
  });
  if (!res.ok) throw new Error("Failed to calculate pumping warranty");
  const data = await res.json();
  return data.calculation;
}
