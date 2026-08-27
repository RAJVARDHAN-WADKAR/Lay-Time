import { NotificationRecord } from "@/lib/types";
import { getStorageItem, setStorageItem } from "./storage";

const STORAGE_KEY = "demurrage_notifications";
const delay = (ms: number = 50) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getNotifications(): Promise<NotificationRecord[]> {
  await delay();
  return getStorageItem<NotificationRecord[]>(STORAGE_KEY, []);
}

export async function createNotification(
  notif: Omit<NotificationRecord, "id" | "createdAt" | "isRead">
): Promise<NotificationRecord> {
  await delay(50);
  const current = getStorageItem<NotificationRecord[]>(STORAGE_KEY, []);
  const newNotif: NotificationRecord = {
    ...notif,
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString(),
    isRead: false,
  };
  const updated = [newNotif, ...current];
  setStorageItem(STORAGE_KEY, updated);
  return newNotif;
}

export async function markNotificationRead(id: string): Promise<void> {
  await delay(50);
  const current = getStorageItem<NotificationRecord[]>(STORAGE_KEY, []);
  const updated = current.map((n) => (n.id === id ? { ...n, isRead: true } : n));
  setStorageItem(STORAGE_KEY, updated);
}

export async function markAllNotificationsRead(): Promise<void> {
  await delay(50);
  const current = getStorageItem<NotificationRecord[]>(STORAGE_KEY, []);
  const updated = current.map((n) => ({ ...n, isRead: true }));
  setStorageItem(STORAGE_KEY, updated);
}

export async function deleteNotification(id: string): Promise<void> {
  await delay(50);
  const current = getStorageItem<NotificationRecord[]>(STORAGE_KEY, []);
  const updated = current.filter((n) => n.id !== id);
  setStorageItem(STORAGE_KEY, updated);
}

export async function clearAllNotifications(): Promise<void> {
  await delay(50);
  setStorageItem(STORAGE_KEY, []);
}
