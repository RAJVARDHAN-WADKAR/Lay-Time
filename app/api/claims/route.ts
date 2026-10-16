import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { getScopedClaims } from "@/lib/db/scoped";
import { createClaim } from "@/lib/db/queries";
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

// POST /api/claims: Create a new claim (Supervisor & Processor only)
export const POST = withApi({
  roles: ["Supervisor", "Claim Processor", "Processor"],
  schema: CreateClaimSchema,
  handler: async ({ user, body }) => {
    const newClaim = createClaim(body as any, user.name || user.email);

    return NextResponse.json(
      {
        success: true,
        claim: newClaim
      },
      { status: 201 }
    );
  }
});
