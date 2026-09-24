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
  ScanText,
  Briefcase,
  Clock,
  BarChart3,
  FileBarChart,
  Bell,
  Settings,
  Users,
  LogOut,
  Anchor,
  Layers,
  ChevronRight,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface SidebarProps {
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  roles?: string[];
}

export function Sidebar({ onCloseMobile, isCollapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, role, logout, canAccessUsers } = useAuth();
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
    const interval = setInterval(fetchUnread, 10000);
    return () => {
      window.removeEventListener("demurrage_storage_change", handleStorage);
      clearInterval(interval);
    };
  }, []);

  // Exact 12 Navigation Items as specified in Section 5
  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    {
      href: "/claims",
      label: role === "Claim Processor" ? "Assigned Claims" : "Claims",
      icon: FileSpreadsheet
    },
    ...(role !== "Reviewer"
      ? [{ href: "/claims/create", label: "Create Claim", icon: PlusCircle }]
      : []),
    { href: "/calculator", label: "Laytime Calculator", icon: Calculator },
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/ocr", label: "OCR & SoF", icon: ScanText },
    { href: "/rac", label: "RAC Review", icon: Briefcase },
    { href: "/timebar", label: "Time-Bar Monitor", icon: Clock },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/reports", label: "Reports", icon: FileBarChart },
    { href: "/notifications", label: "Notifications", icon: Bell, badge: unreadCount },
    { href: "/settings", label: "Settings", icon: Settings },
    ...(canAccessUsers ? [{ href: "/users", label: "User Management", icon: Users }] : [])
  ];

  const handleLogout = async () => {
    await logout();
    if (onCloseMobile) onCloseMobile();
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
              <span className="font-black text-sm text-white tracking-wider leading-none">
                LAYTIME
              </span>
              <span className="text-[10px] text-blue-400 font-bold tracking-wider uppercase mt-1">
                SYSTEM SUITE
              </span>
              <span className="text-[9px] text-slate-400 font-medium tracking-tight mt-0.5">
                Demurrage & RAC Hub
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
        {!isCollapsed && (
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Navigation
          </p>
        )}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "flex items-center px-3 py-2 text-xs font-medium rounded-xl transition-colors group relative",
                  isActive
                    ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-900/30"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                    isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200",
                    isCollapsed ? "mx-auto" : "mr-3"
                  )}
                />
                {!isCollapsed && <span className="truncate flex-1">{item.label}</span>}
                {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
                {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-rose-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Profile & Role Indicator */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/60">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-xs font-bold text-blue-300 shrink-0">
                {currentUser?.name ? currentUser.name.charAt(0) : "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">
                  {currentUser?.name || "User"}
                </p>
                <span
                  className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded inline-block mt-0.5",
                    role === "Admin"
                      ? "bg-purple-900/80 text-purple-300 border border-purple-700/50"
                      : role === "Supervisor"
                      ? "bg-amber-900/80 text-amber-300 border border-amber-700/50"
                      : role === "Reviewer"
                      ? "bg-slate-800 text-slate-300 border border-slate-700"
                      : "bg-blue-900/80 text-blue-300 border border-blue-700/50"
                  )}
                >
                  {role}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex justify-center p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
