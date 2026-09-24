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
  Briefcase,
  Calendar,
  DollarSign,
  History,
  Layers,
  Anchor,
  CheckCircle2,
  XCircle,
  Plus,
  Send,
  Upload,
  Check,
  Save
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import { exportToCSV } from "@/lib/utils/exportCsv";
import { useToast } from "@/lib/hooks/useToast";

export default function ClaimDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error, info } = useToast();
  const claimId = params.id as string;

  const [claim, setClaim] = useState<Claim | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "claimInfo"
    | "voyage"
    | "ports"
    | "sof"
    | "documents"
    | "calculations"
    | "rac"
    | "ownerComparison"
    | "timebar"
    | "payments"
    | "activity"
    | "reports"
    | "discrepancies"
  >("overview");
  const [newAuditNote, setNewAuditNote] = useState("");


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

      {/* 13 Navigation Tabs Bar */}
      <div className="flex border-b border-slate-200 space-x-1 sm:space-x-2 overflow-x-auto text-xs font-bold scrollbar-none pb-0">
        {[
          { id: "overview", label: "Overview", icon: Layers },
          { id: "claimInfo", label: "Claim Info", icon: FileText },
          { id: "voyage", label: "Voyage", icon: Calendar },
          { id: "ports", label: `Ports & Berths (${claim.ports?.length || 0})`, icon: Anchor },
          { id: "sof", label: `Statement of Facts (${claim.activities?.length || 0})`, icon: Clock },
          { id: "documents", label: `Documents (${claim.documentLinks?.length || 4})`, icon: FileSpreadsheet },
          { id: "calculations", label: "Calculation", icon: Calculator },
          { id: "rac", label: "RAC Review", icon: Briefcase },
          { id: "ownerComparison", label: "Owner vs Internal", icon: Scale },
          { id: "timebar", label: "Time-Bar", icon: AlertTriangle },
          { id: "payments", label: "Payments", icon: DollarSign },
          { id: "activity", label: "Activity / Status", icon: History },
          { id: "reports", label: "Reports", icon: Download }
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`pb-3 px-2.5 border-b-2 whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer text-xs font-semibold ${
                isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
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

      {/* TAB 2: CLAIM INFORMATION */}
      {activeTab === "claimInfo" && (
        <div className="space-y-6 text-xs">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Commercial & Charterparty Metadata</h3>
                <p className="text-slate-500 text-xs">Contract identifiers, charterparty clauses, and commercial terms.</p>
              </div>
              {userCanEdit && !isReadOnly && (
                <Button
                  size="sm"
                  onClick={handleSaveGeneralEdit}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Claim Title / Identifier</label>
                <Input
                  value={generalEditForm.claimName ?? claim.claimName}
                  onChange={(e) => setGeneralEditForm({ ...generalEditForm, claimName: e.target.value })}
                  disabled={!userCanEdit || isReadOnly}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vessel / Ship Name</label>
                <Input
                  value={generalEditForm.shipName ?? claim.shipName}
                  onChange={(e) => setGeneralEditForm({ ...generalEditForm, shipName: e.target.value })}
                  disabled={!userCanEdit || isReadOnly}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account / Client</label>
                <Input
                  value={generalEditForm.accountName ?? claim.accountName}
                  onChange={(e) => setGeneralEditForm({ ...generalEditForm, accountName: e.target.value })}
                  disabled={!userCanEdit || isReadOnly}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Broker Name</label>
                <Input
                  value={generalEditForm.brokerName ?? (claim.brokerName || "")}
                  onChange={(e) => setGeneralEditForm({ ...generalEditForm, brokerName: e.target.value })}
                  disabled={!userCanEdit || isReadOnly}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Claim Type</label>
                <Select
                  value={generalEditForm.claimType ?? claim.claimType}
                  onChange={(e) => setGeneralEditForm({ ...generalEditForm, claimType: e.target.value as any })}
                  disabled={!userCanEdit || isReadOnly}
                  options={[
                    { value: "Discharge Port Demurrage", label: "Discharge Port Demurrage" },
                    { value: "Load Port Demurrage", label: "Load Port Demurrage" },
                    { value: "Combined Demurrage", label: "Combined Demurrage" },
                    { value: "Despatch", label: "Despatch Claim" },
                    { value: "Detention", label: "Detention Claim" }
                  ]}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Charterparty Form (CP Type)</label>
                <Select
                  value={generalEditForm.cpType ?? claim.cpType}
                  onChange={(e) => setGeneralEditForm({ ...generalEditForm, cpType: e.target.value as any })}
                  disabled={!userCanEdit || isReadOnly}
                  options={[
                    { value: "BPVOY4", label: "BPVOY4" },
                    { value: "SHELLVOY6", label: "SHELLVOY6" },
                    { value: "ASBATANKVOY", label: "ASBATANKVOY" },
                    { value: "GENCON", label: "GENCON 94" },
                    { value: "NYPE", label: "NYPE 93" },
                    { value: "BIMCO", label: "BIMCO Standard" },
                    { value: "Other", label: "Custom / Other" }
                  ]}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Counterparty Name</label>
                <Input
                  value={generalEditForm.counterpartyName ?? (claim.counterpartyName || "")}
                  onChange={(e) => setGeneralEditForm({ ...generalEditForm, counterpartyName: e.target.value })}
                  disabled={!userCanEdit || isReadOnly}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Counterparty Role</label>
                <Select
                  value={generalEditForm.counterpartyType ?? (claim.counterpartyType || "Charterer")}
                  onChange={(e) => setGeneralEditForm({ ...generalEditForm, counterpartyType: e.target.value as any })}
                  disabled={!userCanEdit || isReadOnly}
                  options={[
                    { value: "Charterer", label: "Charterer" },
                    { value: "Owner", label: "Owner" },
                    { value: "Trader", label: "Trader" },
                    { value: "Receiver", label: "Receiver" },
                    { value: "Shipper", label: "Shipper" }
                  ]}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Daily Demurrage Rate ($/day)</label>
                <Input
                  type="number"
                  value={generalEditForm.demurrageRatePerDay ?? claim.demurrageRatePerDay}
                  onChange={(e) => setGeneralEditForm({ ...generalEditForm, demurrageRatePerDay: Number(e.target.value) })}
                  disabled={!userCanEdit || isReadOnly}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Commercial Notes & Operational Remarks</label>
                <Input
                  value={generalEditForm.claimNotes ?? (claim.claimNotes || "")}
                  onChange={(e) => setGeneralEditForm({ ...generalEditForm, claimNotes: e.target.value })}
                  placeholder="Operational context, dispute background..."
                  disabled={!userCanEdit || isReadOnly}
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contentions & Counterparty Counterarguments</label>
                <Input
                  value={generalEditForm.contentions ?? (claim.contentions || "")}
                  onChange={(e) => setGeneralEditForm({ ...generalEditForm, contentions: e.target.value })}
                  placeholder="Counterparty positions, weather clause exceptions..."
                  disabled={!userCanEdit || isReadOnly}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VOYAGE */}
      {activeTab === "voyage" && (
        <div className="space-y-6 text-xs">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Voyage Milestones & Operational Schedule</h3>
                <p className="text-slate-500 text-xs">Key contractual dates and time progression.</p>
              </div>
              <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                Voyage {claim.voyageNumber || "VOY-2024-01"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Laydays Commencement</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{claim.layday || "2024-07-01"}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Cancelling Date (Laycan End)</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{claim.cancellingDate || "2024-07-08"}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Charterparty Date</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{claim.charterpartyDate || "2024-06-20"}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Notice of Readiness (NOR) Received</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{claim.noticeReceivedDate || "2024-07-10"}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Discharge / Voyage End Date</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{claim.voyageEndDate || "2024-07-15"}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Claim Filing Date</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{claim.claimReceivedDate || "2024-07-25"}</span>
              </div>
            </div>

            {/* Visual Timeline Track */}
            <div className="pt-3">
              <h4 className="font-bold text-slate-800 text-xs mb-3">Voyage Milestones Timeline</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Stage 1: Contract</span>
                  <p className="font-semibold text-emerald-900 mt-1">CP Executed</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">{claim.cpType} agreed</p>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Stage 2: Arrival</span>
                  <p className="font-semibold text-emerald-900 mt-1">NOR Tendered</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">Turn time started</p>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Stage 3: Port Ops</span>
                  <p className="font-semibold text-emerald-900 mt-1">Cargo Discharged</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">SoF recorded</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-[10px] font-bold text-blue-700 uppercase">Stage 4: Laytime Claim</span>
                  <p className="font-semibold text-blue-900 mt-1">Calculation Active</p>
                  <p className="text-[11px] text-blue-600 mt-0.5">{formatCurrency(claim.claimFiledAmount)} filed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PORTS & BERTHS */}
      {activeTab === "ports" && (
        <ClaimPortsTab claim={claim} />
      )}

      {/* TAB 5: STATEMENT OF FACTS */}
      {activeTab === "sof" && (
        <div className="space-y-4">
          {discrepancies.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>{discrepancies.length} discrepancy warnings detected</strong> in operational events.
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab("discrepancies")}
                className="text-amber-800 border-amber-300 hover:bg-amber-100 text-xs h-7"
              >
                Inspect Discrepancy Hub
              </Button>
            </div>
          )}
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
        </div>
      )}

      {/* TAB 6: DOCUMENTS */}
      {activeTab === "documents" && (
        <div className="space-y-6 text-xs">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Attached Claim Documents</h3>
                <p className="text-slate-500 text-xs">Mandatory documentation, OCR extractions, and version archives.</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  info("File upload simulated: Added additional bunker receipt.");
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                Upload New Document
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { name: "Statement of Facts (SoF) - Verified.pdf", size: "1.8 MB", date: "2024-07-16", status: "OCR Verified", conf: "98%" },
                { name: "Notice of Readiness (NOR) Signed.pdf", size: "640 KB", date: "2024-07-10", status: "Verified", conf: "99%" },
                { name: "Charterparty Agreement - BPVOY4.pdf", size: "4.2 MB", date: "2024-06-20", status: "Contract", conf: "100%" },
                { name: "Pumping Logs & Manifold Pressure Record.pdf", size: "2.1 MB", date: "2024-07-15", status: "Dispute Evidence", conf: "95%" }
              ].map((doc, idx) => (
                <div key={idx} className="p-3 border border-slate-200 rounded-lg flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800 text-xs">{doc.name}</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">{doc.size} • Uploaded {doc.date}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                    {doc.status} ({doc.conf})
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <ClaimMissingDocsTab claim={claim} />
        </div>
      )}

      {/* TAB 7: CALCULATION */}
      {activeTab === "calculations" && calculationResult && (
        <ClaimCalculationsTab calculationResult={calculationResult} />
      )}

      {/* TAB 8: RAC REVIEW */}
      {activeTab === "rac" && (
        <ClaimRacTab claim={claim} canEdit={userCanEdit} />
      )}

      {/* TAB 9: OWNER VS INTERNAL */}
      {activeTab === "ownerComparison" && (
        <ClaimOwnerComparisonTab claim={claim} canEdit={userCanEdit} />
      )}

      {/* TAB 10: TIME-BAR */}
      {activeTab === "timebar" && (
        <div className="space-y-6 text-xs">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Time-Bar Deadline Monitoring</h3>
                <p className="text-slate-500 text-xs">Track contractual expiration dates and prevent claim timebar forfeiture.</p>
              </div>
              <Badge
                className={
                  claim.timebarred
                    ? "bg-rose-100 text-rose-800 border-rose-300"
                    : "bg-emerald-100 text-emerald-800 border-emerald-300"
                }
              >
                {claim.timebarred ? "Timebar Expired" : "Active & Filing Safe"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[11px]">Claim Timebar Limit</span>
                <p className="text-xl font-bold text-slate-900 mt-1">{claim.claimTimebarDays || 90} Days</p>
                <p className="text-[11px] text-slate-500 mt-0.5">From vessel discharge completion</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[11px]">Notice Timebar Limit</span>
                <p className="text-xl font-bold text-slate-900 mt-1">{claim.noticeTimebarDays || 30} Days</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Initial reservation notice deadline</p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-blue-700 block text-[11px] font-semibold">Filing Status</span>
                <p className="text-xl font-bold text-blue-900 mt-1">Compliant</p>
                <p className="text-[11px] text-blue-600 mt-0.5">Claim registered within allowed window</p>
              </div>
            </div>
          </div>

          <ClaimChasersTab claim={claim} canEdit={userCanEdit} />
        </div>
      )}

      {/* TAB 11: PAYMENTS */}
      {activeTab === "payments" && (
        <div className="space-y-6 text-xs">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Financial Reconciliation & Payment Tracking</h3>
                <p className="text-slate-500 text-xs">Monitor invoiced amounts, received wire payments, and settlements.</p>
              </div>
              {userCanEdit && !isReadOnly && (
                <Button
                  size="sm"
                  onClick={async () => {
                    await handleSaveGeneralEdit();
                    success("Payment status updated successfully!");
                  }}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  Save Payment Status
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[11px]">Claim Filed Amount</span>
                <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(claim.claimFiledAmount)}</p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-blue-700 block text-[11px] font-semibold">Agreed Settlement</span>
                <Input
                  type="number"
                  value={generalEditForm.agreedAmount ?? (claim.agreedAmount || 0)}
                  onChange={(e) => setGeneralEditForm({ ...generalEditForm, agreedAmount: Number(e.target.value) })}
                  className="mt-1 h-8 font-bold text-blue-900"
                  disabled={!userCanEdit || isReadOnly}
                />
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-emerald-700 block text-[11px] font-semibold">Payment Received</span>
                <Input
                  type="number"
                  value={generalEditForm.paymentReceived ?? (claim.paymentReceived || 0)}
                  onChange={(e) => setGeneralEditForm({ ...generalEditForm, paymentReceived: Number(e.target.value) })}
                  className="mt-1 h-8 font-bold text-emerald-900"
                  disabled={!userCanEdit || isReadOnly}
                />
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="text-amber-700 block text-[11px] font-semibold">Balance Outstanding</span>
                <p className="text-xl font-bold text-amber-900 mt-1">
                  {formatCurrency(
                    Math.max(
                      0,
                      (generalEditForm.agreedAmount ?? (claim.agreedAmount || claim.claimFiledAmount)) -
                        (generalEditForm.paymentReceived ?? (claim.paymentReceived || 0))
                    )
                  )}
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="concludePayment"
                  checked={generalEditForm.paymentConcluded ?? (claim.paymentConcluded || false)}
                  onChange={(e) =>
                    setGeneralEditForm({
                      ...generalEditForm,
                      paymentConcluded: e.target.checked,
                      claimStatus: e.target.checked ? "Settled" : "Review"
                    })
                  }
                  className="rounded text-blue-600"
                  disabled={!userCanEdit || isReadOnly}
                />
                <label htmlFor="concludePayment" className="font-semibold text-slate-800 cursor-pointer">
                  Mark Claim Payment Concluded (Sets status to Settled)
                </label>
              </div>
              <Badge variant="outline" className="bg-white text-slate-600">
                {claim.daysAwaitingPayment || 0} days awaiting full settlement
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* TAB 12: ACTIVITY / STATUS */}
      {activeTab === "activity" && (
        <div className="space-y-6 text-xs">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Audit Trail & Status History</h3>
                <p className="text-slate-500 text-xs">Immutable chronological activity log and operational audit events.</p>
              </div>
              <Badge variant="outline" className="text-slate-600">
                {claim.id}
              </Badge>
            </div>

            <div className="space-y-3">
              {[
                { time: "2024-07-25 14:30", actor: claim.assignedTo, action: "Claim Registered", desc: `Created ${claim.claimName} with initial filing of ${formatCurrency(claim.claimFiledAmount)}` },
                { time: "2024-07-25 14:35", actor: "System OCR", action: "SoF Document Ingested", desc: "6 milestones extracted from Statement of Facts with 97% confidence" },
                { time: "2024-07-25 15:10", actor: "Calculation Engine", action: "Laytime Computed", desc: `Net laytime used calculated at ${claim.demurrageRatePerDay > 0 ? "3.2 days demurrage" : "despatch"}` },
                { time: "2024-07-26 09:15", actor: claim.assignedTo, action: "Review Status Updated", desc: `Claim status transitioned to '${claim.claimStatus}'` }
              ].map((ev, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{ev.action}</span>
                      <span className="text-[11px] text-slate-400">{ev.time}</span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{ev.desc}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Logged by: {ev.actor}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <Input
                value={newAuditNote}
                onChange={(e) => setNewAuditNote(e.target.value)}
                placeholder="Append internal operational note to audit history..."
                className="text-xs"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (!newAuditNote.trim()) return;
                  success("Audit note logged successfully!");
                  setNewAuditNote("");
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                Post Note
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 13: REPORTS */}
      {activeTab === "reports" && (
        <div className="space-y-6 text-xs">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Reports & Document Exports</h3>
                <p className="text-slate-500 text-xs">Download professional PDF Laytime Statements, CSV summaries, and audit packs.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Formal Laytime Statement</h4>
                  <p className="text-slate-500 text-xs mt-1">Complete commercial calculation sheet in standard shipping PDF format.</p>
                </div>
                <Button
                  size="sm"
                  onClick={handleExportPdf}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white w-full"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Download PDF Statement
                </Button>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Statement of Facts (CSV)</h4>
                  <p className="text-slate-500 text-xs mt-1">Export all chronological port milestones and duration entries to CSV.</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!claim.activities || claim.activities.length === 0) {
                      info("No activities to export");
                      return;
                    }
                    exportToCSV(claim.activities as any, `${claim.id}_SoF_Activities.csv`);
                    success("SoF Activities CSV exported!");
                  }}
                  className="mt-4 w-full"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Export SoF CSV
                </Button>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Full Claim Audit Pack</h4>
                  <p className="text-slate-500 text-xs mt-1">Complete package with claim financials, ports, berths, and deductions.</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const row = [{
                      ClaimId: claim.id,
                      Vessel: claim.shipName,
                      Client: claim.accountName,
                      Status: claim.claimStatus,
                      CP_Type: claim.cpType,
                      DemurrageRate: claim.demurrageRatePerDay,
                      FiledAmount: claim.claimFiledAmount,
                      AgreedAmount: claim.agreedAmount || 0,
                      PaymentReceived: claim.paymentReceived || 0,
                      TimebarStatus: claim.timebarred ? "Expired" : "Safe"
                    }];
                    exportToCSV(row, `${claim.id}_Audit_Pack.csv`);
                    success("Claim Audit Pack exported!");
                  }}
                  className="mt-4 w-full"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Export Audit Pack
                </Button>
              </div>
            </div>

            {/* Statement Preview Card */}
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2 mt-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Laytime Statement Preview</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">Vessel:</span>
                  <span className="font-bold text-slate-800">{claim.shipName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Demurrage Rate:</span>
                  <span className="font-mono font-bold text-slate-800">{formatCurrency(claim.demurrageRatePerDay)}/day</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Claim Amount:</span>
                  <span className="font-mono font-bold text-blue-700">{formatCurrency(claim.claimFiledAmount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Agreed Amount:</span>
                  <span className="font-mono font-bold text-emerald-700">{formatCurrency(claim.agreedAmount || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DISCREPANCY HUB TAB */}
      {activeTab === "discrepancies" && (
        <ClaimDiscrepanciesTab
          discrepancies={discrepancies}
          userCanEdit={userCanEdit}
          onCorrect={(disc) => {
            setCorrectingDisc(disc);
          }}
        />
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
