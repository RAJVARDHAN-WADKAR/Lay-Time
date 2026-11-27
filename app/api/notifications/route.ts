export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { normalizeRole } from "@/lib/auth/accessMatrix";
import { getDatabase } from "@/lib/db";
import { markNotificationRead, createNotificationRecord } from "@/lib/db/queries";

export const GET = withApi({
  permission: "claims:view",
  handler: async ({ user }) => {
    const db = getDatabase();
    const isClient = Boolean(user.assignedClientId || user.clientId || user.client_id);
    const normRole = normalizeRole(user.role, isClient);

    let notifications: any[] = [];

    if (normRole === "CLIENT") {
      const clientId = user.assignedClientId || user.clientId || user.client_id;
      if (!clientId) {
        return NextResponse.json({ notifications: [], unreadCount: 0 });
      }

      const rows = db
        .prepare(`
          SELECT n.* FROM notifications n
          LEFT JOIN claims c ON n.claim_id = c.id
          WHERE (n.claim_id IS NOT NULL AND c.client_id = ?)
             OR (n.claim_id IS NULL)
          ORDER BY n.created_at DESC LIMIT 50
        `)
        .all(clientId) as any[];

      notifications = rows.map(mapNotificationRow);
    } else if (normRole === "CLAIM_PROCESSOR") {
      const rows = db
        .prepare(`
          SELECT n.* FROM notifications n
          LEFT JOIN claims c ON n.claim_id = c.id
          WHERE (n.claim_id IS NOT NULL AND (
            c.assigned_to = ? OR LOWER(c.assigned_to) = LOWER(?) OR LOWER(c.assigned_to) = LOWER(?)
          )) OR (n.claim_id IS NULL)
          ORDER BY n.created_at DESC LIMIT 50
        `)
        .all(user.id, user.name, user.email) as any[];

      notifications = rows.map(mapNotificationRow);
    } else {
      const rows = db
        .prepare("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50")
        .all() as any[];

      notifications = rows.map(mapNotificationRow);
    }

    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length
    });
  }
});

export const PUT = withApi({
  permission: "claims:edit",
  handler: async ({ body }) => {
    if (body?.markAllRead) {
      const db = getDatabase();
      db.prepare("UPDATE notifications SET is_read = 1").run();
      return NextResponse.json({ success: true });
    }

    const id = body?.id;
    if (id) {
      markNotificationRead(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Notification id required" }, { status: 400 });
  }
});

export const POST = withApi({
  permission: "claims:edit",
  handler: async ({ body }) => {
    const notif = createNotificationRecord(body);
    return NextResponse.json({ success: true, notification: notif }, { status: 201 });
  }
});

export const DELETE = withApi({
  permission: "claims:edit",
  handler: async ({ req }) => {
    const db = getDatabase();
    const clearAll = req.nextUrl.searchParams.get("clearAll") === "true";
    const id = req.nextUrl.searchParams.get("id");
    if (clearAll) {
      db.prepare("DELETE FROM notifications").run();
      return NextResponse.json({ success: true });
    }
    if (id) {
      db.prepare("DELETE FROM notifications WHERE id = ?").run(id);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Notification id or clearAll required" }, { status: 400 });
  }
});

function mapNotificationRow(r: any) {
  return {
    id: r.id,
    title: r.title,
    message: r.message,
    type: r.type,
    claimId: r.claim_id,
    claimName: r.claim_name,
    racCaseId: r.rac_case_id,
    racReference: r.rac_reference,
    isRead: Boolean(r.is_read),
    createdAt: r.created_at
  };
}
