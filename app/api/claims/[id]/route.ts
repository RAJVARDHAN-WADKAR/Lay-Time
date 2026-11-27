export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { can, normalizeRole } from "@/lib/auth/accessMatrix";
import { getScopedClaimById } from "@/lib/db/scoped";
import { getClaimById, updateClaim, deleteClaim, createNotificationRecord } from "@/lib/db/queries";
import { logAudit } from "@/lib/db/audit";
import { validateDateChain } from "@/lib/utils/dateRules";
import { z } from "zod";

const UpdateClaimSchema = z.object({
  claimNotes: z.string().optional(),
  agreedAmount: z.number().optional(),
  receivedClaimAmount: z.number().optional(),
  claimStatus: z.string().optional(),
  assignedTo: z.string().optional(),
  paymentReceived: z.number().optional(),
  paymentConcluded: z.boolean().optional(),
  invoiceNumber: z.string().optional(),
  isOverridden: z.boolean().optional(),
  overriddenDemurrage: z.number().optional(),
  overrideReason: z.string().optional(),
  dayRule: z.enum(["SHINC", "SHEX", "SHEXUU", "FHINC", "FHEX", "FHEXUU", "SSHEX"]).optional(),
  onceOnDemurrage: z.boolean().optional(),
  noticeGracePeriodHours: z.number().min(0).max(72).optional(),
  applyWeatherWorkingDay24CH: z.boolean().optional(),
  countryCode: z.string().optional(),
  portTimezone: z.string().optional(),
  overlapPolicy: z.enum(["block", "exception_wins"]).optional(),
  overlapOverrideReason: z.string().optional(),
  claimClosed: z.boolean().optional(),
  contentions: z.string().optional(),
  charterpartyDate: z.string().optional(),
  voyageEndDate: z.string().optional(),
  instructionReceivedDate: z.string().optional(),
  noticeReceivedDate: z.string().optional(),
  claimReceivedDate: z.string().optional(),
  claimAgreedDate: z.string().optional(),
  paymentReceivedDate: z.string().optional(),
  updatedAt: z.string().optional()
}).passthrough();

// GET /api/claims/[id]: Scoped claim detail (Client receives restricted DTO, outside scope -> 404)
export const GET = withApi({
  permission: "claims:view",
  handler: async ({ user, params }) => {
    const claim = getScopedClaimById(user, params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    return NextResponse.json({ claim });
  }
});

// PUT /api/claims/[id]: Update claim
export const PUT = withApi({
  permission: "claims:edit",
  checkClaimOwnership: true,
  schema: UpdateClaimSchema,
  handler: async ({ user, params, body }) => {
    const existing = getClaimById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Optimistic concurrency check
    const clientUpdatedAt = body.updatedAt || body.updated_at;
    if (clientUpdatedAt && existing.updatedAt) {
      if (new Date(String(clientUpdatedAt)).getTime() !== new Date(String(existing.updatedAt)).getTime()) {
        return NextResponse.json(
          {
            error: "Conflict: This claim has been modified by someone else. Please reload.",
            currentRecord: existing
          },
          { status: 409 }
        );
      }
    }

    const isClient = Boolean(user.clientId || user.assignedClientId);
    const userRoleNorm = normalizeRole(user.role, isClient);

    // 1. Assign / reassign claim
    if (
      body.assignedTo &&
      body.assignedTo.trim().toLowerCase() !== (existing.assignedTo || "").trim().toLowerCase()
    ) {
      if (!can(userRoleNorm, "claims:assign")) {
        return NextResponse.json(
          { error: "Forbidden: Role is not authorized to assign or reassign claims." },
          { status: 403 }
        );
      }
    }

    // 2. Review / settle claim
    if (
      (body.claimStatus && (body.claimStatus === "Settled" || body.claimStatus === "Review")) ||
      body.claimClosed === true ||
      (body.agreedAmount !== undefined &&
        body.agreedAmount !== existing.agreedAmount &&
        body.agreedAmount > 0)
    ) {
      if (!can(userRoleNorm, "claims:settle")) {
        return NextResponse.json(
          { error: "Forbidden: Role is not authorized to approve settlement or close claims." },
          { status: 403 }
        );
      }
    }

    // 3. Override calculation
    if (body.isOverridden || body.overriddenDemurrage !== undefined) {
      if (!can(userRoleNorm, "calculator:override")) {
        return NextResponse.json(
          { error: "Forbidden: Role is not authorized to apply calculation overrides." },
          { status: 403 }
        );
      }
      if (!body.overrideReason && !existing.overrideReason) {
        return NextResponse.json(
          { error: "Override reason is mandatory when applying a calculation override." },
          { status: 400 }
        );
      }
    }

    // 4. Validate date milestones whenever any date field is explicitly supplied in the update
    const hasDateUpdates =
      body.charterpartyDate !== undefined ||
      body.voyageEndDate !== undefined ||
      body.instructionReceivedDate !== undefined ||
      body.noticeReceivedDate !== undefined ||
      body.claimReceivedDate !== undefined ||
      body.claimFiledDate !== undefined ||
      body.claimAgreedDate !== undefined ||
      body.paymentReceivedDate !== undefined;

    if (hasDateUpdates) {
      const dateValidation = validateDateChain({
        charterpartyDate: body.charterpartyDate ?? existing.charterpartyDate,
        voyageEndDate: body.voyageEndDate ?? existing.voyageEndDate,
        instructionReceivedDate: body.instructionReceivedDate ?? existing.instructionReceivedDate,
        noticeReceivedDate: body.noticeReceivedDate ?? existing.noticeReceivedDate,
        claimReceivedDate: body.claimReceivedDate ?? existing.claimReceivedDate,
        claimFiledDate: (body as any).claimFiledDate ?? body.noticeReceivedDate ?? body.claimReceivedDate ?? existing.claimFiledDate ?? existing.noticeReceivedDate ?? existing.claimReceivedDate,
        agreedDate: body.claimAgreedDate ?? existing.claimAgreedDate,
        paymentReceivedDate: body.paymentReceivedDate ?? (existing as any).paymentReceivedDate
      });
      if (!dateValidation.isValid) {
        return NextResponse.json(
          { error: "Date validation error: milestones cannot be in future and must follow chronological order", details: dateValidation.errors },
          { status: 400 }
        );
      }
    }

    const updated = updateClaim(params.id, body as any);

    logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: userRoleNorm,
      action: "claim_update",
      targetType: "claim",
      targetId: params.id,
      details: body
    });

    if (body.claimStatus && body.claimStatus !== existing.claimStatus) {
      createNotificationRecord({
        title: "Claim Status Updated",
        message: `Claim ${existing.claimName} status changed to ${body.claimStatus}`,
        type: "claim",
        claimId: existing.id,
        claimName: existing.claimName
      });
    }

    return NextResponse.json({
      success: true,
      claim: updated
    });
  }
});

// DELETE /api/claims/[id]: Hard delete claim (Admin only)
export const DELETE = withApi({
  permission: "claims:delete",
  handler: async ({ user, params }) => {
    const ok = deleteClaim(params.id);
    if (!ok) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: normalizeRole(user.role),
      action: "claim_delete",
      targetType: "claim",
      targetId: params.id
    });

    return NextResponse.json({ success: true, message: "Claim deleted successfully" });
  }
});
