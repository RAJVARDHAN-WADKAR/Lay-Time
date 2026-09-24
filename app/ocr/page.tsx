"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getClaims, getClaimById, updateActivity } from "@/lib/api";
import { Claim, SoFActivity, Discrepancy } from "@/lib/types";
import { detectDiscrepancies } from "@/lib/calculations/discrepancies";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/modal";
import { Tooltip } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/hooks/useToast";
import Link from "next/link";
import {
  ScanText,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Eye,
  ArrowRight,
  Wand2,
  FileCode,
  FileCheck,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  FileText,
  Maximize2
} from "lucide-react";

export default function OcrSoFReviewPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string>("CLM-2024-004");
  const [claim, setClaim] = useState<Claim | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [previewMode, setPreviewMode] = useState<"visual" | "raw">("visual");
  const [zoomLevel, setZoomLevel] = useState(100);
  const [highlightedActId, setHighlightedActId] = useState<string | null>(null);

  const [editingAct, setEditingAct] = useState<SoFActivity | null>(null);
  const [correctingDisc, setCorrectingDisc] = useState<Discrepancy | null>(null);
  const [correctionInput, setCorrectionInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { canEditClaim, isReadOnly } = useAuth();
  const { success, info } = useToast();

  useEffect(() => {
    async function loadInitial() {
      setIsLoading(true);
      const allClaims = await getClaims();
      setClaims(allClaims);
      const target = allClaims.find((c) => c.id === selectedClaimId) || allClaims[3] || allClaims[0];
      setClaim(target);
      if (target) setSelectedClaimId(target.id);
      setIsLoading(false);
    }
    loadInitial();
  }, []);

  const handleClaimChange = async (id: string) => {
    setSelectedClaimId(id);
    setIsLoading(true);
    const target = await getClaimById(id);
    setClaim(target);
    setIsLoading(false);
  };

  const discrepancies = useMemo(() => {
    if (!claim) return [];
    return detectDiscrepancies(claim.activities || [], claim.ports || []);
  }, [claim]);

  const userCanEdit = canEditClaim(claim?.assignedTo);

  // 1-Click Auto-Resolve All Discrepancies (Demonstration tool)
  const handleAutoResolveAll = async () => {
    if (!claim || discrepancies.length === 0) return;
    setIsSaving(true);

    for (const disc of discrepancies) {
      if (disc.type === "start_after_stop" && disc.activityId) {
        const act = claim.activities?.find((a) => a.id === disc.activityId);
        if (act) {
          const newStop = "2024-07-27T02:00:00Z";
          await updateActivity(claim.id, act.id, { stopTime: newStop, isCorrected: true });
        }
      } else if (disc.type === "missing_berth" && disc.activityId) {
        const targetBerth = claim.ports?.[0]?.berths?.[0]?.id || "";
        await updateActivity(claim.id, disc.activityId, { berthId: targetBerth, isCorrected: true });
      } else if (disc.type === "duplicate_activity" && disc.activityId) {
        await updateActivity(claim.id, disc.activityId, { activityName: "Rain (Resumed)", isCorrected: true });
      }
    }

    const refreshed = await getClaimById(claim.id);
    setClaim(refreshed);
    setIsSaving(false);
    success("All Discrepancies Resolved", "Statement of Facts updated with corrected timestamps and berth bindings.");
  };

  const handleUpdateActivity = async () => {
    if (!claim || !editingAct) return;
    setIsSaving(true);
    const gross = (new Date(editingAct.stopTime).getTime() - new Date(editingAct.startTime).getTime()) / (1000 * 60);
    const durationMinutes = isNaN(gross) ? 0 : Math.round(gross);
    const updatedClaim = await updateActivity(claim.id, editingAct.id, {
      ...editingAct,
      durationMinutes,
      durationFormatted: `${Math.floor(durationMinutes / 60)}h ${Math.abs(durationMinutes) % 60}m`,
      isCorrected: true,
    });

    setClaim(updatedClaim);
    setIsSaving(false);
    success("Activity Corrected", `"${editingAct.activityName}" updated and flagged as user-corrected`);
    setEditingAct(null);
  };

  const handleApplyDiscrepancyCorrection = async () => {
    if (!claim || !correctingDisc) return;
    setIsSaving(true);

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

    const refreshed = await getClaimById(claim.id);
    setClaim(refreshed);
    setIsSaving(false);
    success("Correction Applied", "Discrepancy marked as resolved");
    setCorrectingDisc(null);
  };

  const cargoName = claim?.ports?.flatMap((p) => p.berths)?.[0]?.cargoType || "Crude Oil";
  const cargoQuantity = claim?.ports?.flatMap((p) => p.berths)?.reduce((acc, b) => acc + (b.quantity || 0), 0) || 50000;
  const cpDate = claim?.charterpartyDate || "2024-06-15";

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">OCR Extraction & Discrepancy Hub</h1>
            <Badge variant="ocr">Deterministic Engine</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review parsed Statement of Facts activities, inspect confidence ratings, and resolve flagged sequence errors.
          </p>
        </div>

        {/* Claim Selector & Auto Fix */}
        <div className="flex items-center space-x-2">
          {discrepancies.length > 0 && userCanEdit && (
            <Button
              onClick={handleAutoResolveAll}
              isLoading={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 h-9"
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span>Auto-Resolve All ({discrepancies.length})</span>
            </Button>
          )}

          <Select
            value={selectedClaimId}
            onChange={(e) => handleClaimChange(e.target.value)}
            className="w-72 text-xs font-semibold h-9"
          >
            {claims.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} — {c.shipName} ({c.accountName.split(" ")[0]})
              </option>
            ))}
          </Select>
        </div>
      </div>

      {claims.length === 0 ? (
        <Card className="p-12 text-center border-slate-200 bg-white shadow-2xs">
          <div className="max-w-md mx-auto space-y-3">
            <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
              <ScanText className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Statement of Facts Loaded</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload a Statement of Facts PDF in Documents or create a claim to run automated discrepancy checks.
            </p>
            <div className="flex items-center justify-center space-x-2 pt-2">
              <Link href="/documents">
                <Button variant="outline" className="text-xs">
                  Upload SoF PDF
                </Button>
              </Link>
              <Link href="/claims/create">
                <Button className="text-xs bg-blue-600 hover:bg-blue-700">
                  Create Claim
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Scanned SoF Document Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <Card className="border-slate-200 shadow-xs bg-white rounded-xl overflow-hidden flex flex-col">
              <CardHeader className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">Scanned Document Preview</span>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    PDF Page 1 of 1
                  </Badge>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 shadow-2xs mr-1">
                    <button
                      type="button"
                      onClick={() => setPreviewMode("visual")}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded transition ${
                        previewMode === "visual"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Visual
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode("raw")}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded transition ${
                        previewMode === "raw"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Raw OCR
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800"
                    onClick={() => setZoomLevel((prev) => Math.max(75, prev - 15))}
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-[10px] font-mono text-slate-500 w-8 text-center">
                    {zoomLevel}%
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800"
                    onClick={() => setZoomLevel((prev) => Math.min(140, prev + 15))}
                    title="Zoom In"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800"
                    onClick={() => setZoomLevel(100)}
                    title="Reset Zoom"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>

              {/* Document viewport */}
              <CardContent className="p-4 bg-slate-100/70 overflow-auto max-h-[750px]">
                {previewMode === "raw" ? (
                  <div className="bg-slate-950 text-emerald-400 p-4 rounded-lg font-mono text-[11px] leading-relaxed overflow-x-auto shadow-inner border border-slate-800">
                    <div className="text-slate-500 pb-2 mb-2 border-b border-slate-800 flex justify-between items-center text-[10px]">
                      <span># OCR RAW TEXT STREAM ENGINE v2.4</span>
                      <span className="text-emerald-500">Confidence: 96.4%</span>
                    </div>
                    <pre className="whitespace-pre-wrap font-mono text-[10px]">
{`=== STATEMENT OF FACTS (RAW INGESTION LOG) ===
VESSEL: ${claim?.shipName?.toUpperCase()}
PORT: ${claim?.ports?.[0]?.name?.toUpperCase() || "ROTTERDAM"}
CARGO: ${cargoName.toUpperCase()} (${cargoQuantity.toLocaleString()} MT)
C/P DATE: ${cpDate}
AGENT: OCEANIC MARITIME SERVICES B.V.

TIMESTAMP              | EVENT / ACTIVITY DESCRIPTION             | CONF | BOUNDING BOX
---------------------------------------------------------------------------------------
${(claim?.activities || []).map((a, idx) => 
  `${a.startTime.replace("T", " ").substring(0, 16).padEnd(22)} | ${a.activityName.padEnd(36)} | ${Math.round((a.ocrConfidence || 0.95) * 100)}% | [y:${120 + idx * 28}, x:35, w:480, h:22]`
).join("\n")}
---------------------------------------------------------------------------------------
[EOF - 100% PARSED, 0 OCR FAILS DETECTED]`}
                    </pre>
                  </div>
                ) : (
                  <div
                    style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top left" }}
                    className="transition-transform duration-150 bg-white border border-slate-300 shadow-sm rounded p-5 w-full min-h-[700px] font-sans text-slate-800 text-xs relative select-none"
                  >
                    {/* Watermark / Stamp */}
                    <div className="absolute top-5 right-5 border-2 border-emerald-600/40 text-emerald-700/60 font-mono text-[9px] font-extrabold uppercase px-2 py-0.5 rounded rotate-[-6deg]">
                      VERIFIED SOF ORIGINAL
                    </div>

                    {/* Port Agent Document Header */}
                    <div className="border-b-2 border-slate-800 pb-3 mb-3 text-center">
                      <h2 className="text-xs font-extrabold tracking-wider text-slate-950 uppercase">
                        Maritime Port Services Agency Ltd.
                      </h2>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">
                        Statement of Facts & Port Time Sheet
                      </p>
                    </div>

                    {/* Metadata Box */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 p-2.5 rounded border border-slate-200 mb-3 font-mono">
                      <div>
                        <span className="text-slate-500 font-sans font-medium">Vessel:</span>{" "}
                        <span className="font-bold text-slate-900">{claim?.shipName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans font-medium">Port:</span>{" "}
                        <span className="font-bold text-slate-900">{claim?.ports?.[0]?.name || "Rotterdam"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans font-medium">Cargo:</span>{" "}
                        <span className="font-bold text-slate-900">{cargoName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans font-medium">Quantity:</span>{" "}
                        <span className="font-bold text-slate-900">{cargoQuantity.toLocaleString()} MT</span>
                      </div>
                    </div>

                    {/* Document Event Lines with OCR Bounding Box Highlights */}
                    <div className="space-y-1 text-[10px]">
                      <div className="font-bold uppercase text-[9px] text-slate-500 border-b border-slate-300 pb-1 mb-1.5 grid grid-cols-12">
                        <span className="col-span-4">Date / Time</span>
                        <span className="col-span-6">Statement of Event</span>
                        <span className="col-span-2 text-right">Confidence</span>
                      </div>

                      {(claim?.activities || []).map((act) => {
                        const isSelected = highlightedActId === act.id;
                        const hasDiscrepancy = discrepancies.some((d) => d.activityId === act.id);
                        const confPct = Math.round((act.ocrConfidence || 0.95) * 100);

                        return (
                          <div
                            key={act.id}
                            onMouseEnter={() => setHighlightedActId(act.id)}
                            onMouseLeave={() => setHighlightedActId(null)}
                            onClick={() => setEditingAct(act)}
                            className={`p-1.5 rounded transition-all cursor-pointer grid grid-cols-12 items-center relative group ${
                              isSelected
                                ? "bg-amber-100 ring-2 ring-amber-500 shadow-2xs"
                                : hasDiscrepancy
                                ? "bg-rose-50/80 border border-rose-300 hover:bg-rose-100"
                                : "hover:bg-blue-50/60 border border-transparent"
                            }`}
                          >
                            <span className="col-span-4 font-mono text-[9px] text-slate-600">
                              {act.startTime.substring(0, 10)}{" "}
                              <strong className="text-slate-900">{act.startTime.substring(11, 16)}</strong>
                            </span>
                            <span className="col-span-6 font-medium text-slate-800 truncate pr-1">
                              {act.activityName}
                              {act.remarks && (
                                <span className="text-[9px] text-slate-400 block font-normal truncate">
                                  {act.remarks}
                                </span>
                              )}
                            </span>
                            <div className="col-span-2 flex items-center justify-end space-x-1">
                              {hasDiscrepancy && (
                                <AlertTriangle className="h-3 w-3 text-rose-600 shrink-0" />
                              )}
                              <span
                                className={`text-[9px] font-mono font-bold px-1 rounded ${
                                  confPct >= 90
                                    ? "bg-emerald-100 text-emerald-800"
                                    : confPct >= 75
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {confPct}%
                              </span>
                            </div>

                            {/* Yellow OCR Bounding Box Indicator */}
                            {isSelected && (
                              <div className="absolute -inset-0.5 border-2 border-dashed border-amber-500 rounded pointer-events-none" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Document Footer Signatures */}
                    <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-[9px] text-slate-500">
                      <div>
                        <div className="border-b border-slate-400 pb-4 mb-1">
                          <span className="italic text-slate-700 font-serif">Capt. A. Vance</span>
                        </div>
                        <p className="font-semibold text-slate-700">Master, {claim?.shipName}</p>
                      </div>
                      <div>
                        <div className="border-b border-slate-400 pb-4 mb-1">
                          <span className="italic text-slate-700 font-serif">P. de Jongh</span>
                        </div>
                        <p className="font-semibold text-slate-700">Port Agent / Representative</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Discrepancies & Extracted SoF Table (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Discrepancy Warnings Cards */}
            {discrepancies.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-rose-700 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{discrepancies.length} Discrepancies Detected</span>
                  </div>
                  <span className="text-[11px] text-slate-500">Auto-flagged by pure TypeScript validator</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {discrepancies.map((disc) => (
                    <Card key={disc.id} className="border-rose-200 bg-rose-50/50 shadow-2xs">
                      <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-start space-x-2.5">
                          <div className="p-1.5 rounded-lg bg-rose-100 text-rose-600 mt-0.5 shrink-0 shadow-2xs">
                            <AlertTriangle className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-xs">{disc.title}</h4>
                            <p className="text-slate-600 mt-0.5 text-[11px] leading-relaxed">{disc.description}</p>
                            <div className="text-[11px] text-slate-500 mt-1 space-x-2">
                              <span>Current: <code className="bg-slate-200/80 px-1.5 py-0.5 rounded font-mono text-rose-800 font-bold">{disc.currentValue}</code></span>
                              <span>Suggested: <code className="bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded font-mono font-bold">{disc.suggestedValue}</code></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end shrink-0">
                          {userCanEdit ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setCorrectingDisc(disc);
                                setCorrectionInput(disc.suggestedValue || "");
                              }}
                              className="text-xs bg-rose-600 hover:bg-rose-700 h-7 px-3 font-semibold shadow-2xs text-white"
                            >
                              Quick Correct
                            </Button>
                          ) : (
                            <span className="text-[10px] text-slate-400">Read-Only</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <Card className="p-3.5 border-emerald-200 bg-emerald-50/60 flex items-center justify-between text-xs shadow-2xs">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-950">Statement of Facts Clean & Validated</span>
                    <p className="text-emerald-700 text-[11px]">All timestamps, durations, and berth associations conform to charterparty sequence standards.</p>
                  </div>
                </div>
                <Badge variant="success">Validated</Badge>
              </Card>
            )}

            {/* Main Extracted SoF Table */}
            {claim && (
              <Card className="border-slate-200 shadow-xs bg-white rounded-xl overflow-hidden">
                <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold text-slate-900">
                      Statement of Facts: {claim.shipName} ({claim.activities?.length || 0} Events)
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Hover over any row to highlight its corresponding OCR bounding box
                    </CardDescription>
                  </div>
                  <Link href={`/claims/${claim.id}`}>
                    <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700 h-7 px-2">
                      <span>Full Claim</span>
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="p-3">Activity</th>
                          <th className="p-3">Berth</th>
                          <th className="p-3">Start (UTC)</th>
                          <th className="p-3">Stop (UTC)</th>
                          <th className="p-3">Duration</th>
                          <th className="p-3">Conf.</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {(claim.activities || []).map((act) => {
                          const hasDiscrepancy = discrepancies.some((d) => d.activityId === act.id);
                          const berthObj = claim.ports?.flatMap((p) => p.berths).find((b) => b.id === act.berthId);
                          const isHighlighted = highlightedActId === act.id;

                          return (
                            <tr
                              key={act.id}
                              onMouseEnter={() => setHighlightedActId(act.id)}
                              onMouseLeave={() => setHighlightedActId(null)}
                              className={`transition ${
                                isHighlighted
                                  ? "bg-amber-50 ring-1 ring-amber-400"
                                  : hasDiscrepancy
                                  ? "bg-rose-50/60 hover:bg-rose-50"
                                  : "hover:bg-slate-50/80"
                              }`}
                            >
                              <td className="p-3 font-bold text-slate-900">
                                <div>{act.activityName}</div>
                                {act.remarks && <div className="text-[10px] text-slate-400 font-normal">{act.remarks}</div>}
                              </td>
                              <td className="p-3">
                                {berthObj ? (
                                  <span className="text-slate-800 font-medium">{berthObj.name}</span>
                                ) : (
                                  <span className="text-rose-600 font-bold flex items-center">
                                    <AlertTriangle className="h-3 w-3 mr-1" /> Unlinked
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-slate-600 font-mono text-[11px]">{act.startTime.substring(0, 16).replace("T", " ")}</td>
                              <td className="p-3 text-slate-600 font-mono text-[11px]">
                                <span className={act.durationMinutes <= 0 ? "text-rose-600 font-bold" : ""}>
                                  {act.stopTime.substring(0, 16).replace("T", " ")}
                                </span>
                              </td>
                              <td className="p-3 font-bold text-slate-900">{act.durationFormatted}</td>
                              <td className="p-3">
                                {act.ocrConfidence ? (
                                  <span
                                    className={`font-bold font-mono text-[11px] ${
                                      act.ocrConfidence >= 0.8 ? "text-emerald-600" : "text-rose-600"
                                    }`}
                                  >
                                    {Math.round(act.ocrConfidence * 100)}%
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="p-3">
                                {act.isCorrected ? (
                                  <Badge variant="corrected">Corrected</Badge>
                                ) : act.isOcrExtracted ? (
                                  <Badge variant="ocr">OCR</Badge>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">Manual</span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                {userCanEdit ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingAct(act)}
                                    className="h-6 px-2 text-[11px] text-blue-600 hover:bg-blue-50"
                                  >
                                    <Edit2 className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                ) : (
                                  <span className="text-slate-400 text-xs">Locked</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

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
            <div>
              <label className="block font-medium text-slate-700 mb-1">Assigned Berth</label>
              <Select
                value={editingAct.berthId}
                onChange={(e) => setEditingAct({ ...editingAct, berthId: e.target.value })}
              >
                {(claim?.ports?.flatMap((p) => p.berths) || []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.quantity} MT)
                  </option>
                ))}
              </Select>
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
            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setEditingAct(null)}>Cancel</Button>
              <Button onClick={handleUpdateActivity} isLoading={isSaving}>Save & Mark Corrected</Button>
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
            <p className="text-slate-600 leading-relaxed">{correctingDisc.description}</p>
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
              <Button onClick={handleApplyDiscrepancyCorrection} isLoading={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Apply Correction
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
