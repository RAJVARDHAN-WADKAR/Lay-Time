"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getClaims } from "@/lib/api";
import { Claim } from "@/lib/types";
import { calculateTimebarCompliance } from "@/lib/calculations/timebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/formatters";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  Ship,
  Calendar,
  ShieldCheck,
  Send,
  Download
} from "lucide-react";
import { useToast } from "@/lib/hooks/useToast";

export default function TimeBarMonitorPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Safe" | "Approaching" | "Urgent" | "Timebarred">("ALL");
  const [clientFilter, setClientFilter] = useState<string>("ALL");
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

  // Compute timebar details for each claim
  const processedClaims = useMemo(() => {
    return claims.map((c) => {
      const tb = calculateTimebarCompliance(c);

      // Determine synthesized status
      let status: "Safe" | "Approaching" | "Urgent" | "Timebarred" = "Safe";
      if (tb.isTimebarred) {
        status = "Timebarred";
      } else if (tb.claimDaysRemaining <= 10 || tb.noticeDaysRemaining <= 5) {
        status = "Urgent";
      } else if (tb.claimDaysRemaining <= 30 || tb.noticeDaysRemaining <= 14) {
        status = "Approaching";
      }

      return {
        claim: c,
        timebar: tb,
        computedStatus: status,
        daysRemaining: tb.claimDaysRemaining,
        deadlineDate: tb.claimDeadline !== "—" ? tb.claimDeadline : tb.noticeDeadline,
        claimDate: c.claimReceivedDate || c.voyageEndDate || c.createdAt.split("T")[0]
      };
    });
  }, [claims]);

  // Clients list
  const uniqueClients = useMemo(() => {
    return Array.from(new Set(claims.map((c) => c.accountName).filter(Boolean)));
  }, [claims]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return processedClaims.filter((row) => {
      if (statusFilter !== "ALL" && row.computedStatus !== statusFilter) return false;
      if (clientFilter !== "ALL" && row.claim.accountName !== clientFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          row.claim.id.toLowerCase().includes(q) ||
          row.claim.shipName.toLowerCase().includes(q) ||
          row.claim.accountName.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [processedClaims, statusFilter, clientFilter, searchTerm]);

  // Summary counts
  const counts = useMemo(() => {
    return {
      total: processedClaims.length,
      safe: processedClaims.filter((r) => r.computedStatus === "Safe").length,
      approaching: processedClaims.filter((r) => r.computedStatus === "Approaching").length,
      urgent: processedClaims.filter((r) => r.computedStatus === "Urgent").length,
      timebarred: processedClaims.filter((r) => r.computedStatus === "Timebarred").length
    };
  }, [processedClaims]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Charterparty Time-Bar Monitor
            </h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 font-bold border-blue-200">
              Contractual Deadlines
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Proactive tracking of Notice of Demurrage and Formal Claim submission deadlines to avoid irreversible time-bar forfeiture.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => success("Export Complete", "Time-bar audit log exported to CSV")}
            className="text-xs font-semibold h-9 px-3.5 bg-white rounded-xl flex items-center space-x-1.5"
          >
            <Download className="h-4 w-4 text-slate-600" />
            <span>Export Schedule</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => setStatusFilter(statusFilter === "Safe" ? "ALL" : "Safe")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === "Safe"
              ? "bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20"
              : "bg-white border-slate-200 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Safe Deadlines</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1.5">{counts.safe}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">&gt; 30 days remaining</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "Approaching" ? "ALL" : "Approaching")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === "Approaching"
              ? "bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/20"
              : "bg-white border-slate-200 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Approaching</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1.5">{counts.approaching}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">10 - 30 days remaining</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "Urgent" ? "ALL" : "Urgent")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === "Urgent"
              ? "bg-rose-50/80 border-rose-400 ring-2 ring-rose-500/20"
              : "bg-white border-slate-200 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Urgent Attention</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1.5">{counts.urgent}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">&lt; 10 days remaining</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "Timebarred" ? "ALL" : "Timebarred")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === "Timebarred"
              ? "bg-slate-100 border-slate-400 ring-2 ring-slate-500/20"
              : "bg-white border-slate-200 hover:border-slate-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Timebarred</span>
            <AlertCircle className="h-4 w-4 text-slate-600" />
          </div>
          <div className="text-2xl font-black text-slate-800 mt-1.5">{counts.timebarred}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Deadline expired</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by claim ID, vessel, or counterparty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs font-medium rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses ({counts.total})</option>
            <option value="Safe">Safe ({counts.safe})</option>
            <option value="Approaching">Approaching ({counts.approaching})</option>
            <option value="Urgent">Urgent ({counts.urgent})</option>
            <option value="Timebarred">Timebarred ({counts.timebarred})</option>
          </select>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="text-xs font-medium rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Clients</option>
            {uniqueClients.map((client) => (
              <option key={client} value={client}>
                {client}
              </option>
            ))}
          </select>

          {(searchTerm || statusFilter !== "ALL" || clientFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
                setClientFilter("ALL");
              }}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Main Time-Bar Table */}
      <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Claim</th>
                  <th className="py-3.5 px-4">Client / Counterparty</th>
                  <th className="py-3.5 px-4">Claim Date</th>
                  <th className="py-3.5 px-4">Notice Window</th>
                  <th className="py-3.5 px-4">Claim Window</th>
                  <th className="py-3.5 px-4">Time-Bar Date</th>
                  <th className="py-3.5 px-4 text-center">Days Remaining</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRows.map((row) => {
                  const isLate = row.computedStatus === "Timebarred";
                  const isUrgent = row.computedStatus === "Urgent";
                  const isApproaching = row.computedStatus === "Approaching";

                  return (
                    <tr
                      key={row.claim.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isLate
                          ? "bg-rose-50/30"
                          : isUrgent
                          ? "bg-amber-50/30"
                          : ""
                      }`}
                    >
                      {/* Claim ID & Ship */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/claims/${row.claim.id}`}
                          className="font-bold text-slate-900 hover:text-blue-600 block"
                        >
                          {row.claim.id}
                        </Link>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                          <Ship className="h-3 w-3 text-blue-500" />
                          <span>{row.claim.shipName}</span>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-4 font-medium text-slate-800 max-w-[180px] truncate">
                        {row.claim.accountName}
                      </td>

                      {/* Claim Date */}
                      <td className="py-3.5 px-4 text-slate-600 font-mono">
                        {row.claimDate ? formatDate(row.claimDate) : "—"}
                      </td>

                      {/* Notice Period */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="font-semibold">{row.claim.noticeTimebarDays || 30} days</span>
                        <span className="text-[10px] text-slate-400 block">from NOR/voyage</span>
                      </td>

                      {/* Claim Period */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="font-semibold">{row.claim.claimTimebarDays || 90} days</span>
                        <span className="text-[10px] text-slate-400 block">under {row.claim.cpType}</span>
                      </td>

                      {/* Timebar Deadline Date */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {row.deadlineDate !== "—" ? formatDate(row.deadlineDate) : "—"}
                      </td>

                      {/* Days Remaining Countdown */}
                      <td className="py-3.5 px-4 text-center">
                        {isLate ? (
                          <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800">
                            EXPIRED
                          </span>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`text-xs font-black ${
                                isUrgent
                                  ? "text-rose-600"
                                  : isApproaching
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {row.daysRemaining} days
                            </span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                              <div
                                className={`h-full rounded-full ${
                                  isUrgent
                                    ? "bg-rose-500"
                                    : isApproaching
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{
                                  width: `${Math.min(
                                    Math.max((row.daysRemaining / (row.claim.claimTimebarDays || 90)) * 100, 5),
                                    100
                                  )}%`
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                            isLate
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : isUrgent
                              ? "bg-rose-50 text-rose-700 border border-rose-300 animate-pulse"
                              : isApproaching
                              ? "bg-amber-50 text-amber-800 border border-amber-300"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-300"
                          }`}
                        >
                          {row.computedStatus}
                        </span>
                      </td>

                      {/* Action Links */}
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <Link href={`/claims/${row.claim.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
