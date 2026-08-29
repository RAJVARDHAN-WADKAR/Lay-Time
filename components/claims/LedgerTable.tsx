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
} from "lucide-react";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Claim No.</th>
                  <th className="py-3.5 px-4">Claim Name</th>
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Ship Name</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Claim Type</th>
                  <th className="py-3.5 px-4 text-right">Days Open</th>
                  <th className="py-3.5 px-4 text-right">Demurrage (USD)</th>
                  <th className="py-3.5 px-4 text-center">RAC Dispute</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedClaims.map((c) => (
                  <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                    {/* 1. Claim No. */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <Link href={`/claims/${c.id}`} className="hover:text-blue-600 hover:underline">
                        {c.id}
                      </Link>
                    </td>

                    {/* 2. Claim Name */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs truncate">
                      <Link href={`/claims/${c.id}`} className="hover:text-blue-600">
                        {c.claimName || `${c.shipName} Claim`}
                      </Link>
                    </td>

                    {/* 3. Client */}
                    <td className="py-3.5 px-4 text-slate-600 max-w-[180px] truncate">
                      {c.accountName || "—"}
                    </td>

                    {/* 4. Ship Name */}
                    <td className="py-3.5 px-4 font-medium text-slate-900 flex items-center space-x-1.5">
                      <Ship className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">{c.shipName}</span>
                    </td>

                    {/* 5. Status */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={c.claimStatus} />
                    </td>

                    {/* 6. Claim Type */}
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-medium text-slate-700">
                        {c.claimType}
                      </span>
                    </td>

                    {/* 7. Days Open */}
                    <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                      {c.daysOpen || 0}d
                    </td>

                    {/* 8. Demurrage (USD) */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(c.claimFiledAmount)}
                    </td>

                    {/* RAC Link */}
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

                    {/* 9. Actions */}
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
