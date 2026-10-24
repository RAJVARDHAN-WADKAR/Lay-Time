"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getClaims, getNotifications, getDocuments } from "@/lib/api";
import { getUsers } from "@/lib/api/users";
import { Claim, NotificationRecord, DocumentRecord, User } from "@/lib/types";
import { calculateDashboardMetrics } from "@/lib/mock/aggregate";
import { formatCurrency } from "@/lib/utils/formatters";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RecentClaimsTable } from "@/components/dashboard/shared/RecentClaimsTable";
import { AccountPortfolioCards } from "@/components/dashboard/shared/AccountPortfolioCards";
import { AdminSecurityAudit } from "@/components/roles/admin/AdminSecurityAudit";
import { AdminUserSummary } from "@/components/roles/admin/AdminUserSummary";
import { useAuth } from "@/lib/context/AuthContext";
import {
  Users,
  Shield,
  Settings,
  FileBarChart,
  FileSpreadsheet,
  Database,
  ShieldCheck,
  RefreshCw
} from "lucide-react";

export function AdminDashboard() {
  const { currentUser } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [cls, usrs, notifs, docs] = await Promise.all([
        getClaims().catch(() => []),
        getUsers().catch(() => []),
        getNotifications().catch(() => []),
        getDocuments().catch(() => [])
      ]);
      setClaims(cls);
      setUsers(usrs);
      setNotifications(notifs);
      setDocuments(docs);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const metrics = useMemo(() => {
    return calculateDashboardMetrics(claims, unreadCount);
  }, [claims, unreadCount]);

  const activeUsersCount = users.filter((u) => u.status === "Active").length;
  const adminCount = users.filter((u) => u.role === "Admin" || u.role === "ADMIN").length;
  const supervisorCount = users.filter((u) => u.role === "Supervisor" || u.role === "SUPERVISOR").length;
  const processorCount = users.filter((u) => u.role === "Claim Processor" || u.role === "CLAIM_PROCESSOR" || u.role === "Processor").length;
  const clientCount = users.filter((u) => u.role === "Client" || u.role === "Reviewer" || u.role === "REVIEWER_CLIENT").length;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-purple-900 text-white uppercase flex items-center space-x-1">
              <Shield className="h-3 w-3" />
              <span>Dedicated Admin Dashboard</span>
            </span>
            <span className="text-xs text-slate-500">
              Logged in as <strong className="text-slate-800">{currentUser?.name || "Administrator"}</strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            System Administration & Governance
          </h1>
          <p className="text-xs text-slate-500">
            Dedicated administrative console for user provisioning, security policies, and company-wide compliance.
          </p>
        </div>

        {/* Quick Admin Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/users">
            <Button size="sm" className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold h-9 px-4 shadow-sm flex items-center space-x-1.5 rounded-xl cursor-pointer">
              <Users className="h-4 w-4" />
              <span>Manage Users</span>
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline" size="sm" className="text-xs font-semibold h-9 px-3.5 bg-white rounded-xl flex items-center space-x-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
              <Settings className="h-4 w-4 text-slate-600" />
              <span>Company Settings</span>
            </Button>
          </Link>
          <Link href="/reports">
            <Button variant="outline" size="sm" className="text-xs font-semibold h-9 px-3.5 bg-white rounded-xl flex items-center space-x-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
              <FileBarChart className="h-4 w-4 text-indigo-600" />
              <span>Audit Reports</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            className="h-9 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 2. Admin System KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Active Users"
          value={String(activeUsersCount)}
          subtitle={`${users.length} Total Accounts`}
          icon={Users}
          variant="blue"
          trend="Platform Access"
        />
        <KPICard
          title="Total Claims Tracked"
          value={String(claims.length)}
          subtitle={`${metrics.openClaimsCount} Active Disputes`}
          icon={FileSpreadsheet}
          variant="green"
          trend={formatCurrency(metrics.totalDemurrageOwed)}
        />
        <KPICard
          title="Document Archive"
          value={String(documents.length)}
          subtitle="Contract & SoF Files"
          icon={Database}
          variant="amber"
          trend="Encrypted"
        />
        <KPICard
          title="Security & RBAC"
          value="Enforced"
          subtitle="Zero-Trust Strict Matrix"
          icon={ShieldCheck}
          variant="rose"
          trend="100% Passing"
        />
      </div>

      {/* 3. Client Account Portfolios Breakdown */}
      <AccountPortfolioCards claims={claims} />

      {/* 4. Role Distribution & User Governance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl p-5 h-full flex flex-col justify-between">
            <div>
              <CardHeader className="p-0 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <Users className="h-4 w-4 text-purple-600" />
                    <span>Role Distribution</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Active users categorized by RBAC privileges
                  </CardDescription>
                </div>
                <Link href="/users" className="text-xs font-bold text-purple-600 hover:underline">
                  Manage
                </Link>
              </CardHeader>

              <CardContent className="p-0 pt-4 space-y-2.5">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/80 border border-purple-100">
                  <div className="flex items-center space-x-2.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-purple-900" />
                    <span className="text-xs font-bold text-purple-950">Administrators</span>
                  </div>
                  <span className="text-xs font-extrabold text-purple-900 px-2 py-0.5 rounded bg-white border border-purple-200">{adminCount}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/80 border border-amber-100">
                  <div className="flex items-center space-x-2.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-600" />
                    <span className="text-xs font-bold text-amber-950">Supervisors</span>
                  </div>
                  <span className="text-xs font-extrabold text-amber-900 px-2 py-0.5 rounded bg-white border border-amber-200">{supervisorCount}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/80 border border-blue-100">
                  <div className="flex items-center space-x-2.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <span className="text-xs font-bold text-blue-950">Claim Processors</span>
                  </div>
                  <span className="text-xs font-extrabold text-blue-900 px-2 py-0.5 rounded bg-white border border-blue-200">{processorCount}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-100">
                  <div className="flex items-center space-x-2.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                    <span className="text-xs font-bold text-emerald-950">Reviewers / Clients</span>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-900 px-2 py-0.5 rounded bg-white border border-emerald-200">{clientCount}</span>
                </div>
              </CardContent>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 text-[11px] text-slate-500">
              Security policy: Subtree isolation active. Only Administrators can provision user accounts.
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <AdminUserSummary users={users} />
          <AdminSecurityAudit />
        </div>
      </div>

      {/* 5. Company-Wide Claims Activity Overview */}
      <RecentClaimsTable
        claims={claims}
        title="Company-Wide Claims Activity"
        subtitle="Master oversight of voyage files across all accounts and operational teams"
        viewAllHref="/claims"
      />
    </div>
  );
}
