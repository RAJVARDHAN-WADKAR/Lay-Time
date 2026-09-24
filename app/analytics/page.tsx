"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getClaims } from "@/lib/api";
import { Claim } from "@/lib/types";
import { calculateDashboardMetrics, filterClaims } from "@/lib/mock/aggregate";
import { formatCurrency, formatCompactNumber } from "@/lib/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Clock,
  PieChart as PieIcon,
  ShieldAlert,
  Calendar,
  Filter,
  Download
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { useToast } from "@/lib/hooks/useToast";

export default function AnalyticsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [timeRange, setTimeRange] = useState("year");
  const { success } = useToast();

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const data = await getClaims();
      setClaims(data);
      setIsLoading(false);
    }
    load();
  }, []);

  const uniqueClients = useMemo(() => {
    return Array.from(new Set(claims.map((c) => c.accountName).filter(Boolean)));
  }, [claims]);

  const filteredClaims = useMemo(() => {
    return filterClaims(claims, {
      client: selectedClient !== "ALL" ? selectedClient : undefined,
      claimType: selectedType !== "ALL" ? selectedType : undefined
    });
  }, [claims, selectedClient, selectedType]);

  const metrics = useMemo(() => {
    return calculateDashboardMetrics(filteredClaims);
  }, [filteredClaims]);

  // Chart 1: Demurrage Monthly Trend
  const trendData = useMemo(() => {
    return metrics.demurrageTrend;
  }, [metrics]);

  // Chart 2: Claims by Status
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of filteredClaims) {
      counts[c.claimStatus] = (counts[c.claimStatus] || 0) + 1;
    }
    const colors: Record<string, string> = {
      Submitted: "#3b82f6",
      Incomplete: "#f59e0b",
      Review: "#8b5cf6",
      Settled: "#10b981",
      Disputed: "#ef4444",
      Timebarred: "#64748b"
    };
    return Object.keys(counts).map((k) => ({
      name: k,
      count: counts[k],
      color: colors[k] || "#3b82f6"
    }));
  }, [filteredClaims]);

  // Chart 3: Claim Amount by Client
  const clientData = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    for (const c of filteredClaims) {
      const clientShort = (c.accountName || "Other")
        .replace(" Trading Pte Ltd", "")
        .replace(" International SA", "")
        .replace(" Marine Products", "")
        .replace(" Group", "");
      if (!map[clientShort]) map[clientShort] = { amount: 0, count: 0 };
      map[clientShort].amount += c.claimFiledAmount || 0;
      map[clientShort].count += 1;
    }
    return Object.keys(map).map((k) => ({
      client: k,
      amount: map[k].amount,
      count: map[k].count
    }));
  }, [filteredClaims]);

  // Chart 4: Claims by Type
  const typeData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of filteredClaims) {
      const t = c.claimType || "Other";
      map[t] = (map[t] || 0) + 1;
    }
    return Object.keys(map).map((k) => ({
      type: k.replace(" Demurrage", ""),
      count: map[k]
    }));
  }, [filteredClaims]);

  // Chart 5: Time-Bar Risk Breakdown
  const timeBarRiskData = useMemo(() => {
    let safe = 0;
    let approaching = 0;
    let urgent = 0;
    let timebarred = 0;

    for (const c of filteredClaims) {
      if (c.timebarred) {
        timebarred++;
      } else {
        const days = c.claimTimebarDays || 90;
        const open = c.daysOpen || 0;
        const remain = days - open;
        if (remain <= 0) timebarred++;
        else if (remain <= 10) urgent++;
        else if (remain <= 30) approaching++;
        else safe++;
      }
    }

    return [
      { name: "Safe (>30d)", count: safe, color: "#10b981" },
      { name: "Approaching (10-30d)", count: approaching, color: "#f59e0b" },
      { name: "Urgent (<10d)", count: urgent, color: "#ef4444" },
      { name: "Timebarred", count: timebarred, color: "#64748b" }
    ];
  }, [filteredClaims]);

  // Chart 6: Contention Amount vs Agreed
  const contentionComparisonData = useMemo(() => {
    return [
      {
        category: "Total Claims Financials",
        Filed: metrics.totalDemurrageOwed,
        Received: metrics.totalDemurrageReceived,
        UnderContention: metrics.amountUnderContention
      }
    ];
  }, [metrics]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Demurrage & Laytime Analytics
            </h1>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 font-bold border-indigo-200">
              Interactive BI
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Commercial intelligence, exposure distribution, time-bar vulnerability, and multi-berth settlement velocity.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => success("Export Complete", "Analytics dataset exported to CSV")}
            className="text-xs font-semibold h-9 px-3.5 bg-white rounded-xl flex items-center space-x-1.5"
          >
            <Download className="h-4 w-4 text-slate-600" />
            <span>Export BI Data</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-500">
          <Filter className="h-3.5 w-3.5" />
          <span>Filters:</span>
        </div>

        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="text-xs font-semibold rounded-xl border border-slate-200 px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Clients</option>
          {uniqueClients.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="text-xs font-semibold rounded-xl border border-slate-200 px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Claim Types</option>
          <option value="Discharge Port Demurrage">Discharge Port Demurrage</option>
          <option value="Load Port Demurrage">Load Port Demurrage</option>
          <option value="Combined Demurrage">Combined Demurrage</option>
          <option value="Despatch">Despatch</option>
        </select>

        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="text-xs font-semibold rounded-xl border border-slate-200 px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="year">Full Year 2024</option>
          <option value="quarter">Current Quarter</option>
          <option value="month">Current Month</option>
        </select>

        {(selectedClient !== "ALL" || selectedType !== "ALL") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedClient("ALL");
              setSelectedType("ALL");
            }}
            className="text-xs text-slate-500 hover:text-slate-900"
          >
            Reset
          </Button>
        )}
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Demurrage Owed</span>
          <div className="text-xl font-black text-blue-600 mt-1">
            {formatCurrency(metrics.totalDemurrageOwed)}
          </div>
          <span className="text-[10px] text-slate-400">{filteredClaims.length} Claims Total</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Demurrage Received</span>
          <div className="text-xl font-black text-emerald-600 mt-1">
            {formatCurrency(metrics.totalDemurrageReceived)}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">
            {metrics.totalDemurrageOwed > 0
              ? `${Math.round((metrics.totalDemurrageReceived / metrics.totalDemurrageOwed) * 100)}% Collection Rate`
              : "0%"}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Avg Processing Time</span>
          <div className="text-xl font-black text-slate-800 mt-1">
            {metrics.averageProcessingTimeDays} Days
          </div>
          <span className="text-[10px] text-slate-400">Creation to Settlement</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Under Contention</span>
          <div className="text-xl font-black text-rose-600 mt-1">
            {formatCurrency(metrics.amountUnderContention)}
          </div>
          <span className="text-[10px] text-rose-500 font-semibold">Disputed Operational Hours</span>
        </div>
      </div>

      {/* Row 1: Demurrage Monthly Trend (Large Area Chart) */}
      <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span>Demurrage Trajectory Trend (Monthly USD)</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Monthly comparison of Filed Claims vs Realized Collections vs Agreed Settlements
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaFiled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="areaReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${formatCompactNumber(v)}`} />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value)), ""]}
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px" }}
                />
                <Legend verticalAlign="top" height={36} />
                <Area type="monotone" dataKey="filed" name="Filed Demurrage" stroke="#2563eb" strokeWidth={2.5} fill="url(#areaFiled)" />
                <Area type="monotone" dataKey="received" name="Received Settlement" stroke="#10b981" strokeWidth={2.5} fill="url(#areaReceived)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Row 2: Client Analysis & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Analysis Bar Chart */}
        <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <span>Claim Amount by Client (Exposure USD)</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Aggregated financial exposure per principal charterer
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                  <XAxis type="number" tickFormatter={(v) => `$${formatCompactNumber(v)}`} stroke="#94a3b8" fontSize={10} />
                  <YAxis type="category" dataKey="client" stroke="#64748b" fontSize={11} width={80} />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value)), "Claim Amount"]}
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px" }}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Claims by Status Pie Chart */}
        <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <PieIcon className="h-4 w-4 text-purple-600" />
              <span>Claims by Status</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Current workflow state distribution
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [`${val} Claims`, name]}
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Claims by Type & Time-Bar Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Claims by Type */}
        <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span>Claims by Operational Category</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Distribution of Load vs Discharge Demurrage, Despatch, and Detention
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="type" stroke="#94a3b8" fontSize={10} angle={-15} textAnchor="end" />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px" }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Time-Bar Risk Breakdown */}
        <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              <span>Time-Bar Exposure Risk Profile</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Active claims categorized by time-bar urgency countdown
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeBarRiskData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px" }} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {timeBarRiskData.map((entry, idx) => (
                      <Cell key={`bar-${idx}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
