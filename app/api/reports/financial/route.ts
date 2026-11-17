export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { getDatabase } from "@/lib/db";

export const GET = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor", "Finance", "Reviewer"],
  handler: async () => {
    const db = getDatabase();
    const claims = db.prepare("SELECT * FROM claims").all() as any[];
    let totalExposure = 0;
    let totalAgreed = 0;
    let totalReceived = 0;
    for (const c of claims) {
      totalExposure += c.claim_filed_amount || 0;
      totalAgreed += c.agreed_amount || 0;
      totalReceived += c.payment_received || 0;
    }
    const summary = {
      totalExposure,
      totalAgreed,
      totalReceived,
      totalClaimsCount: claims.length
    };
    return NextResponse.json({
      success: true,
      report: {
        title: "Executive Financial Exposure & Recovery Report",
        generatedAt: new Date().toISOString(),
        status: "Active"
      },
      summary
    });
  }
});

export const POST = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor", "Finance"],
  handler: async () => {
    return NextResponse.json({
      success: true,
      message: "Financial report computed successfully"
    });
  }
});
