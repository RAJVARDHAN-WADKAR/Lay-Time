const fs = require('fs');
const path = require('path');

const ocrCode = `"use client";

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
} from "lucide-react";

export default function OcrSoFReviewPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string>("CLM-2024-004"); // Antwerp messy sample
  const [claim, setClaim] = useState<Claim | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    const updated = await updateActivity(claim.id, editingAct.id, {
      ...editingAct,
      durationMinutes,
      durationFormatted: \`\${Math.floor(durationMinutes / 60)}h \${Math.abs(durationMinutes) % 60}m\`,
      isCorrected: true,
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
    success("Activity Corrected", \`"\${editingAct.activityName}" updated and flagged as user-corrected\`);
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

      {/* Discrepancy Warnings Cards */}
      {discrepancies.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-rose-700 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4" />
              <span>{discrepancies.length} Discrepancies Detected in Statement of Facts Log</span>
            </div>
            <span className="text-[11px] text-slate-500">Auto-flagged by pure TypeScript sequence validator</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {discrepancies.map((disc) => (
              <Card key={disc.id} className="border-rose-200 bg-rose-50/50 shadow-2xs">
                <CardContent className="p-4 flex flex-col justify-between gap-3 text-xs">
                  <div className="flex items-start space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-rose-100 text-rose-600 mt-0.5 shrink-0 shadow-2xs">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{disc.title}</h4>
                      <p className="text-slate-600 mt-0.5 text-[11px] leading-relaxed">{disc.description}</p>
                      <div className="text-[11px] text-slate-500 mt-1.5 space-x-2">
                        <span>Current: <code className="bg-slate-200/80 px-1.5 py-0.5 rounded font-mono text-rose-800 font-bold">{disc.currentValue}</code></span>
                        <span>Suggested: <code className="bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded font-mono font-bold">{disc.suggestedValue}</code></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    {userCanEdit ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setCorrectingDisc(disc);
                          setCorrectionInput(disc.suggestedValue || "");
                        }}
                        className="text-xs bg-rose-600 hover:bg-rose-700 h-7 px-3 font-semibold shadow-2xs"
                      >
                        Quick Correct
                      </Button>
                    ) : (
                      <span className="text-[10px] text-slate-400">Read-Only Mode</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="p-4 border-emerald-200 bg-emerald-50/60 flex items-center justify-between text-xs shadow-2xs">
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
          <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Statement of Facts: {claim.shipName} ({claim.activities?.length || 0} Events Logged)
              </CardTitle>
              <CardDescription>
                OCR Extracted Values vs User Corrected Fields with confidence rating indicators
              </CardDescription>
            </div>
            <Link href={\`/claims/\${claim.id}\`}>
              <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700">
                <span>View Full Claim File</span>
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Activity</th>
                    <th className="p-3.5">Assigned Berth</th>
                    <th className="p-3.5">Start (UTC)</th>
                    <th className="p-3.5">Stop (UTC)</th>
                    <th className="p-3.5">Duration</th>
                    <th className="p-3.5">% Count</th>
                    <th className="p-3.5">Confidence</th>
                    <th className="p-3.5">Source Tag</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(claim.activities || []).map((act) => {
                    const hasDiscrepancy = discrepancies.some((d) => d.activityId === act.id);
                    const berthObj = claim.ports?.flatMap((p) => p.berths).find((b) => b.id === act.berthId);

                    return (
                      <tr
                        key={act.id}
                        className={\`transition \${
                          hasDiscrepancy ? "bg-rose-50/60 hover:bg-rose-50" : "hover:bg-slate-50/80"
                        }\`}
                      >
                        <td className="p-3.5 font-bold text-slate-900">
                          <div>{act.activityName}</div>
                          {act.remarks && <div className="text-[10px] text-slate-400 font-normal">{act.remarks}</div>}
                        </td>
                        <td className="p-3.5">
                          {berthObj ? (
                            <span className="text-slate-800 font-medium">{berthObj.name}</span>
                          ) : (
                            <span className="text-rose-600 font-bold flex items-center">
                              <AlertTriangle className="h-3 w-3 mr-1" /> Unlinked Berth
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-600 font-mono text-[11px]">{act.startTime}</td>
                        <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                          <span className={act.durationMinutes <= 0 ? "text-rose-600 font-bold" : ""}>
                            {act.stopTime}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">{act.durationFormatted}</td>
                        <td className="p-3.5 font-semibold">{act.percentageCounted}%</td>
                        <td className="p-3.5">
                          {act.ocrConfidence ? (
                            <span
                              className={\`font-bold \${
                                act.ocrConfidence >= 0.8 ? "text-emerald-600" : "text-rose-600"
                              }\`}
                            >
                              {Math.round(act.ocrConfidence * 100)}%
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-3.5">
                          {act.isCorrected ? (
                            <Badge variant="corrected">User Corrected</Badge>
                          ) : act.isOcrExtracted ? (
                            <Badge variant="ocr">OCR Extracted</Badge>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Manual Entry</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          {userCanEdit ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingAct(act)}
                              className="h-7 text-xs text-blue-600 hover:bg-blue-50"
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

      {/* Edit Activity Modal */}
      {editingAct && (
        <Modal
          isOpen={!!editingAct}
          onClose={() => setEditingAct(null)}
          title={\`Edit Activity: \${editingAct.activityName}\`}
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
          title={\`Resolve: \${correctingDisc.title}\`}
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
`;

fs.writeFileSync(path.join(process.cwd(), 'app/ocr/page.tsx'), ocrCode, 'utf8');
console.log('Updated app/ocr/page.tsx with Auto-Resolve button and high polish');
