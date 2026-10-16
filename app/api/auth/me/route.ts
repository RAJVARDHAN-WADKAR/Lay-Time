import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth.error) {
      return auth.error;
    }

    const { user } = auth;

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clientId: user.assignedClientId || user.clientId || undefined,
        clientName: user.clientName,
        status: user.status,
        createdBy: user.createdBy,
        tokenVersion: user.tokenVersion
      }
    });
  } catch (error: any) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json({ error: "Session check error" }, { status: 500 });
  }
}
