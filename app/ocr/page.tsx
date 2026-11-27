"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  getClaims,
  getClaimById,
  getClaimOcrData,
  runDocumentOcr,
  confirmOcrDraft,
  updateActivity
} from "@/lib/api";
import {
  Claim,
  DocumentRecord,
  OcrDraft,
  OcrDraftEvent,
  SoFActivity,
  Discrepancy
} from "@/lib/types";
import { detectDiscrepancies } from "@/lib/calculations/discrepancies";
import { getNowDatetimeLocalIso, validateSofEvent } from "@/lib/utils/dateRules";
import { CONTROLLED_SOF_VOCABULARY } from "@/lib/ocr/parser";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataErrorBanner } from "@/components/ui/data-error-banner";
import { Input, Select } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/lib/context/AuthContext";
import { normalizeRole } from "@/lib/auth/accessMatrix";
import { useToast } from "@/lib/hooks/useToast";
import Link from "next/link";
import {
  ScanText,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Sparkles,
  ArrowRight,
  Wand2,
  FileCheck,
  RotateCcw,
  FileText,
  Upload,
  Check,
  Trash2,
  ShieldAlert
} from "lucide-react";

export default function OcrSoFReviewPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string>("");
  const [claim, setClaim] = useState<Claim | null>(null);
  const [claimDocs, setClaimDocs] = useState<DocumentRecord[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [selectedPortId, setSelectedPortId] = useState<string>("");
  const [selectedBerthId, setSelectedBerthId] = useState<string>("");

  const [drafts, setDrafts] = useState<OcrDraft[]>([]);
  const [draftEvents, setDraftEvents] = useState<OcrDraftEvent[]>([]);
  const [activePageFilter, setActivePageFilter] = useState<number | "ALL">("ALL");

  const [isLoading, setIsLoading] = useState(true);
  const [isRunningOcr, setIsRunningOcr] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [highlightedLine, setHighlightedLine] = useState<string | null>(null);

  const [editingDraftEvt, setEditingDraftEvt] = useState<OcrDraftEvent | null>(null);
  const [editingAct, setEditingAct] = useState<SoFActivity | null>(null);
  const [correctingDisc, setCorrectingDisc] = useState<Discrepancy | null>(null);
  const [correctionInput, setCorrectionInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { role, canEditClaim, canUploadDocuments } = useAuth();
  const normRole = normalizeRole(role);
  const canRunOcr = normRole === "ADMIN" || normRole === "SUPERVISOR" || normRole === "CLAIM_PROCESSOR";
  const { success, error: showError } = useToast();

  const loadWorkspaceForClaim = useCallback(async (cId: string, loadedClaims?: Claim[]) => {
    if (!cId) return;
    const [fullClaim, ocrWorkspace] = await Promise.all([
      getClaimById(cId),
      getClaimOcrData(cId)
    ]);
    const targetClaim = fullClaim || loadedClaims?.find((c) => c.id === cId) || null;
    setClaim(targetClaim);

    const firstPort = targetClaim?.ports?.[0];
    setSelectedPortId(firstPort?.id || "");
    setSelectedBerthId(firstPort?.berths?.[0]?.id || "");

    const ocrEligibleDocs = (ocrWorkspace.documents || []).filter((d) => {
      const ext = d.fileName.split(".").pop()?.toLowerCase() || "";
      return ["pdf", "png", "jpg", "jpeg"].includes(ext);
    });
    setClaimDocs(ocrEligibleDocs);
    setDrafts(ocrWorkspace.drafts || []);

    const preferredDoc =
      ocrEligibleDocs.find((d) => d.id === selectedDocId) || ocrEligibleDocs[0] || null;
    setSelectedDocId(preferredDoc?.id || "");

    const matchedDraft = preferredDoc
      ? ocrWorkspace.drafts.find((dr: OcrDraft) => dr.documentId === preferredDoc.id) || null
      : null;
    setDraftEvents(matchedDraft?.parsedEvents || []);
  }, [selectedDocId]);

  const loadInitial = useCallback(async (isManualRefresh = false) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const allClaims = await getClaims();
      setClaims(allClaims);
      const targetId =
        (selectedClaimId && allClaims.some((c) => c.id === selectedClaimId) ? selectedClaimId : "") ||
        allClaims[0]?.id ||
        "";
      setSelectedClaimId(targetId);
      if (targetId) {
        await loadWorkspaceForClaim(targetId, allClaims);
      } else {
        setClaim(null);
        setClaimDocs([]);
        setDrafts([]);
        setDraftEvents([]);
      }
      if (isManualRefresh) {
        success("OCR Hub Refreshed", "Loaded latest uploaded documents and extraction drafts.");
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to load OCR workspace.";
      setLoadError(msg);
      if (isManualRefresh) showError("Refresh Failed", msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedClaimId, loadWorkspaceForClaim, success, showError]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const handleClaimChange = async (id: string) => {
    setSelectedClaimId(id);
    setSelectedDocId("");
    setDraftEvents([]);
    setIsLoading(true);
    try {
      await loadWorkspaceForClaim(id);
    } catch (err: any) {
      showError("Failed to Load Claim", err?.message || "Could not load claim OCR state.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentChange = (docId: string) => {
    setSelectedDocId(docId);
    const matchedDraft = drafts.find((d) => d.documentId === docId) || null;
    setDraftEvents(matchedDraft?.parsedEvents || []);
    setActivePageFilter("ALL");
  };

  const activeDoc = useMemo(
    () => claimDocs.find((d) => d.id === selectedDocId) || null,
    [claimDocs, selectedDocId]
  );

  const activeDraft = useMemo(
    () => drafts.find((d) => d.documentId === selectedDocId) || null,
    [drafts, selectedDocId]
  );

  const userCanEdit = canEditClaim(claim?.assignedTo) && canRunOcr;

  const handleRunOcr = async () => {
    if (!selectedDocId) {
      showError("No Document Selected", "Upload and select a PDF, PNG, or JPG Statement of Facts first.");
      return;
    }
    setIsRunningOcr(true);
    try {
      const result = await runDocumentOcr({
        documentId: selectedDocId,
        portId: selectedPortId || undefined,
        berthId: selectedBerthId || undefined
      });
      await loadWorkspaceForClaim(selectedClaimId);
      if (result?.extractedActivities) {
        setDraftEvents(result.extractedActivities);
      }
      success(
        "OCR Extraction Completed",
        `Extracted ${result.extractedActivities?.length || 0} draft event(s) with ${result.overallConfidencePct ?? 0}% overall confidence. Review before saving to SoF.`
      );
    } catch (err: any) {
      await loadWorkspaceForClaim(selectedClaimId).catch(() => {});
      showError("OCR Failed", err?.message || "Could not extract events from document.");
    } finally {
      setIsRunningOcr(false);
    }
  };

  const handleConfirmDraft = async () => {
    if (!selectedDocId || draftEvents.length === 0) {
      showError("No Draft Events", "Run OCR extraction first or ensure at least one draft event remains.");
      return;
    }

    for (const evt of draftEvents) {
      const check = validateSofEvent({
        id: evt.id,
        activityName: evt.activityName,
        startTime: evt.startTime,
        stopTime: evt.stopTime
      });
      if (!check.isValid) {
        showError(`Invalid Draft Timestamp (${evt.activityName})`, check.error || "Check timestamps.");
        return;
      }
    }

    setIsConfirming(true);
    try {
      const res = await confirmOcrDraft({
        documentId: selectedDocId,
        portId: selectedPortId || undefined,
        berthId: selectedBerthId || undefined,
        events: draftEvents
      });
      await loadWorkspaceForClaim(selectedClaimId);
      success(
        "Confirmed into Statement of Facts",
        `Saved ${res.savedCount} SoF event(s) to ${res.claimId}${res.correctionsCount ? ` (${res.correctionsCount} user corrections audit-logged)` : ""}.`
      );
    } catch (err: any) {
      showError("Confirmation Failed", err?.message || "Could not save draft events.");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSaveDraftEdit = () => {
    if (!editingDraftEvt) return;
    const s = new Date(editingDraftEvt.startTime).getTime();
    const e = new Date(editingDraftEvt.stopTime).getTime();
    const durationMinutes = !isNaN(s) && !isNaN(e) && e > s ? Math.round((e - s) / 60000) : 0;
    const d = Math.floor(durationMinutes / 1440);
    const h = Math.floor((durationMinutes % 1440) / 60);
    const m = durationMinutes % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    const durationFormatted = d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}h ${pad(m)}m`;

    setDraftEvents((prev) =>
      prev.map((ev) =>
        ev.id === editingDraftEvt.id
          ? {
              ...editingDraftEvt,
              durationMinutes,
              durationFormatted,
              isCorrected: true,
              isUnclassified: editingDraftEvt.activityName === "Unclassified"
            }
          : ev
      )
    );
    setEditingDraftEvt(null);
    success("Draft Updated", "Modified event queued. Click Confirm & Save when ready.");
  };

  const discrepancies = useMemo(() => {
    if (!claim) return [];
    return detectDiscrepancies(claim.activities || [], claim.ports || []);
  }, [claim]);

  const handleUpdateSavedActivity = async () => {
    if (!claim || !editingAct) return;
    const check = validateSofEvent({
      id: editingAct.id,
      activityName: editingAct.activityName,
      startTime: editingAct.startTime,
      stopTime: editingAct.stopTime
    });
    if (!check.isValid) {
      showError("Invalid Date/Time", check.error || "Invalid timestamps.");
      return;
    }
    setIsSaving(true);
    try {
      await updateActivity(claim.id, editingAct.id, {
        activityName: editingAct.activityName,
        startTime: editingAct.startTime,
        stopTime: editingAct.stopTime,
        berthId: editingAct.berthId,
        percentageCounted: editingAct.percentageCounted,
        isCorrected: true
      });
      await loadWorkspaceForClaim(claim.id);
      success("Saved SoF Corrected", `"${editingAct.activityName}" updated and flagged as corrected.`);
      setEditingAct(null);
    } catch (err: any) {
      showError("Update Failed", err?.message || "Failed to update SoF event.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyDiscrepancyCorrection = async () => {
    if (!claim || !correctingDisc) return;
    setIsSaving(true);
    try {
      if (correctingDisc.type === "start_after_stop" && correctingDisc.activityId) {
        const act = claim.activities?.find((a) => a.id === correctingDisc.activityId);
        if (act) {
          const newStop = correctionInput || new Date(new Date(act.startTime).getTime() + 4 * 3600 * 1000).toISOString();
          await updateActivity(claim.id, act.id, { stopTime: newStop, isCorrected: true });
        }
      } else if (correctingDisc.type === "missing_berth" && correctingDisc.activityId) {
        const targetBerth = correctionInput || claim.ports?.[0]?.berths?.[0]?.id || "";
        await updateActivity(claim.id, correctingDisc.activityId, { berthId: targetBerth, isCorrected: true });
      }
      await loadWorkspaceForClaim(claim.id);
      success("Correction Applied", "Discrepancy resolved.");
      setCorrectingDisc(null);
      setCorrectionInput("");
    } catch (err: any) {
      showError("Correction Failed", err?.message || "Could not apply correction.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredDraftEvents = useMemo(() => {
    if (activePageFilter === "ALL") return draftEvents;
    return draftEvents.filter((e) => e.pageNumber === activePageFilter);
  }, [draftEvents, activePageFilter]);

  const rawDisplayText = useMemo(() => {
    if (!activeDraft) return "";
    if (activePageFilter === "ALL") return activeDraft.rawText;
    const pg = activeDraft.pages?.find((p) => p.pageNumber === activePageFilter);
    return pg ? pg.text : activeDraft.rawText;
  }, [activeDraft, activePageFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Document OCR &amp; Statement of Facts Review
            </h1>
            <Badge variant="ocr">Real Byte-Level OCR</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Extract Statements of Facts from uploaded PDF text layers or scanned PNG/JPG images (offline Tesseract + PDFParse) and review drafts before saving to SQLite.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadInitial(true)}
            disabled={isLoading}
            className="text-xs h-9 px-3 rounded-lg flex items-center space-x-1.5"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Select
            value={selectedClaimId}
            onChange={(e) => handleClaimChange(e.target.value)}
            className="w-64 text-xs font-semibold h-9"
          >
            {claims.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} — {c.shipName}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {activeDraft?.isDemo && (
        <div className="flex items-center space-x-2.5 bg-amber-50 border border-amber-300 text-amber-900 px-4 py-2.5 rounded-xl text-xs font-bold">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
          <span>DEMO DATA MODE ACTIVE (OCR_MODE=demo) — Displayed draft events are simulated demo fixtures.</span>
        </div>
      )}

      {loadError && (
        <DataErrorBanner
          title="Unable to load OCR workspace"
          message={loadError}
          onRetry={() => loadInitial(true)}
          isRetrying={isLoading}
        />
      )}

      {/* Document Selection & OCR Run Controls */}
      {claim && (
        <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl">
          <CardContent className="p-4 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Uploaded SoF Document ({claimDocs.length})
                </label>
                <Select
                  value={selectedDocId}
                  onChange={(e) => handleDocumentChange(e.target.value)}
                  className="h-9 text-xs bg-white"
                >
                  {claimDocs.length === 0 && <option value="">No PDF/PNG/JPG documents uploaded for {claim.id}</option>}
                  {claimDocs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fileName} [{d.status}]
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Port</label>
                <Select
                  value={selectedPortId}
                  onChange={(e) => {
                    const pId = e.target.value;
                    setSelectedPortId(pId);
                    const p = claim.ports?.find((x) => x.id === pId);
                    setSelectedBerthId(p?.berths?.[0]?.id || "");
                  }}
                  className="h-9 text-xs bg-white"
                >
                  <option value="">Default Port</option>
                  {(claim.ports || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.portType})
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Berth</label>
                <Select
                  value={selectedBerthId}
                  onChange={(e) => setSelectedBerthId(e.target.value)}
                  className="h-9 text-xs bg-white"
                >
                  <option value="">Default Berth</option>
                  {(claim.ports?.find((p) => p.id === selectedPortId)?.berths || []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canUploadDocuments() && userCanEdit && (
                <Link href={`/documents?claimId=${claim.id}`}>
                  <Button variant="outline" size="sm" className="h-9 text-xs rounded-xl">
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Upload SoF File
                  </Button>
                </Link>
              )}

              {userCanEdit && (
                <Button
                  size="sm"
                  onClick={handleRunOcr}
                  isLoading={isRunningOcr}
                  disabled={!selectedDocId || isRunningOcr}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-9 px-4 rounded-xl flex items-center space-x-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isRunningOcr ? "Running OCR..." : "Run Real OCR"}</span>
                </Button>
              )}
            </div>
          </CardContent>

          {activeDoc && (
            <div className="px-4 pb-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-600 border-t border-slate-100 pt-2.5">
              <span>
                Status:{" "}
                <strong
                  className={
                    activeDoc.status === "OCR Completed"
                      ? "text-emerald-700"
                      : activeDoc.status === "OCR Failed"
                      ? "text-rose-700"
                      : "text-blue-700"
                  }
                >
                  {activeDoc.status}
                </strong>
              </span>
              {activeDoc.errorReason && (
                <span className="text-rose-700 font-semibold">Reason: {activeDoc.errorReason}</span>
              )}
              {activeDraft && (
                <>
                  <span>• Mode: <strong>{activeDraft.isScanned ? "Scanned Image (Tesseract OCR)" : "Digital PDF Text Layer"}</strong></span>
                  <span>
                    • Overall Confidence:{" "}
                    <strong className={activeDraft.overallConfidence < 80 ? "text-rose-600" : "text-emerald-700"}>
                      {Math.round(activeDraft.overallConfidence)}%
                    </strong>
                  </span>
                  {activeDraft.confirmedAt ? (
                    <Badge variant="success">Confirmed on {activeDraft.confirmedAt.slice(0, 10)}</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300">
                      Pending Draft Review (Not yet saved to SoF)
                    </Badge>
                  )}
                </>
              )}
            </div>
          )}
        </Card>
      )}

      {/* SIDE-BY-SIDE OCR DRAFT REVIEW WORKSPACE */}
      {activeDraft ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Raw Extracted Text */}
          <div className="lg:col-span-5 space-y-3">
            <Card className="border-slate-200 shadow-xs bg-white rounded-xl overflow-hidden">
              <CardHeader className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">Original Extracted Text</span>
                </div>
                <div className="flex items-center space-x-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setActivePageFilter("ALL")}
                    className={`px-2 py-0.5 rounded font-semibold ${
                      activePageFilter === "ALL" ? "bg-blue-600 text-white" : "bg-white border text-slate-600"
                    }`}
                  >
                    All ({activeDraft.pages?.length || 1}p)
                  </button>
                  {(activeDraft.pages || []).map((p) => (
                    <button
                      key={p.pageNumber}
                      type="button"
                      onClick={() => setActivePageFilter(p.pageNumber)}
                      className={`px-2 py-0.5 rounded font-semibold ${
                        activePageFilter === p.pageNumber ? "bg-blue-600 text-white" : "bg-white border text-slate-600"
                      }`}
                    >
                      P{p.pageNumber}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="p-4 bg-slate-950 text-emerald-300 max-h-[600px] overflow-auto">
                <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                  {rawDisplayText || "(No extracted text)"}
                </pre>
                {highlightedLine && (
                  <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-amber-300 font-mono">
                    Source Line: {highlightedLine}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Editable Parsed Draft Events */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border-slate-200 shadow-xs bg-white rounded-xl overflow-hidden">
              <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Parsed OCR Draft Events ({filteredDraftEvents.length})
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    Inspect confidence scores, fix any unclassified or low-confidence entries, then click Confirm &amp; Save.
                  </CardDescription>
                </div>
                {userCanEdit && (
                  <Button
                    size="sm"
                    onClick={handleConfirmDraft}
                    isLoading={isConfirming}
                    disabled={draftEvents.length === 0 || isConfirming}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 px-3.5 rounded-lg flex items-center space-x-1.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Confirm &amp; Save to SoF</span>
                  </Button>
                )}
              </CardHeader>

              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-2.5">Pg</th>
                      <th className="p-2.5">Controlled Event</th>
                      <th className="p-2.5">Start / Stop (UTC)</th>
                      <th className="p-2.5">Field Confidences</th>
                      <th className="p-2.5 text-right">Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDraftEvents.map((evt) => {
                      const isLowConf = evt.overallConfidencePct < 80;
                      const isUnclassified = evt.activityName === "Unclassified" || evt.isUnclassified;
                      return (
                        <tr
                          key={evt.id}
                          onMouseEnter={() => setHighlightedLine(evt.rawLine)}
                          onMouseLeave={() => setHighlightedLine(null)}
                          className={
                            isLowConf || isUnclassified
                              ? "bg-amber-50/60 hover:bg-amber-50"
                              : "hover:bg-slate-50"
                          }
                        >
                          <td className="p-2.5 font-mono text-[11px] text-slate-500">
                            P{evt.pageNumber}
                          </td>
                          <td className="p-2.5">
                            <div className="flex items-center space-x-1.5">
                              <span
                                className={`font-bold ${
                                  isUnclassified ? "text-amber-800" : "text-slate-900"
                                }`}
                              >
                                {evt.activityName}
                              </span>
                              {evt.isCorrected && <Badge variant="corrected">Edited</Badge>}
                            </div>
                            <p className="text-[10px] text-slate-500 truncate max-w-[220px]" title={evt.rawLine}>
                              {evt.rawLine}
                            </p>
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                            <div>{evt.startTime.slice(0, 16).replace("T", " ")}</div>
                            <div className="text-slate-500">{evt.stopTime.slice(0, 16).replace("T", " ")}</div>
                          </td>
                          <td className="p-2.5">
                            <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold ${
                                  isLowConf
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                Overall {evt.overallConfidencePct}%
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                D:{evt.fieldConfidences?.date ?? 100}%
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                T:{Math.min(evt.fieldConfidences?.startTime ?? 100, evt.fieldConfidences?.stopTime ?? 100)}%
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                E:{evt.fieldConfidences?.activityName ?? 100}%
                              </span>
                            </div>
                          </td>
                          <td className="p-2.5 text-right whitespace-nowrap">
                            {userCanEdit ? (
                              <div className="inline-flex items-center space-x-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingDraftEvt(evt)}
                                  className="h-6 px-2 text-[11px]"
                                >
                                  <Edit2 className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setDraftEvents((prev) => prev.filter((x) => x.id !== evt.id))
                                  }
                                  className="h-6 px-1.5 text-rose-600 hover:bg-rose-50"
                                  title="Discard draft line"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400">Read-Only</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        claim && (
          <Card className="p-8 text-center border-slate-200 bg-white shadow-2xs space-y-2">
            <FileCheck className="h-8 w-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">
              {claimDocs.length > 0
                ? "Select a document above and click Run Real OCR to extract a review draft"
                : "Upload a PDF, PNG, or JPG Statement of Facts document first"}
            </h3>
            <p className="text-xs text-slate-500">
              OCR results are saved as a review draft first and never modify Statement of Facts until confirmed.
            </p>
          </Card>
        )
      )}

      {/* Existing Confirmed Statement of Facts + Discrepancy Monitor */}
      {claim && (
        <Card className="border-slate-200 shadow-xs bg-white rounded-xl overflow-hidden">
          <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-slate-900">
                Saved Statement of Facts: {claim.shipName} ({claim.activities?.length || 0} Confirmed Events • {discrepancies.length} Discrepancies)
              </CardTitle>
              <CardDescription className="text-[11px]">
                Confirmed maritime time sheet records persisted in SQLite
              </CardDescription>
            </div>
            <Link href={`/claims/${claim.id}?tab=sof`}>
              <Button variant="ghost" size="sm" className="text-xs text-blue-600 h-7 px-2">
                <span>Open Claim SoF</span>
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Activity</th>
                  <th className="p-3">Start (UTC)</th>
                  <th className="p-3">Stop (UTC)</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(claim.activities || []).map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-semibold text-slate-900">{act.activityName}</td>
                    <td className="p-3 font-mono text-[11px]">{act.startTime.slice(0, 16).replace("T", " ")}</td>
                    <td className="p-3 font-mono text-[11px]">{act.stopTime.slice(0, 16).replace("T", " ")}</td>
                    <td className="p-3 font-bold">{act.durationFormatted}</td>
                    <td className="p-3">
                      {act.isCorrected ? (
                        <Badge variant="corrected">Corrected</Badge>
                      ) : act.isOcrExtracted ? (
                        <Badge variant="ocr">OCR Confirmed</Badge>
                      ) : (
                        <span className="text-[10px] text-slate-400">Manual</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {userCanEdit ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingAct(act)}
                          className="h-6 px-2 text-[11px]"
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      ) : (
                        <span className="text-[10px] text-slate-400">Locked</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(claim.activities || []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-xs text-slate-400">
                      No confirmed SoF events yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Edit Draft Modal */}
      {editingDraftEvt && (
        <Modal
          isOpen={!!editingDraftEvt}
          onClose={() => setEditingDraftEvt(null)}
          title={`Review Draft Event (Page ${editingDraftEvt.pageNumber})`}
          maxWidth="md"
        >
          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Controlled Activity Name</label>
              <Select
                value={
                  CONTROLLED_SOF_VOCABULARY.some((v) => v.canonical === editingDraftEvt.activityName) ||
                  editingDraftEvt.activityName.startsWith("Commenced ") ||
                  editingDraftEvt.activityName.startsWith("Completed ")
                    ? editingDraftEvt.activityName
                    : editingDraftEvt.activityName
                }
                onChange={(e) =>
                  setEditingDraftEvt({ ...editingDraftEvt, activityName: e.target.value })
                }
              >
                <option value="Unclassified">Unclassified</option>
                <option value="Commenced loading">Commenced loading</option>
                <option value="Commenced discharging">Commenced discharging</option>
                <option value="Completed loading">Completed loading</option>
                <option value="Completed discharging">Completed discharging</option>
                {CONTROLLED_SOF_VOCABULARY.map((v) => (
                  <option key={v.canonical} value={v.canonical}>
                    {v.canonical}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Start Time (UTC)</label>
                <Input
                  type="datetime-local"
                  max={getNowDatetimeLocalIso()}
                  value={editingDraftEvt.startTime.slice(0, 16)}
                  onChange={(e) =>
                    setEditingDraftEvt({ ...editingDraftEvt, startTime: `${e.target.value}:00Z` })
                  }
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Stop Time (UTC)</label>
                <Input
                  type="datetime-local"
                  max={getNowDatetimeLocalIso()}
                  value={editingDraftEvt.stopTime.slice(0, 16)}
                  onChange={(e) =>
                    setEditingDraftEvt({ ...editingDraftEvt, stopTime: `${e.target.value}:00Z` })
                  }
                />
              </div>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Percentage Counted (0-100)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={editingDraftEvt.percentageCounted}
                onChange={(e) =>
                  setEditingDraftEvt({
                    ...editingDraftEvt,
                    percentageCounted: Number(e.target.value)
                  })
                }
              />
            </div>
            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setEditingDraftEvt(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveDraftEdit}>Apply Draft Correction</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Saved Activity Modal */}
      {editingAct && (
        <Modal
          isOpen={!!editingAct}
          onClose={() => setEditingAct(null)}
          title={`Edit Saved Activity: ${editingAct.activityName}`}
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
                  max={getNowDatetimeLocalIso()}
                  value={editingAct.startTime.slice(0, 16)}
                  onChange={(e) => setEditingAct({ ...editingAct, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Stop Time (UTC)</label>
                <Input
                  type="datetime-local"
                  max={getNowDatetimeLocalIso()}
                  value={editingAct.stopTime.slice(0, 16)}
                  onChange={(e) => setEditingAct({ ...editingAct, stopTime: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setEditingAct(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateSavedActivity} isLoading={isSaving}>
                Save &amp; Mark Corrected
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Discrepancy Correction Modal */}
      {correctingDisc && (
        <Modal
          isOpen={!!correctingDisc}
          onClose={() => setCorrectingDisc(null)}
          title={`Quick Resolve: ${correctingDisc.title}`}
          maxWidth="md"
        >
          <div className="space-y-3 text-xs">
            <p className="text-slate-600">{correctingDisc.description}</p>
            <Input
              value={correctionInput}
              onChange={(e) => setCorrectionInput(e.target.value)}
            />
            <div className="flex justify-end space-x-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setCorrectingDisc(null)}>
                Cancel
              </Button>
              <Button onClick={handleApplyDiscrepancyCorrection} isLoading={isSaving}>
                Apply Correction
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
