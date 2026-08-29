import { NotificationRecord } from "@/lib/types";

export async function getNotifications(): Promise<NotificationRecord[]> {
  try {
    const res = await fetch("/api/notifications", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.notifications || [];
  } catch (error) {
    console.error("API getNotifications error:", error);
    return [];
  }
}

export async function markNotificationAsRead(id: string): Promise<boolean> {
  try {
    const res = await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export const markNotificationRead = markNotificationAsRead;

export async function markAllNotificationsRead(): Promise<boolean> {
  try {
    const res = await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function deleteNotification(id: string): Promise<boolean> {
  try {
    await markNotificationAsRead(id);
    return true;
  } catch (e) {
    return false;
  }
}

export async function clearAllNotifications(): Promise<boolean> {
  return await markAllNotificationsRead();
}

export async function createNotification(notif: Partial<NotificationRecord>): Promise<NotificationRecord> {
  const res = await fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(notif)
  });
  if (!res.ok) throw new Error("Failed to create notification");
  const data = await res.json();
  return data.notification;
}
