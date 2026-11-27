import { NotificationRecord } from "@/lib/types";

export async function getNotifications(): Promise<NotificationRecord[]> {
  const res = await fetch("/api/notifications", {
    method: "GET",
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load notifications (HTTP ${res.status})`);
  }

  const data = await res.json();
  return Array.isArray(data.notifications) ? data.notifications : [];
}

export async function markAllNotificationsRead(): Promise<boolean> {
  const res = await fetch("/api/notifications", {
    method: "PUT",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markAllRead: true })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to mark all notifications read");
  }
  return true;
}

export async function markNotificationRead(id: string): Promise<boolean> {
  const res = await fetch("/api/notifications", {
    method: "PUT",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to mark notification read");
  }
  return true;
}

export async function deleteNotification(id: string): Promise<boolean> {
  const res = await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    cache: "no-store"
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete notification");
  }
  return true;
}

export async function clearAllNotifications(): Promise<boolean> {
  const res = await fetch("/api/notifications?clearAll=true", {
    method: "DELETE",
    cache: "no-store"
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to clear notifications");
  }
  return true;
}

export async function createNotification(notif: Partial<NotificationRecord>): Promise<NotificationRecord> {
  const res = await fetch("/api/notifications", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(notif)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Failed to create notification");
  }
  return data.notification;
}
