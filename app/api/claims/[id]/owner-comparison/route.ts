export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { getScopedClaimById } from "@/lib/db/scoped";
import { getOwnerComparisonForClaim, saveOwnerComparisonForClaim } from "@/lib/db/queries";

export const GET = withApi({
  permission: "claims:view",
  handler: async ({ user, params }) => {
    const claim = getScopedClaimById(user, params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }
    const comparison = getOwnerComparisonForClaim(params.id);
    return NextResponse.json({ comparison });
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

    const saved = saveOwnerComparisonForClaim(params.id, body, user.name || user.email || "System");
    return NextResponse.json({ success: true, comparison: saved });
  }
});
