"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { getNotifications } from "@/lib/api";
import {
  LayoutDashboard,
  FileSpreadsheet,
  PlusCircle,
  Calculator,
  FileText,
  FileBarChart,
  Bell,
  Users,
  Settings,
  LogOut,
  Anchor,
  Ship,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface SidebarProps {
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
}

export function Sidebar({ onCloseMobile, isCollapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, currentUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = async () => {
    try {
      const notifs = await getNotifications();
      setUnreadCount(notifs.filter((n) => !n.isRead).length);
    } catch {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchUnread();
    const handleStorage = () => fetchUnread();
    window.addEventListener("demurrage_storage_change", handleStorage);
    return () => window.removeEventListener("demurrage_storage_change", handleStorage);
  }, []);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/claims", label: "Claim Ledger", icon: FileSpreadsheet },
    { href: "/claims/create", label: "New Claim", icon: PlusCircle },
    { href: "/calculations", label: "Laytime Calculator", icon: Calculator },
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/reports", label: "Reports", icon: FileBarChart },
    { href: "/notifications", label: "Notifications", icon: Bell, badge: unreadCount },
    { href: "/users", label: "User Management", icon: Users },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    if (onCloseMobile) onCloseMobile();
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "bg-[#0B192C] text-slate-200 flex flex-col h-screen select-none border-r border-slate-800/80 transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center space-x-3 group"
          onClick={onCloseMobile}
        >
          <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-900/40 group-hover:scale-105 transition-transform flex items-center justify-center">
            <Anchor className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-sm text-white tracking-wider leading-none">
                LAYTIME
              </span>
              <span className="text-[10px] text-blue-400 font-bold tracking-wider uppercase mt-1">
                CALCULATION SYSTEM
              </span>
              <span className="text-[9px] text-slate-400 font-medium tracking-tight mt-0.5">
                Maritime Claim Management
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {!isCollapsed && (
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Main Navigation
          </div>
        )}
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              item.href !== "/claims" &&
              pathname.startsWith(`${item.href}/`)) ||
            (item.href === "/claims" &&
              pathname.startsWith("/claims/") &&
              pathname !== "/claims/create");

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              title={item.label}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-xl transition-all duration-150 group",
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
              )}
            >
              <div className="flex items-center space-x-3">
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                    isActive ? "text-white" : "text-slate-400"
                  )}
                />
                {!isCollapsed && <span>{item.label}</span>}
              </div>

              {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
        {!isCollapsed && (
          <div className="flex items-center space-x-2.5 px-2 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <div className="h-8 w-8 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-300 flex items-center justify-center font-bold text-xs">
              {(currentUser?.name || "U").charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {currentUser?.name || "User Name"}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {currentUser?.role || "Claim Processor"}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
