export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { getScopedClaimById } from "@/lib/db/scoped";
import { getChasersForClaim, createChaserRecord } from "@/lib/db/queries";

export const GET = withApi({
  permission: "claims:view",
  handler: async ({ user, params }) => {
    const claim = getScopedClaimById(user, params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }
    const chasers = getChasersForClaim(params.id);
    return NextResponse.json({ chasers });
  }
});

export const POST = withApi({
  permission: "claims:edit",
  checkClaimOwnership: true,
  handler: async ({ user, params, body }) => {
    const claim = getScopedClaimById(user, params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const newChaser = createChaserRecord(
      {
        ...body,
        claimId: params.id
      },
      user.name || user.email || "System"
    );

    return NextResponse.json({ success: true, chaser: newChaser });
  }
});
