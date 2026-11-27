export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { normalizeRole } from "@/lib/auth/accessMatrix";
import { getScopedClaimById } from "@/lib/db/scoped";
import { updateClaim, createNotificationRecord } from "@/lib/db/queries";
import { logAudit } from "@/lib/db/audit";
import { z } from "zod";

const OverrideSchema = z.object({
  overriddenDemurrage: z.number().nonnegative("Overridden amount must be positive"),
  overrideReason: z.string().min(5, "Override justification reason is required")
});

export const POST = withApi({
  permission: "calculator:override",
  checkClaimOwnership: true,
  schema: OverrideSchema,
  handler: async ({ user, params, body }) => {
    const claim = getScopedClaimById(user, params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const updated = updateClaim(params.id, {
      isOverridden: true,
      overriddenDemurrage: body.overriddenDemurrage,
      overrideReason: body.overrideReason
    });

    logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: normalizeRole(user.role),
      action: "override_calculation",
      targetType: "claim",
      targetId: params.id,
      details: {
        overriddenDemurrage: body.overriddenDemurrage,
        overrideReason: body.overrideReason
      }
    });

    const cName = (claim as any).claimName || params.id;
    createNotificationRecord({
      title: "Calculation Overridden",
      message: `Calculation override applied on claim ${cName}`,
      type: "claim",
      claimId: claim.id,
      claimName: cName
    });

    return NextResponse.json({
      success: true,
      claim: updated
    });
  }
});
