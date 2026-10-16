import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";

export const GET = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor", "Finance", "Reviewer", "Client"],
  handler: async ({ user }) => {
    if (user.role === "Client") {
      return NextResponse.json(
        { error: "Forbidden: Client role may not access Statement of Facts" },
        { status: 403 }
      );
    }
    return NextResponse.json({ success: true, message: "Statement of Facts service active" });
  }
});
