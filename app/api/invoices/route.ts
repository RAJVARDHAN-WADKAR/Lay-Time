import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { getDatabase } from "@/lib/db";

export const GET = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor", "Finance", "Reviewer", "Client"],
  handler: async () => {
    return NextResponse.json({
      invoices: [
        { id: "inv-001", claimId: "CLM-2024-001", amount: 22000, status: "Issued", currency: "USD" }
      ]
    });
  }
});

export const POST = withApi({
  roles: ["Finance"],
  handler: async () => {
    return NextResponse.json({ success: true, message: "Invoice created" }, { status: 201 });
  }
});

export const PUT = withApi({
  roles: ["Finance"],
  handler: async () => {
    return NextResponse.json({ success: true, message: "Invoice updated" });
  }
});
