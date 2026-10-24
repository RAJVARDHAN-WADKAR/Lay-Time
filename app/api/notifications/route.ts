import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { normalizeRole } from "@/app/access/roles";
import { getDatabase } from "@/lib/db";
import { markNotificationRead, createNotificationRecord } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireUser(request);
    if (authResult.error) {
      return authResult.error;
    }

    const { user } = authResult;
    const db = getDatabase();
    const isClient =
      user.role === "Client" ||
      (user.role === "REVIEWER_CLIENT" &&
        Boolean(user.assignedClientId || user.clientId || user.client_id));

    let notifications: any[] = [];

    if (isClient) {
      const clientId = user.assignedClientId || user.clientId || user.client_id;
      if (!clientId) {
        return NextResponse.json({ notifications: [], unreadCount: 0 });
      }

      // External client strictly sees notifications attached to their own claims,
      // or broadcast notifications that have NO claim_id attached.
      const rows = db
        .prepare(`
          SELECT n.* FROM notifications n
          LEFT JOIN claims c ON n.claim_id = c.id
          WHERE (n.claim_id IS NOT NULL AND c.client_id = ?)
             OR (n.claim_id IS NULL)
          ORDER BY n.created_at DESC LIMIT 50
        `)
        .all(clientId) as any[];

      notifications = rows.map((r) => ({
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
      }));
    } else {
      const normRole = normalizeRole(user.role);
      const isProcessor = normRole === "CLAIM_PROCESSOR";

      if (isProcessor) {
        // Claim processor sees notifications on assigned claims or general without claim
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

        notifications = rows.map((r) => ({
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
        }));
      } else {
        // ADMIN, SUPERVISOR, internal REVIEWER
        const rows = db
          .prepare("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50")
          .all() as any[];

        notifications = rows.map((r) => ({
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
        }));
      }
    }

    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireUser(request);
    if (authResult.error) {
      return authResult.error;
    }

    const { user } = authResult;
    const normRole = normalizeRole(user.role);

    // Reviewer is strictly read-only and cannot mutate notifications
    if (normRole === "REVIEWER_CLIENT" && !user.assignedClientId && !user.clientId) {
      return NextResponse.json(
        { error: "Forbidden: Reviewer role is read-only" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (id) {
      markNotificationRead(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Notification id required" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireUser(request);
    if (authResult.error) {
      return authResult.error;
    }

    const { user } = authResult;
    const normRole = normalizeRole(user.role);

    // Strictly restrict POST to internal operational roles
    if (normRole !== "ADMIN" && normRole !== "SUPERVISOR" && normRole !== "CLAIM_PROCESSOR") {
      return NextResponse.json(
        { error: "Forbidden: Only internal operational roles may create notifications" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const notif = createNotificationRecord(body);
    return NextResponse.json({ success: true, notification: notif }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}
