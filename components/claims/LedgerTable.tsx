"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Claim, ClaimStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { exportToCSV } from "@/lib/utils/exportCsv";
import { exportClaimPdf } from "@/lib/utils/exportPdf";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/lib/hooks/useToast";
import {
  Search,
  Download,
  Filter,
  PlusCircle,
  Ship,
  Eye,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  RotateCcw,
  Layers,
  Calculator,
  Briefcase,
  SlidersHorizontal,
  Check
} from "lucide-react";

export interface ColumnDef {
  key: string;
  label: string;
  category: "General" | "Financials" | "Voyage" | "Compliance";
  defaultVisible: boolean;
}

export const SRS_COLUMNS: ColumnDef[] = [
  // 1-13 General
  { key: "id", label: "Claim No.", category: "General", defaultVisible: true },
  { key: "claimName", label: "Claim Name", category: "General", defaultVisible: true },
  { key: "accountName", label: "Client Name", category: "General", defaultVisible: true },
  { key: "shipName", label: "Ship Name", category: "General", defaultVisible: true },
  { key: "claimStatus", label: "Claim Status", category: "General", defaultVisible: true },
  { key: "claimType", label: "Claim Type", category: "General", defaultVisible: true },
  { key: "brokerName", label: "Broker Name", category: "General", defaultVisible: false },
  { key: "cpType", label: "CP Form", category: "General", defaultVisible: false },
  { key: "counterpartyName", label: "Counterparty", category: "General", defaultVisible: false },
  { key: "counterpartyType", label: "Counterparty Role", category: "General", defaultVisible: false },
  { key: "assignedTo", label: "Assigned To", category: "General", defaultVisible: false },
  { key: "daysOpen", label: "Days Open", category: "General", defaultVisible: true },
  { key: "claimClosed", label: "Claim Closed", category: "General", defaultVisible: false },

  // 14-21 Financials
  { key: "claimFiledAmount", label: "Demurrage (USD)", category: "Financials", defaultVisible: true },
  { key: "demurrageRatePerDay", label: "Demurrage Rate ($/d)", category: "Financials", defaultVisible: false },
  { key: "receivedClaimAmount", label: "Received Claim ($)", category: "Financials", defaultVisible: false },
  { key: "agreedAmount", label: "Agreed Settlement ($)", category: "Financials", defaultVisible: false },
  { key: "billableAmount", label: "Billable Amount ($)", category: "Financials", defaultVisible: false },
  { key: "paymentReceived", label: "Payment Collected ($)", category: "Financials", defaultVisible: false },
  { key: "paymentConcluded", label: "Payment Concluded", category: "Financials", defaultVisible: false },
  { key: "daysAwaitingPayment", label: "Days Awaiting Payment", category: "Financials", defaultVisible: false },

  // 22-28 Voyage
  { key: "layday", label: "Layday", category: "Voyage", defaultVisible: false },
  { key: "cancellingDate", label: "Cancelling Date", category: "Voyage", defaultVisible: false },
  { key: "voyageEndDate", label: "Voyage End Date", category: "Voyage", defaultVisible: false },
  { key: "instructionReceivedDate", label: "Instruction Date", category: "Voyage", defaultVisible: false },
  { key: "noticeReceivedDate", label: "Notice Received Date", category: "Voyage", defaultVisible: false },
  { key: "claimReceivedDate", label: "Claim Received Date", category: "Voyage", defaultVisible: false },
  { key: "charterpartyDate", label: "Charterparty Date", category: "Voyage", defaultVisible: false },

  // 29-32 Compliance
  { key: "noticeTimebarDays", label: "Notice Timebar (d)", category: "Compliance", defaultVisible: false },
  { key: "claimTimebarDays", label: "Claim Timebar (d)", category: "Compliance", defaultVisible: false },
  { key: "timebarred", label: "Timebar Status", category: "Compliance", defaultVisible: false },
  { key: "racDispute", label: "RAC Hub", category: "Compliance", defaultVisible: true }
];

interface LedgerTableProps {
  initialClaims: Claim[];
  onUpdateClaim: (id: string, updates: Partial<Claim>) => Promise<void>;
  onDeleteClaim: (id: string) => Promise<void>;
}

