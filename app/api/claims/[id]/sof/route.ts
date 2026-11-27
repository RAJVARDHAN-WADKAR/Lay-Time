export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { normalizeRole } from "@/lib/auth/accessMatrix";
import { getScopedSoF, getScopedClaimById } from "@/lib/db/scoped";
import { addActivityToClaim, updateActivityInClaim, deleteActivityFromClaim, getClaimById } from "@/lib/db/queries";
import { logAudit } from "@/lib/db/audit";
import { z } from "zod";

export const GET = withApi({
  permission: "sof:view",
  handler: async ({ user, params }) => {
    const claim = getScopedClaimById(user, params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const activities = getScopedSoF(user, params.id);
    return NextResponse.json({ activities });
  }
});

const SoFActivitySchema = z.object({
  id: z.string().optional(),
  activityName: z.string().min(1, "Activity name is required"),
  startTime: z.string().min(1, "startTime is required"),
  stopTime: z.string().min(1, "stopTime is required"),
  portId: z.string().nullable().optional(),
  berthId: z.string().nullable().optional(),
  percentageCounted: z.number().min(0, "percentageCounted must be between 0 and 100").max(100, "percentageCounted must be between 0 and 100").optional(),
  prorata: z.number().optional(),
  deductionCategory: z.string().optional(),
  remarks: z.string().optional()
}).passthrough().refine(
  (data) => {
    const start = new Date(data.startTime).getTime();
    const stop = new Date(data.stopTime).getTime();
    return !isNaN(start) && !isNaN(stop) && start < stop;
  },
  { message: "Invalid time window: stopTime must be strictly after startTime", path: ["stopTime"] }
);

export const POST = withApi({
  permission: "sof:edit",
  checkClaimOwnership: true,
  schema: SoFActivitySchema,
  handler: async ({ user, params, body }) => {
    const claim = getScopedClaimById(user, params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    try {
      const activity = addActivityToClaim(params.id, body as any);
      logAudit({
        actorId: user.id,
        actorEmail: user.email,
        actorRole: normalizeRole(user.role),
        action: "sof_create",
        targetType: "statement_of_facts",
        targetId: activity.id,
        details: { claimId: params.id, activityName: activity.activityName }
      });
      const updatedClaim = getClaimById(params.id);
      return NextResponse.json({ success: true, activity, claim: updatedClaim }, { status: 201 });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Failed to add activity" }, { status: err.statusCode || 400 });
    }
  }
});

export const PUT = withApi({
  permission: "sof:edit",
  checkClaimOwnership: true,
  handler: async ({ user, params, req, body }) => {
    const claim = getScopedClaimById(user, params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const actId = body?.id || req.nextUrl.searchParams.get("activityId");
    if (!actId) {
      return NextResponse.json({ error: "Activity ID required" }, { status: 400 });
    }

    try {
      const updated = updateActivityInClaim(params.id, actId, body);
      if (!updated) {
        return NextResponse.json({ error: "Activity not found" }, { status: 404 });
      }

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
  handler: async ({ user, params, req }) => {
    const claim = getScopedClaimById(user, params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const actId = req.nextUrl.searchParams.get("activityId");
    if (!actId) {
      return NextResponse.json({ error: "Activity ID required" }, { status: 400 });
    }

    deleteActivityFromClaim(params.id, actId);
    const updatedClaim = getClaimById(params.id);
    return NextResponse.json({ success: true, claim: updatedClaim });
  }
});
