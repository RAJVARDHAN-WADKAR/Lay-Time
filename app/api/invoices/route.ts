export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";

export const GET = withApi({
  permission: "invoices:view",
  handler: async () => {
    return NextResponse.json({
      invoices: [
        { id: "inv-001", claimId: "CLM-2024-001", amount: 22000, status: "Issued", currency: "USD" }
      ]
    });
  }
});

export const POST = withApi({
  permission: "invoices:manage",
  handler: async () => {
    return NextResponse.json({ success: true, message: "Invoice created" }, { status: 201 });
  }
});

export const PUT = withApi({
  permission: "invoices:manage",
  handler: async () => {
    return NextResponse.json({ success: true, message: "Invoice updated" });
  }
});
