import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { confirmProposedSettlement } from "@/lib/db/negotiations";

// POST /api/claims/[id]/negotiations/confirm: Supervisor confirms agreed amount
export const POST = withApi({
  roles: ["Supervisor", "Admin"],
  handler: async ({ user, params, req }) => {
    const { normalizeRole } = await import("@/app/access/roles");
    const userRoleNorm = normalizeRole(user.role);
    if (userRoleNorm !== "SUPERVISOR" && userRoleNorm !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Supervisor can confirm agreed settlement amounts." },
        { status: 403 }
      );
    }

    const result = confirmProposedSettlement({
      claimId: params.id,
      user,
      ipAddress: req.headers.get("x-forwarded-for") || undefined
    });

    return NextResponse.json(result);
  }
});
