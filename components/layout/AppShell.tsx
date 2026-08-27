"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const isAuthPage = pathname === "/login";

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar isCollapsed={isSidebarCollapsed} />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onToggleDesktopSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/80">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
