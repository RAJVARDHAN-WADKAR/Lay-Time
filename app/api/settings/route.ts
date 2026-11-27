export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { normalizeRole } from "@/lib/auth/accessMatrix";
import { getBusinessRuleMeta, saveBusinessRule } from "@/lib/db/queries";
import { logAudit } from "@/lib/db/audit";

export const GET = withApi({
  permission: "settings:manage",
  handler: async () => {
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
  }
});

export const PUT = withApi({
  permission: "settings:manage",
  handler: async ({ user, body }) => {
    const clientUpdatedAt = body?.updatedAt || body?.updated_at;
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

    saveBusinessRule("laytime_defaults", body, user.name || user.email || "System");

    logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: normalizeRole(user.role),
      action: "settings_update",
      targetType: "settings",
      targetId: "laytime_defaults",
      details: body
    });

    const updatedMeta = getBusinessRuleMeta("laytime_defaults");
    return NextResponse.json({ success: true, settings: body, updatedAt: updatedMeta?.updatedAt });
  }
});

export const POST = PUT;
