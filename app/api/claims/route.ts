export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { getScopedClaims } from "@/lib/db/scoped";
import { createClaim, createNotificationRecord } from "@/lib/db/queries";
import { logAudit } from "@/lib/db/audit";
import { validateDateChain } from "@/lib/utils/dateRules";
import { z } from "zod";

const CreateClaimSchema = z.object({
  claimName: z.string().min(1, "Claim name is required"),
  accountName: z.string().optional(),
  brokerName: z.string().optional(),
  claimType: z.string().optional(),
  shipName: z.string().optional(),
  cpType: z.string().optional(),
  voyageNumber: z.string().optional(),
  demurrageRatePerDay: z.number().optional(),
  claimFiledAmount: z.number().optional(),
  charterpartyDate: z.string().optional(),
  noticeReceivedDate: z.string().optional(),
  claimReceivedDate: z.string().optional(),
  assignedTo: z.string().optional(),
  clientId: z.string().optional(),
  ports: z.array(z.any()).optional(),
  berths: z.array(z.any()).optional(),
  activities: z.array(z.any()).optional()
}).passthrough();

// GET /api/claims: Scoped Claims Ledger
export const GET = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor", "Finance", "Reviewer", "Client"],
  handler: async ({ user, req }) => {
    const searchParams = req.nextUrl.searchParams;

    const status = searchParams.get("status") || "All";
    const claimType = searchParams.get("claimType") || "All";
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = (searchParams.get("sortOrder") || "DESC").toUpperCase() as "ASC" | "DESC";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = (page - 1) * limit;

    const result = getScopedClaims(user, {
      status,
      claimType,
      search,
      sortBy,
      sortOrder,
      limit,
      offset
    });

    return NextResponse.json({
      claims: result.claims,
      total: result.total,
      page,
      limit
    });
  }
});

// POST /api/claims: Create a new claim (Admin, Supervisor, Claim Processor)
export const POST = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor", "ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR"],
  permission: "claims:create",
  schema: CreateClaimSchema,
  handler: async ({ user, body }) => {
    const claimData = { ...(body as any) };

    const dateValidation = validateDateChain({
      charterpartyDate: claimData.charterpartyDate,
      instructionReceivedDate: claimData.instructionReceivedDate,
      claimFiledDate: claimData.noticeReceivedDate || claimData.claimReceivedDate,
      agreedDate: claimData.claimAgreedDate,
      paymentReceivedDate: claimData.paymentReceivedDate
    });

    if (!dateValidation.isValid) {
      return NextResponse.json(
        { error: "Date validation error: milestones cannot be in future and must follow chronological order", details: dateValidation.errors },
        { status: 400 }
      );
    }

    const norm = user.role.toUpperCase().replace(/[\s-]+/g, "_");
    if (norm === "CLAIM_PROCESSOR" || norm === "PROCESSOR") {
      claimData.assignedTo = user.name || user.email;
    }

    const newClaim = createClaim(claimData, user.name || user.email);

    logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "claim_create",
      targetType: "claim",
      targetId: newClaim.id,
      details: { claimName: newClaim.claimName, shipName: newClaim.shipName }
    });

    createNotificationRecord({
      title: "New Claim Created",
      message: `Claim ${newClaim.claimName} has been created`,
      type: "claim",
      claimId: newClaim.id,
      claimName: newClaim.claimName
    });

    return NextResponse.json(
      {
        success: true,
        claim: newClaim
      },
      { status: 201 }
    );
  }
});
