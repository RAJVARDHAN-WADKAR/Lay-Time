export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";

export const GET = withApi({
  permission: "sof:view",
  handler: async () => {
    return NextResponse.json({ success: true, message: "Statement of Facts service active" });
  }
});
