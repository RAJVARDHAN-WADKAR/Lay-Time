export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { getScopedClaimById } from "@/lib/db/scoped";
import { updateActivityInClaim, deleteActivityFromClaim, getClaimById } from "@/lib/db/queries";

export const PUT = withApi({
  roles: ["Supervisor", "Claim Processor", "Processor"],
  handler: async ({ user, params, body }) => {
    const claim = getScopedClaimById(user, params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const activityId = params.activityId;
    if (!activityId) {
      return NextResponse.json({ error: "Activity ID is required" }, { status: 400 });
    }

    const updated = updateActivityInClaim(params.id, activityId, body);
    if (!updated) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const updatedClaim = getClaimById(params.id);
    return NextResponse.json({ success: true, activity: updated, claim: updatedClaim });
  }
});

export const DELETE = withApi({
  roles: ["Supervisor", "Claim Processor", "Processor"],
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

    const updatedClaim = getClaimById(params.id);
    return NextResponse.json({ success: true, claim: updatedClaim });
  }
});
