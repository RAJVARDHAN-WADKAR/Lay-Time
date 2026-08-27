"use client";

import React from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { UserRole } from "@/lib/types";
import { Shield, UserCheck, Eye, Sparkles } from "lucide-react";

export function RoleSwitcher() {
  const { role, setRole, currentUser } = useAuth();

  const roles: { role: UserRole; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      role: "Admin",
      label: "Admin",
      icon: <Shield className="h-3.5 w-3.5 text-rose-500" />,
      desc: "Full access + User Management",
    },
    {
      role: "Supervisor",
      label: "Supervisor",
      icon: <UserCheck className="h-3.5 w-3.5 text-blue-500" />,
      desc: "Full claims access & override",
    },
    {
      role: "Claim Processor",
      label: "Processor",
      icon: <Sparkles className="h-3.5 w-3.5 text-amber-500" />,
      desc: "Edit assigned claims only",
    },
    {
      role: "Reviewer",
      label: "Reviewer",
      icon: <Eye className="h-3.5 w-3.5 text-purple-500" />,
      desc: "Read-only access across all views",
    },
  ];

  return (
    <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
      <span className="text-[11px] font-semibold text-slate-500 uppercase px-1.5 hidden sm:inline">Role:</span>
      <div className="flex items-center space-x-1">
        {roles.map((r) => {
          const isActive = role === r.role;
          return (
            <button
              key={r.role}
              onClick={() => setRole(r.role)}
              title={`${r.role}: ${r.desc}`}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
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
