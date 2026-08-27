const fs = require('fs');
const path = require('path');

const dashCode = `"use client";

import React, { useEffect, useState, useMemo } from "react";
import { getClaims } from "@/lib/api";
import { Claim, ClaimStatus } from "@/lib/types";
import { calculateDashboardMetrics, filterClaims, DashboardFilters } from "@/lib/mock/aggregate";
import { formatCurrency, formatCompactNumber, formatDate } from "@/lib/utils/formatters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, Input } from "@/components/ui/inputs";
import { useAuth } from "@/lib/context/AuthContext";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  ArrowUpRight,
  Filter,
  RotateCcw,
  PlusCircle,
  Ship,
  ScanText,
  Calculator,
  Bot,
  Layers,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

export default function DashboardPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const { role, currentUser } = useAuth();

  // Filter state
  const [filters, setFilters] = useState<DashboardFilters>({
    client: "ALL",
    claimType: "ALL",
    claimStatus: "ALL",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    setIsMounted(true);
    async function loadData() {
      setIsLoading(true);
      const data = await getClaims();
      setClaims(data);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const filteredClaims = useMemo(() => {
    return filterClaims(claims, filters);
  }, [claims, filters]);

  const metrics = useMemo(() => {
    return calculateDashboardMetrics(filteredClaims);
  }, [filteredClaims]);

  const uniqueClients = useMemo(() => {
    const set = new Set(claims.map((c) => c.accountName));
    return Array.from(set);
  }, [claims]);

  // Urgent attention items (Disputed or Timebarred)
  const urgentClaims = useMemo(() => {
    return claims.filter((c) => c.claimStatus === "Disputed" || c.timebarred || c.claimStatus === "Incomplete").slice(0, 3);
  }, [claims]);

  const resetFilters = () => {
    setFilters({
      client: "ALL",
      claimType: "ALL",
      claimStatus: "ALL",
      startDate: "",
      endDate: "",
    });
  };

  const handleFilterChange = (key: keyof DashboardFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 shadow-md border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase">
                Voyage Ops Console
              </span>
              <span className="text-slate-400 text-xs">• Active Role: <strong className="text-white">{role}</strong></span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Demurrage & Laytime Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time portfolio exposure, automated Statement of Facts discrepancy verification, and laytime settlement reconciliation.
            </p>
          </div>

          {/* Quick Action Buttons Grid */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/claims/create">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md flex items-center space-x-1.5 h-9">
                <PlusCircle className="h-4 w-4" />
                <span>New Claim</span>
              </Button>
            </Link>
            <Link href="/documents">
              <Button variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold h-9 flex items-center space-x-1.5">
                <ScanText className="h-4 w-4 text-blue-400" />
                <span>Upload SoF</span>
              </Button>
            </Link>
            <Link href="/calculations">
              <Button variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold h-9 flex items-center space-x-1.5">
                <Calculator className="h-4 w-4 text-purple-400" />
                <span>Calculations</span>
              </Button>
            </Link>
            <Link href="/ai-assistant">
              <Button variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold h-9 flex items-center space-x-1.5">
                <Bot className="h-4 w-4 text-emerald-400" />
                <span>AI Assistant</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Decorative Background Glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 6 Key Performance Indicator (KPI) Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* KPI 1 */}
        <Card className="border-slate-200 shadow-2xs hover:shadow-xs transition bg-white group hover:border-blue-300">
          <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Demurrage Owed
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-extrabold text-slate-900">
              {formatCurrency(metrics.totalDemurrageOwed)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
              <span>{filteredClaims.length} active files</span>
              <span className="text-blue-600 font-semibold">100% billable</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2 */}
        <Card className="border-slate-200 shadow-2xs hover:shadow-xs transition bg-white group hover:border-emerald-300">
          <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Collected Funds
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-extrabold text-emerald-700">
              {formatCurrency(metrics.totalDemurrageReceived)}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-1">
              {metrics.settledClaimsCount} fully settled voyages
            </div>
          </CardContent>
        </Card>

        {/* KPI 3 */}
        <Card className="border-slate-200 shadow-2xs hover:shadow-xs transition bg-white group hover:border-amber-300">
          <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Open Exposure
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-extrabold text-amber-700">
              {formatCurrency(metrics.totalExposure)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Outstanding receivable balance
            </div>
          </CardContent>
        </Card>

        {/* KPI 4 */}
        <Card className="border-slate-200 shadow-2xs hover:shadow-xs transition bg-white group hover:border-rose-300">
          <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              In Contention
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <AlertCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-extrabold text-rose-700">
              {formatCurrency(metrics.amountUnderContention)}
            </div>
            <div className="text-[10px] text-rose-600 font-semibold mt-1">
              Disputed & incomplete claims
            </div>
          </CardContent>
        </Card>

        {/* KPI 5 */}
        <Card className="border-slate-200 shadow-2xs hover:shadow-xs transition bg-white group hover:border-purple-300">
          <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Avg Processing
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-extrabold text-slate-900">
              {metrics.averageProcessingTimeDays} <span className="text-xs font-normal text-slate-500">days</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              From voyage completion date
            </div>
          </CardContent>
        </Card>

        {/* KPI 6 */}
        <Card className="border-slate-200 shadow-2xs hover:shadow-xs transition bg-white group hover:border-slate-400">
          <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Avg Per Claim
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <Ship className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-extrabold text-slate-900">
              {formatCurrency(metrics.averageDemurragePerClaim)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Average filing value
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Filters Toolbar */}
      <Card className="border-slate-200 shadow-2xs bg-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
              <Filter className="h-3.5 w-3.5 text-blue-600" />
              <span>Interactive Dataset Filtering</span>
              <span className="text-[10px] font-normal text-slate-500 hidden sm:inline">(Re-calculates KPIs & Charts in state)</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-7 text-xs text-slate-500 hover:text-slate-900"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Account / Client</label>
              <Select
                value={filters.client || "ALL"}
                onChange={(e) => handleFilterChange("client", e.target.value)}
                className="h-8 text-xs"
              >
                <option value="ALL">All Clients ({uniqueClients.length})</option>
                {uniqueClients.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Claim Type</label>
              <Select
                value={filters.claimType || "ALL"}
                onChange={(e) => handleFilterChange("claimType", e.target.value)}
                className="h-8 text-xs"
              >
                <option value="ALL">All Claim Types</option>
                <option value="Load Port Demurrage">Load Port Demurrage</option>
                <option value="Discharge Port Demurrage">Discharge Port Demurrage</option>
                <option value="Combined Demurrage">Combined Demurrage</option>
                <option value="Despatch">Despatch</option>
                <option value="Detention">Detention</option>
              </Select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Claim Status</label>
              <Select
                value={filters.claimStatus || "ALL"}
                onChange={(e) => handleFilterChange("claimStatus", e.target.value)}
                className="h-8 text-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Incomplete">Incomplete</option>
                <option value="Review">Review</option>
                <option value="Settled">Settled</option>
                <option value="Disputed">Disputed</option>
                <option value="Timebarred">Timebarred</option>
              </Select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Start Date</label>
              <Input
                type="date"
                value={filters.startDate || ""}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">End Date</label>
              <Input
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Donut Chart */}
        <Card className="border-slate-200 shadow-2xs bg-white">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-sm font-bold text-slate-900">Claim Status Distribution</CardTitle>
            <CardDescription>Workflow allocation of filtered claims</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="h-64 w-full">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="status"
                    >
                      {metrics.statusDistribution.map((entry, index) => (
                        <Cell key={\`cell-\${index}\`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-lg border border-slate-700">
                              <div className="font-bold">{data.status}</div>
                              <div className="text-slate-300 mt-1">{data.count} Claims</div>
                              <div className="text-blue-400 font-semibold">{formatCurrency(data.value)}</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Demurrage Trend Area Chart */}
        <Card className="lg:col-span-2 border-slate-200 shadow-2xs bg-white">
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">Demurrage & Collection Trend (USD)</CardTitle>
              <CardDescription>Filing volume vs cash recovery realization over time</CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px]">Monthly Aggregation</Badge>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="h-64 w-full">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.demurrageTrend} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorFiled" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickFormatter={(val) => \`$\${formatCompactNumber(val)}\`}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-lg text-xs shadow-lg border border-slate-700 space-y-1">
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
                    <Legend verticalAlign="top" height={30} />
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
                      name="Payment Collected"
                      stroke="#059669"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorReceived)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Counterparty Exposure & High-Priority Urgent Action Files */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Counterparty Exposure Horizontal Bar */}
        <Card className="border-slate-200 shadow-2xs bg-white">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-sm font-bold text-slate-900">Counterparty Exposure Ranking</CardTitle>
            <CardDescription>Top open receivable exposures by trading entity</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="h-64 w-full">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={metrics.clientExposure}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      stroke="#94a3b8"
                      fontSize={10}
                      tickFormatter={(val) => \`$\${formatCompactNumber(val)}\`}
                    />
                    <YAxis dataKey="client" type="category" stroke="#94a3b8" fontSize={10} width={90} />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-lg border border-slate-700">
                              <div className="font-bold">{data.client}</div>
                              <div className="text-blue-400 font-bold mt-1">Exposure: {formatCurrency(data.exposure)}</div>
                              <div className="text-slate-400 text-[10px]">{data.claimCount} Active Claim(s)</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="exposure" name="Exposure" fill="#0284c7" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Priority Action Snapshot */}
        <Card className="lg:col-span-2 border-slate-200 shadow-2xs bg-white">
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">Priority Claims Ledger Snapshot</CardTitle>
              <CardDescription>Active claims requiring immediate operator review or action</CardDescription>
            </div>
            <Link href="/claims">
              <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700">
                <span>Open Full Ledger ({claims.length})</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-2.5">Vessel / Claim</th>
                    <th className="pb-2.5">Charterer</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5 text-right">Filed Amount</th>
                    <th className="pb-2.5 text-right">Days Open</th>
                    <th className="pb-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredClaims.slice(0, 5).map((c) => (
                    <tr key={c.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-2.5 font-bold text-slate-900">
                        <Link href={\`/claims/\${c.id}\`} className="hover:text-blue-600 flex items-center space-x-1.5">
                          <Ship className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <div>
                            <div>{c.shipName}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{c.id}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="py-2.5 text-slate-600">{c.accountName}</td>
                      <td className="py-2.5">
                        <Badge status={c.claimStatus} />
                      </td>
                      <td className="py-2.5 text-right font-extrabold text-slate-900">
                        {formatCurrency(c.claimFiledAmount)}
                      </td>
                      <td className="py-2.5 text-right text-slate-600 font-medium">{c.daysOpen}d</td>
                      <td className="py-2.5 text-center">
                        <Link href={\`/claims/\${c.id}\`}>
                          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs text-blue-600 hover:bg-blue-50">
                            View File
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {filteredClaims.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No claims match the active filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(process.cwd(), 'app/dashboard/page.tsx'), dashCode, 'utf8');
console.log('Updated app/dashboard/page.tsx with attractive styling');
