import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { getRacCases } from "@/lib/db/queries";

export const GET = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Reviewer"],
  handler: async ({ user }) => {
    const isClient = Boolean(user.assignedClientId || user.clientId);
    if (isClient || user.role === "Client") {
      return NextResponse.json({ error: "Forbidden: Clients cannot access RAC" }, { status: 403 });
    }
    const cases = getRacCases({ role: user.role, userEmail: user.email, userName: user.name });
    return NextResponse.json({ cases, total: cases.length });
  }
});
