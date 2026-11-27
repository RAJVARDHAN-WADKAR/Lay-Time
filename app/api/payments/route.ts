export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { getDatabase } from "@/lib/db";

export const GET = withApi({
  permission: "payments:view",
  handler: async () => {
    const db = getDatabase();
    const payments = db
      .prepare("SELECT id, id as claim_id, payment_received, payment_concluded, days_awaiting_payment FROM claims WHERE payment_received > 0")
      .all();
    return NextResponse.json({ payments });
  }
});

export const POST = withApi({
  permission: "payments:manage",
  handler: async () => {
    return NextResponse.json({ success: true, message: "Payment recorded" }, { status: 201 });
  }
});

export const PUT = withApi({
  permission: "payments:manage",
  handler: async () => {
    return NextResponse.json({ success: true, message: "Payment updated" });
  }
});
