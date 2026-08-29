"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { getNotifications, markAllNotificationsRead } from "@/lib/api";
import { NotificationRecord } from "@/lib/types";
import {
  Menu,
  X,
  Bell,
  User as UserIcon,
  ChevronDown,
  PlusCircle,
  Search,
  CheckCheck,
  Settings,
  LogOut,
  Shield,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";
import { Sidebar } from "./Sidebar";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onToggleDesktopSidebar?: () => void;
}

export function Header({ onToggleDesktopSidebar }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  const fetchNotifs = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const handleStorage = () => fetchNotifs();
    window.addEventListener("demurrage_storage_change", handleStorage);
    return () => window.removeEventListener("demurrage_storage_change", handleStorage);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    fetchNotifs();
  };

  // Compute current page title from pathname
  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname === "/claims") return "Claim Ledger";
    if (pathname === "/claims/create") return "New Claim";
    if (pathname.startsWith("/claims/")) return "Claim Details";
    if (pathname === "/calculations") return "Laytime Calculator";
    if (pathname === "/documents") return "Documents";
    if (pathname === "/reports") return "Reports";
    if (pathname === "/notifications") return "Notifications";
    if (pathname === "/users") return "User Management";
    if (pathname === "/settings") return "Settings";
    return "Laytime Calculation System";
  };

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6 shadow-2xs">
        {/* Left Side: Hamburger + Current Page Title */}
        <div className="flex items-center space-x-3">
          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden transition"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Desktop Sidebar Toggle */}
          <button
            onClick={onToggleDesktopSidebar}
            className="hidden md:flex p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
            aria-label="Toggle Sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Page Title Header */}
          <div className="flex items-center space-x-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {getPageTitle()}
            </h1>
          </div>
        </div>

        {/* Right Side: Quick Action + Notification Icon + User Profile */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* New Claim CTA */}
          <Link href="/claims/create" className="hidden sm:inline-flex">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-3.5 shadow-xs flex items-center space-x-1.5 rounded-lg">
              <PlusCircle className="h-4 w-4" />
              <span>New Claim</span>
            </Button>
          </Link>

          {/* Notification Icon */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-xl py-3 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-blue-600 hover:underline flex items-center space-x-1 font-medium"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 5).map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 text-xs transition ${
                          n.isRead ? "bg-white" : "bg-blue-50/50"
                        }`}
                      >
                        <div className="font-semibold text-slate-900">{n.title}</div>
                        <div className="text-slate-600 text-[11px] mt-0.5">{n.message}</div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {new Date(n.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 space-y-1">
                      <Bell className="h-6 w-6 mx-auto text-slate-300" />
                      <p className="text-xs font-medium text-slate-500">No notifications</p>
                    </div>
                  )}
                </div>

                <div className="px-4 pt-2 border-t border-slate-100 text-center">
                  <Link
                    href="/notifications"
                    onClick={() => setIsNotifOpen(false)}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    View All Notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Section */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition border border-slate-200/80"
            >
              <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                {(currentUser?.name || "User Name").charAt(0)}
              </div>
              <div className="hidden md:flex flex-col text-left pr-1">
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  {currentUser?.name || "User Name"}
                </span>
                <span className="text-[10px] font-medium text-slate-500 leading-tight">
                  {currentUser?.role || "Claim Processor"}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-2 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-900">{currentUser?.name || "User Name"}</div>
                  <div className="text-[11px] text-slate-500">{currentUser?.email || "user@shipping.com"}</div>
                  <div className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {currentUser?.role || "Claim Processor"}
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    href="/settings"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center space-x-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    <span>Account Settings</span>
                  </Link>
                  <Link
                    href="/users"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center space-x-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    <Shield className="h-4 w-4 text-slate-400" />
                    <span>User Management</span>
                  </Link>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      logout();
                      router.push("/login");
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-semibold"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-50 w-64 bg-[#0B192C] h-full shadow-2xl animate-in slide-in-from-left">
            <Sidebar onCloseMobile={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
