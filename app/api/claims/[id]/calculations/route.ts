import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { getScopedCalculations, getScopedClaimById } from "@/lib/db/scoped";
import { getClaimById } from "@/lib/db/queries";
import { calculateClaimLaytime } from "@/lib/calculations/laytime";

import { normalizeRole } from "@/app/access/roles";

export const GET = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor", "Finance", "Reviewer"],
  handler: async ({ user, params }) => {
    const isClient = Boolean(user.clientId || user.assignedClientId);
    if (user.role === "Client" || isClient) {
      return NextResponse.json(
        { error: "Forbidden: Client role may not access laytime calculations" },
        { status: 403 }
      );
    }

    const claim = getScopedClaimById(user, params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const calc = getScopedCalculations(user, params.id);
    return NextResponse.json({ calculations: calc });
  }
});

export const POST = withApi({
  roles: ["Supervisor", "Claim Processor", "Processor"],
  handler: async ({ user, params }) => {
    const claim = getScopedClaimById(user, params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const fullClaim = getClaimById(params.id);
    if (!fullClaim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const result = calculateClaimLaytime(fullClaim);
    return NextResponse.json({ success: true, calculation: result });
  }
});
