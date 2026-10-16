import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { canAccessNegotiations, respondToCounterOffer } from "@/lib/db/negotiations";
import { z } from "zod";

const RespondSchema = z.object({
  messageId: z.string().min(1, "Message ID is required"),
  decision: z.enum(["Accepted", "Rejected"])
});

// POST /api/claims/[id]/negotiations/respond: Processor accepts or rejects counter-offer
export const POST = withApi({
  roles: ["Claim Processor", "Processor", "Supervisor"],
  schema: RespondSchema,
  handler: async ({ user, params, body, req }) => {
    const access = canAccessNegotiations(user, params.id);
    if (!access.allowed) {
      return NextResponse.json({ error: "Claim negotiation room not found" }, { status: 404 });
    }

    if (access.roleType === "client") {
      return NextResponse.json(
        { error: "Forbidden: Only Claim Processors or Supervisors can respond to counter-offers." },
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
