export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { getDatabase } from "@/lib/db";

export const GET = withApi({
  permission: "clients:view",
  handler: async () => {
    const db = getDatabase();
    const clients = db.prepare("SELECT * FROM clients ORDER BY name ASC").all();
    return NextResponse.json({ clients });
  }
});

export const POST = withApi({
  permission: "clients:manage",
  handler: async () => {
    return NextResponse.json({ success: true, message: "Client created" }, { status: 201 });
  }
});

export const PUT = withApi({
  permission: "clients:manage",
  handler: async () => {
    return NextResponse.json({ success: true, message: "Client updated" });
  }
});

export const DELETE = withApi({
  permission: "clients:manage",
  handler: async () => {
    return NextResponse.json({ success: true, message: "Client deleted" });
  }
});
