"use client";

import React, { useState, useEffect } from "react";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
  createNotification,
} from "@/lib/api";
import { NotificationRecord } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/utils/formatters";
import { useToast } from "@/lib/hooks/useToast";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Trash2,
  Ship,
  FileText,
  Calculator,
  ShieldCheck,
  Plus,
  RotateCcw,
} from "lucide-react";

export default function NotificationsPage() {
  const { success } = useToast();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchNotifs = async () => {
    setIsLoading(true);
    const data = await getNotifications();
    setNotifications(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifs();

    const handleStorage = () => fetchNotifs();
    window.addEventListener("demurrage_storage_change", handleStorage);
    return () => window.removeEventListener("demurrage_storage_change", handleStorage);
  }, []);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    fetchNotifs();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    fetchNotifs();
    success("Notifications Updated", "All notifications marked as read.");
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
    fetchNotifs();
  };

  const handleClearAll = async () => {
    await clearAllNotifications();
    fetchNotifs();
    success("Notifications Cleared", "All notifications have been removed.");
  };

  const handleAddTestNotification = async () => {
    await createNotification({
      title: "Claim Review Required",
      message: "A demurrage statement requires supervisor review and sign-off.",
      type: "claim",
    });
    fetchNotifs();
  };

  const filteredNotifs = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getIcon = (type: NotificationRecord["type"]) => {
    switch (type) {
      case "claim":
        return <Ship className="h-4 w-4 text-blue-600" />;
      case "document":
        return <FileText className="h-4 w-4 text-emerald-600" />;
      case "calculation":
        return <Calculator className="h-4 w-4 text-purple-600" />;
      default:
        return <Bell className="h-4 w-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Notifications &amp; Activity Stream
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            System events, claim assignments, document uploads, and laytime calculation alerts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs h-9 bg-white rounded-xl flex items-center space-x-1.5"
            >
              <CheckCheck className="h-4 w-4 text-blue-600" />
              <span>Mark All Read</span>
            </Button>
          )}

          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="text-xs h-9 text-rose-600 bg-white hover:bg-rose-50 rounded-xl flex items-center space-x-1.5"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear All</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            filter === "all"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            filter === "unread"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {filteredNotifs.length > 0 ? (
            <div className="divide-y divide-slate-100 text-xs">
              {filteredNotifs.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 flex items-start justify-between gap-4 transition ${
                    n.isRead ? "bg-white" : "bg-blue-50/40"
                  }`}
                >
                  <div className="flex items-start space-x-3 text-left">
                    <div className="p-2 rounded-xl bg-slate-100 mt-0.5 shrink-0">
                      {getIcon(n.type)}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-xs">{n.title}</span>
                        {!n.isRead && (
                          <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-slate-600 text-xs">{n.message}</p>
                      <div className="text-[10px] text-slate-400 pt-1">
                        {formatDateTime(n.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {!n.isRead && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="text-blue-600 hover:underline text-[11px] font-semibold"
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 px-4">
              <EmptyState
                icon={Bell}
                title="No notifications"
                description="You're all caught up! Real-time alerts will appear here when claims are assigned, documents are uploaded, or calculations are completed."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
