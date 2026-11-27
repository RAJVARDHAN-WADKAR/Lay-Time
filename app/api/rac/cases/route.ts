export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { normalizeRole } from "@/lib/auth/accessMatrix";
import { getRacCases, createRacCase, createNotificationRecord } from "@/lib/db/queries";
import { logAudit } from "@/lib/db/audit";
import { isFutureDate } from "@/lib/utils/dateRules";

export const GET = withApi({
  permission: "rac:view",
  handler: async ({ user, req }) => {
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status") || "All";
    const racType = searchParams.get("racType") || "All";
    const client = searchParams.get("client") || "All";
    const claimId = searchParams.get("claimId") || undefined;
    const search = searchParams.get("search") || "";

    const cases = getRacCases({
      role: user.role,
      userEmail: user.email,
      userName: user.name,
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
  }
});

export const POST = withApi({
  permission: "rac:create",
  handler: async ({ user, body }) => {
    const racData = { ...(body || {}) };
    if (racData.relevantDate && isFutureDate(racData.relevantDate)) {
      return NextResponse.json(
        { error: "Date validation error: RAC relevant operational date cannot be in the future." },
        { status: 400 }
      );
    }
    const normRole = normalizeRole(user.role);
    if (normRole === "CLAIM_PROCESSOR") {
      racData.assignedTo = user.name || user.email;
    }

    const newCase = createRacCase(racData, user.name || user.email || "System");

    logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: normRole,
      action: "rac_create",
      targetType: "rac_case",
      targetId: newCase.id,
      details: racData
    });

    createNotificationRecord({
      title: "New RAC Case Created",
      message: `RAC Case ${newCase.racReference} has been created`,
      type: "rac",
      racCaseId: newCase.id,
      racReference: newCase.racReference
    });

    return NextResponse.json(
      {
        success: true,
        case: newCase
      },
      { status: 201 }
    );
  }
});
