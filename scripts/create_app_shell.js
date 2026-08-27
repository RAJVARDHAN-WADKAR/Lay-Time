const fs = require('fs');
const path = require('path');

const shellCode = `"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { DemoBadge } from "@/components/layout/DemoBadge";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";

  if (isLandingPage) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
        {children}
        <DemoBadge />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main content column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
        <DemoBadge />
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(process.cwd(), 'components/layout/AppShell.tsx'), shellCode, 'utf8');
console.log('Created components/layout/AppShell.tsx');
