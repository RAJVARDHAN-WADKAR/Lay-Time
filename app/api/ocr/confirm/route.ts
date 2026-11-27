export const dynamic = "force-dynamic";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi, isClaimAssignedToUser } from "@/lib/api/withApi";
import { normalizeRole } from "@/lib/auth/accessMatrix";
import { getClaimById, getDocumentById } from "@/lib/db/queries";
import { confirmOcrDraftEvents } from "@/lib/ocr/draftStore";
import { logAudit } from "@/lib/db/audit";

const ConfirmEventSchema = z.object({
  id: z.string().min(1).max(120),
  activityName: z.string().min(1).max(200),
  startTime: z.string().min(1),
  stopTime: z.string().min(1),
  portId: z.string().optional(),
  berthId: z.string().optional(),
  percentageCounted: z.number().min(0).max(100).optional(),
  prorata: z.number().min(0).max(100).optional(),
  deductionCategory: z.string().optional(),
  remarks: z.string().max(1000).optional(),
  isCorrected: z.boolean().optional(),
  ocrConfidence: z.number().optional(),
  originalOcrValues: z.any().optional()
}).passthrough();

const ConfirmDraftSchema = z.object({
  documentId: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[a-zA-Z0-9._-]+$/, "Invalid documentId"),
  portId: z.string().trim().optional(),
  berthId: z.string().trim().optional(),
  events: z.array(ConfirmEventSchema).min(1, "At least one SoF event must be confirmed")
});

export const POST = withApi({
  permission: "ocr:run",
  schema: ConfirmDraftSchema,
  handler: async ({ user, body }) => {
    const correlationId = crypto.randomUUID().slice(0, 12);
    const { documentId, portId, berthId, events } = body as z.infer<typeof ConfirmDraftSchema>;

    const doc = getDocumentById(documentId);
    if (!doc || !doc.claimId) {
      return NextResponse.json({ error: "Document not found.", correlationId }, { status: 404 });
    }

    const claim = getClaimById(doc.claimId);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found.", correlationId }, { status: 404 });
    }

    const isClient = Boolean(user.assignedClientId || user.clientId);
    const normRole = normalizeRole(user.role, isClient);
    if (normRole === "CLAIM_PROCESSOR" && !isClaimAssignedToUser(claim, user)) {
      return NextResponse.json({ error: "Forbidden", correlationId }, { status: 403 });
    }

    try {
      const outcome = confirmOcrDraftEvents({
        documentId,
        events: events as any[],
        portId,
        berthId,
        actorId: user.id,
        actorEmail: user.email,
        actorRole: normRole,
        actorName: user.name || user.email || "System"
      });

      logAudit({
        actorId: user.id,
        actorEmail: user.email,
        actorRole: normRole,
        action: "ocr_draft_confirmed",
        targetType: "claim",
        targetId: claim.id,
        details: {
          correlationId,
          documentId,
          savedCount: outcome.savedCount,
          correctionsCount: outcome.correctionsCount
        }
      });

      const updatedClaim = getClaimById(claim.id);
      return NextResponse.json({
        success: true,
        correlationId,
        ...outcome,
        claim: updatedClaim
      });
    } catch (err: any) {
      console.error(`[OCR CONFIRM ${correlationId}]`, err);
      return NextResponse.json(
        { error: err?.message || "Could not confirm OCR events.", correlationId },
        { status: err?.statusCode || 400 }
      );
    }
  }
});
