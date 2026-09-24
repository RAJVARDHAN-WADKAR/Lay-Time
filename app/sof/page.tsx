"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getClaims, getClaimById, updateActivity, addActivity, deleteActivity } from "@/lib/api";
import { Claim, SoFActivity } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/inputs";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  Ship,
  Calendar,
  Layers,
  CheckCircle2,
  List,
  GitCommit,
  Download
} from "lucide-react";
import { useToast } from "@/lib/hooks/useToast";

const PRESET_ACTIVITIES = [
  "Vessel Arrived",
  "Notice of Readiness",
  "Pilot On Board",
  "All Fast",
  "Loading Started",
  "Loading Stopped",
  "Loading Completed",
  "Documents Completed",
  "Vessel Sailed"
];

export default function SoFInterfacePage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string>("");
  const [claim, setClaim] = useState<Claim | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<SoFActivity | null>(null);
  const [formActivityName, setFormActivityName] = useState("Loading Started");
  const [formStartTime, setFormStartTime] = useState(new Date().toISOString().substring(0, 16));
  const [formStopTime, setFormStopTime] = useState(new Date(Date.now() + 4 * 3600 * 1000).toISOString().substring(0, 16));
  const [formPercent, setFormPercent] = useState<number>(100);
  const [formCategory, setFormCategory] = useState<string>("Other");
  const [formRemarks, setFormRemarks] = useState<string>("");

  const { success } = useToast();

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const data = await getClaims();
      setClaims(data);
      if (data.length > 0) {
        setSelectedClaimId(data[0].id);
        setClaim(data[0]);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const handleSelectClaim = async (id: string) => {
    setSelectedClaimId(id);
    const target = await getClaimById(id);
    setClaim(target);
  };

  const calculateDuration = (start: string, stop: string) => {
    const s = new Date(start).getTime();
    const e = new Date(stop).getTime();
    const diffMins = Math.max(Math.round((e - s) / 60000), 0);
    const d = Math.floor(diffMins / 1440);
    const h = Math.floor((diffMins % 1440) / 60);
    const m = diffMins % 60;
    const formatted = d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
    return { diffMins, formatted };
  };

  const handleOpenAddModal = (presetName?: string) => {
    setEditingActivity(null);
    setFormActivityName(presetName || "Loading Started");
    setFormStartTime(new Date().toISOString().substring(0, 16));
    setFormStopTime(new Date(Date.now() + 4 * 3600 * 1000).toISOString().substring(0, 16));
    setFormPercent(100);
    setFormCategory("Other");
    setFormRemarks("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (act: SoFActivity) => {
    setEditingActivity(act);
    setFormActivityName(act.activityName);
    setFormStartTime(act.startTime.substring(0, 16));
    setFormStopTime(act.stopTime.substring(0, 16));
    setFormPercent(act.percentageCounted);
    setFormCategory((act.deductionCategory as any) || "Other");
    setFormRemarks(act.remarks || "");
    setIsModalOpen(true);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claim) return;

    const { diffMins, formatted } = calculateDuration(formStartTime, formStopTime);

    if (editingActivity) {
      const updated = await updateActivity(claim.id, editingActivity.id, {
        activityName: formActivityName,
        startTime: formStartTime,
        stopTime: formStopTime,
        durationMinutes: diffMins,
        durationFormatted: formatted,
        percentageCounted: formPercent,
        deductionCategory: formCategory as any,
        remarks: formRemarks,
        isCorrected: true
      });
      setClaim(updated);
      success("Event Updated", `"${formActivityName}" updated with automatic duration recalculation.`);
    } else {
      const updated = await addActivity(claim.id, {
        claimId: claim.id,
        portId: claim.ports?.[0]?.id,
        berthId: claim.ports?.[0]?.berths?.[0]?.id,
        activityName: formActivityName,
        startTime: formStartTime,
        stopTime: formStopTime,
        durationMinutes: diffMins,
        durationFormatted: formatted,
        percentageCounted: formPercent,
        prorata: 100,
        deductionCategory: formCategory as any,
        remarks: formRemarks
      });
      setClaim(updated);
      success("Event Added", `"${formActivityName}" added to Statement of Facts.`);
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (actId: string) => {
    if (!claim) return;
    const updated = await deleteActivity(claim.id, actId);
    setClaim(updated);
    success("Event Removed", "Statement of Facts item deleted.");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Statement of Facts (SoF) Interface
            </h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 font-bold border-blue-200">
              Time Sheet Engine
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Log, sequence, and verify all port operational milestones with automatic duration calculation and laytime percentage allocations.
          </p>
        </div>

        {/* Claim Selector & View Mode */}
        <div className="flex items-center space-x-2.5">
          <select
            value={selectedClaimId}
            onChange={(e) => handleSelectClaim(e.target.value)}
            className="text-xs font-semibold rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[220px]"
          >
            {claims.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} — {c.shipName}
              </option>
            ))}
          </select>

          <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-100">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                viewMode === "table" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600"
              }`}
            >
              <List className="h-3.5 w-3.5 inline mr-1" />
              Table
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                viewMode === "timeline" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600"
              }`}
            >
              <GitCommit className="h-3.5 w-3.5 inline mr-1" />
              Timeline
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add Presets Strip */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Quick-Add Standard Maritime Milestone
          </span>
          <Button
            size="sm"
            onClick={() => handleOpenAddModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 px-3 rounded-lg"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Custom Activity
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_ACTIVITIES.map((name) => (
            <button
              key={name}
              onClick={() => handleOpenAddModal(name)}
              className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-slate-700 transition flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="h-3 w-3 text-slate-400" />
              <span>{name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Statement of Facts Table View */}
      {viewMode === "table" ? (
        <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Ship className="h-4 w-4 text-blue-600" />
                <span>
                  Statement of Facts: {claim?.shipName} ({claim?.activities?.length || 0} Events)
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Automatic duration computation from start and stop datetimes
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => success("Export Complete", "Statement of Facts downloaded")}
              className="text-xs h-8 px-3 rounded-lg flex items-center space-x-1"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download SoF</span>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Activity Name</th>
                    <th className="py-3 px-4">Start Datetime</th>
                    <th className="py-3 px-4">Stop Datetime</th>
                    <th className="py-3 px-4 text-right">Computed Duration</th>
                    <th className="py-3 px-4 text-center">% Counted</th>
                    <th className="py-3 px-4">Remarks & Clause</th>
                    <th className="py-3 px-4 text-center">Status / Tag</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(claim?.activities || []).map((act, idx) => (
                    <tr key={act.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{act.activityName}</td>
                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">{act.startTime}</td>
                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">{act.stopTime}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        {act.durationFormatted || "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            act.percentageCounted === 100
                              ? "bg-slate-100 text-slate-800"
                              : act.percentageCounted === 0
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {act.percentageCounted}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate">
                        {act.remarks || "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {act.isCorrected ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            User Corrected
                          </span>
                        ) : act.isOcrExtracted ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            OCR ({Math.round((act.ocrConfidence || 0.9) * 100)}%)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            Manual
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEditModal(act)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Edit Event"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(act.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete Event"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Timeline View */
        <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl p-6">
          <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
            {(claim?.activities || []).map((act, idx) => (
              <div key={act.id} className="relative flex items-start space-x-4 pl-8">
                <div className="absolute left-1.5 top-1 h-4 w-4 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                <div className="flex-1 bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{act.activityName}</span>
                    <span className="font-mono text-xs font-bold text-blue-600">
                      {act.durationFormatted}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {act.startTime} → {act.stopTime}
                  </div>
                  {act.remarks && <div className="text-[11px] text-slate-600">{act.remarks}</div>}
                  <div className="pt-1 flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-slate-600">
                      {act.percentageCounted}% Counted Laytime
                    </span>
                    <button
                      onClick={() => handleOpenEditModal(act)}
                      className="text-blue-600 hover:underline font-bold"
                    >
                      Edit Timestamps
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add / Edit Activity Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingActivity ? "Edit Statement of Facts Activity" : "Add Statement of Facts Activity"}
        maxWidth="md"
      >
        <form onSubmit={handleSaveActivity} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Activity Name / Event Description *</label>
            <Input
              value={formActivityName}
              onChange={(e) => setFormActivityName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Start Time (UTC) *</label>
              <Input
                type="datetime-local"
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Stop Time (UTC) *</label>
              <Input
                type="datetime-local"
                value={formStopTime}
                onChange={(e) => setFormStopTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between">
            <span className="text-slate-600 font-medium">Automatic Duration Preview:</span>
            <span className="font-mono font-bold text-blue-700">
              {calculateDuration(formStartTime, formStopTime).formatted}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">% Counted (0 - 100)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formPercent}
                onChange={(e) => setFormPercent(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Deduction Category</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs bg-white text-slate-800"
              >
                <option value="Other">Operational</option>
                <option value="Rain">Rain Delay</option>
                <option value="Weather">Weather Delay</option>
                <option value="Waiting for berth">Waiting for berth</option>
                <option value="Equipment breakdown">Equipment breakdown</option>
                <option value="Shifting">Shifting</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Remarks &amp; Clause Notes</label>
            <Input
              value={formRemarks}
              onChange={(e) => setFormRemarks(e.target.value)}
              placeholder="e.g. 50% counted under C/P Clause 17"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
              Save to Statement of Facts
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
