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
  ScanText,
  Bot,
  Briefcase,
  Layers,
  FolderPlus,
  BarChart3,
  ShieldCheck,
  UserCheck
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
}

export function Sidebar({ onCloseMobile, isCollapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, currentUser, canAccessUsers } = useAuth();
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
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  const mainNav: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/claims", label: currentUser.role === "Claim Processor" ? "Assigned Claims" : "Claims Ledger", icon: FileSpreadsheet },
    ...(currentUser.role !== "Reviewer" ? [{ href: "/claims/create", label: "Create Claim", icon: PlusCircle }] : []),
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/ocr", label: "OCR Review", icon: ScanText },
    { href: "/calculations", label: "Calculations", icon: Calculator },
    { href: "/reports", label: "Reports", icon: FileBarChart }
  ];

  const racNav: NavItem[] = [
    { href: "/rac", label: "RAC Dashboard", icon: BarChart3 },
    { href: "/rac/cases", label: "RAC Cases", icon: Briefcase },
    ...(currentUser.role !== "Reviewer" ? [{ href: "/rac/create", label: "Create RAC", icon: FolderPlus }] : []),
    { href: "/rac/calculations", label: "RAC Calculation", icon: Layers },
    { href: "/rac/reports", label: "RAC Reports", icon: FileBarChart }
  ];

  const workflowNav: NavItem[] = [
    { href: "/notifications", label: "Notifications", icon: Bell, badge: unreadCount },
    { href: "/ai-assistant", label: "AI Assistant", icon: Bot }
  ];

  const adminNav: NavItem[] = [
    { href: "/users", label: "Users", icon: Users },
    { href: "/settings", label: "Settings", icon: Settings }
  ];

  const handleLogout = async () => {
    await logout();
    if (onCloseMobile) onCloseMobile();
  };

  const renderNavSection = (title: string, items: NavItem[]) => (
    <div className="mb-4">
      {!isCollapsed && (
        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          {title}
        </p>
      )}
      <nav className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/rac" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                "flex items-center px-3 py-2 text-xs font-medium rounded-lg transition-colors group relative",
                isActive
                  ? "bg-blue-600/20 text-blue-400 font-semibold border-l-2 border-blue-500 rounded-l-none pl-2.5"
                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                  isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-200",
                  isCollapsed ? "mx-auto" : "mr-3"
                )}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
              {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="ml-auto bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
              {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-blue-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );

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
                Demurrage & RAC Suite
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 custom-scrollbar">
        {renderNavSection("Main", mainNav)}
        {renderNavSection("RAC Module", racNav)}
        {renderNavSection("Workflow", workflowNav)}
        {canAccessUsers && renderNavSection("Admin", adminNav)}
      </div>

      {/* User Profile & Logout Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/50">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-xs font-bold text-blue-300 shrink-0">
                {currentUser?.name ? currentUser.name.charAt(0) : "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{currentUser?.name || "User"}</p>
                <div className="flex items-center space-x-1">
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.2 rounded",
                    currentUser?.role === "Admin" ? "bg-purple-900/60 text-purple-300" :
                    currentUser?.role === "Supervisor" ? "bg-amber-900/60 text-amber-300" :
                    currentUser?.role === "Reviewer" ? "bg-slate-800 text-slate-300" :
                    "bg-blue-900/60 text-blue-300"
                  )}>
                    {currentUser?.role || "Claim Processor"}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex justify-center p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
