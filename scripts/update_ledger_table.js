const fs = require('fs');
const path = require('path');

const tableCode = `"use client";

import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { Claim, ClaimStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { exportToCSV } from "@/lib/utils/exportCsv";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/hooks/useToast";
import Link from "next/link";
import {
  Search,
  Download,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Eye,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  RotateCcw,
  Copy,
  Check,
  Ship,
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
  const [data, setData] = useState<Claim[]>(initialClaims);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [timebarFilter, setTimebarFilter] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    claimNotes: false,
    contentions: false,
    documentLinks: false,
    instructionReceivedDate: false,
    noticeReceivedDate: false,
    claimReceivedDate: false,
    noticeTimebarDays: false,
    claimTimebarDays: false,
    cancellingDate: false,
    charterpartyDate: false,
    demurrageRatePerDay: true,
    counterpartyName: true,
  });

  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null);
  const [deletingClaimId, setDeletingClaimId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { canEditClaim, isReadOnly, role } = useAuth();
  const { success, info } = useToast();

  React.useEffect(() => {
    setData(initialClaims);
  }, [initialClaims]);

  const copyClaimId = (id: string) => {
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    info("Copied to clipboard", \`Claim ID \${id}\`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: initialClaims.length };
    initialClaims.forEach((c) => {
      counts[c.claimStatus] = (counts[c.claimStatus] || 0) + 1;
    });
    return counts;
  }, [initialClaims]);

  // Define All 32+ columns with types
  const columns = useMemo<ColumnDef<Claim>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Claim ID",
        cell: (info) => {
          const id = info.getValue() as string;
          return (
            <div className="flex items-center space-x-1.5 font-bold text-blue-600">
              <Link href={\`/claims/\${id}\`} className="hover:underline">
                {id}
              </Link>
              <button
                onClick={() => copyClaimId(id)}
                className="opacity-40 hover:opacity-100 transition p-0.5 text-slate-500"
                title="Copy ID"
              >
                {copiedId === id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          );
        },
      },
      {
        accessorKey: "shipName",
        header: "Ship Name",
        cell: (info) => (
          <div className="flex items-center space-x-1.5 font-semibold text-slate-900">
            <Ship className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{info.getValue() as string}</span>
          </div>
        ),
      },
      {
        accessorKey: "claimName",
        header: "Claim Name",
        cell: (info) => <span className="text-slate-800 line-clamp-1 max-w-[180px]">{info.getValue() as string}</span>,
      },
      {
        accessorKey: "accountName",
        header: "Account / Client",
        cell: (info) => <span className="text-slate-700 font-medium">{info.getValue() as string}</span>,
      },
      {
        accessorKey: "brokerName",
        header: "Broker",
        cell: (info) => <span className="text-slate-600 text-xs">{info.getValue() as string || "Direct"}</span>,
      },
      {
        accessorKey: "claimStatus",
        header: "Claim Status",
        cell: (info) => <Badge status={info.getValue() as ClaimStatus} />,
      },
      {
        accessorKey: "claimType",
        header: "Claim Type",
        cell: (info) => <span className="text-[11px] text-slate-700">{info.getValue() as string}</span>,
      },
      {
        accessorKey: "cpType",
        header: "C/P Type",
        cell: (info) => <span className="font-mono text-xs text-slate-800">{info.getValue() as string}</span>,
      },
      {
        accessorKey: "assignedTo",
        header: "Assigned To",
        cell: (info) => <span className="text-xs text-slate-600">{info.getValue() as string}</span>,
      },
      {
        accessorKey: "daysOpen",
        header: "Days Open",
        cell: (info) => <span className="font-bold text-slate-800">{info.getValue() as number}d</span>,
      },
      {
        accessorKey: "claimClosed",
        header: "Closed",
        cell: (info) =>
          info.getValue() ? (
            <span className="text-emerald-600 font-bold text-xs">Yes</span>
          ) : (
            <span className="text-slate-400 text-xs">No</span>
          ),
      },
      {
        accessorKey: "timebarred",
        header: "Timebarred",
        cell: (info) =>
          info.getValue() ? (
            <span className="inline-flex items-center text-rose-600 font-bold text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Yes
            </span>
          ) : (
            <span className="text-emerald-600 font-semibold text-xs">No</span>
          ),
      },
      {
        accessorKey: "demurrageRatePerDay",
        header: "Rate/Day",
        cell: (info) => <span className="font-medium text-slate-800">{formatCurrency(info.getValue() as number)}</span>,
      },
      {
        accessorKey: "claimFiledAmount",
        header: "Filed Amount",
        cell: (info) => (
          <span className="font-extrabold text-slate-900">
            {formatCurrency(info.getValue() as number)}
          </span>
        ),
      },
      {
        accessorKey: "agreedAmount",
        header: "Agreed Amount",
        cell: (info) => {
          const val = info.getValue() as number;
          return val > 0 ? (
            <span className="text-blue-700 font-bold">{formatCurrency(val)}</span>
          ) : (
            <span className="text-slate-400">—</span>
          );
        },
      },
      {
        accessorKey: "receivedClaimAmount",
        header: "Received Amount",
        cell: (info) => {
          const val = info.getValue() as number;
          return val > 0 ? (
            <span className="text-emerald-700 font-bold">{formatCurrency(val)}</span>
          ) : (
            <span className="text-slate-400">—</span>
          );
        },
      },
      {
        accessorKey: "billableAmount",
        header: "Billable Amount",
        cell: (info) => formatCurrency(info.getValue() as number),
      },
      {
        accessorKey: "paymentReceived",
        header: "Payment Received",
        cell: (info) => (
          <span className="text-emerald-700 font-bold">
            {formatCurrency(info.getValue() as number)}
          </span>
        ),
      },
      {
        accessorKey: "paymentConcluded",
        header: "Payment Concluded",
        cell: (info) => (info.getValue() ? <span className="text-emerald-600 font-bold">Yes</span> : "No"),
      },
      {
        accessorKey: "counterpartyName",
        header: "Counterparty Name",
      },
      {
        accessorKey: "counterpartyType",
        header: "Counterparty Type",
      },
      {
        accessorKey: "layday",
        header: "Layday",
        cell: (info) => formatDate(info.getValue() as string),
      },
      {
        accessorKey: "cancellingDate",
        header: "Cancelling Date",
        cell: (info) => formatDate(info.getValue() as string),
      },
      {
        accessorKey: "voyageEndDate",
        header: "Voyage End Date",
        cell: (info) => formatDate(info.getValue() as string),
      },
      {
        accessorKey: "instructionReceivedDate",
        header: "Instruction Date",
        cell: (info) => formatDate(info.getValue() as string),
      },
      {
        accessorKey: "noticeReceivedDate",
        header: "Notice Received",
        cell: (info) => formatDate(info.getValue() as string),
      },
      {
        accessorKey: "claimReceivedDate",
        header: "Claim Received",
        cell: (info) => formatDate(info.getValue() as string),
      },
      {
        accessorKey: "noticeTimebarDays",
        header: "Notice Timebar (Days)",
      },
      {
        accessorKey: "claimTimebarDays",
        header: "Claim Timebar (Days)",
      },
      {
        accessorKey: "charterpartyDate",
        header: "C/P Date",
        cell: (info) => formatDate(info.getValue() as string),
      },
      {
        accessorKey: "daysAwaitingPayment",
        header: "Days Awaiting Payment",
      },
      {
        accessorKey: "contentions",
        header: "Contentions",
      },
      {
        accessorKey: "claimNotes",
        header: "Claim Notes",
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const claim = row.original;
          const userCanEdit = canEditClaim(claim.assignedTo);

          return (
            <div className="flex items-center space-x-1 justify-end">
              <Link href={\`/claims/\${claim.id}\`}>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:text-blue-600" title="View Details">
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </Link>

              {userCanEdit ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => setEditingClaim({ ...claim })}
                  title="Quick Inline Edit"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Tooltip
                  content={
                    isReadOnly
                      ? "Reviewer role: Read-only access"
                      : "Claim assigned to another processor"
                  }
                >
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 cursor-not-allowed" disabled>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </Tooltip>
              )}

              {userCanEdit && role !== "Reviewer" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                  onClick={() => setDeletingClaimId(claim.id)}
                  title="Delete Claim (Mock Action)"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [canEditClaim, isReadOnly, role, copiedId]
  );

  const filteredData = useMemo(() => {
    return data.filter((c) => {
      if (statusFilter !== "ALL" && c.claimStatus !== statusFilter) return false;
      if (timebarFilter === "TIMEBARRED" && !c.timebarred) return false;
      if (timebarFilter === "VALID" && c.timebarred) return false;
      return true;
    });
  }, [data, statusFilter, timebarFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const handleExportCSV = () => {
    const visibleCols = table.getVisibleLeafColumns().map((c) => c.id).filter((id) => id !== "actions");
    const exportRows = table.getFilteredRowModel().rows.map((r) => {
      const rowObj: Record<string, any> = {};
      visibleCols.forEach((colId) => {
        rowObj[colId] = (r.original as any)[colId];
      });
      return rowObj;
    });
    exportToCSV(exportRows, \`demurrage_claims_export_\${new Date().toISOString().split("T")[0]}.csv\`);
    success("CSV Generated", \`Exported \${exportRows.length} filtered claim records\`);
  };

  const applyPreset = (preset: "default" | "financial" | "timebar" | "all") => {
    const allColIds = table.getAllColumns().map((c) => c.id);
    const newVis: VisibilityState = {};

    if (preset === "all") {
      allColIds.forEach((id) => (newVis[id] = true));
    } else if (preset === "financial") {
      allColIds.forEach((id) => (newVis[id] = false));
      [
        "id", "shipName", "accountName", "claimStatus", "demurrageRatePerDay",
        "claimFiledAmount", "agreedAmount", "receivedClaimAmount", "billableAmount",
        "paymentReceived", "paymentConcluded", "actions"
      ].forEach((id) => (newVis[id] = true));
    } else if (preset === "timebar") {
      allColIds.forEach((id) => (newVis[id] = false));
      [
        "id", "shipName", "accountName", "claimStatus", "timebarred", "layday",
        "cancellingDate", "voyageEndDate", "noticeReceivedDate", "claimReceivedDate",
        "noticeTimebarDays", "claimTimebarDays", "actions"
      ].forEach((id) => (newVis[id] = true));
    } else {
      allColIds.forEach((id) => (newVis[id] = true));
      [
        "claimNotes", "contentions", "documentLinks", "instructionReceivedDate",
        "noticeReceivedDate", "claimReceivedDate", "noticeTimebarDays",
        "claimTimebarDays", "cancellingDate", "charterpartyDate"
      ].forEach((id) => (newVis[id] = false));
    }
    setColumnVisibility(newVis);
  };

  const handleSaveInlineEdit = async () => {
    if (!editingClaim) return;
    setIsSaving(true);
    await onUpdateClaim(editingClaim.id, editingClaim);
    setIsSaving(false);
    success("Claim Updated", \`\${editingClaim.id} changes saved to state\`);
    setEditingClaim(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingClaimId) return;
    setIsSaving(true);
    await onDeleteClaim(deletingClaimId);
    setIsSaving(false);
    success("Claim Deleted", \`Claim \${deletingClaimId} removed from local mock store\`);
    setDeletingClaimId(null);
  };

  return (
    <div className="space-y-4">
      {/* Quick Status Tabs Carousel */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: "ALL", label: "All Claims" },
          { id: "Submitted", label: "Submitted" },
          { id: "Incomplete", label: "Incomplete" },
          { id: "Review", label: "Review" },
          { id: "Settled", label: "Settled" },
          { id: "Disputed", label: "Disputed" },
          { id: "Timebarred", label: "Timebarred" },
        ].map((tab) => {
          const count = statusCounts[tab.id] || 0;
          const isActive = statusFilter === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={\`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap \${
                isActive
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }\`}
            >
              <span>{tab.label}</span>
              <span
                className={\`px-1.5 py-0.2 rounded-full text-[10px] font-bold \${
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }\`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Filter & Search Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search ship name, client, ID, broker..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <Select
            value={timebarFilter}
            onChange={(e) => setTimebarFilter(e.target.value)}
            className="w-36 h-9 text-xs"
          >
            <option value="ALL">All Timebars</option>
            <option value="VALID">Compliant Only</option>
            <option value="TIMEBARRED">Timebarred Only</option>
          </Select>
        </div>

        {/* Column Toggle & Actions */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsColumnModalOpen(true)}
            className="flex items-center space-x-1.5 h-9 text-xs"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-600" />
            <span>Columns ({table.getVisibleLeafColumns().length})</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 h-9 text-xs text-slate-700 hover:text-blue-600"
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            <span>Export CSV</span>
          </Button>

          <Link href="/claims/create">
            <Button size="sm" className="h-9 text-xs flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="h-3.5 w-3.5" />
              <span>New Claim</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[620px]">
          <table className="w-full text-xs text-left">
            <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const isSorted = header.column.getIsSorted();

                    return (
                      <th
                        key={header.id}
                        className="px-3.5 py-3 whitespace-nowrap select-none"
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={\`flex items-center space-x-1 \${
                              canSort ? "cursor-pointer hover:text-blue-600" : ""
                            }\`}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                            {canSort && (
                              <span className="text-slate-400">
                                {isSorted === "asc" ? (
                                  <ArrowUp className="h-3 w-3 text-blue-600" />
                                ) : isSorted === "desc" ? (
                                  <ArrowDown className="h-3 w-3 text-blue-600" />
                                ) : (
                                  <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-blue-50/40 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3.5 py-2.5 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-12 text-center text-slate-400"
                  >
                    No claims found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/70 text-xs">
          <div className="text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-800">
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-800">
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-800">
              {table.getFilteredRowModel().rows.length}
            </span>{" "}
            claims
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500">Rows per page:</span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
              >
                {[10, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-slate-600 px-2 font-medium">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Column Visibility Modal */}
      <Modal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        title="Customize Ledger Columns"
        description="Toggle visible columns or select from fast presets"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 pb-3 border-b border-slate-100">
            <Button size="sm" variant="outline" onClick={() => applyPreset("default")}>
              Standard View
            </Button>
            <Button size="sm" variant="outline" onClick={() => applyPreset("financial")}>
              Financial Focus
            </Button>
            <Button size="sm" variant="outline" onClick={() => applyPreset("timebar")}>
              Dates & Timebar Focus
            </Button>
            <Button size="sm" variant="outline" onClick={() => applyPreset("all")}>
              Show All Columns
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto p-1 text-xs">
            {table.getAllLeafColumns().map((column) => {
              if (column.id === "actions") return null;
              return (
                <label
                  key={column.id}
                  className="flex items-center space-x-2 p-1.5 rounded hover:bg-slate-50 border border-slate-100 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={column.getIsVisible()}
                    onChange={column.getToggleVisibilityHandler()}
                    className="rounded text-blue-600"
                  />
                  <span className="truncate">{column.id}</span>
                </label>
              );
            })}
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button onClick={() => setIsColumnModalOpen(false)}>Done</Button>
          </div>
        </div>
      </Modal>

      {/* Quick Edit Modal */}
      {editingClaim && (
        <Modal
          isOpen={!!editingClaim}
          onClose={() => setEditingClaim(null)}
          title={\`Quick Edit: \${editingClaim.shipName} (\${editingClaim.id})\`}
          maxWidth="md"
        >
          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Claim Status</label>
              <Select
                value={editingClaim.claimStatus}
                onChange={(e) =>
                  setEditingClaim({
                    ...editingClaim,
                    claimStatus: e.target.value as ClaimStatus,
                  })
                }
              >
                <option value="Submitted">Submitted</option>
                <option value="Incomplete">Incomplete</option>
                <option value="Review">Review</option>
                <option value="Settled">Settled</option>
                <option value="Disputed">Disputed</option>
                <option value="Timebarred">Timebarred</option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Agreed Amount ($)</label>
                <Input
                  type="number"
                  value={editingClaim.agreedAmount}
                  onChange={(e) =>
                    setEditingClaim({
                      ...editingClaim,
                      agreedAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Received Payment ($)</label>
                <Input
                  type="number"
                  value={editingClaim.paymentReceived}
                  onChange={(e) =>
                    setEditingClaim({
                      ...editingClaim,
                      paymentReceived: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-2 font-medium text-slate-700 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingClaim.claimClosed}
                  onChange={(e) =>
                    setEditingClaim({
                      ...editingClaim,
                      claimClosed: e.target.checked,
                    })
                  }
                  className="rounded text-blue-600"
                />
                <span>Mark Claim File as Closed</span>
              </label>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Claim Notes</label>
              <Input
                value={editingClaim.claimNotes || ""}
                onChange={(e) =>
                  setEditingClaim({
                    ...editingClaim,
                    claimNotes: e.target.value,
                  })
                }
                placeholder="Operational notes, contention details..."
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setEditingClaim(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveInlineEdit} isLoading={isSaving}>
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingClaimId}
        onClose={() => setDeletingClaimId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Claim Record"
        message="Are you sure you want to delete this claim record? This mock action will remove the claim and its associated activities from the local state."
        confirmLabel="Delete Claim"
        variant="destructive"
        isLoading={isSaving}
      />
    </div>
  );
}
`;

fs.writeFileSync(path.join(process.cwd(), 'components/claims/LedgerTable.tsx'), tableCode, 'utf8');
console.log('Updated components/claims/LedgerTable.tsx');
