export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { getScopedCalculations, getScopedClaimById } from "@/lib/db/scoped";
import { getClaimById, persistCalculationForClaim, getBusinessRule } from "@/lib/db/queries";
import { calculateClaimLaytime } from "@/lib/calculations/laytime";
import { listHolidays } from "@/lib/calculations/holidays";

export const GET = withApi({
  permission: "calculator:view",
  handler: async ({ user, params }) => {
    const claim = getScopedClaimById(user, params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const calc = getScopedCalculations(user, params.id);
    const fullClaim = getClaimById(params.id);
    const holidays = listHolidays();
    const assumptions = getBusinessRule("laytime_defaults") || undefined;
    const calculation = fullClaim ? calculateClaimLaytime(fullClaim, assumptions, holidays) : null;
    return NextResponse.json({ calculations: calc, calculation });
  }
});

export const POST = withApi({
  permission: "calculator:use",
  checkClaimOwnership: true,
  handler: async ({ user, params }) => {
    const claim = getScopedClaimById(user, params.id);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const fullClaim = getClaimById(params.id);
    if (!fullClaim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const result = persistCalculationForClaim(params.id, user.email || user.name);
    if (result.overlapBlocked) {
      return NextResponse.json(
        {
          error:
            result.overlapErrors?.[0] ||
            "Calculation blocked due to overlapping SoF events on the same berth.",
          overlapBlocked: true,
          overlapErrors: result.overlapErrors || [],
          calculation: result
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true, calculation: result });
  }
});
