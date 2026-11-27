export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { can, normalizeRole } from "@/lib/auth/accessMatrix";
import { getRacCaseById, updateRacCase, createNotificationRecord } from "@/lib/db/queries";
import { getDatabase } from "@/lib/db";
import { logAudit } from "@/lib/db/audit";

function isRacAssignedToUser(rac: any, user: { id: string; name: string; email: string }): boolean {
  const assigned = String(rac?.assignedTo || "").trim().toLowerCase();
  if (!assigned) return false;
  return (
    assigned === (user.id || "").trim().toLowerCase() ||
    assigned === (user.name || "").trim().toLowerCase() ||
    assigned === (user.email || "").trim().toLowerCase()
  );
}

export const GET = withApi({
  permission: "rac:view",
  handler: async ({ user, params }) => {
    const rac = getRacCaseById(params.id);
    if (!rac) {
      return NextResponse.json({ error: "RAC case not found" }, { status: 404 });
    }

    if (normalizeRole(user.role) === "CLAIM_PROCESSOR" && !isRacAssignedToUser(rac, user)) {
      return NextResponse.json(
        { error: "Forbidden: RAC case is not assigned to your account." },
        { status: 403 }
      );
    }

    return NextResponse.json({ case: rac });
  }
});

export const PUT = withApi({
  permission: "rac:edit",
  handler: async ({ user, params, body }) => {
    const existing = getRacCaseById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "RAC case not found" }, { status: 404 });
    }

    const normRole = normalizeRole(user.role);
    if (normRole === "CLAIM_PROCESSOR" && !isRacAssignedToUser(existing, user)) {
      return NextResponse.json(
        { error: "Forbidden: You can only update RAC cases assigned to your account." },
        { status: 403 }
      );
    }

    const clientUpdatedAt = body?.updatedAt || body?.updated_at;
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

    if (body?.status && (body.status === "Reviewed" || body.status === "Closed" || body.status === "Authorized")) {
      if (!can(normRole, "rac:authorize")) {
        return NextResponse.json(
          { error: "Forbidden: Role is not authorized to approve or close RAC cases." },
          { status: 403 }
        );
      }
    }

    if (body?.agreedAmount !== undefined && body.agreedAmount !== existing.agreedAmount && body.agreedAmount > 0) {
      if (!can(normRole, "rac:authorize")) {
        return NextResponse.json(
          { error: "Forbidden: Role is not authorized to set agreed RAC settlement amounts." },
          { status: 403 }
        );
      }
    }

    const updated = updateRacCase(params.id, body, user.name || user.email || "System");

    logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: normRole,
      action: body?.status && body.status !== existing.status ? "rac_status_transition" : "rac_update",
      targetType: "rac_case",
      targetId: params.id,
      details: body
    });

    if (body?.status && body.status !== existing.status) {
      createNotificationRecord({
        title: "RAC Case Status Changed",
        message: `RAC Case ${existing.racReference} moved to ${body.status}`,
        type: "rac",
        racCaseId: existing.id,
        racReference: existing.racReference
      });
    }

    return NextResponse.json({ success: true, case: updated });
  }
});

export const DELETE = withApi({
  permission: "rac:delete",
  handler: async ({ user, params }) => {
    const db = getDatabase();
    const res = db.prepare("DELETE FROM rac_cases WHERE id = ?").run(params.id);
    if (res.changes === 0) {
      return NextResponse.json({ error: "RAC case not found" }, { status: 404 });
    }

    logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: normalizeRole(user.role),
      action: "rac_delete",
      targetType: "rac_case",
      targetId: params.id
    });

    return NextResponse.json({ success: true, message: "RAC case deleted" });
  }
});
