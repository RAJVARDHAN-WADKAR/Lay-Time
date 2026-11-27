export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { calculateOilChemPumping } from "@/lib/calculations/oilChem";
import { withApi, isClaimAssignedToUser, isClaimOwnedByClient } from "@/lib/api/withApi";
import { normalizeRole } from "@/lib/auth/accessMatrix";
import { getDatabase } from "@/lib/db";
import { getClaimById } from "@/lib/db/queries";

export const GET = withApi({
  permission: "calculator:view",
  handler: async ({ user, req }) => {
    const db = getDatabase();
    const { searchParams } = new URL(req.url);
    const claimIdParam = searchParams.get("claimId");

    const isClient = Boolean(user.assignedClientId || user.clientId || user.client_id);
    const normRole = normalizeRole(user.role, isClient);

    if (claimIdParam) {
      const claim = getClaimById(claimIdParam);
      if (!claim) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }

      if (normRole === "CLIENT" && !isClaimOwnedByClient(claim, user)) {
        return NextResponse.json(
          { error: "Forbidden: External clients may only access calculations for their own claims" },
          { status: 403 }
        );
      }

      if (normRole === "CLAIM_PROCESSOR" && !isClaimAssignedToUser(claim, user)) {
        return NextResponse.json(
          { error: "Forbidden: Claim Processors may only access calculations for assigned claims" },
          { status: 403 }
        );
      }

      const rows = db
        .prepare("SELECT * FROM oil_chem_calculations WHERE claim_id = ? ORDER BY created_at DESC")
        .all(claimIdParam) as any[];

      return NextResponse.json({ calculations: rows.map(mapOilChemRow) });
    }

    let rows: any[] = [];
    if (normRole === "CLIENT") {
      const clientId = user.assignedClientId || user.clientId || user.client_id;
      if (!clientId) return NextResponse.json({ calculations: [] });
      rows = db
        .prepare(`
          SELECT occ.* 
          FROM oil_chem_calculations occ
          JOIN claims c ON occ.claim_id = c.id
          WHERE c.client_id = ?
          ORDER BY occ.created_at DESC
        `)
        .all(clientId) as any[];
    } else if (normRole === "CLAIM_PROCESSOR") {
      rows = db
        .prepare(`
          SELECT occ.* 
          FROM oil_chem_calculations occ
          JOIN claims c ON occ.claim_id = c.id
          WHERE c.assigned_to = ? OR LOWER(c.assigned_to) = LOWER(?) OR LOWER(c.assigned_to) = LOWER(?)
          ORDER BY occ.created_at DESC
        `)
        .all(user.id, user.name, user.email) as any[];
    } else {
      rows = db.prepare("SELECT * FROM oil_chem_calculations ORDER BY created_at DESC").all() as any[];
    }

    return NextResponse.json({ calculations: rows.map(mapOilChemRow) });
  }
});

export const POST = withApi({
  permission: "calculator:use",
  handler: async ({ user, body }) => {
    const normRole = normalizeRole(user.role);

    if (body?.claimId) {
      const claim = getClaimById(body.claimId);
      if (!claim) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      if (normRole === "CLAIM_PROCESSOR" && !isClaimAssignedToUser(claim, user)) {
        return NextResponse.json(
          { error: "Forbidden: Claim Processors may only calculate on assigned claims" },
          { status: 403 }
        );
      }
    }

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
      body?.claimId || null,
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

    return NextResponse.json({ success: true, calculation: result }, { status: 201 });
  }
});

function mapOilChemRow(r: any) {
  return {
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
  };
}
