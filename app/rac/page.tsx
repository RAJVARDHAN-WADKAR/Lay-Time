"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { getRacCases } from "@/lib/api/rac";
import { RacCase, RacStatus, RacType } from "@/lib/types";
import {
  Briefcase,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  Filter,
  PlusCircle,
  ArrowUpRight,
  FileText
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { formatCurrency } from "@/lib/utils/formatters";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  Draft: "#94A3B8",
  Submitted: "#3B82F6",
  "Under Review": "#F59E0B",
  "Correction Required": "#EF4444",
  Reviewed: "#10B981",
  Closed: "#64748B"
};

export default function RacDashboardPage() {
  const { currentUser, role } = useAuth();
  const [cases, setCases] = useState<RacCase[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [clientFilter, setClientFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const loadCases = async () => {
    setLoading(true);
    try {
      const data = await getRacCases({
        status: statusFilter,
        racType: typeFilter,
        client: clientFilter
      });
      setCases(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [clientFilter, statusFilter, typeFilter]);

  // Calculations
  const totalCases = cases.length;
  const openCases = cases.filter((c) => c.status !== "Closed").length;
  const closedCases = cases.filter((c) => c.status === "Closed").length;
  const pendingReview = cases.filter((c) => c.status === "Under Review" || c.status === "Submitted").length;
  const correctionRequired = cases.filter((c) => c.status === "Correction Required").length;

  const totalAmount = cases.reduce((acc, c) => acc + (c.totalAmount || 0), 0);
  const agreedAmount = cases.reduce((acc, c) => acc + (c.agreedAmount || 0), 0);
  const outstandingAmount = cases.reduce((acc, c) => acc + (c.outstandingAmount || 0), 0);

  // Status breakdown for Pie Chart
  const statusCounts = Object.keys(STATUS_COLORS).map((st) => {
    const matched = cases.filter((c) => c.status === st);
    return {
      name: st,
      count: matched.length,
      value: matched.reduce((acc, c) => acc + (c.totalAmount || 0), 0),
      color: STATUS_COLORS[st]
    };
  }).filter((item) => item.count > 0);

  // Type Breakdown for Bar Chart
  const typeCountsMap = new Map<string, number>();
  cases.forEach((c) => {
    typeCountsMap.set(c.racType, (typeCountsMap.get(c.racType) || 0) + c.totalAmount);
  });
  const typeData = Array.from(typeCountsMap.entries()).map(([type, amount]) => ({
    type: type.length > 18 ? type.substring(0, 16) + "..." : type,
    amount
  }));

  const uniqueClients = Array.from(new Set(cases.map((c) => c.clientName)));

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">RAC Executive Dashboard</h1>
              <p className="text-xs text-slate-500">
                Recoverable Additional Costs, Pumping Warranties & Port Expense Disputes
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {role !== "Reviewer" && (
            <Link href="/rac/create">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-3.5 shadow-xs flex items-center space-x-1.5 rounded-lg cursor-pointer">
                <PlusCircle className="h-4 w-4" />
                <span>Create RAC Case</span>
              </Button>
            </Link>
          )}
          <Link href="/rac/cases">
            <Button variant="outline" size="sm" className="text-xs h-9 px-3.5 rounded-lg cursor-pointer">
              <span>View All Cases ({totalCases})</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 mr-2">
          <Filter className="h-3.5 w-3.5" />
          <span>Filters:</span>
        </div>

        {/* Client filter */}
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:border-blue-500"
        >
          <option value="All">All Clients</option>
          {uniqueClients.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:border-blue-500"
        >
          <option value="All">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Submitted">Submitted</option>
          <option value="Under Review">Under Review</option>
          <option value="Correction Required">Correction Required</option>
          <option value="Reviewed">Reviewed</option>
          <option value="Closed">Closed</option>
        </select>

        {/* RAC Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:border-blue-500"
        >
          <option value="All">All Dispute Types</option>
          <option value="Demurrage Review">Demurrage Review</option>
          <option value="Additional Port Costs">Additional Port Costs</option>
          <option value="Pumping Warranty Contention">Pumping Warranty Contention</option>
          <option value="Berth Allocation Audit">Berth Allocation Audit</option>
          <option value="Special Cargo Handling">Special Cargo Handling</option>
        </select>

        {(clientFilter !== "All" || statusFilter !== "All" || typeFilter !== "All") && (
          <button
            onClick={() => {
              setClientFilter("All");
              setStatusFilter("All");
              setTypeFilter("All");
            }}
            className="text-xs text-blue-600 hover:underline font-medium ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total RAC Exposure"
          value={formatCurrency(totalAmount)}
          subtitle={`${totalCases} total registered cases`}
          icon={DollarSign}
          variant="blue"
        />
        <KPICard
          title="Agreed Recoveries"
          value={formatCurrency(agreedAmount)}
          subtitle="Settled with counterparties"
          icon={CheckCircle2}
          variant="green"
        />
        <KPICard
          title="Outstanding Recoverable"
          value={formatCurrency(outstandingAmount)}
          subtitle="Active recovery exposure"
          icon={TrendingUp}
          variant="amber"
        />
        <KPICard
          title="Pending Supervisor Review"
          value={String(pendingReview)}
          subtitle={`${correctionRequired} requires analyst correction`}
          icon={Clock}
          variant="rose"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Pie */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Case Status Distribution</h3>
            <span className="text-xs text-slate-400 font-medium">By Volume</span>
          </div>

          <div className="h-56">
            {statusCounts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusCounts}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {statusCounts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any, item: any) => [
                      `${value} cases (${formatCurrency(item.payload.value)})`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No matching cases
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-100">
            {statusCounts.map((s) => (
              <div key={s.name} className="flex items-center space-x-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-slate-600 truncate">{s.name}:</span>
                <span className="font-bold text-slate-900 ml-auto">{s.count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Dispute Category Breakdown */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Financial Exposure by Dispute Category</h3>
            <span className="text-xs text-slate-400 font-medium">USD Value</span>
          </div>

          <div className="h-64">
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} fontSize={11} />
                  <YAxis type="category" dataKey="type" width={140} fontSize={11} />
                  <Tooltip formatter={(val: any) => [formatCurrency(val), "Exposure"]} />
                  <Bar dataKey="amount" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No data available
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Active High-Priority RAC Cases Table */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Active High-Priority RAC Cases</h3>
            <p className="text-xs text-slate-500">Cases requiring urgent review, calculations, or evidence validation</p>
          </div>
          <Link href="/rac/cases" className="text-xs font-semibold text-blue-600 hover:underline flex items-center space-x-1">
            <span>View Ledger</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                <th className="py-2.5 px-3 font-semibold">RAC Reference</th>
                <th className="py-2.5 px-3 font-semibold">Client</th>
                <th className="py-2.5 px-3 font-semibold">Vessel</th>
                <th className="py-2.5 px-3 font-semibold">Dispute Type</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right">Claim Amount</th>
                <th className="py-2.5 px-3 font-semibold">Assigned Analyst</th>
                <th className="py-2.5 px-3 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cases.slice(0, 5).map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-2.5 px-3 font-bold text-blue-600">
                    <Link href={`/rac/cases/${c.id}`} className="hover:underline">
                      {c.racReference}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">{c.clientName}</td>
                  <td className="py-2.5 px-3 text-slate-700">{c.shipName}</td>
                  <td className="py-2.5 px-3 text-slate-600">{c.racType}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        backgroundColor: `${STATUS_COLORS[c.status]}20`,
                        color: STATUS_COLORS[c.status]
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 text-right">{formatCurrency(c.totalAmount)}</td>
                  <td className="py-2.5 px-3 text-slate-600">{c.assignedTo}</td>
                  <td className="py-2.5 px-3 text-center">
                    <Link href={`/rac/cases/${c.id}`}>
                      <Button variant="outline" size="sm" className="text-[11px] h-7 px-2 rounded">
                        Inspect
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
