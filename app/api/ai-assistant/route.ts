import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { queryAiAssistant } from "@/lib/mock/assistant";

export const GET = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor", "Finance"],
  handler: async () => {
    return NextResponse.json({ active: true, model: "Maritime AI v1.0" });
  }
});

export const POST = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor", "Finance"],
  handler: async ({ req }) => {
    const body = await req.json();
    const response = await queryAiAssistant(body.prompt || "", []);
    return NextResponse.json({ success: true, response });
  }
});
