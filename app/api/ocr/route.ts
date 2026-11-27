export const dynamic = "force-dynamic";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi, isClaimAssignedToUser, isClaimOwnedByClient } from "@/lib/api/withApi";
import { normalizeRole } from "@/lib/auth/accessMatrix";
import {
  getClaimById,
  getDocumentById,
  getDocuments,
  createNotificationRecord
} from "@/lib/db/queries";
import { logAudit } from "@/lib/db/audit";
import { getOcrDraftsForClaim } from "@/lib/ocr/draftStore";
import { runRealOcrForDocument } from "@/lib/ocr/processor";
import { OcrFailureError } from "@/lib/ocr/extractText";
import { checkAndRecordOcrRateLimit } from "@/lib/ocr/rateLimiter";

const RunOcrSchema = z
  .object({
    documentId: z
      .string()
      .trim()
      .min(3, "Invalid documentId")
      .max(120, "documentId too long")
      .regex(/^[a-zA-Z0-9._-]+$/, "Invalid documentId format"),
    portId: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-zA-Z0-9._-]+$/, "Invalid portId format")
      .optional(),
    berthId: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-zA-Z0-9._-]+$/, "Invalid berthId format")
      .optional()
  })
  .strict();

export const GET = withApi({
  permission: "claims:view",
  handler: async ({ user, req }) => {
    const claimId = req.nextUrl.searchParams.get("claimId")?.trim();
    if (!claimId) {
      return NextResponse.json({ error: "claimId query parameter is required." }, { status: 400 });
    }

    const claim = getClaimById(claimId);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    }

    const isClient = Boolean(user.assignedClientId || user.clientId);
    const normRole = normalizeRole(user.role, isClient);
    if (normRole === "CLAIM_PROCESSOR" && !isClaimAssignedToUser(claim, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (normRole === "CLIENT" && !isClaimOwnedByClient(claim, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const documents = getDocuments({ claimId });
    const drafts = getOcrDraftsForClaim(claimId);

    return NextResponse.json({
      claimId,
      documents,
      drafts
    });
  }
});

export const POST = withApi({
  permission: "ocr:run",
  schema: RunOcrSchema,
  handler: async ({ user, body }) => {
    const correlationId = crypto.randomUUID().slice(0, 12);
    const rate = checkAndRecordOcrRateLimit(user.id);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: "Too many OCR requests. Please wait before running OCR again.",
          correlationId,
          retryAfterSeconds: rate.retryAfterSeconds
        },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds) }
        }
      );
    }

    const startedAt = Date.now();
    const { documentId, portId, berthId } = body as z.infer<typeof RunOcrSchema>;

    const doc = getDocumentById(documentId);
    if (!doc) {
      return NextResponse.json({ error: "Document not found.", correlationId }, { status: 404 });
    }

    const claim = doc.claimId ? getClaimById(doc.claimId) : null;
    if (!claim) {
      return NextResponse.json(
        { error: "Document is not linked to a valid claim.", correlationId },
        { status: 400 }
      );
    }

    const isClient = Boolean(user.assignedClientId || user.clientId);
    const normRole = normalizeRole(user.role, isClient);
    if (normRole === "CLAIM_PROCESSOR" && !isClaimAssignedToUser(claim, user)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have access to this claim.", correlationId },
        { status: 403 }
      );
    }

    // Verify portId / berthId belong to this claim if supplied
    if (portId) {
      const port = (claim.ports || []).find((p) => p.id === portId);
      if (!port) {
        return NextResponse.json(
          { error: "Specified port does not belong to this claim.", correlationId },
          { status: 400 }
        );
      }
      if (berthId && !(port.berths || []).some((b) => b.id === berthId)) {
        return NextResponse.json(
          { error: "Specified berth does not belong to the specified port.", correlationId },
          { status: 400 }
        );
      }
    } else if (berthId) {
      const hasBerth = (claim.ports || []).some((p) =>
        (p.berths || []).some((b) => b.id === berthId)
      );
      if (!hasBerth) {
        return NextResponse.json(
          { error: "Specified berth does not belong to this claim.", correlationId },
          { status: 400 }
        );
      }
    }

    try {
      const result = await runRealOcrForDocument({
        documentId,
        portId,
        berthId,
        actor: user.name || user.email || "System"
      });

      const durationMs = Date.now() - startedAt;

      logAudit({
        actorId: user.id,
        actorEmail: user.email,
        actorRole: normRole,
        action: "ocr_run",
        targetType: "document",
        targetId: documentId,
        details: {
          correlationId,
          claimId: claim.id,
          durationMs,
          status: "OCR Completed",
          eventsCount: result.extractedActivities.length,
          overallConfidencePct: result.overallConfidencePct,
          isScanned: result.isScanned
        }
      });

      if (result.flaggedDiscrepancies.length > 0) {
        const safeShipClaim = String(claim.claimName || claim.id).replace(/[<>]/g, "");
        createNotificationRecord({
          title: "OCR Review Ready",
          message: `OCR completed for claim ${String(claim.id).replace(/[<>]/g, "")} (${result.extractedActivities.length} events, ${result.flaggedDiscrepancies.length} discrepancy alert(s)).`,
          type: "document",
          claimId: claim.id,
          claimName: safeShipClaim
        });
      }

      return NextResponse.json({
        success: true,
        correlationId,
        result
      });
    } catch (err: any) {
      const durationMs = Date.now() - startedAt;
      console.error(`[OCR ${correlationId}] Failed for document ${documentId}:`, err);

      logAudit({
        actorId: user.id,
        actorEmail: user.email,
        actorRole: normRole,
        action: "ocr_run",
        targetType: "document",
        targetId: documentId,
        details: {
          correlationId,
          claimId: claim.id,
          durationMs,
          status: "OCR Failed",
          code: err instanceof OcrFailureError ? err.code : "ERROR"
        }
      });

      const safeStatus =
        err instanceof OcrFailureError
          ? err.code === "TIMEOUT"
            ? 504
            : err.code === "PROCESSING_ERROR" && String(err.message).includes("already running")
            ? 409
            : 400
          : 500;

      const safeMessage =
        err instanceof OcrFailureError
          ? err.message
          : "OCR extraction failed safely. Check document integrity and try again.";

      return NextResponse.json(
        {
          error: safeMessage,
          correlationId
        },
        { status: safeStatus }
      );
    }
  }
});
