export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { calculateClaimLaytime } from "@/lib/calculations/laytime";

export const GET = withApi({
  permission: "calculator:view",
  handler: async () => {
    return NextResponse.json({ success: true, message: "Laytime calculation service active" });
  }
});

export const POST = withApi({
  permission: "calculator:use",
  handler: async ({ body }) => {
    const result = calculateClaimLaytime(body);
    return NextResponse.json({ success: true, calculation: result });
  }
});
