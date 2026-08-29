"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { getRacCases, updateRacCase, deleteRacCase } from "@/lib/api/rac";
import { RacCase, RacStatus, RacType } from "@/lib/types";
import {
  Briefcase,
  Search,
  Filter,
  Download,
  PlusCircle,
  Eye,
  Edit2,
  Trash2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
  FileSpreadsheet
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/formatters";

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700 border-slate-300",
  Submitted: "bg-blue-50 text-blue-700 border-blue-200",
  "Under Review": "bg-amber-50 text-amber-700 border-amber-200",
  "Correction Required": "bg-rose-50 text-rose-700 border-rose-200",
  Reviewed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Closed: "bg-slate-200 text-slate-800 border-slate-300"
};

export default function RacCasesPage() {
  const { currentUser, role, canEditRac } = useAuth();
  const [cases, setCases] = useState<RacCase[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [clientFilter, setClientFilter] = useState("All");

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<RacStatus>("Draft");
  const [editAgreedAmt, setEditAgreedAmt] = useState<number>(0);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const loadCases = async () => {
    setLoading(true);
    try {
      const data = await getRacCases({
        status: statusFilter,
        racType: typeFilter,
        client: clientFilter,
        search
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
  }, [statusFilter, typeFilter, clientFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCases();
  };

  const handleInlineSave = async (caseId: string) => {
    try {
      const currentCase = cases.find((c) => c.id === caseId);
      if (!currentCase) return;

      const outstanding = Math.max(0, currentCase.totalAmount - editAgreedAmt);
      await updateRacCase(caseId, {
        status: editStatus,
        agreedAmount: editAgreedAmt,
        outstandingAmount: outstanding
      });

      setEditingId(null);
      loadCases();
    } catch (e) {
      alert("Failed to update RAC case");
    }
  };

  const handleDelete = async (caseId: string) => {
    if (!confirm("Are you sure you want to delete this RAC case?")) return;
    try {
      await deleteRacCase(caseId);
      loadCases();
    } catch (e) {
      alert("Failed to delete RAC case");
    }
  };

  const handleExportCsv = () => {
    const headers = ["RAC Reference", "Client", "Vessel", "Voyage", "Dispute Type", "Status", "Total Amount", "Agreed Amount", "Outstanding", "Assigned Processor", "Created Date"];
    const rows = cases.map((c) => [
      c.racReference,
      c.clientName,
      c.shipName,
      c.voyageNumber || "",
      c.racType,
      c.status,
      c.totalAmount,
      c.agreedAmount,
      c.outstandingAmount,
      c.assignedTo,
      c.createdAt.slice(0, 10)
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `RAC_Cases_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uniqueClients = Array.from(new Set(cases.map((c) => c.clientName)));
  const totalPages = Math.ceil(cases.length / pageSize) || 1;
  const paginatedCases = cases.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {role === "Claim Processor" ? "Assigned RAC Cases" : "Master RAC Cases Ledger"}
              </h1>
              <p className="text-xs text-slate-500">
                {role === "Claim Processor"
                  ? "Showing RAC dispute files assigned to your account"
                  : "Centralized repository for additional port expenses, pumping disputes, and detention claims"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            onClick={handleExportCsv}
            variant="outline"
            size="sm"
            className="text-xs h-9 px-3.5 rounded-lg flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>

          {role !== "Reviewer" && (
            <Link href="/rac/create">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-3.5 shadow-xs flex items-center space-x-1.5 rounded-lg cursor-pointer">
                <PlusCircle className="h-4 w-4" />
                <span>Create RAC</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference, vessel, client..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-hidden focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Correction Required">Correction Required</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Closed">Closed</option>
            </select>

            {/* RAC Type */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-hidden focus:border-blue-500"
            >
              <option value="All">All Dispute Types</option>
              <option value="Demurrage Review">Demurrage Review</option>
              <option value="Additional Port Costs">Additional Port Costs</option>
              <option value="Pumping Warranty Contention">Pumping Warranty Contention</option>
              <option value="Berth Allocation Audit">Berth Allocation Audit</option>
              <option value="Special Cargo Handling">Special Cargo Handling</option>
            </select>

            {/* Client */}
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-hidden focus:border-blue-500"
            >
              <option value="All">All Clients</option>
              {uniqueClients.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">RAC Ref</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Vessel & Voyage</th>
                <th className="py-3 px-4">Dispute Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Claim Amount</th>
                <th className="py-3 px-4 text-right">Agreed Settlement</th>
                <th className="py-3 px-4">Assigned Analyst</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading RAC cases from database...
                  </td>
                </tr>
              ) : paginatedCases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No RAC cases found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedCases.map((c) => {
                  const isEditing = editingId === c.id;
                  const canEdit = canEditRac(c.assignedTo);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      {/* Ref */}
                      <td className="py-3 px-4 font-bold text-blue-600">
                        <Link href={`/rac/cases/${c.id}`} className="hover:underline flex items-center space-x-1">
                          <span>{c.racReference}</span>
                        </Link>
                      </td>

                      {/* Client */}
                      <td className="py-3 px-4 font-semibold text-slate-900">{c.clientName}</td>

                      {/* Vessel */}
                      <td className="py-3 px-4 text-slate-700">
                        <div className="font-medium">{c.shipName}</div>
                        <div className="text-[10px] text-slate-400">{c.voyageNumber || "N/A"}</div>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-4 text-slate-600">{c.racType}</td>

                      {/* Status (Inline editable) */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as RacStatus)}
                            className="text-xs bg-white border border-blue-400 rounded px-1.5 py-0.5"
                          >
                            <option value="Draft">Draft</option>
                            <option value="Submitted">Submitted</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Correction Required">Correction Required</option>
                            <option value="Reviewed">Reviewed</option>
                            <option value="Closed">Closed</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[c.status] || "bg-slate-100"}`}>
                            {c.status}
                          </span>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(c.totalAmount)}
                      </td>

                      {/* Agreed Amount (Inline editable) */}
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editAgreedAmt}
                            onChange={(e) => setEditAgreedAmt(Number(e.target.value))}
                            className="w-24 text-right text-xs bg-white border border-blue-400 rounded px-1.5 py-0.5"
                          />
                        ) : (
                          formatCurrency(c.agreedAmount || 0)
                        )}
                      </td>

                      {/* Assigned Processor */}
                      <td className="py-3 px-4 text-slate-600">{c.assignedTo}</td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleInlineSave(c.id)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                title="Save changes"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <Link href={`/rac/cases/${c.id}`} className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded" title="View details">
                                <Eye className="h-4 w-4" />
                              </Link>
                              {canEdit && (
                                <button
                                  onClick={() => {
                                    setEditingId(c.id);
                                    setEditStatus(c.status);
                                    setEditAgreedAmt(c.agreedAmount || 0);
                                  }}
                                  className="p-1 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded"
                                  title="Quick Edit"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {(role === "Admin" || role === "Supervisor") && (
                                <button
                                  onClick={() => handleDelete(c.id)}
                                  className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded"
                                  title="Delete Case"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700">{(page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-700">{Math.min(page * pageSize, cases.length)}</span> of{" "}
            <span className="font-semibold text-slate-700">{cases.length}</span> cases
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-medium">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
