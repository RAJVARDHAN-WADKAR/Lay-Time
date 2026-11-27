export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { getRacCases } from "@/lib/db/queries";

export const GET = withApi({
  permission: "rac:view",
  handler: async ({ user }) => {
    const cases = getRacCases({ role: user.role, userEmail: user.email, userName: user.name });
    return NextResponse.json({ cases, total: cases.length });
  }
});
