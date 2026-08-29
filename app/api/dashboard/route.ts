import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { getDashboardAnalytics } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = getCurrentUserFromRequest(request);
    const metrics = getDashboardAnalytics(session?.role, session?.email);
    return NextResponse.json({ metrics });
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Failed to generate dashboard metrics" }, { status: 500 });
  }
}
