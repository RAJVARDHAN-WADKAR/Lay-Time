export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { getRacCases, createRacCase, createNotificationRecord } from "@/lib/db/queries";
import { logAudit } from "@/lib/db/audit";

export async function GET(request: NextRequest) {
  try {
    const session = getCurrentUserFromRequest(request);
    const searchParams = request.nextUrl.searchParams;

    const status = searchParams.get("status") || "All";
    const racType = searchParams.get("racType") || "All";
    const client = searchParams.get("client") || "All";
    const claimId = searchParams.get("claimId") || undefined;
    const search = searchParams.get("search") || "";

    const cases = getRacCases({
      role: session?.role,
      userEmail: session?.email,
      userName: session?.name,
      status,
      racType,
      client,
      claimId,
      search
    });

    return NextResponse.json({
      cases,
      total: cases.length
    });
  } catch (error: any) {
    console.error("GET RAC Cases API Error:", error);
    return NextResponse.json({ error: "Failed to fetch RAC cases" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getCurrentUserFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { normalizeRole } = await import("@/app/access/roles");
    const userRoleNorm = normalizeRole(session.role);
    if (
      userRoleNorm === "REVIEWER_CLIENT" ||
      userRoleNorm === "FINANCE" ||
      session.role === "Reviewer" ||
      session.role === "Client" ||
      session.role === "Finance"
    ) {
      return NextResponse.json({ error: "Forbidden: Reviewers, Clients, and Finance cannot create RAC cases." }, { status: 403 });
    }

    const body = await request.json();
    const newCase = createRacCase(body, session.name || session.email || "System");

    logAudit({
      actorId: session.userId,
      actorEmail: session.email,
      actorRole: session.role,
      action: "rac_create",
      targetType: "rac_case",
      targetId: newCase.id,
      details: body
    });

    createNotificationRecord({
      title: "New RAC Case Created",
      message: `RAC Case ${newCase.racReference} has been created`,
      type: "rac",
      racCaseId: newCase.id,
      racReference: newCase.racReference
    });

    return NextResponse.json({
      success: true,
      case: newCase
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST RAC Case API Error:", error);
    return NextResponse.json({ error: "Failed to create RAC case" }, { status: 500 });
  }
}
