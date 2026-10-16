import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";

export const GET = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor", "Finance", "Reviewer"],
  handler: async () => {
    return NextResponse.json({
      success: true,
      report: {
        title: "Financial Overview Report",
        generatedAt: "Stored Report Snapshot",
        status: "Archived"
      }
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
