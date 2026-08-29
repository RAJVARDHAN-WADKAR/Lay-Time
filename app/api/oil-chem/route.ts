import { NextRequest, NextResponse } from "next/server";
import { calculateOilChemPumping } from "@/lib/calculations/oilChem";
import { getDatabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const rows = db.prepare("SELECT * FROM oil_chem_calculations ORDER BY created_at DESC").all() as any[];
    const calculations = rows.map((r) => ({
      id: r.id,
      claimId: r.claim_id,
      cargoName: r.cargo_name,
      cargoType: r.cargo_type,
      quantityMetricTons: r.quantity_metric_tons,
      density15C: r.density_15c,
      temperatureC: r.temperature_c,
      vcfFactor: r.vcf_factor,
      correctedQuantity: r.corrected_quantity,
      pumpingWarrantyRateM3H: r.pumping_warranty_rate_m3h,
      pumpingWarrantyPressureBar: r.pumping_warranty_pressure_bar,
      cowAllowedHours: r.cow_allowed_hours,
      manifoldConnectionHours: r.manifold_connection_hours,
      actualPumpingHours: r.actual_pumping_hours,
      allowedPumpingHours: r.allowed_pumping_hours,
      excessPumpingHours: r.excess_pumping_hours,
      excessPumpingDemurrage: r.excess_pumping_demurrage,
      hourlyRate: r.hourly_rate,
      notes: r.notes,
      createdAt: r.created_at
    }));

    return NextResponse.json({ calculations });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch oil/chem calculations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = calculateOilChemPumping(body);

    const db = getDatabase();
    db.prepare(`
      INSERT INTO oil_chem_calculations (
        id, claim_id, cargo_name, cargo_type, quantity_metric_tons, density_15c, temperature_c,
        vcf_factor, corrected_quantity, pumping_warranty_rate_m3h, pumping_warranty_pressure_bar,
        cow_allowed_hours, manifold_connection_hours, actual_pumping_hours, allowed_pumping_hours,
        excess_pumping_hours, excess_pumping_demurrage, hourly_rate, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      result.id,
      body.claimId || null,
      result.cargoName,
      result.cargoType,
      result.quantityMetricTons,
      result.density15C,
      result.temperatureC,
      result.vcfFactor,
      result.correctedQuantity,
      result.pumpingWarrantyRateM3H,
      result.pumpingWarrantyPressureBar,
      result.cowAllowedHours,
      result.manifoldConnectionHours,
      result.actualPumpingHours,
      result.allowedPumpingHours,
      result.excessPumpingHours,
      result.excessPumpingDemurrage,
      result.hourlyRate,
      result.notes || "",
      result.createdAt
    );

    return NextResponse.json({ success: true, calculation: result });
  } catch (error: any) {
    console.error("Oil/Chem API Error:", error);
    return NextResponse.json({ error: "Failed to calculate oil/chem pumping" }, { status: 500 });
  }
}
