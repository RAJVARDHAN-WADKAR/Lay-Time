"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { getClaimById, updateClaim, addActivity, updateActivity } from "@/lib/api";
import { Claim, SoFActivity, Discrepancy } from "@/lib/types";
import { calculateClaimLaytime } from "@/lib/calculations";
import { detectDiscrepancies } from "@/lib/calculations/discrepancies";
import { exportClaimPdf } from "@/lib/utils/exportPdf";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/modal";
import { Tooltip } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/context/AuthContext";
import { ClaimOverviewTab } from "@/components/claims/ClaimOverviewTab";
import { ClaimPortsTab } from "@/components/claims/ClaimPortsTab";
import { ClaimSoFTab } from "@/components/claims/ClaimSoFTab";
import { ClaimCalculationsTab } from "@/components/claims/ClaimCalculationsTab";
import { ClaimDiscrepanciesTab } from "@/components/claims/ClaimDiscrepanciesTab";
import Link from "next/link";
import {
  Ship,
  Anchor,
  FileSpreadsheet,
  Calculator,
  AlertTriangle,
  FileText,
  ArrowLeft,
  Edit2,
  Download,
} from "lucide-react";

export default function ClaimDetailPage() {
  const params = useParams();
  const router = useRouter();
  const claimId = params.id as string;

  const [claim, setClaim] = useState<Claim | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "ports" | "sof" | "calculations" | "discrepancies" | "documents">("overview");

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

  useEffect(() => {
    async function loadClaim() {
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
    }
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

  const handleSaveGeneral = async () => {
    if (!claim) return;
    setIsSaving(true);
    const updated = await updateClaim(claim.id, generalEditForm);
    setClaim(updated);
    setIsSaving(false);
    setIsEditingGeneral(false);
  };

  const handleAddActivity = async () => {
    if (!claim) return;
    setIsSaving(true);
    const gross = (new Date(newActForm.stopTime).getTime() - new Date(newActForm.startTime).getTime()) / (1000 * 60);
    const created = await addActivity(claim.id, {
      claimId: claim.id,
      portId: newActForm.portId || claim.ports?.[0]?.id || "",
      berthId: newActForm.berthId || claim.ports?.[0]?.berths?.[0]?.id || "",
      activityName: newActForm.activityName,
      startTime: newActForm.startTime,
      stopTime: newActForm.stopTime,
      durationMinutes: isNaN(gross) ? 0 : Math.round(gross),
      durationFormatted: `${Math.floor((gross || 0) / 60)}h ${(gross || 0) % 60}m`,
      percentageCounted: newActForm.percentageCounted,
      prorata: newActForm.prorata,
      deductionCategory: newActForm.deductionCategory,
      remarks: newActForm.remarks,
    });
    setClaim((prev) => (prev ? { ...prev, activities: [...(prev.activities || []), created] } : prev));
    setIsSaving(false);
    setIsAddActModalOpen(false);
  };

  const handleUpdateActivity = async () => {
    if (!claim || !editingAct) return;
    setIsSaving(true);
    const gross = (new Date(editingAct.stopTime).getTime() - new Date(editingAct.startTime).getTime()) / (1000 * 60);
    const durationMinutes = isNaN(gross) ? 0 : Math.round(gross);
    const updated = await updateActivity(claim.id, editingAct.id, {
      ...editingAct,
      durationMinutes,
      durationFormatted: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
    });
    setClaim((prev) =>
      prev
        ? {
            ...prev,
            activities: prev.activities?.map((a) => (a.id === updated.id ? updated : a)),
          }
        : prev
    );
    setIsSaving(false);
    setEditingAct(null);
  };

  const handleApplyDiscrepancyCorrection = async () => {
    if (!claim || !correctingDisc) return;
    setIsSaving(true);
    if (correctingDisc.type === "start_after_stop" && correctingDisc.activityId) {
      const act = claim.activities?.find((a) => a.id === correctingDisc.activityId);
      if (act) {
        const newStop = correctionInput || new Date(new Date(act.startTime).getTime() + 4 * 3600 * 1000).toISOString();
        await updateActivity(claim.id, act.id, { stopTime: newStop });
      }
    } else if (correctingDisc.type === "missing_berth" && correctingDisc.activityId) {
      const targetBerth = correctionInput || claim.ports?.[0]?.berths?.[0]?.id || "";
      await updateActivity(claim.id, correctingDisc.activityId, { berthId: targetBerth });
    }
    const refreshed = await getClaimById(claim.id);
    setClaim(refreshed);
    setIsSaving(false);
    setCorrectingDisc(null);
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
        <p className="text-xs">Loading claim records...</p>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="py-16 max-w-lg mx-auto">
        <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-4 shadow-2xs">
          <Ship className="h-10 w-10 text-slate-300 mx-auto" />
          <div>
            <h3 className="font-bold text-slate-800 text-base">Claim Not Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              The claim record with ID &quot;{claimId}&quot; does not exist or was removed.
            </p>
          </div>
          <Link href="/claims">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
              Return to Claim Ledger
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link href="/claims">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{claim.id}</span>
              <Badge status={claim.claimStatus} />
              {claim.timebarred && <Badge variant="destructive">Timebarred</Badge>}
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
              {claim.shipName} — {claim.claimName}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportClaimPdf(claim, calculationResult)}
            className="flex items-center space-x-1.5 text-xs text-slate-700"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download PDF</span>
          </Button>

          {userCanEdit ? (
            <Button
              size="sm"
              onClick={() => setIsEditingGeneral(!isEditingGeneral)}
              className="flex items-center space-x-1.5 text-xs"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>{isEditingGeneral ? "Cancel Edit" : "Edit Claim"}</span>
            </Button>
          ) : (
            <Tooltip
              content={
                isReadOnly
                  ? "Reviewer: Read-only access"
                  : "Claim assigned to another processor"
              }
            >
              <Button size="sm" variant="outline" disabled className="text-xs opacity-60">
                <span>Read Only</span>
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto text-xs font-semibold">
        {[
          { id: "overview", label: "Overview & Financials", icon: Ship },
          { id: "ports", label: `Ports & Berths (${claim.ports?.length || 0})`, icon: Anchor },
          { id: "sof", label: `Statement of Facts (${claim.activities?.length || 0})`, icon: FileSpreadsheet },
          { id: "calculations", label: "Calculations Engine", icon: Calculator },
          {
            id: "discrepancies",
            label: `Discrepancies (${discrepancies.length})`,
            icon: AlertTriangle,
            badge: discrepancies.length,
          },
          { id: "documents", label: `Documents (${claim.documentLinks?.length || 0})`, icon: FileText },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2.5 px-3.5 border-b-2 font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "border-blue-600 text-blue-600 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === "overview" && (
        <ClaimOverviewTab
          claim={claim}
          isEditingGeneral={isEditingGeneral}
          generalEditForm={generalEditForm}
          setGeneralEditForm={setGeneralEditForm}
          onSave={handleSaveGeneral}
          isSaving={isSaving}
        />
      )}

      {activeTab === "ports" && <ClaimPortsTab claim={claim} />}

      {activeTab === "sof" && (
        <ClaimSoFTab
          claim={claim}
          userCanEdit={userCanEdit}
          onOpenAddModal={() => setIsAddActModalOpen(true)}
          onOpenEditModal={(act) => setEditingAct(act)}
        />
      )}

      {activeTab === "calculations" && calculationResult && (
        <ClaimCalculationsTab calculationResult={calculationResult} />
      )}

      {activeTab === "discrepancies" && (
        <ClaimDiscrepanciesTab
          discrepancies={discrepancies}
          userCanEdit={userCanEdit}
          onCorrect={(disc) => {
            setCorrectingDisc(disc);
            setCorrectionInput(disc.suggestedValue || "");
          }}
        />
      )}

      {activeTab === "documents" && (
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Linked Voyage Documents</h3>
            <Link href="/documents">
              <Button size="sm" variant="outline" className="text-xs">
                Go to OCR Processing Hub
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {(claim.documentLinks || ["SOF_Document.pdf", "Charterparty_Contract.pdf"]).map((docName, idx) => (
              <div key={idx} className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                <div className="flex items-center space-x-2.5">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <span className="font-semibold text-slate-900 block">{docName}</span>
                    <span className="text-[10px] text-slate-400">PDF Document • Verified</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-blue-600">
                  View
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Activity Modal */}
      <Modal
        isOpen={isAddActModalOpen}
        onClose={() => setIsAddActModalOpen(false)}
        title="Add Statement of Facts Activity"
        maxWidth="md"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Activity Name</label>
            <Input
              value={newActForm.activityName}
              onChange={(e) => setNewActForm({ ...newActForm, activityName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Start Time (UTC)</label>
              <Input
                type="datetime-local"
                value={newActForm.startTime}
                onChange={(e) => setNewActForm({ ...newActForm, startTime: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Stop Time (UTC)</label>
              <Input
                type="datetime-local"
                value={newActForm.stopTime}
                onChange={(e) => setNewActForm({ ...newActForm, stopTime: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsAddActModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddActivity} isLoading={isSaving}>Add Activity</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Activity Modal */}
      {editingAct && (
        <Modal
          isOpen={!!editingAct}
          onClose={() => setEditingAct(null)}
          title={`Edit Activity: ${editingAct.activityName}`}
          maxWidth="md"
        >
          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Activity Name</label>
              <Input
                value={editingAct.activityName}
                onChange={(e) => setEditingAct({ ...editingAct, activityName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Start Time (UTC)</label>
                <Input
                  type="datetime-local"
                  value={editingAct.startTime.substring(0, 16)}
                  onChange={(e) => setEditingAct({ ...editingAct, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Stop Time (UTC)</label>
                <Input
                  type="datetime-local"
                  value={editingAct.stopTime.substring(0, 16)}
                  onChange={(e) => setEditingAct({ ...editingAct, stopTime: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">% Counted (0-100)</label>
                <Input
                  type="number"
                  value={editingAct.percentageCounted}
                  onChange={(e) =>
                    setEditingAct({
                      ...editingAct,
                      percentageCounted: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Deduction Category</label>
                <Select
                  value={editingAct.deductionCategory}
                  onChange={(e) =>
                    setEditingAct({
                      ...editingAct,
                      deductionCategory: e.target.value as any,
                    })
                  }
                >
                  <option value="Weather">Weather</option>
                  <option value="Rain">Rain</option>
                  <option value="Shifting">Shifting</option>
                  <option value="Waiting for berth">Waiting for berth</option>
                  <option value="Equipment breakdown">Equipment breakdown</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setEditingAct(null)}>Cancel</Button>
              <Button onClick={handleUpdateActivity} isLoading={isSaving}>Save Updates</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Discrepancy Correction Quick Modal */}
      {correctingDisc && (
        <Modal
          isOpen={!!correctingDisc}
          onClose={() => setCorrectingDisc(null)}
          title={`Resolve: ${correctingDisc.title}`}
          maxWidth="md"
        >
          <div className="space-y-3 text-xs">
            <p className="text-slate-600">{correctingDisc.description}</p>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Enter Corrected Value</label>
              <Input
                value={correctionInput}
                onChange={(e) => setCorrectionInput(e.target.value)}
                placeholder={correctingDisc.suggestedValue}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setCorrectingDisc(null)}>Cancel</Button>
              <Button onClick={handleApplyDiscrepancyCorrection} isLoading={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                Apply Correction
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
