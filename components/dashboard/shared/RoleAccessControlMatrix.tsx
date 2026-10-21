"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  AlertTriangle,
  Search,
  Filter,
  Info,
  Layers,
  FileSpreadsheet,
  Calculator,
  Briefcase,
  Users,
  Settings,
  Scale
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface AccessItem {
  id: string;
  name: string;
  category: "Claims" | "Calculations" | "RAC" | "Commercial" | "Admin" | "Documents";
  description: string;
  status: "granted" | "removed";
  badge?: string;
  reason?: string;
}

interface RoleAccessControlMatrixProps {
  roleName: string;
  roleCode: "ADMIN" | "SUPERVISOR" | "CLAIM_PROCESSOR" | "REVIEWER" | "CLIENT" | "REVIEWER_CLIENT";
  roleScope: string;
  purpose: string;
  grantedPermissions: AccessItem[];
  removedPermissions: AccessItem[];
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Claims: <FileSpreadsheet className="h-3.5 w-3.5" />,
  Calculations: <Calculator className="h-3.5 w-3.5" />,
  RAC: <Briefcase className="h-3.5 w-3.5" />,
  Commercial: <Scale className="h-3.5 w-3.5" />,
  Admin: <Users className="h-3.5 w-3.5" />,
  Documents: <Layers className="h-3.5 w-3.5" />
};

export function RoleAccessControlMatrix({
  roleName,
  roleCode,
  roleScope,
  purpose,
  grantedPermissions,
  removedPermissions
}: RoleAccessControlMatrixProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const categories = useMemo(() => {
    const cats = new Set<string>(["All"]);
    grantedPermissions.forEach((p) => cats.add(p.category));
    removedPermissions.forEach((p) => cats.add(p.category));
    return Array.from(cats);
  }, [grantedPermissions, removedPermissions]);

  const filteredGranted = useMemo(() => {
    return grantedPermissions.filter((item) => {
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [grantedPermissions, selectedCategory, searchQuery]);

  const filteredRemoved = useMemo(() => {
    return removedPermissions.filter((item) => {
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.reason && item.reason.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [removedPermissions, selectedCategory, searchQuery]);

  const getRoleTheme = () => {
    switch (roleCode) {
      case "ADMIN":
        return {
          badgeBg: "bg-purple-100 text-purple-900 border-purple-300",
          accentBorder: "border-purple-500",
          headerGradient: "from-purple-900 via-slate-900 to-slate-900"
        };
      case "SUPERVISOR":
        return {
          badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
          accentBorder: "border-amber-500",
          headerGradient: "from-amber-900 via-slate-900 to-slate-900"
        };
      case "CLAIM_PROCESSOR":
        return {
          badgeBg: "bg-blue-100 text-blue-900 border-blue-300",
          accentBorder: "border-blue-500",
          headerGradient: "from-blue-900 via-slate-900 to-slate-900"
        };
      case "CLIENT":
        return {
          badgeBg: "bg-cyan-100 text-cyan-900 border-cyan-300",
          accentBorder: "border-cyan-500",
          headerGradient: "from-cyan-900 via-slate-900 to-slate-900"
        };
      default:
        return {
          badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300",
          accentBorder: "border-emerald-500",
          headerGradient: "from-emerald-900 via-slate-900 to-slate-900"
        };
    }
  };

  const theme = getRoleTheme();

  return (
    <Card className="border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
      {/* 1. Header Banner */}
      <div className={cn("p-5 sm:p-6 text-white bg-linear-to-r", theme.headerGradient)}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border", theme.badgeBg)}>
                {roleName} RBAC Profile
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800/80 text-slate-300 border border-slate-700">
                Scope: {roleScope}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center space-x-1">
                <ShieldCheck className="h-3 w-3" />
                <span>Zero-Trust Enforced</span>
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-400 shrink-0" />
              <span>Role Access Control & Security Matrix</span>
            </h3>
            <p className="text-xs text-slate-300 max-w-3xl">
              {purpose}
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2 text-center">
              <div className="text-base font-black text-emerald-400">{grantedPermissions.length}</div>
              <div className="text-[9px] uppercase font-bold text-slate-400">Granted</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2 text-center">
              <div className="text-base font-black text-rose-400">{removedPermissions.length}</div>
              <div className="text-[9px] uppercase font-bold text-slate-400">Removed</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filters & Search Bar */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pill Filters */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center space-x-1 cursor-pointer",
                selectedCategory === cat
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              )}
            >
              {CATEGORY_ICONS[cat] && <span className="opacity-70">{CATEGORY_ICONS[cat]}</span>}
              <span>{cat}</span>
            </button>
          ))}
        </div>

        {/* Real-time Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search permissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 transition"
          />
        </div>
      </div>

      {/* 3. Side-by-Side Access Columns */}
      <CardContent className="p-5 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Access Needed & Authorized */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                    Access Needed & Authorized
                  </h4>
                  <p className="text-[11px] text-emerald-700">
                    Capabilities required to perform the {roleName} duties
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {filteredGranted.length} Active
              </span>
            </div>

            <div className="space-y-2.5">
              {filteredGranted.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-200/80 hover:border-emerald-300 transition space-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="font-bold text-xs text-slate-900">{item.name}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 pl-6">{item.description}</p>
                </div>
              ))}

              {filteredGranted.length === 0 && (
                <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                  No authorized permissions match your search or filter.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Remaining Access Removed & Restricted */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-rose-100">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-rose-100 text-rose-800">
                  <XCircle className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider">
                    Remaining Access Removed & Restricted
                  </h4>
                  <p className="text-[11px] text-rose-700">
                    Denied to enforce Separation of Duties & Zero-Trust RBAC
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                {filteredRemoved.length} Blocked
              </span>
            </div>

            <div className="space-y-2.5">
              {filteredRemoved.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-rose-50/40 border border-rose-200/80 hover:border-rose-300 transition space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      <span className="font-bold text-xs text-slate-900">{item.name}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 pl-6">{item.description}</p>
                  {item.reason && (
                    <div className="ml-6 p-2 rounded-lg bg-white/80 border border-rose-200 text-[10px] text-rose-900 flex items-start space-x-1.5">
                      <Lock className="h-3 w-3 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Security Rationale:</strong> {item.reason}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {filteredRemoved.length === 0 && (
                <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                  No restricted permissions match your search or filter.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Zero-Trust Footer Note */}
        <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center space-x-2">
            <Info className="h-4 w-4 text-blue-600 shrink-0" />
            <span>
              <strong>Zero-Trust Enforcement:</strong> Permissions are checked dynamically at both Edge Middleware and API controllers. Any unpermitted route yields an immediate 403 Forbidden.
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 shrink-0">
            SRS Compliance Matrix v2.0
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
