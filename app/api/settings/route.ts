import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { getBusinessRule, saveBusinessRule } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    const assumptions = getBusinessRule("laytime_defaults") || {
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

    return NextResponse.json({ settings: assumptions });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = getCurrentUserFromRequest(request);
    if (!session || session.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Only Admin can update settings." }, { status: 403 });
    }

    const body = await request.json();
    saveBusinessRule("laytime_defaults", body, session.name || session.email);

    return NextResponse.json({ success: true, settings: body });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
