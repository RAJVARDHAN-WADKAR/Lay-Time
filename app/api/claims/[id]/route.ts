import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { getScopedClaimById } from "@/lib/db/scoped";
import { getClaimById, updateClaim, deleteClaim } from "@/lib/db/queries";
import { canEditClaim } from "@/lib/auth/session";
import { normalizeRole } from "@/app/access/roles";
import { z } from "zod";

const UpdateClaimSchema = z.object({
  claimNotes: z.string().optional(),
  agreedAmount: z.number().optional(),
  receivedClaimAmount: z.number().optional(),
  claimStatus: z.string().optional(),
  assignedTo: z.string().optional(),
  paymentReceived: z.number().optional(),
  paymentConcluded: z.boolean().optional(),
  isOverridden: z.boolean().optional(),
  overriddenDemurrage: z.number().optional(),
  overrideReason: z.string().optional(),
  claimClosed: z.boolean().optional(),
  contentions: z.string().optional()
}).passthrough();

// GET /api/claims/[id]: Scoped claim detail (Client receives restricted DTO, outside scope -> 404)
export const GET = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor", "Finance", "Reviewer", "Client"],
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
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor"],
  schema: UpdateClaimSchema,
  handler: async ({ user, params, body }) => {
    const userRoleNorm = normalizeRole(user.role);
    if (userRoleNorm === "REVIEWER_CLIENT" || user.role === "Reviewer" || user.role === "Client") {
      return NextResponse.json(
        { error: "Forbidden: Reviewers and Clients have read-only access." },
        { status: 403 }
      );
    }

    // Check if claim exists in database
    const existing = getClaimById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Check row-level isolation scope for Claim Processor
    const scopedClaim = getScopedClaimById(user, params.id);
    if (!scopedClaim) {
      return NextResponse.json(
        { error: "Forbidden: You are only permitted to edit claims assigned to your account." },
        { status: 403 }
      );
    }

    // Role-specific field authorization guards:
    // 1. Assign / reassign claim: Supervisor or Admin ONLY
    if (
      body.assignedTo &&
      body.assignedTo.trim().toLowerCase() !== existing.assignedTo.trim().toLowerCase()
    ) {
      if (userRoleNorm !== "SUPERVISOR" && userRoleNorm !== "ADMIN") {
        return NextResponse.json(
          { error: "Forbidden: Only Supervisor or Admin can assign or reassign claims." },
          { status: 403 }
        );
      }
    }

    // 2. Review / settle claim: Supervisor ONLY
    if (
      (body.claimStatus && (body.claimStatus === "Settled" || body.claimStatus === "Review")) ||
      body.claimClosed === true ||
      (body.agreedAmount !== undefined &&
        body.agreedAmount !== existing.agreedAmount &&
        body.agreedAmount > 0)
    ) {
      if (userRoleNorm !== "SUPERVISOR") {
        return NextResponse.json(
          { error: "Forbidden: Only Supervisor can review, approve settlement, or close claims." },
          { status: 403 }
        );
      }
    }

    // 3. Payments edit: Supervisor, Finance, or Claim Processor on own claim
    if (
      (body.paymentReceived !== undefined && body.paymentReceived !== existing.paymentReceived) ||
      (body.paymentConcluded !== undefined &&
        body.paymentConcluded !== Boolean(existing.paymentConcluded))
    ) {
      if (userRoleNorm !== "SUPERVISOR" && userRoleNorm !== "CLAIM_PROCESSOR" && user.role !== "Finance") {
        return NextResponse.json(
          { error: "Forbidden: You are not authorized to edit payment records." },
          { status: 403 }
        );
      }
    }

    // 4. Override a calculation: Supervisor ONLY (must provide reason)
    if (body.isOverridden || body.overriddenDemurrage !== undefined) {
      if (userRoleNorm !== "SUPERVISOR") {
        return NextResponse.json(
          { error: "Forbidden: Only Supervisor can apply calculation overrides." },
          { status: 403 }
        );
      }
      if (!body.overrideReason && !existing.overrideReason) {
        return NextResponse.json(
          { error: "Invalid Request: Calculation override requires a justification reason." },
          { status: 400 }
        );
      }
    }

    const updated = updateClaim(params.id, body as any);

    return NextResponse.json({
      success: true,
      claim: updated
    });
  }
});

// DELETE /api/claims/[id]: Delete claim (Supervisor or Admin only)
export const DELETE = withApi({
  roles: ["Admin", "Supervisor"],
  handler: async ({ user, params }) => {
    const userRoleNorm = normalizeRole(user.role);
    if (userRoleNorm !== "SUPERVISOR" && userRoleNorm !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Supervisor can delete claims." },
        { status: 403 }
      );
    }

    const ok = deleteClaim(params.id);
    if (!ok) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Claim deleted successfully" });
  }
});
