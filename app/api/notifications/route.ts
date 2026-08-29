import { NextRequest, NextResponse } from "next/server";
import { getNotifications, markNotificationRead, createNotificationRecord } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    const notifications = getNotifications();
    return NextResponse.json({ notifications, unreadCount: notifications.filter((n) => !n.isRead).length });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (id) {
      markNotificationRead(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Notification id required" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const notif = createNotificationRecord(body);
    return NextResponse.json({ success: true, notification: notif }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}
