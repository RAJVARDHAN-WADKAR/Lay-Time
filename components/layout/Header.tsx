"use client";

import React, { useState, useEffect, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { getRoleDashboardPath, normalizeRole } from "@/lib/auth/accessMatrix";
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
  ChevronRight,
  ShieldCheck,
  UserCheck,
  GraduationCap
} from "lucide-react";
import Link from "next/link";
import { Sidebar } from "./Sidebar";
import { Button } from "@/components/ui/button";
import { DemoGuideDrawer } from "@/components/demo/DemoGuideDrawer";

interface HeaderProps {
  onToggleDesktopSidebar?: () => void;
}

function HeaderInner({ onToggleDesktopSidebar }: HeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentUser, role, logout, canCreateClaim, canAccessSettings } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDemoGuideOpen, setIsDemoGuideOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const targetList = normRole === "CLAIM_PROCESSOR" ? "/claims/assigned" : "/claims";
      router.push(`${targetList}?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isClient = Boolean(currentUser?.clientId || (currentUser as any)?.client_id);
  const normRole = normalizeRole(role, isClient);
  const homeDashboardHref = getRoleDashboardPath(role, isClient);
  const currentTab = searchParams?.get("tab") || null;
  const isAssignedFilter =
    pathname === "/claims/assigned" ||
    searchParams?.get("filter") === "assigned" ||
    searchParams?.get("view") === "assigned" ||
    searchParams?.get("assigned") === "me";

  // Compute current page title and breadcrumbs
  const getPageInfo = () => {
    // 1. Dashboards & No-Access
    if (pathname === "/no-access") return { title: "Access Restricted", crumbs: [{ label: "No Access" }] };
    if (pathname === "/dashboard") return { title: "Operations Dashboard", crumbs: [{ label: "Dashboard" }] };
    if (pathname === "/dashboard/admin") return { title: "Admin Console", crumbs: [{ label: "Admin Console" }] };
    if (pathname === "/dashboard/supervisor") return { title: "Supervisor Dashboard", crumbs: [{ label: "Supervisor Dashboard" }] };
    if (pathname === "/dashboard/claim-processor") return { title: "Processor Dashboard", crumbs: [{ label: "Processor Dashboard" }] };
    if (pathname === "/dashboard/reviewer") return { title: "Reviewer Dashboard", crumbs: [{ label: "Reviewer Dashboard" }] };
    if (pathname === "/dashboard/client") return { title: "Client Portal", crumbs: [{ label: "Client Portal" }] };

    // 2. Claims
    const claimsListHref = normRole === "CLAIM_PROCESSOR" ? "/claims/assigned" : "/claims";
    const claimsListLabel =
      normRole === "CLAIM_PROCESSOR" ? "Assigned Claims" : normRole === "CLIENT" ? "My Claims" : "All Claims";

    if (pathname === "/claims/create") {
      return {
        title: "Create Claim",
        crumbs: [
          { label: claimsListLabel, href: claimsListHref },
          { label: "Create Claim" }
        ]
      };
    }
    if (pathname === "/claims/assigned") {
      return {
        title: "Assigned Claims",
        crumbs: [{ label: "Assigned Claims" }]
      };
    }
    if (pathname === "/claims") {
      return {
        title: isAssignedFilter ? "Assigned Claims" : normRole === "CLIENT" ? "My Claims" : "Claims Ledger",
        crumbs: [{ label: isAssignedFilter ? "Assigned Claims" : normRole === "CLIENT" ? "My Claims" : "Claims Ledger" }]
      };
    }
    if (pathname.startsWith("/claims/")) {
      const claimId = pathname.replace("/claims/", "").split("/")[0];
      const tabNames: Record<string, string> = {
        overview: "Overview",
        sof: "Statement of Facts",
        calculations: "Laytime Calculation",
        negotiations: "Negotiations",
        documents: "Documents",
        rac: "RAC Analysis",
        audit: "Audit Log"
      };
      const tabLabel = currentTab && tabNames[currentTab] ? tabNames[currentTab] : "Claim Inspection";

      return {
        title: `Claim ${claimId} — ${tabLabel}`,
        crumbs: [
          { label: claimsListLabel, href: claimsListHref },
          { label: claimId, href: `/claims/${claimId}` },
          ...(currentTab ? [{ label: tabLabel }] : [])
        ]
      };
    }

    // 3. Calculator & Engines
    if (pathname === "/calculator") {
      return {
        title: "Laytime Calculator",
        crumbs: [{ label: "Laytime Calculator" }]
      };
    }
    if (pathname === "/calculations") {
      return {
        title: "Calculations",
        crumbs: [{ label: "Calculations" }]
      };
    }
    if (pathname === "/ocr") {
      return {
        title: "OCR & Statement of Facts",
        crumbs: [{ label: "Document AI" }, { label: "OCR Review" }]
      };
    }
    if (pathname === "/sof") {
      return {
        title: "Statement of Facts",
        crumbs: [{ label: "Operations" }, { label: "SoF Timeline" }]
      };
    }

    // 4. RAC
    if (pathname === "/rac/create") {
      return {
        title: "New RAC Case",
        crumbs: [
          { label: "RAC Portfolio", href: "/rac" },
          { label: "Cases", href: "/rac/cases" },
          { label: "Create Case" }
        ]
      };
    }
    if (pathname.startsWith("/rac/cases/")) {
      const caseId = pathname.replace("/rac/cases/", "").split("/")[0];
      return {
        title: "RAC Case Details",
        crumbs: [
          { label: "RAC Portfolio", href: "/rac" },
          { label: "Cases", href: "/rac/cases" },
          { label: caseId }
        ]
      };
    }
    if (pathname === "/rac/cases") {
      return {
        title: "RAC Cases Ledger",
        crumbs: [
          { label: "RAC Portfolio", href: "/rac" },
          { label: "Cases" }
        ]
      };
    }
    if (pathname === "/rac/calculations") {
      return {
        title: "RAC Calculations",
        crumbs: [
          { label: "RAC Portfolio", href: "/rac" },
          { label: "Calculations" }
        ]
      };
    }
    if (pathname === "/rac/reports") {
      return {
        title: "RAC Reports",
        crumbs: [
          { label: "RAC Portfolio", href: "/rac" },
          { label: "Reports" }
        ]
      };
    }
    if (pathname === "/rac") {
      return {
        title: "RAC Portfolio",
        crumbs: [{ label: "Recoverables" }, { label: "RAC Portfolio" }]
      };
    }

    // 5. Timebar, Analytics, Reports, Users, Settings
    if (pathname === "/timebar") {
      return {
        title: "Time-Bar Monitor",
        crumbs: [{ label: "Compliance" }, { label: "Time-Bar Deadlines" }]
      };
    }
    if (pathname === "/analytics") {
      return {
        title: "Analytics",
        crumbs: [{ label: "Intelligence" }, { label: "Analytics" }]
      };
    }
    if (pathname === "/reports") {
      return {
        title: "Reports",
        crumbs: [{ label: "Reports" }, { label: "PDF Reports" }]
      };
    }
    if (pathname === "/documents") {
      return {
        title: "Documents",
        crumbs: [{ label: "Archive" }, { label: "Documents" }]
      };
    }
    if (pathname === "/notifications") {
      return {
        title: "Notifications",
        crumbs: [{ label: "Alerts" }, { label: "Notifications" }]
      };
    }
    if (pathname === "/users") {
      return {
        title: "User Management",
        crumbs: [{ label: "Admin" }, { label: "Users" }]
      };
    }
    if (pathname === "/settings") {
      return {
        title: "Settings",
        crumbs: [{ label: "Configuration" }, { label: "Settings" }]
      };
    }

    return {
      title: "Laytime Calculation System",
      crumbs: [{ label: "Maritime Operations" }]
    };
  };

  const { title, crumbs } = getPageInfo();

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6 shadow-2xs">
        {/* Left: Sidebar toggle + Page Title + Clickable Breadcrumbs */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 md:hidden transition"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <button
            onClick={onToggleDesktopSidebar}
            className="hidden md:flex p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
            aria-label="Toggle Sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex flex-col">
            <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-[10px] font-semibold text-slate-400">
              <Link href={homeDashboardHref} className="hover:text-blue-600 transition-colors">
                Laytime
              </Link>
              {crumbs.map((c, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="h-2.5 w-2.5 text-slate-300 shrink-0" />
                  {c.href ? (
                    <Link href={c.href} className="hover:text-blue-600 transition-colors">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="text-slate-600 font-semibold">{c.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
            <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
              {title}
            </h1>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="hidden lg:flex items-center flex-1 max-w-md mx-6">
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search claims, ships, counterparties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400 transition"
            />
          </form>
        </div>

        {/* Right: Quick Action + Role Switcher + Notification + User */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Create Claim CTA */}
          {canCreateClaim && (
            <Link href="/claims/create" className="hidden sm:inline-flex">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-3.5 shadow-xs rounded-xl flex items-center space-x-1.5">
                <PlusCircle className="h-4 w-4" />
                <span>Create Claim</span>
              </Button>
            </Link>
          )}

          {/* Live Demo Walkthrough Guide Button */}
          <button
            onClick={() => setIsDemoGuideOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition shadow-xs cursor-pointer group"
            title="Open Interactive Demo Walkthrough for Project Guide / Examiner"
          >
            <GraduationCap className="h-4 w-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Live Demo Guide</span>
          </button>

          {/* Active Role Indicator */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
            <span className="hidden sm:inline text-slate-500 font-semibold">Role:</span>
            <span className="text-slate-900 font-extrabold">{role}</span>
          </div>

          {/* Notifications Icon & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-xl py-3 z-50 animate-in fade-in">
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
                        <div className="font-bold text-slate-900">{n.title}</div>
                        <div className="text-slate-600 text-[11px] mt-0.5">{n.message}</div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {new Date(n.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
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
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    View All Notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100 transition border border-slate-200"
            >
              <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                {(currentUser?.name || "U").charAt(0)}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in">
                <div className="px-4 py-2 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-900">{currentUser?.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{currentUser?.email}</div>
                  <div className="mt-1 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {role}
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    href={homeDashboardHref}
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center space-x-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    <span>My Dashboard</span>
                  </Link>
                </div>

                {canAccessSettings && (
                  <div className="py-1">
                    <Link
                      href="/settings"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      <Settings className="h-4 w-4 text-slate-400" />
                      <span>Settings</span>
                    </Link>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-bold cursor-pointer"
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

      {/* Live Demo Guide Drawer */}
      <DemoGuideDrawer
        isOpen={isDemoGuideOpen}
        onClose={() => setIsDemoGuideOpen(false)}
      />

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

export function Header(props: HeaderProps) {
  return (
    <Suspense
      fallback={
        <header className="sticky top-0 z-40 flex h-16 w-full items-center border-b border-slate-200 bg-white px-4 md:px-6" />
      }
    >
      <HeaderInner {...props} />
    </Suspense>
  );
}
