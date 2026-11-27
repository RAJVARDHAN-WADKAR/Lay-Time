export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { normalizeRole } from "@/lib/auth/accessMatrix";
import { getScopedClaimById } from "@/lib/db/scoped";
import { updateActivityInClaim, deleteActivityFromClaim, getClaimById } from "@/lib/db/queries";
import { logAudit } from "@/lib/db/audit";

export const PUT = withApi({
  permission: "sof:edit",
  checkClaimOwnership: true,
  handler: async ({ user, params, body }) => {
    const claim = getScopedClaimById(user, params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const activityId = params.activityId;
    if (!activityId) {
      return NextResponse.json({ error: "Activity ID is required" }, { status: 400 });
    }

    try {
      const updated = updateActivityInClaim(params.id, activityId, body);
      if (!updated) {
        return NextResponse.json({ error: "Activity not found" }, { status: 404 });
      }

      logAudit({
        actorId: user.id,
        actorEmail: user.email,
        actorRole: normalizeRole(user.role),
        action: "sof_update",
        targetType: "statement_of_facts",
        targetId: activityId,
        details: body
      });

      const updatedClaim = getClaimById(params.id);
      return NextResponse.json({ success: true, activity: updated, claim: updatedClaim });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Failed to update activity" }, { status: err.statusCode || 400 });
    }
  }
});

export const DELETE = withApi({
  permission: "sof:edit",
  checkClaimOwnership: true,
  handler: async ({ user, params }) => {
    const claim = getScopedClaimById(user, params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const activityId = params.activityId;
    if (!activityId) {
      return NextResponse.json({ error: "Activity ID is required" }, { status: 400 });
    }

    const success = deleteActivityFromClaim(params.id, activityId);
    if (!success) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: normalizeRole(user.role),
      action: "sof_delete",
      targetType: "statement_of_facts",
      targetId: activityId,
      details: { claimId: params.id }
    });

    const updatedClaim = getClaimById(params.id);
    return NextResponse.json({ success: true, claim: updatedClaim });
  }
});
