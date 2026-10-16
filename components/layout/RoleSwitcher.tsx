"use client";

import React from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { UserRole } from "@/lib/types";
import { Shield, UserCheck, Eye, Sparkles, DollarSign, Building2 } from "lucide-react";

export function RoleSwitcher() {
  const { role, currentUser } = useAuth();
  const isClient = Boolean(currentUser?.clientId || (currentUser as any)?.client_id || (currentUser as any)?.assignedClientId);

  const roleMeta: Record<string, { label: string; icon: React.ReactNode; desc: string; color: string }> = {
    ADMIN: {
      label: "Admin",
      icon: <Shield className="h-3.5 w-3.5 text-purple-600" />,
      desc: "Users, Settings, Clients/Vessels, Audit Log",
      color: "bg-purple-50 text-purple-700 border-purple-200"
    },
    Admin: {
      label: "Admin",
      icon: <Shield className="h-3.5 w-3.5 text-purple-600" />,
      desc: "Users, Settings, Clients/Vessels, Audit Log",
      color: "bg-purple-50 text-purple-700 border-purple-200"
    },
    SUPERVISOR: {
      label: "Supervisor",
      icon: <UserCheck className="h-3.5 w-3.5 text-amber-600" />,
      desc: "Full claims ops, overrides, settlements, negotiations",
      color: "bg-amber-50 text-amber-700 border-amber-200"
    },
    Supervisor: {
      label: "Supervisor",
      icon: <UserCheck className="h-3.5 w-3.5 text-amber-600" />,
      desc: "Full claims ops, overrides, settlements, negotiations",
      color: "bg-amber-50 text-amber-700 border-amber-200"
    },
    CLAIM_PROCESSOR: {
      label: "Claim Processor",
      icon: <Sparkles className="h-3.5 w-3.5 text-blue-600" />,
      desc: "Assigned claims, SoF event entry, draft offers",
      color: "bg-blue-50 text-blue-700 border-blue-200"
    },
    Processor: {
      label: "Claim Processor",
      icon: <Sparkles className="h-3.5 w-3.5 text-blue-600" />,
      desc: "Assigned claims, SoF event entry, draft offers",
      color: "bg-blue-50 text-blue-700 border-blue-200"
    },
    "Claim Processor": {
      label: "Claim Processor",
      icon: <Sparkles className="h-3.5 w-3.5 text-blue-600" />,
      desc: "Assigned claims, SoF event entry, draft offers",
      color: "bg-blue-50 text-blue-700 border-blue-200"
    },
    REVIEWER_CLIENT: isClient
      ? {
          label: "Client",
          icon: <Building2 className="h-3.5 w-3.5 text-cyan-600" />,
          desc: "Client portal: own claims, shared docs, final offers",
          color: "bg-cyan-50 text-cyan-700 border-cyan-200"
        }
      : {
          label: "Reviewer",
          icon: <Eye className="h-3.5 w-3.5 text-slate-600" />,
          desc: "Read-only compliance, audit log & reports",
          color: "bg-slate-50 text-slate-700 border-slate-200"
        },
    Reviewer: {
      label: "Reviewer",
      icon: <Eye className="h-3.5 w-3.5 text-slate-600" />,
      desc: "Read-only compliance, audit log & reports",
      color: "bg-slate-50 text-slate-700 border-slate-200"
    },
    Client: {
      label: "Client",
      icon: <Building2 className="h-3.5 w-3.5 text-cyan-600" />,
      desc: "Client portal: own claims, shared docs, final offers",
      color: "bg-cyan-50 text-cyan-700 border-cyan-200"
    }
  };

  const meta = roleMeta[role] || roleMeta["REVIEWER_CLIENT"];

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
