"use client";

import React, { useMemo, useState } from "react";
import { Claim, SoFActivity } from "@/lib/types";
import {
  ActivityOverlapPair,
  findActivityOverlaps
} from "@/lib/calculations/discrepancies";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Plus, Trash2, Wrench, X } from "lucide-react";

interface ClaimSoFTabProps {
  claim: Claim;
  userCanEdit: boolean;
  onOpenAddModal: () => void;
  onOpenEditModal: (act: SoFActivity) => void;
  onDeleteActivity?: (actId: string) => Promise<void> | void;
  onQuickTrimActivity?: (actId: string, updates: Partial<SoFActivity>) => Promise<void>;
}

export function ClaimSoFTab({
  claim,
  userCanEdit,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteActivity,
  onQuickTrimActivity
}: ClaimSoFTabProps) {
  const berths = claim.ports?.flatMap((p) => p.berths) || [];
  const activities = useMemo(() => claim.activities || [], [claim.activities]);

  const { sorted, sameBerthOverlaps, crossBerthOverlaps, affectedMinutesUnion } = useMemo(
    () => findActivityOverlaps(activities),
    [activities]
  );

  const overlappingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const pair of sameBerthOverlaps) {
      ids.add(pair.actA.id);
      ids.add(pair.actB.id);
    }
    return ids;
  }, [sameBerthOverlaps]);

  const timelineBounds = useMemo(() => {
    const valid = sorted.filter(
      (a) => !isNaN(new Date(a.startTime).getTime()) && !isNaN(new Date(a.stopTime).getTime())
    );
    if (valid.length === 0) return null;
    const minMs = Math.min(...valid.map((a) => new Date(a.startTime).getTime()));
    const maxMs = Math.max(...valid.map((a) => new Date(a.stopTime).getTime()));
    const spanMs = Math.max(maxMs - minMs, 60000);
    return { valid, minMs, maxMs, spanMs };
  }, [sorted]);

  const [fixingPair, setFixingPair] = useState<ActivityOverlapPair | null>(null);
  const [isApplyingFix, setIsApplyingFix] = useState(false);

  const handleApplyFix = async (mode: "trim_first" | "trim_second" | "delete_second") => {
    if (!fixingPair) return;
    setIsApplyingFix(true);
    try {
      if (mode === "trim_first" && onQuickTrimActivity) {
        const sMs = new Date(fixingPair.actA.startTime).getTime();
        const eMs = new Date(fixingPair.actB.startTime).getTime();
        const diffMins = Math.max(1, Math.round((eMs - sMs) / 60000));
        await onQuickTrimActivity(fixingPair.actA.id, {
          stopTime: fixingPair.actB.startTime,
          durationMinutes: diffMins,
          isCorrected: true
        });
      } else if (mode === "trim_second" && onQuickTrimActivity) {
        const sMs = new Date(fixingPair.actA.stopTime).getTime();
        const eMs = new Date(fixingPair.actB.stopTime).getTime();
        const diffMins = Math.max(1, Math.round((eMs - sMs) / 60000));
        await onQuickTrimActivity(fixingPair.actB.id, {
          startTime: fixingPair.actA.stopTime,
          durationMinutes: diffMins,
          isCorrected: true
        });
      } else if (mode === "delete_second" && onDeleteActivity) {
        await onDeleteActivity(fixingPair.actB.id);
      }
      setFixingPair(null);
    } finally {
      setIsApplyingFix(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Statement of Facts Activity Log</h3>
          <p className="text-xs text-slate-500">
            Detailed chronological operational events, weather delays, and overlap detection
          </p>
        </div>
        {userCanEdit && (
          <Button
            size="sm"
            onClick={onOpenAddModal}
            className="text-xs flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Activity</span>
          </Button>
        )}
      </div>

      {/* Overlap Error & Visual Timeline Alert */}
      {sameBerthOverlaps.length > 0 && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-900 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2 font-bold">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>
                {sameBerthOverlaps.length} Same-Berth SoF Timestamp Overlap Conflict(s) ({affectedMinutesUnion}m affected)
              </span>
            </div>
            {userCanEdit && (
              <Button
                size="sm"
                onClick={() => setFixingPair(sameBerthOverlaps[0])}
                className="h-7 px-3 text-[11px] bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                <Wrench className="h-3 w-3 mr-1" />
                One-Click Fix Overlap
              </Button>
            )}
          </div>
          <ul className="list-disc pl-5 space-y-1 text-[11px] text-rose-800">
            {sameBerthOverlaps.map((pair) => (
              <li key={`${pair.actA.id}-${pair.actB.id}`} className="flex items-center justify-between gap-2">
                <span>
                  &ldquo;{pair.actA.activityName}&rdquo; &harr; &ldquo;{pair.actB.activityName}&rdquo; ({pair.overlapMinutes} min overlap)
                </span>
                {userCanEdit && (
                  <button
                    type="button"
                    onClick={() => setFixingPair(pair)}
                    className="underline font-semibold text-rose-700 hover:text-rose-950 shrink-0"
                  >
                    Resolve
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {crossBerthOverlaps.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            {crossBerthOverlaps.length} Cross-Berth Concurrent Overlap Warning(s) detected across separate berths (verify concurrent operations).
          </span>
        </div>
      )}

      {/* Visual Timeline Strip with Red Overlap Bars */}
      {timelineBounds && (
        <Card className="border-slate-200 shadow-2xs p-3 bg-slate-50/70">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Visual SoF Timeline &amp; Conflict Strip
            </span>
            <span className="text-[10px] text-slate-400">
              {new Date(timelineBounds.minMs).toISOString().slice(0, 16).replace("T", " ")} UTC &rarr;{" "}
              {new Date(timelineBounds.maxMs).toISOString().slice(0, 16).replace("T", " ")} UTC
            </span>
          </div>
          <div className="relative h-7 bg-white rounded-lg border border-slate-200 overflow-hidden">
            {timelineBounds.valid.map((act) => {
              const s = new Date(act.startTime).getTime();
              const e = new Date(act.stopTime).getTime();
              const leftPct = ((s - timelineBounds.minMs) / timelineBounds.spanMs) * 100;
              const widthPct = Math.max(((e - s) / timelineBounds.spanMs) * 100, 1.5);
              const isOverlap = overlappingIds.has(act.id);
              const isDeduction = (act.percentageCounted ?? 100) < 100;
              return (
                <div
                  key={act.id}
                  title={`${act.activityName} (${act.durationFormatted})`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  className={`absolute top-1 bottom-1 rounded-sm border ${
                    isOverlap
                      ? "bg-rose-400/70 border-rose-600"
                      : isDeduction
                      ? "bg-amber-300/75 border-amber-500"
                      : "bg-blue-400/65 border-blue-600"
                  }`}
                />
              );
            })}
            {sameBerthOverlaps.map((p) => {
              const leftPct = ((p.overlapStartMs - timelineBounds.minMs) / timelineBounds.spanMs) * 100;
              const widthPct = Math.max(((p.overlapEndMs - p.overlapStartMs) / timelineBounds.spanMs) * 100, 1.5);
              return (
                <div
                  key={`bar-${p.actA.id}-${p.actB.id}`}
                  title={`OVERLAP CONFLICT: ${p.overlapMinutes}m (${p.actA.activityName} & ${p.actB.activityName})`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  className="absolute top-0 bottom-0 bg-rose-600/85 border-x-2 border-rose-900 z-10"
                />
              );
            })}
          </div>
        </Card>
      )}

      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Activity</th>
                  <th className="p-3">Berth</th>
                  <th className="p-3">Start (UTC)</th>
                  <th className="p-3">Stop (UTC)</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">% Counted</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Source Tag</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {sorted.map((act) => {
                  const isOverlapping = overlappingIds.has(act.id);
                  const matchingPair = sameBerthOverlaps.find(
                    (p) => p.actA.id === act.id || p.actB.id === act.id
                  );
                  return (
                    <tr
                      key={act.id}
                      className={
                        isOverlapping
                          ? "bg-rose-50/90 hover:bg-rose-100/70 border-l-4 border-l-rose-500"
                          : "hover:bg-slate-50"
                      }
                    >
                      <td className="p-3 font-semibold text-slate-900">
                        <div className="flex items-center space-x-1.5">
                          <span>{act.activityName}</span>
                          {isOverlapping && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-600 text-white">
                              Overlap
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-slate-600">
                        {berths.find((b) => b.id === act.berthId)?.name || (
                          <span className="text-rose-500 font-bold">Unassigned Berth</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600">{act.startTime}</td>
                      <td className="p-3 text-slate-600">{act.stopTime}</td>
                      <td className="p-3 font-bold text-slate-900">{act.durationFormatted}</td>
                      <td className="p-3">{act.percentageCounted}%</td>
                      <td className="p-3 text-slate-600">{act.deductionCategory}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {act.isCorrected ? (
                            <Badge variant="corrected">Corrected</Badge>
                          ) : act.isOcrExtracted ? (
                            <>
                              <Badge variant="ocr">OCR Extracted</Badge>
                              {act.ocrConfidence !== undefined && act.ocrConfidence < 0.8 && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
                                  title={`Low OCR Confidence: ${Math.round(act.ocrConfidence * 100)}% - Manual verification recommended`}
                                >
                                  ⚠️ {Math.round(act.ocrConfidence * 100)}% Low Conf
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Manual</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        {userCanEdit ? (
                          <div className="flex items-center justify-end space-x-1">
                            {isOverlapping && matchingPair && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setFixingPair(matchingPair)}
                                className="h-6 px-2 text-xs text-rose-700 hover:bg-rose-100 font-bold"
                              >
                                Fix Overlap
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onOpenEditModal(act)}
                              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              Edit
                            </Button>
                            {onDeleteActivity && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Delete "${act.activityName}" from Statement of Facts?`)) {
                                    onDeleteActivity(act.id);
                                  }
                                }}
                                className="h-6 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
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

      {/* One-Click Fix Overlap Dialog */}
      {fixingPair && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                  <Wrench className="h-4 w-4 text-rose-600" />
                  <span>Resolve Overlapping SoF Timestamps</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Overlap of {fixingPair.overlapMinutes} minutes detected on same berth. All edits are audit-logged.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFixingPair(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="font-bold text-slate-800">Event A: </span>
                <span>{fixingPair.actA.activityName}</span>
                <div className="text-[10px] font-mono text-slate-500">
                  {fixingPair.actA.startTime} &rarr; {fixingPair.actA.stopTime}
                </div>
              </div>
              <div>
                <span className="font-bold text-slate-800">Event B: </span>
                <span>{fixingPair.actB.activityName}</span>
                <div className="text-[10px] font-mono text-slate-500">
                  {fixingPair.actB.startTime} &rarr; {fixingPair.actB.stopTime}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {onQuickTrimActivity && (
                <>
                  <Button
                    size="sm"
                    disabled={isApplyingFix}
                    onClick={() => handleApplyFix("trim_first")}
                    className="w-full justify-start text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    1. Trim Event A stop time &rarr; {fixingPair.actB.startTime}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isApplyingFix}
                    onClick={() => handleApplyFix("trim_second")}
                    className="w-full justify-start text-xs"
                  >
                    2. Trim Event B start time &rarr; {fixingPair.actA.stopTime}
                  </Button>
                </>
              )}
              {onDeleteActivity && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isApplyingFix}
                  onClick={() => handleApplyFix("delete_second")}
                  className="w-full justify-start text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
                >
                  3. Delete overlapping Event B (&ldquo;{fixingPair.actB.activityName}&rdquo;)
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
