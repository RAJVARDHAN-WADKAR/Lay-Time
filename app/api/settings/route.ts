export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { getBusinessRule, getBusinessRuleMeta, saveBusinessRule } from "@/lib/db/queries";
import { logAudit } from "@/lib/db/audit";

export async function GET(request: NextRequest) {
  try {
    const session = getCurrentUserFromRequest(request);
    if (!session || session.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Settings are restricted to Administrator." }, { status: 403 });
    }

    const meta = getBusinessRuleMeta("laytime_defaults");
    const assumptions = meta?.value || {
      laytimeRule: "OOD_AOD",
      weekendRule: "SHEX",
      noticeGracePeriodHours: 6,
      currency: "USD",
      roundingPrecisionMinutes: 1,
      ocrConfidenceThreshold: 0.8,
      applyWeatherWorkingDay24CH: true,
      defaultDemurrageRate: 25000,
      defaultDespatchRate: 12500,
      workingHours: "24 Hours SHINC",
      companyName: "Maritime Global Energy Trading SA",
      companyAddress: "12 Marina Boulevard, Marina Bay Financial Centre, Singapore",
      companyContact: "claims@maritime-trading.com",
      companyPhone: "+65 6828 9000"
    };

    return NextResponse.json({ settings: assumptions, updatedAt: meta?.updatedAt });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = getCurrentUserFromRequest(request);
    const { normalizeRole } = await import("@/app/access/roles");
    if (!session || normalizeRole(session.role) !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only Admin can update settings." }, { status: 403 });
    }

    const body = await request.json();

    // Optimistic concurrency check (Defect 8)
    const clientUpdatedAt = body.updatedAt || body.updated_at;
    const meta = getBusinessRuleMeta("laytime_defaults");
    if (meta?.updatedAt && clientUpdatedAt) {
      if (new Date(clientUpdatedAt).getTime() !== new Date(meta.updatedAt).getTime()) {
        return NextResponse.json(
          {
            error: "Conflict: Settings have been modified by someone else. Please reload.",
            currentRecord: { settings: meta.value, updatedAt: meta.updatedAt }
          },
          { status: 409 }
        );
      }
    }

    saveBusinessRule("laytime_defaults", body, session.name || session.email || "System");

    logAudit({
      actorId: session.userId,
      actorEmail: session.email,
      actorRole: session.role,
      action: "settings_update",
      targetType: "settings",
      targetId: "laytime_defaults",
      details: body
    });

    const updatedMeta = getBusinessRuleMeta("laytime_defaults");
    return NextResponse.json({ success: true, settings: body, updatedAt: updatedMeta?.updatedAt });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return PUT(request);
}
