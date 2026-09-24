"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { getNotifications, markAllNotificationsRead } from "@/lib/api";
import { NotificationRecord, UserRole } from "@/lib/types";
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
  UserCheck
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
  const { currentUser, role, switchRole, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
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
      router.push(`/claims?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Compute current page title and breadcrumbs
  const getPageInfo = () => {
    if (pathname === "/dashboard") return { title: "Dashboard", crumb: "Operations" };
    if (pathname === "/claims") return { title: "Claims Ledger", crumb: "Claims" };
    if (pathname === "/claims/create") return { title: "Create Claim", crumb: "Claims > New Claim Wizard" };
    if (pathname.startsWith("/claims/")) return { title: "Claim Details", crumb: "Claims > File Inspection" };
    if (pathname === "/calculator") return { title: "Laytime Calculator", crumb: "Engines > Calculator" };
    if (pathname === "/calculations") return { title: "Laytime Calculator", crumb: "Engines > Calculator" };
    if (pathname === "/sof") return { title: "Statement of Facts", crumb: "Operations > SoF Timeline" };
    if (pathname === "/documents") return { title: "Documents", crumb: "Archive > Documents" };
    if (pathname === "/ocr") return { title: "OCR & Statement of Facts", crumb: "Document AI > OCR Review" };
    if (pathname.startsWith("/rac")) return { title: "RAC Review", crumb: "Recoverables > RAC Review" };
    if (pathname === "/timebar") return { title: "Time-Bar Monitor", crumb: "Compliance > Time-Bar Deadlines" };
    if (pathname === "/analytics") return { title: "Analytics", crumb: "Intelligence > Analytics" };
    if (pathname === "/reports") return { title: "Reports", crumb: "Export > PDF Reports" };
    if (pathname === "/notifications") return { title: "Notifications", crumb: "Alerts > Notifications" };
    if (pathname === "/users") return { title: "User Management", crumb: "Admin > Users" };
    if (pathname === "/settings") return { title: "Settings", crumb: "Configuration > Settings" };
    return { title: "Laytime Calculation System", crumb: "Maritime Operations" };
  };

  const { title, crumb } = getPageInfo();

  const demoRoles: { role: UserRole; label: string; desc: string; color: string }[] = [
    { role: "Admin", label: "Admin", desc: "Full permissions & system settings", color: "text-purple-600 bg-purple-50" },
    { role: "Claim Processor", label: "Claim Processor", desc: "Create, SoF, calculations & assigned claims", color: "text-blue-600 bg-blue-50" },
    { role: "Supervisor", label: "Supervisor", desc: "Approval authority & calculation audit", color: "text-amber-600 bg-amber-50" },
    { role: "Reviewer", label: "Reviewer", desc: "Read-only inspection mode", color: "text-slate-600 bg-slate-100" }
  ];

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6 shadow-2xs">
        {/* Left: Sidebar toggle + Page Title + Breadcrumbs */}
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
            <div className="flex items-center space-x-1.5 text-[10px] font-semibold text-slate-400">
              <span>Laytime</span>
              <ChevronRight className="h-2.5 w-2.5 text-slate-300" />
              <span className="text-slate-500">{crumb}</span>
            </div>
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
          {role !== "Reviewer" && (
            <Link href="/claims/create" className="hidden sm:inline-flex">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-3.5 shadow-xs rounded-xl flex items-center space-x-1.5">
                <PlusCircle className="h-4 w-4" />
                <span>Create Claim</span>
              </Button>
            </Link>
          )}

          {/* Quick Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50 transition"
              title="Click to switch simulated demo role"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              <span className="hidden sm:inline text-slate-600">Role:</span>
              <span className="text-slate-900 font-extrabold">{role}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {isRoleMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Simulate Demo Role
                </div>
                <div className="p-1 space-y-1">
                  {demoRoles.map((r) => (
                    <button
                      key={r.role}
                      onClick={() => {
                        switchRole(r.role);
                        setIsRoleMenuOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs transition flex items-center justify-between ${
                        role === r.role ? "bg-blue-50 font-bold text-blue-700" : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div>
                        <div className="font-bold">{r.label}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{r.desc}</div>
                      </div>
                      {role === r.role && <UserCheck className="h-4 w-4 text-blue-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
                    href="/settings"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center space-x-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    <span>Settings</span>
                  </Link>
                </div>

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
