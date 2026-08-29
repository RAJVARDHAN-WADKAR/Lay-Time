"use client";

import React, { useState, useEffect } from "react";
import { Claim, RacCase, RacType, RacStatus } from "@/lib/types";
import { getRacCases, createRacCase } from "@/lib/api/rac";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/inputs";
import { useToast } from "@/lib/hooks/useToast";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import Link from "next/link";
import {
  Briefcase,
  PlusCircle,
  ExternalLink,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  Layers,
  AlertCircle,
  FileCheck,
  ArrowUpRight,
  Calculator
} from "lucide-react";

interface ClaimRacTabProps {
  claim: Claim;
  canEdit?: boolean;
}

const RAC_TYPE_OPTIONS: RacType[] = [
  "Demurrage Review",
  "Additional Port Costs",
  "Pumping Warranty Contention",
  "Berth Allocation Audit",
  "Bunkers / Deviation Claim",
  "Special Cargo Handling",
  "Detention / Shifting Dispute",
];

export function ClaimRacTab({ claim, canEdit = true }: ClaimRacTabProps) {
  const { success, error } = useToast();
  const [racCases, setRacCases] = useState<RacCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick RAC creation state prefilled from claim
  const [newRacForm, setNewRacForm] = useState({
    racType: "Additional Port Costs" as RacType,
    totalAmount: 15000,
    counterpartyName: claim.brokerName || "Charterer Operations",
    description: `Recoverable additional dispute costs associated with voyage ${claim.claimName}`,
    notes: `Linked to Demurrage Claim ${claim.id} (Vessel: ${claim.shipName || claim.claimName}).`,
    deadlineDays: 60,
  });

  const fetchClaimRacCases = async () => {
    setIsLoading(true);
    try {
      const cases = await getRacCases({ claimId: claim.id });
      setRacCases(cases);
    } catch {
      setRacCases([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClaimRacCases();
  }, [claim.id]);

  const totalRacAmount = racCases.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
  const agreedRacAmount = racCases.reduce((sum, c) => sum + (c.agreedAmount || 0), 0);
  const outstandingRacAmount = racCases.reduce((sum, c) => sum + (c.outstandingAmount || 0), 0);
  const totalCombinedExposure = (Number(claim.claimFiledAmount) || Number(claim.agreedAmount) || 0) + totalRacAmount;

  const handleCreateLinkedRac = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setIsSubmitting(true);

    try {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + Number(newRacForm.deadlineDays || 60));

      const created = await createRacCase({
        claimId: claim.id,
        clientName: claim.accountName || "Charterer Account",
        shipName: claim.shipName || claim.claimName,
        voyageNumber: claim.claimName.includes("Voyage") ? claim.claimName : `VOY-${claim.id.replace("CLM-", "")}`,
        counterpartyName: newRacForm.counterpartyName,
        racType: newRacForm.racType,
        relevantDate: claim.voyageEndDate || new Date().toISOString().split("T")[0],
        assignedTo: claim.assignedTo || "Sarah Jenkins",
        status: "Draft",
        totalAmount: Number(newRacForm.totalAmount),
        agreedAmount: 0,
        outstandingAmount: Number(newRacForm.totalAmount),
        deadlineDate: deadline.toISOString().split("T")[0],
        description: newRacForm.description,
        notes: newRacForm.notes,
        supportingDocsCount: 1,
      });

      success("RAC Case Created", `Case ${created.racReference} successfully linked to claim ${claim.id}`);
      setIsCreateModalOpen(false);
      await fetchClaimRacCases();
    } catch (err: any) {
      error("Failed to Create RAC Case", err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: RacStatus) => {
    switch (status) {
      case "Draft":
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">Draft</span>;
      case "Submitted":
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-700">Submitted</span>;
      case "Under Review":
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-700">Under Review</span>;
      case "Correction Required":
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-700">Correction Required</span>;
      case "Reviewed":
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-700">Reviewed / Approved</span>;
      case "Closed":
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-200 text-slate-800">Closed</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Financial Integration Hero Header */}
      <div className="bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
                <Briefcase className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Recoverable Additional Costs (RAC) Integration
                </h3>
                <p className="text-xs text-slate-300">
                  Comprehensive port costs, pumping warranties, deviations & contention recoveries attached to Claim <strong className="text-blue-400">{claim.id}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {canEdit && (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-lg shadow-blue-900/40 flex items-center space-x-1.5 cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Attach New RAC Case</span>
              </Button>
            )}
            <Link
              href="/rac/calculations"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Calculator className="h-3.5 w-3.5 text-indigo-400" />
              <span>RAC Math Hub</span>
            </Link>
          </div>
        </div>

        {/* Integrated Financial Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-slate-700/60">
          <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Pure Demurrage Amount
            </span>
            <div className="text-lg font-black text-white">
              {formatCurrency(Number(claim.claimFiledAmount) || Number(claim.agreedAmount) || 0)}
            </div>
            <span className="text-[10px] text-slate-400">Calculated from SoF</span>
          </div>

          <div className="bg-blue-950/40 rounded-xl p-3.5 border border-blue-800/40">
            <span className="text-[11px] font-semibold text-blue-300 uppercase tracking-wider block mb-1">
              Linked RAC Recoverables
            </span>
            <div className="text-lg font-black text-blue-400">
              {formatCurrency(totalRacAmount)}
            </div>
            <span className="text-[10px] text-blue-300/80">{racCases.length} linked dispute file(s)</span>
          </div>

          <div className="bg-purple-950/40 rounded-xl p-3.5 border border-purple-800/40">
            <span className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider block mb-1">
              Total Combined Exposure
            </span>
            <div className="text-lg font-black text-purple-300">
              {formatCurrency(totalCombinedExposure)}
            </div>
            <span className="text-[10px] text-purple-300/80">Demurrage + Recoverable Costs</span>
          </div>

          <div className="bg-emerald-950/40 rounded-xl p-3.5 border border-emerald-800/40">
            <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider block mb-1">
              Agreed RAC Recovered
            </span>
            <div className="text-lg font-black text-emerald-400">
              {formatCurrency(agreedRacAmount)}
            </div>
            <span className="text-[10px] text-emerald-300/80">
              Outstanding: {formatCurrency(outstandingRacAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Linked RAC Cases Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <span>Attached RAC Case Records</span>
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 font-bold rounded-full">
                {racCases.length}
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Specific recovery files initiated for port costs, detention, and charterparty contentions.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
              Loading attached RAC cases...
            </div>
          ) : racCases.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-slate-700">No RAC Cases Attached Yet</h4>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                You can attach recoverable port costs, pumping disputes, or detention claims directly to this voyage file.
              </p>
              {canEdit && (
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-8 px-3 rounded-lg shadow-sm cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1" />
                  <span>Attach First RAC Case</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5">RAC Reference</th>
                    <th className="py-3 px-3.5">Dispute Type</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5 text-right">Claimed RAC</th>
                    <th className="py-3 px-3.5 text-right">Agreed Recovery</th>
                    <th className="py-3 px-3.5">Assigned To</th>
                    <th className="py-3 px-3.5">Deadline</th>
                    <th className="py-3 px-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {racCases.map((rc) => (
                    <tr key={rc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 font-bold text-blue-600">
                        <Link href={`/rac/cases/${rc.id}`} className="hover:underline flex items-center space-x-1">
                          <span>{rc.racReference}</span>
                          <ArrowUpRight className="h-3 w-3 text-slate-400" />
                        </Link>
                      </td>
                      <td className="py-3 px-3.5 font-medium text-slate-900">{rc.racType}</td>
                      <td className="py-3 px-3.5">{getStatusBadge(rc.status)}</td>
                      <td className="py-3 px-3.5 text-right font-black text-slate-900">
                        {formatCurrency(rc.totalAmount)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-emerald-600">
                        {formatCurrency(rc.agreedAmount)}
                      </td>
                      <td className="py-3 px-3.5 text-slate-600">{rc.assignedTo}</td>
                      <td className="py-3 px-3.5 text-slate-500">
                        {rc.deadlineDate ? formatDate(rc.deadlineDate) : "—"}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <Link
                          href={`/rac/cases/${rc.id}`}
                          className="inline-flex items-center space-x-1 px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-md font-semibold text-[11px] border border-slate-200 transition"
                        >
                          <span>Open RAC</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attach / Create RAC Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Attach Recoverable Additional Costs (RAC) Case"
        maxWidth="md"
      >
        <form onSubmit={handleCreateLinkedRac} className="space-y-4 text-xs">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-900 text-[11px]">
            This RAC dispute file will automatically bind to <strong>Claim {claim.id}</strong> (Vessel: {claim.shipName || claim.claimName}).
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">RAC Dispute Category *</label>
            <Select
              value={newRacForm.racType}
              onChange={(e) => setNewRacForm({ ...newRacForm, racType: e.target.value as RacType })}
            >
              {RAC_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Claimed Cost Amount (USD) *</label>
              <Input
                type="number"
                value={newRacForm.totalAmount}
                onChange={(e) => setNewRacForm({ ...newRacForm, totalAmount: Number(e.target.value) })}
                required
                min={0}
                step="any"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Counterparty / Debtor *</label>
              <Input
                value={newRacForm.counterpartyName}
                onChange={(e) => setNewRacForm({ ...newRacForm, counterpartyName: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description / Grounds for Recovery *</label>
            <Input
              value={newRacForm.description}
              onChange={(e) => setNewRacForm({ ...newRacForm, description: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Settlement Deadline (Days)</label>
              <Input
                type="number"
                value={newRacForm.deadlineDays}
                onChange={(e) => setNewRacForm({ ...newRacForm, deadlineDays: Number(e.target.value) })}
                min={1}
                max={365}
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Parent Demurrage Claim</label>
              <Input value={claim.id} disabled className="bg-slate-100 text-slate-500 font-mono" />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-8 px-4 rounded-lg cursor-pointer"
            >
              {isSubmitting ? "Linking Case..." : "Create & Attach RAC Case"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
