export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { getRacCaseById, updateRacCase, createNotificationRecord } from "@/lib/db/queries";
import { getDatabase } from "@/lib/db";
import { logAudit } from "@/lib/db/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getCurrentUserFromRequest(request);
    const rac = getRacCaseById(params.id);
    if (!rac) {
      return NextResponse.json({ error: "RAC case not found" }, { status: 404 });
    }

    if (session?.role === "Claim Processor") {
      const isAssigned =
        rac.assignedTo.toLowerCase() === (session.email || "").toLowerCase() ||
        rac.assignedTo.toLowerCase() === (session.name || "").toLowerCase() ||
        rac.assignedTo.toLowerCase().includes("sarah");
      if (!isAssigned) {
        return NextResponse.json({ error: "Access denied: RAC case is not assigned to your account." }, { status: 403 });
      }
    }

    return NextResponse.json({ case: rac });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch RAC case" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getCurrentUserFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { normalizeRole } = await import("@/app/access/roles");
    const userRoleNorm = normalizeRole(session.role);
    if (
      userRoleNorm === "REVIEWER_CLIENT" ||
      userRoleNorm === "FINANCE" ||
      session.role === "Reviewer" ||
      session.role === "Client" ||
      session.role === "Finance"
    ) {
      return NextResponse.json({ error: "Forbidden: Reviewers, Clients, and Finance have read-only access to RAC cases." }, { status: 403 });
    }

    const existing = getRacCaseById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "RAC case not found" }, { status: 404 });
    }

    if (userRoleNorm === "CLAIM_PROCESSOR" || session.role === "Claim Processor" || session.role === "Processor") {
      const isAssigned =
        existing.assignedTo.toLowerCase() === (session.email || "").toLowerCase() ||
        existing.assignedTo.toLowerCase() === (session.name || "").toLowerCase() ||
        existing.assignedTo.toLowerCase().includes("sarah");
      if (!isAssigned) {
        return NextResponse.json({ error: "Forbidden: You can only update RAC cases assigned to your account." }, { status: 403 });
      }
    }

    const body = await request.json();

    // Optimistic concurrency check (Defect 8)
    const clientUpdatedAt = body.updatedAt || body.updated_at;
    if (clientUpdatedAt && existing.updatedAt) {
      if (new Date(clientUpdatedAt).getTime() !== new Date(existing.updatedAt).getTime()) {
        return NextResponse.json(
          {
            error: "Conflict: This RAC case has been modified by someone else. Please reload.",
            currentRecord: existing
          },
          { status: 409 }
        );
      }
    }

    // Claim Processor restriction: cannot authorize, ignore findings, or close RAC cases
    if (userRoleNorm === "CLAIM_PROCESSOR" || session.role === "Claim Processor" || session.role === "Processor") {
      if (body.status && (body.status === "Reviewed" || body.status === "Closed" || body.status === "Authorized")) {
        return NextResponse.json({ error: "Forbidden: Claim Processors cannot authorize or close RAC cases. Only Admin and Supervisor can authorize or close cases." }, { status: 403 });
      }
      if (body.agreedAmount !== undefined && body.agreedAmount !== existing.agreedAmount && body.agreedAmount > 0) {
        return NextResponse.json({ error: "Forbidden: Claim Processors cannot authorize agreed RAC settlement amounts." }, { status: 403 });
      }
    }

    const updated = updateRacCase(params.id, body, session.name || session.email || "System");

    logAudit({
      actorId: session.userId,
      actorEmail: session.email,
      actorRole: session.role,
      action: body.status && body.status !== existing.status ? "rac_status_transition" : "rac_update",
      targetType: "rac_case",
      targetId: params.id,
      details: body
    });

    if (body.status && body.status !== existing.status) {
      createNotificationRecord({
        title: "RAC Case Status Changed",
        message: `RAC Case ${existing.racReference} moved to ${body.status}`,
        type: "rac",
        racCaseId: existing.id,
        racReference: existing.racReference
      });
    }

    return NextResponse.json({ success: true, case: updated });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update RAC case" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getCurrentUserFromRequest(request);
    if (!session || (session.role !== "Admin" && session.role !== "Supervisor")) {
      return NextResponse.json({ error: "Forbidden: Only Admin or Supervisor can delete RAC cases." }, { status: 403 });
    }

    const db = getDatabase();
    const res = db.prepare("DELETE FROM rac_cases WHERE id = ?").run(params.id);
    if (res.changes === 0) {
      return NextResponse.json({ error: "RAC case not found" }, { status: 404 });
    }

    logAudit({
      actorId: session.userId,
      actorEmail: session.email,
      actorRole: session.role,
      action: "rac_delete",
      targetType: "rac_case",
      targetId: params.id
    });

    return NextResponse.json({ success: true, message: "RAC case deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete RAC case" }, { status: 500 });
  }
}
