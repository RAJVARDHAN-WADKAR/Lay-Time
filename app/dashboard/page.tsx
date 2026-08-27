"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getClaims, getNotifications, getDocuments } from "@/lib/api";
import { Claim, DocumentRecord, NotificationRecord } from "@/lib/types";
import { calculateDashboardMetrics, filterClaims } from "@/lib/mock/aggregate";
import { formatCurrency, formatCompactNumber } from "@/lib/utils/formatters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { KPICard } from "@/components/ui/kpi-card";
import { useAuth } from "@/lib/context/AuthContext";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  PlusCircle,
  Ship,
  FileText,
  Calculator,
  Bell,
  ArrowRight,
  Inbox,
  Calendar,
  Layers,
  FileBarChart,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";

export default function DashboardPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [timeRange, setTimeRange] = useState<"month" | "last_month" | "3_months" | "year">("month");
  const { currentUser } = useAuth();

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      const [cls, notifs, docs] = await Promise.all([
        getClaims(),
        getNotifications(),
        getDocuments(),
      ]);
      setClaims(cls);
      setNotifications(notifs);
      setDocuments(docs);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    loadAllData();

    const handleStorageChange = () => {
      loadAllData();
    };

    window.addEventListener("demurrage_storage_change", handleStorageChange);
    return () => window.removeEventListener("demurrage_storage_change", handleStorageChange);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const metrics = useMemo(() => {
    return calculateDashboardMetrics(claims, unreadCount);
  }, [claims, unreadCount]);

  // Filter trend data according to selected time range if data exists
  const filteredTrendData = useMemo(() => {
    if (!claims || claims.length === 0) return [];
    return metrics.demurrageTrend;
  }, [claims, metrics]);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Dashboard Top Header / Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-blue-50 text-blue-700 border border-blue-200 uppercase">
              Operations Center
            </span>
            <span className="text-xs text-slate-500">
              Welcome back, <strong className="text-slate-800">{currentUser?.name || "User Name"}</strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Laytime & Demurrage Dashboard
          </h1>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/claims/create">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 px-4 shadow-sm flex items-center space-x-1.5 rounded-xl">
              <PlusCircle className="h-4 w-4" />
              <span>Create Claim</span>
            </Button>
          </Link>
          <Link href="/calculations">
            <Button variant="outline" size="sm" className="text-xs font-semibold h-9 px-3.5 bg-white rounded-xl flex items-center space-x-1.5">
              <Calculator className="h-4 w-4 text-blue-600" />
              <span>Calculator</span>
            </Button>
          </Link>
          <Link href="/documents">
            <Button variant="outline" size="sm" className="text-xs font-semibold h-9 px-3.5 bg-white rounded-xl flex items-center space-x-1.5">
              <FileText className="h-4 w-4 text-slate-600" />
              <span>Documents</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. SECTION 4: 4 DASHBOARD SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Demurrage Owed */}
        <KPICard
          title="Demurrage Owed"
          value={formatCurrency(metrics.totalDemurrageOwed)}
          subtitle={`${metrics.openClaimsCount} Claims`}
          icon={DollarSign}
          variant="blue"
          trend={metrics.totalClaimsCount > 0 ? "Active Exposure" : undefined}
        />

        {/* Card 2: Demurrage Received */}
        <KPICard
          title="Demurrage Received"
          value={formatCurrency(metrics.totalDemurrageReceived)}
          subtitle={`${metrics.settledClaimsCount} Claims`}
          icon={CheckCircle2}
          variant="green"
          trend={metrics.settledClaimsCount > 0 ? "Collected" : undefined}
        />

        {/* Card 3: Exposure */}
        <KPICard
          title="Exposure"
          value={formatCurrency(metrics.totalExposure)}
          subtitle={`${metrics.openClaimsCount} Claims`}
          icon={TrendingUp}
          variant="amber"
          trend={metrics.totalExposure > 0 ? "Unsettled Balance" : undefined}
        />

        {/* Card 4: Under Contention */}
        <KPICard
          title="Under Contention"
          value={formatCurrency(metrics.amountUnderContention)}
          subtitle={`${claims.filter((c) => c.claimStatus === "Disputed").length} Claims`}
          icon={AlertCircle}
          variant="rose"
          trend={metrics.amountUnderContention > 0 ? "Disputed" : undefined}
        />
      </div>

      {/* 3. SECTION 5: CLAIM OVERVIEW (LARGE CHART SECTION) */}
      <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <FileBarChart className="h-4 w-4 text-blue-600" />
              <span>Claim Overview</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Demurrage filed vs received trajectory over time
            </CardDescription>
          </div>

          {/* Time-range Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500">Period:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="text-xs font-semibold rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="3_months">Last 3 Months</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {claims.length > 0 && isMounted && filteredTrendData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredTrendData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFiled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${formatCompactNumber(v)}`} />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl text-xs shadow-xl border border-slate-700 space-y-1">
                            <div className="font-bold text-slate-300">{label}</div>
                            {payload.map((entry: any) => (
                              <div key={entry.name} className="flex justify-between space-x-4">
                                <span style={{ color: entry.color }}>{entry.name}:</span>
                                <span className="font-bold">{formatCurrency(entry.value)}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Area
                    type="monotone"
                    dataKey="filed"
                    name="Filed Demurrage"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorFiled)"
                  />
                  <Area
                    type="monotone"
                    dataKey="received"
                    name="Demurrage Received"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorReceived)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-12">
              <EmptyState
                icon={FileBarChart}
                title="No claim data available"
                description="Charts will automatically populate when you create claims and record demurrage transactions."
                actionText="Create First Claim"
                actionHref="/claims/create"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. SECTION 6 & 7: RECENT CLAIMS & TASKS / NOTIFICATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SECTION 6: RECENT CLAIMS PANEL (2 COLUMNS ON DESKTOP) */}
        <div className="lg:col-span-2">
          <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl h-full flex flex-col justify-between">
            <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Ship className="h-4 w-4 text-blue-600" />
                  <span>Recent Claims</span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Latest registered maritime claims
                </CardDescription>
              </div>

              <Link href="/claims">
                <Button variant="ghost" size="sm" className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  <span>View All</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </CardHeader>

            <CardContent className="p-5 flex-1">
              {claims.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="pb-2">Claim Name / Ship</th>
                        <th className="pb-2">Claim No.</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2 text-right">Days Open</th>
                        <th className="pb-2 text-right">Demurrage</th>
                        <th className="pb-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {claims.slice(0, 5).map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 font-bold text-slate-900">
                            <Link href={`/claims/${c.id}`} className="hover:text-blue-600">
                              <div>{c.claimName || c.shipName}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{c.shipName}</div>
                            </Link>
                          </td>
                          <td className="py-3 font-mono text-[11px] text-slate-600">{c.id}</td>
                          <td className="py-3">
                            <StatusBadge status={c.claimStatus} />
                          </td>
                          <td className="py-3 text-right font-medium text-slate-600">
                            {c.daysOpen || 0}d
                          </td>
                          <td className="py-3 text-right font-bold text-slate-900">
                            {formatCurrency(c.claimFiledAmount)}
                          </td>
                          <td className="py-3 text-center">
                            <Link href={`/claims/${c.id}`}>
                              <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] text-blue-600 hover:bg-blue-50">
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8">
                  <EmptyState
                    icon={Ship}
                    title="No recent claims"
                    description="There are currently no claims registered in the system."
                    actionText="Create New Claim"
                    actionHref="/claims/create"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SECTION 7: TASKS & NOTIFICATIONS (4 SMALL CARDS) */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            Tasks & Operational Workflows
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
            {/* Task Card 1: Claims Awaiting Your Action */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between group hover:border-blue-300 transition">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-700">
                  Claims Awaiting Your Action
                </div>
                <div className="text-xl font-black text-blue-600">
                  {metrics.claimsAwaitingAction} Claims
                </div>
                <div className="text-[10px] text-slate-400">Review & verification pending</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                <Clock className="h-5 w-5" />
              </div>
            </div>

            {/* Task Card 2: Claims Awaiting Documents */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between group hover:border-amber-300 transition">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-700">
                  Claims Awaiting Documents
                </div>
                <div className="text-xl font-black text-amber-600">
                  {metrics.claimsAwaitingDocs} Documents
                </div>
                <div className="text-[10px] text-slate-400">SOF, NOR, or Timesheet missing</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition">
                <FileText className="h-5 w-5" />
              </div>
            </div>

            {/* Task Card 3: Unread Messages */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between group hover:border-purple-300 transition">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-700">
                  Unread Messages
                </div>
                <div className="text-xl font-black text-purple-600">
                  {metrics.unreadNotifications} Messages
                </div>
                <div className="text-[10px] text-slate-400">System alerts & updates</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition">
                <Bell className="h-5 w-5" />
              </div>
            </div>

            {/* Task Card 4: Pending Actions */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between group hover:border-emerald-300 transition">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-700">
                  Pending Actions
                </div>
                <div className="text-xl font-black text-emerald-600">
                  {metrics.pendingActions} Actions
                </div>
                <div className="text-[10px] text-slate-400">Operational tasks in queue</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
                <Layers className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
