export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { confirmProposedSettlement } from "@/lib/db/negotiations";

export const POST = withApi({
  permission: "negotiations:approve",
  handler: async ({ user, params, req }) => {
    const result = confirmProposedSettlement({
      claimId: params.id,
      user,
      ipAddress: req.headers.get("x-forwarded-for") || undefined
    });

    return NextResponse.json(result);
  }
});
