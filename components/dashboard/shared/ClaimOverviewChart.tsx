"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatCompactNumber } from "@/lib/utils/formatters";
import { Claim, DashboardMetrics } from "@/lib/types";
import { FileBarChart } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";

interface ClaimOverviewChartProps {
  claims: Claim[];
  metrics: DashboardMetrics;
  isMounted: boolean;
}

export function ClaimOverviewChart({ claims, metrics, isMounted }: ClaimOverviewChartProps) {
  const [timeRange, setTimeRange] = useState<"month" | "last_month" | "3_months" | "year">("month");

  const filteredTrendData = useMemo(() => {
    if (!claims || claims.length === 0) return [];
    return metrics.demurrageTrend || [];
  }, [claims, metrics]);

  return (
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
  );
}
