import { NotificationRecord } from "@/lib/types";
import {
  getStoreNotifications,
  markStoreAllNotificationsRead,
  markStoreNotificationRead,
  deleteStoreNotification,
  clearStoreAllNotifications,
  createStoreNotification
} from "@/lib/mock/clientStore";

export async function getNotifications(): Promise<NotificationRecord[]> {
  return getStoreNotifications();
}

export async function markAllNotificationsRead(): Promise<boolean> {
  markStoreAllNotificationsRead();
  return true;
}

export async function markNotificationRead(id: string): Promise<boolean> {
  markStoreNotificationRead(id);
  return true;
}

export async function deleteNotification(id: string): Promise<boolean> {
  return deleteStoreNotification(id);
}

export async function clearAllNotifications(): Promise<boolean> {
  return clearStoreAllNotifications();
}

export async function createNotification(notif: Partial<NotificationRecord>): Promise<NotificationRecord> {
  return createStoreNotification(notif);
}

