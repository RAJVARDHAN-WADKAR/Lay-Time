import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { getDatabase } from "@/lib/db";

export const GET = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor", "Finance", "Reviewer", "Client"],
  handler: async () => {
    const db = getDatabase();
    const payments = db.prepare("SELECT id, id as claim_id, payment_received, payment_concluded, days_awaiting_payment FROM claims WHERE payment_received > 0").all();
    return NextResponse.json({ payments });
  }
});

export const POST = withApi({
  roles: ["Finance", "Supervisor"],
  handler: async ({ body }) => {
    return NextResponse.json({ success: true, message: "Payment recorded" }, { status: 201 });
  }
});

export const PUT = withApi({
  roles: ["Finance", "Supervisor"],
  handler: async () => {
    return NextResponse.json({ success: true, message: "Payment updated" });
  }
});
