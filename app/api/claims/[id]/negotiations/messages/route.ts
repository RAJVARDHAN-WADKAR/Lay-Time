import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import {
  canAccessNegotiations,
  getOrCreateThread,
  checkRateLimit,
  postNegotiationMessage
} from "@/lib/db/negotiations";
import { z } from "zod";

const MessageSchema = z
  .object({
    messageType: z.enum(["text", "counter_offer"]),
    content: z.string().min(1, "Message content is required").max(2000, "Message cannot exceed 2000 characters"),
    counterOfferAmount: z.number().positive("Counter-offer amount must be a positive number").optional(),
    currency: z.string().min(1).max(5).default("USD").optional()
  })
  .refine(
    (data) => {
      if (data.messageType === "counter_offer") {
        return typeof data.counterOfferAmount === "number" && data.counterOfferAmount > 0;
      }
      return true;
    },
    {
      message: "Positive counter-offer amount is required for counter_offer message type",
      path: ["counterOfferAmount"]
    }
  );

// POST /api/claims/[id]/negotiations/messages: Append-only message posting
export const POST = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor", "Client"],
  schema: MessageSchema,
  handler: async ({ user, params, body, req }) => {
    const access = canAccessNegotiations(user, params.id);
    if (!access.allowed) {
      return NextResponse.json({ error: "Claim negotiation room not found" }, { status: 404 });
    }

    // Supervisor and Admin get read-only oversight
    if (access.roleType === "oversight") {
      return NextResponse.json(
        { error: "Forbidden: Supervisors and Administrators have read-only oversight in negotiations." },
        { status: 403 }
      );
    }

    // Rate-limit posting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment before sending another message." },
        { status: 429 }
      );
    }

    const thread = getOrCreateThread(params.id);
    const newMsg = postNegotiationMessage({
      threadId: thread.id,
      claimId: params.id,
      sender: user,
      messageType: body.messageType,
      content: body.content,
      counterOfferAmount: body.counterOfferAmount,
      currency: body.currency,
      ipAddress: req.headers.get("x-forwarded-for") || undefined
    });

    return NextResponse.json({ success: true, message: newMsg }, { status: 201 });
  }
});

// Explicitly reject PUT and DELETE to ensure messages are append-only
export async function PUT() {
  return NextResponse.json(
    { error: "Method Not Allowed: Negotiation messages are append-only and cannot be edited." },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method Not Allowed: Negotiation messages are append-only and cannot be deleted." },
    { status: 405 }
  );
}
