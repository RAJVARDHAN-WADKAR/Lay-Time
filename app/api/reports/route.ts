export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";

export const GET = withApi({
  permission: "reports:view",
  handler: async () => {
    return NextResponse.json({
      success: true,
      reports: [
        { id: "rep-001", name: "Demurrage Settlement Dossier", type: "Settlement", date: "2024-07-15" },
        { id: "rep-002", name: "Monthly Vessel Turnaround Analysis", type: "Operations", date: "2024-07-01" }
      ]
    });
  }
});

export const POST = withApi({
  permission: "reports:export",
  handler: async () => {
    return NextResponse.json({
      success: true,
      message: "Report generated successfully"
    });
  }
});
