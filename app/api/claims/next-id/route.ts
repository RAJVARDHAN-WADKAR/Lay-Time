export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { generateNextClaimId } from "@/lib/utils/claimId";
import { getDatabase } from "@/lib/db";

// GET /api/claims/next-id: Preview the next sequential claim ID based on Instruction Received date
export const GET = withApi({
  permission: "claims:create",
  handler: async ({ req }) => {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || searchParams.get("instructionReceivedDate");

    const db = getDatabase();
    const nextId = generateNextClaimId(db, date);

    return NextResponse.json({
      success: true,
      nextId,
      dateParam: date || null
    });
  }
});
