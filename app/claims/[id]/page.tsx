"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { getClaimById, updateClaim, addSoFActivity, updateSoFActivity } from "@/lib/api/claims";
import { Claim, SoFActivity, Discrepancy } from "@/lib/types";
import { calculateClaimLaytime } from "@/lib/calculations";
import { detectDiscrepancies } from "@/lib/calculations/discrepancies";
import { exportClaimPdf } from "@/lib/utils/exportPdf";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/lib/context/AuthContext";
import { ClaimOverviewTab } from "@/components/claims/ClaimOverviewTab";
import { ClaimPortsTab } from "@/components/claims/ClaimPortsTab";
import { ClaimSoFTab } from "@/components/claims/ClaimSoFTab";
import { ClaimCalculationsTab } from "@/components/claims/ClaimCalculationsTab";
import { ClaimDiscrepanciesTab } from "@/components/claims/ClaimDiscrepanciesTab";
import { ClaimOwnerComparisonTab } from "@/components/claims/ClaimOwnerComparisonTab";
import { ClaimChasersTab } from "@/components/claims/ClaimChasersTab";
import { ClaimMissingDocsTab } from "@/components/claims/ClaimMissingDocsTab";
import { ClaimRacTab } from "@/components/claims/ClaimRacTab";
import Link from "next/link";
import {
  Ship,
  FileSpreadsheet,
  Calculator,
  AlertTriangle,
  FileText,
  ArrowLeft,
  Edit2,
  Download,
  Scale,
  Clock,
  ShieldCheck,
  PlusCircle,
  Briefcase
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";

export default function ClaimDetailPage() {
  const params = useParams();
  const router = useRouter();
  const claimId = params.id as string;

  const [claim, setClaim] = useState<Claim | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "ports" | "sof" | "calculations" | "rac" | "discrepancies" | "ownerComparison" | "chasers" | "missingDocs" | "documents"
  >("overview");

  // Inline edit state
  const [isEditingGeneral, setIsEditingGeneral] = useState(false);
  const [generalEditForm, setGeneralEditForm] = useState<Partial<Claim>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Add/Edit Activity
  const [isAddActModalOpen, setIsAddActModalOpen] = useState(false);
  const [editingAct, setEditingAct] = useState<SoFActivity | null>(null);
  const [newActForm, setNewActForm] = useState({
    activityName: "Discharging commenced",
    berthId: "",
    portId: "",
    startTime: new Date().toISOString().substring(0, 16),
    stopTime: new Date(Date.now() + 4 * 3600 * 1000).toISOString().substring(0, 16),
    percentageCounted: 100,
    prorata: 100,
    deductionCategory: "Other" as const,
    remarks: "",
  });

  // Discrepancy correction modal
  const [correctingDisc, setCorrectingDisc] = useState<Discrepancy | null>(null);
  const [correctionInput, setCorrectionInput] = useState("");

  const { canEditClaim, isReadOnly } = useAuth();

  const loadClaim = async () => {
    setIsLoading(true);
    const data = await getClaimById(claimId);
    setClaim(data);
    if (data) {
      setGeneralEditForm({
        claimStatus: data.claimStatus,
        agreedAmount: data.agreedAmount,
        paymentReceived: data.paymentReceived,
        claimNotes: data.claimNotes,
        contentions: data.contentions,
        demurrageRatePerDay: data.demurrageRatePerDay,
        claimClosed: data.claimClosed,
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadClaim();
  }, [claimId]);

  const calculationResult = useMemo(() => {
    if (!claim) return null;
    return calculateClaimLaytime(claim);
  }, [claim]);

  const discrepancies = useMemo(() => {
    if (!claim) return [];
    return detectDiscrepancies(claim.activities || [], claim.ports || []);
  }, [claim]);

  const userCanEdit = canEditClaim(claim?.assignedTo);

  const handleSaveGeneralEdit = async () => {
    if (!claim) return;
    setIsSaving(true);
    try {
      const updated = await updateClaim(claim.id, generalEditForm);
      setClaim(updated);
      setIsEditingGeneral(false);
    } catch (e: any) {
      alert(e.message || "Failed to update claim");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claim) return;
    try {
      const updated = await addSoFActivity(claim.id, {
        claimId: claim.id,
        portId: newActForm.portId || claim.ports?.[0]?.id,
        berthId: newActForm.berthId || claim.ports?.[0]?.berths?.[0]?.id,
        activityName: newActForm.activityName,
        startTime: newActForm.startTime,
        stopTime: newActForm.stopTime,
        durationMinutes: 120,
        durationFormatted: "02h 00m",
        percentageCounted: Number(newActForm.percentageCounted),
        prorata: Number(newActForm.prorata),
        deductionCategory: newActForm.deductionCategory,
        remarks: newActForm.remarks,
      });
      setClaim(updated);
      setIsAddActModalOpen(false);
    } catch (e: any) {
      alert(e.message || "Failed to add activity");
    }
  };

  const handleExportPdf = () => {
    if (!claim || !calculationResult) return;
    exportClaimPdf(claim, calculationResult);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading claim data from database...</p>
        </div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-slate-600 font-medium">Claim file not found</p>
        <Link href="/claims">
          <Button variant="outline" size="sm">Back to Claims Ledger</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link
              href="/claims"
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center space-x-2.5">
                <span className="font-extrabold text-blue-600 text-sm">{claim.id}</span>
                <span className="text-slate-300">•</span>
                <h1 className="text-base sm:text-lg font-bold text-slate-900">{claim.shipName}</h1>
                <Badge variant="outline" className="text-[11px] font-bold">
                  {claim.claimType}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Client: <span className="font-semibold text-slate-800">{claim.accountName}</span> • Assigned to:{" "}
                <span className="font-semibold text-slate-800">{claim.assignedTo}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              className="text-xs font-semibold h-9 px-3.5 rounded-lg flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Export PDF Report</span>
            </Button>

            {userCanEdit && !isReadOnly && (
              <Button
                size="sm"
                onClick={() => setIsEditingGeneral(!isEditingGeneral)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-3.5 rounded-lg flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>{isEditingGeneral ? "Cancel Edit" : "Edit Claim"}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Quick Highlights Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-xl">
            <span className="text-slate-400 block text-[11px]">Demurrage Rate:</span>
            <span className="font-bold text-slate-900">{formatCurrency(claim.demurrageRatePerDay)}/day</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl">
            <span className="text-slate-400 block text-[11px]">Filed Amount:</span>
            <span className="font-bold text-blue-600">{formatCurrency(claim.claimFiledAmount)}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl">
            <span className="text-slate-400 block text-[11px]">Agreed Settlement:</span>
            <span className="font-bold text-emerald-600">{formatCurrency(claim.agreedAmount || 0)}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl">
            <span className="text-slate-400 block text-[11px]">Timebar Compliance:</span>
            <span className={`font-bold ${claim.timebarred ? "text-rose-600" : "text-emerald-600"}`}>
              {claim.timebarred ? "Timebarred (Expired)" : "Compliant (Within 90d)"}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex border-b border-slate-200 space-x-2 sm:space-x-4 overflow-x-auto text-xs font-bold scrollbar-none">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 px-1 border-b-2 whitespace-nowrap transition ${
            activeTab === "overview" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          General Overview
        </button>
        <button
          onClick={() => setActiveTab("ports")}
          className={`pb-3 px-1 border-b-2 whitespace-nowrap transition ${
            activeTab === "ports" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Ports & Berths ({claim.ports?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("sof")}
          className={`pb-3 px-1 border-b-2 whitespace-nowrap transition ${
            activeTab === "sof" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Statement of Facts ({claim.activities?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("calculations")}
          className={`pb-3 px-1 border-b-2 whitespace-nowrap transition ${
            activeTab === "calculations" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Laytime Calculation
        </button>
        <button
          onClick={() => setActiveTab("discrepancies")}
          className={`pb-3 px-1 border-b-2 whitespace-nowrap transition flex items-center space-x-1 ${
            activeTab === "discrepancies" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Discrepancy Hub</span>
          {discrepancies.length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full ml-1">
              {discrepancies.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("rac")}
          className={`pb-3 px-1 border-b-2 whitespace-nowrap transition flex items-center space-x-1 ${
            activeTab === "rac" ? "border-blue-600 text-blue-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-800 font-medium"
          }`}
        >
          <Briefcase className="h-3.5 w-3.5 mr-1 text-indigo-500" />
          <span>RAC Recoverables</span>
        </button>
        <button
          onClick={() => setActiveTab("ownerComparison")}
          className={`pb-3 px-1 border-b-2 whitespace-nowrap transition flex items-center space-x-1 ${
            activeTab === "ownerComparison" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Scale className="h-3.5 w-3.5 mr-1" />
          <span>Owner Comparison</span>
        </button>
        <button
          onClick={() => setActiveTab("chasers")}
          className={`pb-3 px-1 border-b-2 whitespace-nowrap transition flex items-center space-x-1 ${
            activeTab === "chasers" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Clock className="h-3.5 w-3.5 mr-1" />
          <span>Claim Chasers</span>
        </button>
        <button
          onClick={() => setActiveTab("missingDocs")}
          className={`pb-3 px-1 border-b-2 whitespace-nowrap transition flex items-center space-x-1 ${
            activeTab === "missingDocs" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5 mr-1" />
          <span>Missing Docs Audit</span>
        </button>
      </div>

      {activeTab === "overview" && (
        <ClaimOverviewTab
          claim={claim}
          isEditingGeneral={isEditingGeneral}
          generalEditForm={generalEditForm}
          setGeneralEditForm={setGeneralEditForm}
          onSave={handleSaveGeneralEdit}
          isSaving={isSaving}
        />
      )}

      {activeTab === "ports" && (
        <ClaimPortsTab claim={claim} />
      )}

      {activeTab === "sof" && (
        <ClaimSoFTab
          claim={claim}
          userCanEdit={userCanEdit}
          onOpenAddModal={() => {
            setEditingAct(null);
            setIsAddActModalOpen(true);
          }}
          onOpenEditModal={(act) => {
            setEditingAct(act);
            setNewActForm({
              activityName: act.activityName,
              berthId: act.berthId || "",
              portId: act.portId || "",
              startTime: act.startTime,
              stopTime: act.stopTime,
              percentageCounted: act.percentageCounted,
              prorata: act.prorata || 100,
              deductionCategory: (act.deductionCategory as any) || "Other",
              remarks: act.remarks || "",
            });
            setIsAddActModalOpen(true);
          }}
        />
      )}

      {activeTab === "calculations" && calculationResult && (
        <ClaimCalculationsTab calculationResult={calculationResult} />
      )}

      {activeTab === "rac" && (
        <ClaimRacTab claim={claim} canEdit={userCanEdit} />
      )}

      {activeTab === "discrepancies" && (
        <ClaimDiscrepanciesTab
          discrepancies={discrepancies}
          userCanEdit={userCanEdit}
          onCorrect={(disc) => {
            setCorrectingDisc(disc);
          }}
        />
      )}

      {activeTab === "ownerComparison" && (
        <ClaimOwnerComparisonTab claim={claim} canEdit={userCanEdit} />
      )}

      {activeTab === "chasers" && (
        <ClaimChasersTab claim={claim} canEdit={userCanEdit} />
      )}

      {activeTab === "missingDocs" && (
        <ClaimMissingDocsTab claim={claim} />
      )}

      {/* Add SoF Activity Modal */}
      <Modal
        isOpen={isAddActModalOpen}
        onClose={() => setIsAddActModalOpen(false)}
        title="Add Statement of Facts Entry"
        maxWidth="md"
      >
        <form onSubmit={handleCreateActivity} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Activity Name / Event Description *</label>
            <Input
              value={newActForm.activityName}
              onChange={(e) => setNewActForm({ ...newActForm, activityName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Datetime *</label>
              <Input
                type="datetime-local"
                value={newActForm.startTime}
                onChange={(e) => setNewActForm({ ...newActForm, startTime: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Stop Datetime *</label>
              <Input
                type="datetime-local"
                value={newActForm.stopTime}
                onChange={(e) => setNewActForm({ ...newActForm, stopTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">% Counted (0-100)</label>
              <Input
                type="number"
                value={newActForm.percentageCounted}
                onChange={(e) => setNewActForm({ ...newActForm, percentageCounted: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Prorata % (0-100)</label>
              <Input
                type="number"
                value={newActForm.prorata}
                onChange={(e) => setNewActForm({ ...newActForm, prorata: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Deduction Type</label>
              <select
                value={newActForm.deductionCategory}
                onChange={(e) => setNewActForm({ ...newActForm, deductionCategory: e.target.value as any })}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="Other">Other</option>
                <option value="Rain">Rain</option>
                <option value="Weather">Weather</option>
                <option value="Waiting for berth">Waiting for berth</option>
                <option value="Equipment breakdown">Equipment breakdown</option>
                <option value="Shifting">Shifting</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Remarks & Clause Notes</label>
            <Input
              value={newActForm.remarks}
              onChange={(e) => setNewActForm({ ...newActForm, remarks: e.target.value })}
              placeholder="e.g. 50% counted under BPVOY4 Clause 17"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddActModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              Save to Statement of Facts
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
