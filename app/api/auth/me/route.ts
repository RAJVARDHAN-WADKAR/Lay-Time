import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest, AUTH_COOKIE_NAME } from "@/lib/auth/session";
import { getUserById } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    const session = getCurrentUserFromRequest(request);
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const user = getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    if (user.status === "Inactive") {
      return NextResponse.json({ authenticated: false, error: "Account deactivated" }, { status: 403 });
    }

    return NextResponse.json({
      authenticated: true,
      user
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Session check error" }, { status: 500 });
  }
}
