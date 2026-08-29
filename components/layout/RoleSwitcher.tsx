"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { UserRole } from "@/lib/types";
import { Shield, UserCheck, Eye, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

const ROLE_ACCOUNTS: Record<UserRole, { email: string; pass: string }> = {
  Admin: { email: "admin@laytime.com", pass: "Admin@123" },
  Supervisor: { email: "supervisor@laytime.com", pass: "Supervisor@123" },
  "Claim Processor": { email: "processor@laytime.com", pass: "Processor@123" },
  Reviewer: { email: "reviewer@laytime.com", pass: "Reviewer@123" }
};

export function RoleSwitcher() {
  const { role, login, isLoading } = useAuth();
  const [switching, setSwitching] = useState(false);
  const router = useRouter();

  const roles: { role: UserRole; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      role: "Admin",
      label: "Admin",
      icon: <Shield className="h-3.5 w-3.5 text-purple-500" />,
      desc: "Full access + User Management",
    },
    {
      role: "Supervisor",
      label: "Supervisor",
      icon: <UserCheck className="h-3.5 w-3.5 text-amber-500" />,
      desc: "Full claims access & override",
    },
    {
      role: "Claim Processor",
      label: "Processor",
      icon: <Sparkles className="h-3.5 w-3.5 text-blue-500" />,
      desc: "Edit assigned claims only",
    },
    {
      role: "Reviewer",
      label: "Reviewer",
      icon: <Eye className="h-3.5 w-3.5 text-emerald-500" />,
      desc: "Read-only access across all views",
    },
  ];

  const handleSwitch = async (targetRole: UserRole) => {
    if (targetRole === role || switching || isLoading) return;
    setSwitching(true);
    try {
      const creds = ROLE_ACCOUNTS[targetRole];
      if (creds) {
        await login(creds.email, creds.pass);
        router.refresh();
      }
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
      <span className="text-[11px] font-semibold text-slate-500 uppercase px-1.5 hidden sm:inline">Role:</span>
      <div className="flex items-center space-x-1">
        {roles.map((r) => {
          const isActive = role === r.role;
          return (
            <button
              key={r.role}
              disabled={switching || isLoading}
              onClick={() => handleSwitch(r.role)}
              title={`${r.role}: ${r.desc}`}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
              }`}
            >
              {r.icon}
              <span>{r.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
