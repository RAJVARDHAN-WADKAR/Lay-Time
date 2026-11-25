import { OilChemCalculation } from "@/lib/types";

export interface OilChemInput {
  cargoName: string;
  cargoType: "Crude Oil" | "Fuel Oil" | "Clean Petroleum Product" | "Chemical Grade A" | "Chemical Grade B" | "Vegetable Oil";
  quantityMetricTons: number;
  density15C: number;
  temperatureC: number;
  pumpingWarrantyRateM3H: number;
  pumpingWarrantyPressureBar: number;
  cowAllowedHours: number;
  manifoldConnectionHours: number;
  actualPumpingHours: number;
  hourlyRate: number;
  notes?: string;
}

export function calculateOilChemPumping(input: OilChemInput): OilChemCalculation {
  const density = input.density15C || 0.85;
  const temp = input.temperatureC || 25.0;

  // Approximate ASTM 54B VCF factor calculation
  // VCF = exp(-alpha * deltaT * (1 + 0.8 * alpha * deltaT)) where deltaT = temp - 15
  const deltaT = temp - 15.0;
  const alpha = 0.00065; // standard thermal expansion coefficient
  const vcfFactor = Math.round((1 - alpha * deltaT) * 10000) / 10000;

  // Section 6.6: Fix ASTM 54B:
  // Volume at 15°C = Mass / Density; Observed Volume = Volume at 15°C / VCF. Do NOT multiply mass by VCF.
  // Note: This is an ASTM Table 54B approximation.
  const volume15C = density > 0 ? input.quantityMetricTons / density : input.quantityMetricTons;
  const observedVolumeM3 = vcfFactor > 0 ? volume15C / vcfFactor : volume15C;
  const volumeM3 = Math.round(observedVolumeM3 * 100) / 100;
  const correctedQuantity = Math.round(volume15C * 100) / 100;

  // Allowed Pumping Time (Hours) = Volume (M3) / Pumping Warranty Rate (M3/Hr) + COW + Manifold
  const purePumpingAllowed = input.pumpingWarrantyRateM3H > 0 ? volumeM3 / input.pumpingWarrantyRateM3H : 24.0;
  const totalAllowedHours = Math.round((purePumpingAllowed + (input.cowAllowedHours || 0) + (input.manifoldConnectionHours || 0)) * 100) / 100;

  const excessHours = Math.max(0, Math.round((input.actualPumpingHours - totalAllowedHours) * 100) / 100);
  const excessDemurrage = Math.round(excessHours * (input.hourlyRate || 1500) * 100) / 100;

  const approxNote = "ASTM Table 54B approximation applied for Volume Correction Factor (VCF) and observed volume determination.";
  const combinedNotes = input.notes ? `${input.notes} | ${approxNote}` : approxNote;

  return {
    id: `oil-${Date.now()}`,
    cargoName: input.cargoName,
    cargoType: input.cargoType,
    quantityMetricTons: input.quantityMetricTons,
    density15C: density,
    temperatureC: temp,
    vcfFactor,
    correctedQuantity,
    pumpingWarrantyRateM3H: input.pumpingWarrantyRateM3H,
    pumpingWarrantyPressureBar: input.pumpingWarrantyPressureBar,
    cowAllowedHours: input.cowAllowedHours,
    manifoldConnectionHours: input.manifoldConnectionHours,
    actualPumpingHours: input.actualPumpingHours,
    allowedPumpingHours: totalAllowedHours,
    excessPumpingHours: excessHours,
    excessPumpingDemurrage: excessDemurrage,
    hourlyRate: input.hourlyRate,
    notes: combinedNotes,
    createdAt: new Date().toISOString()
  };
}
