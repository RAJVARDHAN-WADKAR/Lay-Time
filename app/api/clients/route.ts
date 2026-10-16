import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { getDatabase } from "@/lib/db";

export const GET = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor", "Finance", "Reviewer"],
  handler: async () => {
    const db = getDatabase();
    const clients = db.prepare("SELECT * FROM clients ORDER BY name ASC").all();
    return NextResponse.json({ clients });
  }
});

export const POST = withApi({
  roles: ["Admin", "Supervisor"],
  handler: async ({ body }) => {
    return NextResponse.json({ success: true, message: "Client created" }, { status: 201 });
  }
});

export const PUT = withApi({
  roles: ["Admin", "Supervisor"],
  handler: async () => {
    return NextResponse.json({ success: true, message: "Client updated" });
  }
});

export const DELETE = withApi({
  roles: ["Admin"],
  handler: async () => {
    return NextResponse.json({ success: true, message: "Client deleted" });
  }
});
