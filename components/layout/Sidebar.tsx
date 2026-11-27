"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import {
  getLongestMatchingSidebarHref,
  getRoleDashboardPath,
  getSidebarItemsForRole,
  normalizeRole,
  SidebarNavDefinition
} from "@/lib/auth/accessMatrix";
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
  UserCheck,
  Layers
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface SidebarProps {
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
}

const ICON_MAP: Record<SidebarNavDefinition["iconKey"], React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  claims: FileSpreadsheet,
  assigned: UserCheck,
  create: PlusCircle,
  calculator: Calculator,
  calculations: Layers,
  documents: FileText,
  ocr: ScanText,
  rac: Briefcase,
  timebar: Clock,
  analytics: BarChart3,
  reports: FileBarChart,
  notifications: Bell,
  users: Users,
  settings: Settings
};

export function Sidebar({ onCloseMobile, isCollapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { currentUser, role, isAuthenticated, isLoading, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const isClient = Boolean(currentUser?.clientId || (currentUser as any)?.client_id);
  const normRole = normalizeRole(role, isClient);
  const roleDashboardHref = getRoleDashboardPath(role, isClient);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    let active = true;
    const fetchUnread = async () => {
      try {
        const notifs = await getNotifications();
        if (active) {
          setUnreadCount(notifs.filter((n) => !n.isRead).length);
        }
      } catch {
        if (active) setUnreadCount(0);
      }
    };

    fetchUnread();
    const handleStorage = () => fetchUnread();
    window.addEventListener("demurrage_storage_change", handleStorage);
    const interval = setInterval(fetchUnread, 15000);
    return () => {
      active = false;
      window.removeEventListener("demurrage_storage_change", handleStorage);
      clearInterval(interval);
    };
  }, [isAuthenticated, normRole]);

  // Derived strictly from ACCESS_MATRIX only once session is resolved (prevents hydration flicker)
  const navItems = useMemo(() => {
    if (isLoading || !isAuthenticated) return [];
    return getSidebarItemsForRole(normRole, isClient);
  }, [isLoading, isAuthenticated, normRole, isClient]);

  // Longest-prefix match: strictly one active nav item
  const activeItemHref = useMemo(
    () => getLongestMatchingSidebarHref(navItems, pathname),
    [navItems, pathname]
  );

  const handleLogout = async () => {
    await logout();
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside
      className={cn(
        "bg-[#071322] text-slate-200 flex flex-col h-screen select-none border-r border-slate-800/80 transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between">
        <Link
          href={roleDashboardHref}
          prefetch={false}
          className="flex items-center space-x-3 group"
          onClick={onCloseMobile}
        >
          <div className="bg-gradient-to-tr from-cyan-600 to-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-cyan-950/40 group-hover:scale-105 transition-transform flex items-center justify-center">
            <Anchor className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-black text-sm text-white tracking-wider leading-none">
                LAY-TIME
              </span>
              <span className="text-[10px] text-cyan-400 font-bold tracking-wider uppercase mt-1">
                SYSTEM SUITE
              </span>
              <span className="text-[9px] text-slate-400 font-medium tracking-tight mt-0.5">
                Demurrage &amp; RAC Hub
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
        <nav className="space-y-1" aria-label="Primary Navigation">
          {isLoading ? (
            <div className="space-y-2 px-2 py-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-8 rounded-xl bg-slate-800/50 animate-pulse" />
              ))}
            </div>
          ) : (
            navItems.map((item) => {
              const Icon = ICON_MAP[item.iconKey] || FileText;
              const isActive = item.href === activeItemHref;
              const badge = item.href === "/notifications" ? unreadCount : 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={onCloseMobile}
                  data-nav-href={item.href}
                  data-active={isActive ? "true" : "false"}
                  className={cn(
                    "flex items-center px-3 py-2 text-xs font-medium rounded-xl transition-colors group relative",
                    isActive
                      ? "bg-cyan-600 text-white font-semibold shadow-md shadow-cyan-900/30"
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
                  {!isCollapsed && badge > 0 && (
                    <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {badge}
                    </span>
                  )}
                  {isCollapsed && badge > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-rose-500 rounded-full" />
                  )}
                </Link>
              );
            })
          )}
        </nav>
      </div>

      {/* User Profile & Role Indicator */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/60">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-cyan-600/30 border border-cyan-500/50 flex items-center justify-center text-xs font-bold text-cyan-300 shrink-0">
                {currentUser?.name ? currentUser.name.charAt(0) : "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">
                  {currentUser?.name || "User"}
                </p>
                <span
                  className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded inline-block mt-0.5 uppercase tracking-wide",
                    normRole === "ADMIN"
                      ? "bg-purple-900/80 text-purple-300 border border-purple-700/50"
                      : normRole === "SUPERVISOR"
                      ? "bg-amber-900/80 text-amber-300 border border-amber-700/50"
                      : normRole === "CLAIM_PROCESSOR"
                      ? "bg-blue-900/80 text-blue-300 border border-blue-700/50"
                      : normRole === "CLIENT"
                      ? "bg-cyan-900/80 text-cyan-300 border border-cyan-700/50"
                      : "bg-slate-800 text-slate-300 border border-slate-700"
                  )}
                >
                  {normRole.replace("_", " ")}
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
