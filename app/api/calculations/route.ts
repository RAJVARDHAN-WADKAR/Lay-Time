import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { calculateClaimLaytime } from "@/lib/calculations/laytime";

export const GET = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor", "Finance", "Reviewer", "Client"],
  handler: async ({ user }) => {
    if (user.role === "Client") {
      return NextResponse.json(
        { error: "Forbidden: Client role may not access laytime calculations" },
        { status: 403 }
      );
    }
    return NextResponse.json({ success: true, message: "Laytime calculation service active" });
  }
});

export const POST = withApi({
  roles: ["Supervisor", "Claim Processor", "Processor"],
  handler: async ({ user, req }) => {
    const body = await req.json();
    const result = calculateClaimLaytime(body);
    return NextResponse.json({ success: true, calculation: result });
  }
});
