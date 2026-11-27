import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { getDashboardAnalytics } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export const GET = withApi({
  permission: "claims:view",
  handler: async ({ user }) => {
    const metrics = getDashboardAnalytics(user.role, user.email);
    return NextResponse.json({ metrics });
  }
});
