"use client";

import React from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { UserRole } from "@/lib/types";
import { Shield, UserCheck, Eye, Sparkles } from "lucide-react";

export function RoleSwitcher() {
  const { role } = useAuth();

  const roleMeta: Record<UserRole, { label: string; icon: React.ReactNode; desc: string; color: string }> = {
    Admin: {
      label: "Admin",
      icon: <Shield className="h-3.5 w-3.5 text-purple-600" />,
      desc: "Full access + User Management",
      color: "bg-purple-50 text-purple-700 border-purple-200"
    },
    Supervisor: {
      label: "Supervisor",
      icon: <UserCheck className="h-3.5 w-3.5 text-amber-600" />,
      desc: "Full claims access & override authority",
      color: "bg-amber-50 text-amber-700 border-amber-200"
    },
    "Claim Processor": {
      label: "Claim Processor",
      icon: <Sparkles className="h-3.5 w-3.5 text-blue-600" />,
      desc: "Edit assigned claims only",
      color: "bg-blue-50 text-blue-700 border-blue-200"
    },
    Reviewer: {
      label: "Reviewer",
      icon: <Eye className="h-3.5 w-3.5 text-emerald-600" />,
      desc: "Read-only access across all views",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200"
    }
  };

  const meta = roleMeta[role] || roleMeta["Reviewer"];

  return (
    <div
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${meta.color}`}
      title={`${meta.label}: ${meta.desc}`}
    >
      {meta.icon}
      <span>{meta.label}</span>
    </div>
  );
}
