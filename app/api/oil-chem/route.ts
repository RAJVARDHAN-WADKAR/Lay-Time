import { NextRequest, NextResponse } from "next/server";
import { calculateOilChemPumping } from "@/lib/calculations/oilChem";
import { requireUser } from "@/lib/auth/session";
import { normalizeRole } from "@/app/access/roles";
import { getDatabase } from "@/lib/db";
import { claimScope } from "@/lib/db/scoped";
import { getClaimById } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireUser(request);
    if (authResult.error) {
      return authResult.error;
    }

    const { user } = authResult;
    const db = getDatabase();
    const { searchParams } = new URL(request.url);
    const claimIdParam = searchParams.get("claimId");

    const isClient =
      user.role === "Client" ||
      (user.role === "REVIEWER_CLIENT" &&
        Boolean(user.assignedClientId || user.clientId || user.client_id));
    const normRole = normalizeRole(user.role);

    if (claimIdParam) {
      const claim = getClaimById(claimIdParam);
      if (!claim) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }

      if (isClient) {
        const clientId = user.assignedClientId || user.clientId || user.client_id;
        if (!clientId || claim.clientId !== clientId) {
          return NextResponse.json(
            { error: "Forbidden: External clients may only access calculations for their own claims" },
            { status: 403 }
          );
        }
      }

      if (normRole === "CLAIM_PROCESSOR") {
        const assigned = (claim.assignedTo || "").trim().toLowerCase();
        const userId = (user.id || "").trim().toLowerCase();
        const userName = (user.name || "").trim().toLowerCase();
        const userEmail = (user.email || "").trim().toLowerCase();

        const isAssigned =
          assigned !== "" &&
          (assigned === userId || assigned === userName || assigned === userEmail);

        if (!isAssigned) {
          return NextResponse.json(
            { error: "Forbidden: Claim Processors may only access calculations for assigned claims" },
            { status: 403 }
          );
        }
      }

      const rows = db
        .prepare("SELECT * FROM oil_chem_calculations WHERE claim_id = ? ORDER BY created_at DESC")
        .all(claimIdParam) as any[];

      const calculations = rows.map(mapOilChemRow);
      return NextResponse.json({ calculations });
    }

    // List all scoped oil_chem_calculations
    let rows: any[] = [];
    if (isClient) {
      const clientId = user.assignedClientId || user.clientId || user.client_id;
      if (!clientId) {
        return NextResponse.json({ calculations: [] });
      }
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
      // ADMIN, SUPERVISOR, Internal Reviewer
      rows = db
        .prepare("SELECT * FROM oil_chem_calculations ORDER BY created_at DESC")
        .all() as any[];
    }

    const calculations = rows.map(mapOilChemRow);
    return NextResponse.json({ calculations });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch oil/chem calculations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireUser(request);
    if (authResult.error) {
      return authResult.error;
    }

    const { user } = authResult;
    const normRole = normalizeRole(user.role);

    // Reviewer and external client are strictly read-only
    if (normRole === "REVIEWER_CLIENT") {
      return NextResponse.json(
        { error: "Forbidden: Reviewers and clients have read-only access and cannot perform calculations." },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (body.claimId) {
      const claim = getClaimById(body.claimId);
      if (!claim) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }

      if (normRole === "CLAIM_PROCESSOR") {
        const assigned = (claim.assignedTo || "").trim().toLowerCase();
        const userId = (user.id || "").trim().toLowerCase();
        const userName = (user.name || "").trim().toLowerCase();
        const userEmail = (user.email || "").trim().toLowerCase();

        const isAssigned =
          assigned !== "" &&
          (assigned === userId || assigned === userName || assigned === userEmail);

        if (!isAssigned) {
          return NextResponse.json(
            { error: "Forbidden: Claim Processors may only calculate on assigned claims" },
            { status: 403 }
          );
        }
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

    return NextResponse.json({ success: true, calculation: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to calculate oil/chem pumping" },
      { status: 500 }
    );
  }
}

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
