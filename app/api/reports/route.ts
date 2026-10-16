import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";

export const GET = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor", "Finance", "Reviewer"],
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
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor", "Finance"],
  handler: async () => {
    return NextResponse.json({
      success: true,
      message: "Report generated successfully"
    });
  }
});
