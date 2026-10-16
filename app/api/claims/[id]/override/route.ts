import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { getScopedClaimById } from "@/lib/db/scoped";
import { updateClaim } from "@/lib/db/queries";
import { z } from "zod";

const OverrideSchema = z.object({
  overriddenDemurrage: z.number().nonnegative("Overridden amount must be positive"),
  overrideReason: z.string().min(5, "Override justification reason is required")
});

export const POST = withApi({
  roles: ["Supervisor"],
  schema: OverrideSchema,
  handler: async ({ user, params, body }) => {
    if (user.role === "Client") {
      return NextResponse.json(
        { error: "Forbidden: Client role may not override calculations" },
        { status: 403 }
      );
    }

    const claim = getScopedClaimById(user, params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const updated = updateClaim(params.id, {
      isOverridden: true,
      overriddenDemurrage: body.overriddenDemurrage,
      overrideReason: body.overrideReason
    });

    return NextResponse.json({
      success: true,
      claim: updated
    });
  }
});
