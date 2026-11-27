export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { canAccessNegotiations, respondToCounterOffer } from "@/lib/db/negotiations";
import { z } from "zod";

const RespondSchema = z.object({
  messageId: z.string().min(1, "Message ID is required"),
  decision: z.enum(["Accepted", "Rejected"])
});

export const POST = withApi({
  permission: "negotiations:offer",
  checkClaimOwnership: true,
  schema: RespondSchema,
  handler: async ({ user, params, body, req }) => {
    const access = canAccessNegotiations(user, params.id);
    if (!access.allowed) {
      return NextResponse.json({ error: "Claim negotiation room not found" }, { status: 404 });
    }

    if (access.roleType === "client") {
      return NextResponse.json(
        { error: "Forbidden: Client role cannot accept or reject counter-offers." },
        { status: 403 }
      );
    }

    const result = respondToCounterOffer({
      messageId: body.messageId,
      claimId: params.id,
      user,
      decision: body.decision,
      ipAddress: req.headers.get("x-forwarded-for") || undefined
    });

    return NextResponse.json(result);
  }
});