export function LedgerTable({
  initialClaims,
  onUpdateClaim,
  onDeleteClaim,
}: LedgerTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    SRS_COLUMNS.forEach((col) => {
      initial[col.key] = col.defaultVisible;
    });
    return initial;
  });

  const activeColumnCount = useMemo(() => {
    return Object.values(visibleColumns).filter(Boolean).length;
  }, [visibleColumns]);

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAllColumns = () => {
    const all: Record<string, boolean> = {};
    SRS_COLUMNS.forEach((col) => {
      all[col.key] = true;
    });
    setVisibleColumns(all);
  };

  const resetDefaultColumns = () => {
    const def: Record<string, boolean> = {};
    SRS_COLUMNS.forEach((col) => {
      def[col.key] = col.defaultVisible;
    });
    setVisibleColumns(def);
  };

  const clearAllColumns = () => {
    const none: Record<string, boolean> = {};
    SRS_COLUMNS.forEach((col) => {
      none[col.key] = false;
    });
    setVisibleColumns(none);
  };

  const { success } = useToast();

  // Unique clients for dropdown
  const uniqueClients = useMemo(() => {
    const set = new Set(initialClaims.map((c) => c.accountName).filter(Boolean));
    return Array.from(set);
  }, [initialClaims]);

  // Filtered claims
  const filteredClaims = useMemo(() => {
    return initialClaims.filter((claim) => {
      // Global Search across ship, client, claim ID, claim name
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matches =
          (claim.shipName && claim.shipName.toLowerCase().includes(query)) ||
          (claim.accountName && claim.accountName.toLowerCase().includes(query)) ||
          (claim.id && claim.id.toLowerCase().includes(query)) ||
          (claim.claimName && claim.claimName.toLowerCase().includes(query)) ||
          (claim.claimType && claim.claimType.toLowerCase().includes(query));

        if (!matches) return false;
      }

      // Client filter
      if (selectedClient !== "ALL" && claim.accountName !== selectedClient) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "ALL" && claim.claimStatus !== selectedStatus) {
        return false;
      }

      // Type filter
      if (selectedType !== "ALL" && claim.claimType !== selectedType) {
        return false;
      }

      return true;
    });
  }, [initialClaims, searchTerm, selectedClient, selectedStatus, selectedType]);

  // Pagination
  const totalPages = Math.ceil(filteredClaims.length / pageSize) || 1;
  const paginatedClaims = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClaims.slice(start, start + pageSize);
  }, [filteredClaims, currentPage, pageSize]);

  const handleExportCSV = () => {
    if (filteredClaims.length === 0) return;
    exportToCSV(filteredClaims, `claim_ledger_${new Date().toISOString().split("T")[0]}`);
    success("Export Complete", "Claims ledger exported to CSV format");
  };

  const handleConfirmDelete = async () => {
    if (deletingId) {
      await onDeleteClaim(deletingId);
      setDeletingId(null);
      success("Claim Deleted", "The claim record has been removed.");
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedClient("ALL");
    setSelectedStatus("ALL");
    setSelectedType("ALL");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm || selectedClient !== "ALL" || selectedStatus !== "ALL" || selectedType !== "ALL";

  return (
    <div className="space-y-4">
      {/* Top Controls Toolbar matching Section 8 */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Side: Search & Client Dropdown */}
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative min-w-[220px] flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ship / client / claim..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Client Dropdown */}
          <select
            value={selectedClient}
            onChange={(e) => {
              setSelectedClient(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs font-medium rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
          >
            <option value="ALL">All Clients</option>
            {uniqueClients.map((client) => (
              <option key={client} value={client}>
                {client}
              </option>
            ))}
          </select>

          {/* Filters Button */}
          <Button
            variant={hasActiveFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setIsFilterModalOpen(true)}
            className="text-xs h-9 px-3 rounded-xl flex items-center space-x-1.5"
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="ml-1 h-2 w-2 rounded-full bg-white ring-1 ring-blue-500" />
            )}
          </Button>

          {/* Columns Visibility Toggle Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsColumnModalOpen(true)}
            className="text-xs h-9 px-3 rounded-xl flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
            <span>Columns ({activeColumnCount}/32)</span>
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-xs h-9 px-2 text-slate-500 hover:text-slate-900"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              <span>Reset</span>
            </Button>
          )}
        </div>

        {/* Right Side: Export + New Claim */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredClaims.length === 0}
            className="text-xs h-9 px-3.5 rounded-xl bg-white flex items-center space-x-1.5"
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            <span>Export</span>
          </Button>

          <Link href="/claims/create">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-xs flex items-center space-x-1.5">
              <PlusCircle className="h-4 w-4" />
              <span>New Claim</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Ledger Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {paginatedClaims.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                  {visibleColumns.id && <th className="py-3.5 px-4">Claim No.</th>}
                  {visibleColumns.claimName && <th className="py-3.5 px-4">Claim Name</th>}
                  {visibleColumns.accountName && <th className="py-3.5 px-4">Client</th>}
                  {visibleColumns.shipName && <th className="py-3.5 px-4">Ship Name</th>}
                  {visibleColumns.claimStatus && <th className="py-3.5 px-4">Status</th>}
                  {visibleColumns.claimType && <th className="py-3.5 px-4">Claim Type</th>}
                  {visibleColumns.brokerName && <th className="py-3.5 px-4">Broker</th>}
                  {visibleColumns.cpType && <th className="py-3.5 px-4">CP Form</th>}
                  {visibleColumns.counterpartyName && <th className="py-3.5 px-4">Counterparty</th>}
                  {visibleColumns.counterpartyType && <th className="py-3.5 px-4">Role</th>}
                  {visibleColumns.assignedTo && <th className="py-3.5 px-4">Assigned To</th>}
                  {visibleColumns.daysOpen && <th className="py-3.5 px-4 text-right">Days Open</th>}
                  {visibleColumns.claimClosed && <th className="py-3.5 px-4 text-center">Closed</th>}
                  {visibleColumns.claimFiledAmount && <th className="py-3.5 px-4 text-right">Demurrage (USD)</th>}
                  {visibleColumns.demurrageRatePerDay && <th className="py-3.5 px-4 text-right">Rate ($/d)</th>}
                  {visibleColumns.receivedClaimAmount && <th className="py-3.5 px-4 text-right">Received ($)</th>}
                  {visibleColumns.agreedAmount && <th className="py-3.5 px-4 text-right">Agreed ($)</th>}
                  {visibleColumns.billableAmount && <th className="py-3.5 px-4 text-right">Billable ($)</th>}
                  {visibleColumns.paymentReceived && <th className="py-3.5 px-4 text-right">Collected ($)</th>}
                  {visibleColumns.paymentConcluded && <th className="py-3.5 px-4 text-center">Concluded</th>}
                  {visibleColumns.daysAwaitingPayment && <th className="py-3.5 px-4 text-right">Awaiting (d)</th>}
                  {visibleColumns.layday && <th className="py-3.5 px-4">Layday</th>}
                  {visibleColumns.cancellingDate && <th className="py-3.5 px-4">Cancelling Date</th>}
                  {visibleColumns.voyageEndDate && <th className="py-3.5 px-4">Voyage End</th>}
                  {visibleColumns.instructionReceivedDate && <th className="py-3.5 px-4">Instruction Date</th>}
                  {visibleColumns.noticeReceivedDate && <th className="py-3.5 px-4">Notice Date</th>}
                  {visibleColumns.claimReceivedDate && <th className="py-3.5 px-4">Claim Date</th>}
                  {visibleColumns.charterpartyDate && <th className="py-3.5 px-4">CP Date</th>}
                  {visibleColumns.noticeTimebarDays && <th className="py-3.5 px-4 text-right">Notice TB</th>}
                  {visibleColumns.claimTimebarDays && <th className="py-3.5 px-4 text-right">Claim TB</th>}
                  {visibleColumns.timebarred && <th className="py-3.5 px-4 text-center">Timebar</th>}
                  {visibleColumns.racDispute && <th className="py-3.5 px-4 text-center">RAC Hub</th>}
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedClaims.map((c) => (
                  <tr key={c.id} className="hover:bg-blue-50/30 transition-colors whitespace-nowrap">
                    {visibleColumns.id && (
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <Link href={`/claims/${c.id}`} className="hover:text-blue-600 hover:underline">
                          {c.id}
                        </Link>
                      </td>
                    )}

                    {visibleColumns.claimName && (
                      <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs truncate">
                        <Link href={`/claims/${c.id}`} className="hover:text-blue-600">
                          {c.claimName || `${c.shipName} Claim`}
                        </Link>
                      </td>
                    )}

                    {visibleColumns.accountName && (
                      <td className="py-3.5 px-4 text-slate-600 max-w-[180px] truncate">{c.accountName || "—"}</td>
                    )}

                    {visibleColumns.shipName && (
                      <td className="py-3.5 px-4 font-medium text-slate-900 flex items-center space-x-1.5">
                        <Ship className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{c.shipName}</span>
                      </td>
                    )}

                    {visibleColumns.claimStatus && (
                      <td className="py-3.5 px-4">
                        <StatusBadge status={c.claimStatus} />
                      </td>
                    )}

                    {visibleColumns.claimType && (
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-medium text-slate-700">
                          {c.claimType}
                        </span>
                      </td>
                    )}

                    {visibleColumns.brokerName && <td className="py-3.5 px-4 text-slate-600">{c.brokerName || "—"}</td>}
                    {visibleColumns.cpType && (
                      <td className="py-3.5 px-4 font-medium text-slate-700">{c.cpType || "—"}</td>
                    )}
                    {visibleColumns.counterpartyName && (
                      <td className="py-3.5 px-4 text-slate-600">{c.counterpartyName || "—"}</td>
                    )}
                    {visibleColumns.counterpartyType && (
                      <td className="py-3.5 px-4 text-slate-500">{c.counterpartyType || "—"}</td>
                    )}
                    {visibleColumns.assignedTo && <td className="py-3.5 px-4 text-slate-700">{c.assignedTo}</td>}
                    {visibleColumns.daysOpen && (
                      <td className="py-3.5 px-4 text-right font-medium text-slate-600">{c.daysOpen || 0}d</td>
                    )}
                    {visibleColumns.claimClosed && (
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.claimClosed ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}>
                          {c.claimClosed ? "Closed" : "Open"}
                        </span>
                      </td>
                    )}
                    {visibleColumns.claimFiledAmount && (
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(c.claimFiledAmount)}
                      </td>
                    )}
                    {visibleColumns.demurrageRatePerDay && (
                      <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                        {formatCurrency(c.demurrageRatePerDay)}
                      </td>
                    )}
                    {visibleColumns.receivedClaimAmount && (
                      <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                        {formatCurrency(c.receivedClaimAmount || 0)}
                      </td>
                    )}
                    {visibleColumns.agreedAmount && (
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-blue-700">
                        {formatCurrency(c.agreedAmount || 0)}
                      </td>
                    )}
                    {visibleColumns.billableAmount && (
                      <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                        {formatCurrency(c.billableAmount || 0)}
                      </td>
                    )}
                    {visibleColumns.paymentReceived && (
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-700">
                        {formatCurrency(c.paymentReceived || 0)}
                      </td>
                    )}
                    {visibleColumns.paymentConcluded && (
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.paymentConcluded ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                          {c.paymentConcluded ? "Concluded" : "Pending"}
                        </span>
                      </td>
                    )}
                    {visibleColumns.daysAwaitingPayment && (
                      <td className="py-3.5 px-4 text-right text-slate-600">{c.daysAwaitingPayment || 0}d</td>
                    )}
                    {visibleColumns.layday && <td className="py-3.5 px-4 text-slate-600">{c.layday || "—"}</td>}
                    {visibleColumns.cancellingDate && (
                      <td className="py-3.5 px-4 text-slate-600">{c.cancellingDate || "—"}</td>
                    )}
                    {visibleColumns.voyageEndDate && (
                      <td className="py-3.5 px-4 text-slate-600">{c.voyageEndDate || "—"}</td>
                    )}
                    {visibleColumns.instructionReceivedDate && (
                      <td className="py-3.5 px-4 text-slate-600">{c.instructionReceivedDate || "—"}</td>
                    )}
                    {visibleColumns.noticeReceivedDate && (
                      <td className="py-3.5 px-4 text-slate-600">{c.noticeReceivedDate || "—"}</td>
                    )}
                    {visibleColumns.claimReceivedDate && (
                      <td className="py-3.5 px-4 text-slate-600">{c.claimReceivedDate || "—"}</td>
                    )}
                    {visibleColumns.charterpartyDate && (
                      <td className="py-3.5 px-4 text-slate-600">{c.charterpartyDate || "—"}</td>
                    )}
                    {visibleColumns.noticeTimebarDays && (
                      <td className="py-3.5 px-4 text-right text-slate-600">{c.noticeTimebarDays || 30}d</td>
                    )}
                    {visibleColumns.claimTimebarDays && (
                      <td className="py-3.5 px-4 text-right text-slate-600">{c.claimTimebarDays || 90}d</td>
                    )}
                    {visibleColumns.timebarred && (
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.timebarred ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                          {c.timebarred ? "Timebarred" : "Safe"}
                        </span>
                      </td>
                    )}
                    {visibleColumns.racDispute && (
                      <td className="py-3.5 px-4 text-center">
                        <Link
                          href={`/claims/${c.id}`}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60 transition"
                          title="View or attach RAC Recoverable Costs"
                        >
                          <Briefcase className="h-2.5 w-2.5" />
                          <span>RAC Hub</span>
                        </Link>
                      </td>
                    )}

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <Link href={`/claims/${c.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="View Claim File"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <button
                          onClick={() => setDeletingId(c.id)}
                          className="h-7 w-7 p-0 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Delete Claim"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 px-4">
            <EmptyState
              icon={FileSpreadsheet}
              title="No claims found"
              description="Create your first claim to start calculating laytime, tracking timebars, and reconciling demurrage."
              actionText="Create New Claim"
              actionHref="/claims/create"
            />
          </div>
        )}

        {/* Pagination Section (disabled/hidden when no data) */}
        {filteredClaims.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <strong className="text-slate-800">{(currentPage - 1) * pageSize + 1}</strong> to{" "}
              <strong className="text-slate-800">
                {Math.min(currentPage * pageSize, filteredClaims.length)}
              </strong>{" "}
              of <strong className="text-slate-800">{filteredClaims.length}</strong> claims
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 px-2.5 text-xs bg-white"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <span className="text-xs font-semibold text-slate-700 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-8 px-2.5 text-xs bg-white"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter Claims Ledger"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          {/* Filter Status */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Claim Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Incomplete">Incomplete</option>
              <option value="Review">Review</option>
              <option value="Settled">Settled</option>
              <option value="Disputed">Disputed</option>
              <option value="Timebarred">Timebarred</option>
            </select>
          </div>

          {/* Filter Type */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Claim Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Claim Types</option>
              <option value="Load Port Demurrage">Load Port Demurrage</option>
              <option value="Discharge Port Demurrage">Discharge Port Demurrage</option>
              <option value="Combined Demurrage">Combined Demurrage</option>
              <option value="Despatch">Despatch</option>
              <option value="Detention">Detention</option>
            </select>
          </div>

          {/* Client Filter */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Client / Account</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Clients</option>
              {uniqueClients.map((client) => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Reset All
            </Button>
            <Button
              size="sm"
              onClick={() => setIsFilterModalOpen(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Modal>

      {/* Column Visibility Configuration Modal */}
      <Modal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        title="Customize Table Columns (32 Available)"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="font-semibold text-slate-700">
              Showing <strong className="text-blue-600">{activeColumnCount}</strong> of 32 columns
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={selectAllColumns} className="text-xs h-7 px-2">
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={resetDefaultColumns} className="text-xs h-7 px-2">
                Reset Default (10)
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAllColumns} className="text-xs h-7 px-2 text-rose-600 hover:text-rose-700">
                Clear All
              </Button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
            {(["General", "Financials", "Voyage", "Compliance"] as const).map((cat) => {
              const catCols = SRS_COLUMNS.filter((c) => c.category === cat);
              return (
                <div key={cat} className="space-y-2">
                  <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-1 text-xs uppercase tracking-wider flex items-center justify-between">
                    <span>{cat} Fields</span>
                    <span className="text-slate-400 font-normal">
                      {catCols.filter((c) => visibleColumns[c.key]).length}/{catCols.length}
                    </span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {catCols.map((col) => {
                      const isChecked = Boolean(visibleColumns[col.key]);
                      return (
                        <label
                          key={col.key}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                            isChecked
                              ? "bg-blue-50/50 border-blue-200 text-slate-900 font-semibold"
                              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleColumn(col.key)}
                            className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                          />
                          <span className="text-xs truncate">{col.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button
              size="sm"
              onClick={() => setIsColumnModalOpen(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Apply Column Layout
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Claim Record"
        description="Are you sure you want to delete this claim? This will remove all associated Statement of Facts activities, port allocations, and calculation records."
        confirmText="Delete Claim"
        destructive
      />
    </div>
  );
}
