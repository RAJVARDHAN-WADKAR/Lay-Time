export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { getScopedSoF, getScopedClaimById } from "@/lib/db/scoped";
import { addActivityToClaim, updateActivityInClaim, deleteActivityFromClaim, getClaimById } from "@/lib/db/queries";
import { z } from "zod";

export const GET = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor", "Finance", "Reviewer"],
  handler: async ({ user, params }) => {
    const isClient = Boolean(user.clientId || user.assignedClientId);
    if (user.role === "Client" || isClient) {
      return NextResponse.json(
        { error: "Forbidden: Client role may not access Statement of Facts" },
        { status: 403 }
      );
    }

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
  startTime: z.string().min(1),
  stopTime: z.string().min(1),
  portId: z.string().optional(),
  berthId: z.string().optional(),
  percentageCounted: z.number().min(0).max(100).optional(),
  prorata: z.number().optional(),
  deductionCategory: z.string().optional(),
  remarks: z.string().optional()
}).passthrough();

export const POST = withApi({
  roles: ["Supervisor", "Claim Processor", "Processor"],
  schema: SoFActivitySchema,
  handler: async ({ user, params, body }) => {
    const claim = getScopedClaimById(user, params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const activity = addActivityToClaim(params.id, body as any);
    const updatedClaim = getClaimById(params.id);

    return NextResponse.json({ success: true, activity, claim: updatedClaim }, { status: 201 });
  }
});

export const PUT = withApi({
  roles: ["Supervisor", "Claim Processor", "Processor"],
  handler: async ({ user, params, req, body }) => {
    const claim = getScopedClaimById(user, params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const actId = body?.id || req.nextUrl.searchParams.get("activityId");
    if (!actId) {
      return NextResponse.json({ error: "Activity ID required" }, { status: 400 });
    }

    const updated = updateActivityInClaim(params.id, actId, body);
    if (!updated) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const updatedClaim = getClaimById(params.id);
    return NextResponse.json({ success: true, activity: updated, claim: updatedClaim });
  }
});

export const DELETE = withApi({
  roles: ["Supervisor", "Claim Processor", "Processor"],
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
