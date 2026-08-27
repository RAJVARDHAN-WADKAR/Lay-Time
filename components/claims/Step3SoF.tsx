"use client";

import React, { useState } from "react";
import { Port, SoFActivity } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/inputs";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMinutesToDuration } from "@/lib/utils/formatters";
import {
  UploadCloud,
  FileText,
  Plus,
  Trash2,
  ScanText,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react";

interface Step3SoFProps {
  ports: Port[];
  activities: SoFActivity[];
  setActivities: React.Dispatch<React.SetStateAction<SoFActivity[]>>;
}

export function Step3SoF({ ports, activities, setActivities }: Step3SoFProps) {
  const [isParsing, setIsParsing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseSuccess, setParseSuccess] = useState<string | null>(null);

  // Manual Add Form
  const [newActivity, setNewActivity] = useState({
    activityName: "NOR tendered",
    startDate: "",
    startTime: "06:00",
    stopDate: "",
    stopTime: "12:00",
    remarks: "",
    portId: ports[0]?.id || "",
    berthId: ports[0]?.berths[0]?.id || "",
    percentageCounted: 100,
    prorata: 100,
    deductionCategory: "Other" as const,
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setParseSuccess(null);
    }
  };

  const handleParsePDF = () => {
    if (!selectedFile) return;
    setIsParsing(true);
    setParseSuccess(null);

    // Simulate async SOF parsing extraction
    setTimeout(() => {
      const today = new Date().toISOString().split("T")[0];
      const parsedActivities: SoFActivity[] = [
        {
          id: `act-${Date.now()}-1`,
          claimId: "",
          portId: ports[0]?.id || "",
          berthId: ports[0]?.berths[0]?.id || "",
          activityName: "Vessel arrived & dropped anchor",
          startTime: `${today}T06:00`,
          stopTime: `${today}T06:30`,
          durationMinutes: 30,
          durationFormatted: "00h 30m",
          percentageCounted: 100,
          prorata: 100,
          deductionCategory: "Other",
          remarks: "Anchored at pilot station",
          isOcrExtracted: true,
          ocrConfidence: 0.98,
        },
        {
          id: `act-${Date.now()}-2`,
          claimId: "",
          portId: ports[0]?.id || "",
          berthId: ports[0]?.berths[0]?.id || "",
          activityName: "NOR tendered",
          startTime: `${today}T06:30`,
          stopTime: `${today}T12:30`,
          durationMinutes: 360,
          durationFormatted: "06h 00m",
          percentageCounted: 0,
          prorata: 100,
          deductionCategory: "Waiting for berth",
          remarks: "Notice time allowance under CP terms",
          isOcrExtracted: true,
          ocrConfidence: 0.95,
        },
        {
          id: `act-${Date.now()}-3`,
          claimId: "",
          portId: ports[0]?.id || "",
          berthId: ports[0]?.berths[0]?.id || "",
          activityName: "Discharging commenced",
          startTime: `${today}T14:00`,
          stopTime: `${today}T22:00`,
          durationMinutes: 480,
          durationFormatted: "08h 00m",
          percentageCounted: 100,
          prorata: 100,
          deductionCategory: "Other",
          remarks: "Discharging continuous",
          isOcrExtracted: true,
          ocrConfidence: 0.92,
        },
      ];

      setActivities((prev) => [...prev, ...parsedActivities]);
      setIsParsing(false);
      setParseSuccess(`Successfully extracted ${parsedActivities.length} operational activities from ${selectedFile.name}`);
    }, 1200);
  };

  const handleAddManualActivity = () => {
    if (!newActivity.activityName) return;

    const start = newActivity.startDate
      ? `${newActivity.startDate}T${newActivity.startTime || "00:00"}`
      : new Date().toISOString().substring(0, 16);

    const stop = newActivity.stopDate
      ? `${newActivity.stopDate}T${newActivity.stopTime || "00:00"}`
      : new Date(Date.now() + 4 * 3600 * 1000).toISOString().substring(0, 16);

    const startTimeMs = new Date(start).getTime();
    const stopTimeMs = new Date(stop).getTime();
    const diffMins = Math.max(Math.round((stopTimeMs - startTimeMs) / 60000), 0);

    const act: SoFActivity = {
      id: `act-${Date.now()}`,
      claimId: "",
      portId: newActivity.portId || ports[0]?.id || "",
      berthId: newActivity.berthId || ports[0]?.berths[0]?.id || "",
      activityName: newActivity.activityName,
      startTime: start,
      stopTime: stop,
      durationMinutes: diffMins,
      durationFormatted: formatMinutesToDuration(diffMins),
      percentageCounted: Number(newActivity.percentageCounted) || 100,
      prorata: Number(newActivity.prorata) || 100,
      deductionCategory: newActivity.deductionCategory || "Other",
      remarks: newActivity.remarks,
      isOcrExtracted: false,
    };

    setActivities((prev) => [...prev, act]);
    setNewActivity({
      activityName: "Loading commenced",
      startDate: "",
      startTime: "06:00",
      stopDate: "",
      stopTime: "12:00",
      remarks: "",
      portId: ports[0]?.id || "",
      berthId: ports[0]?.berths[0]?.id || "",
      percentageCounted: 100,
      prorata: 100,
      deductionCategory: "Other",
    });
  };

  const handleRemoveActivity = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-6 text-xs text-left">
      {/* 1. TOP SECTION: Upload SOF PDF matching Section 11 */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <UploadCloud className="h-4 w-4 text-blue-600" />
            <span>Upload SOF PDF</span>
          </h3>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Select a Statement of Facts PDF document to automatically parse and extract port timeline events.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="flex-1 cursor-pointer">
            <div className="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 transition">
              <FileText className="h-4 w-4 text-slate-500" />
              <span className="text-xs text-slate-700 truncate font-medium">
                {selectedFile ? selectedFile.name : "Choose File (SOF PDF)"}
              </span>
            </div>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <Button
            type="button"
            size="sm"
            onClick={handleParsePDF}
            disabled={!selectedFile}
            isLoading={isParsing}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-10 px-5 rounded-xl flex items-center space-x-2 shrink-0"
          >
            <ScanText className="h-4 w-4" />
            <span>Upload &amp; Parse</span>
          </Button>
        </div>

        {parseSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{parseSuccess}</span>
          </div>
        )}
      </div>

      {/* 2. Manual Activity Entry Card */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
          <Plus className="h-3.5 w-3.5 text-blue-600" />
          <span>Add SOF Activity</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Activity Name */}
          <div className="space-y-1 sm:col-span-2">
            <label className="font-bold text-slate-700 block">Activity Name</label>
            <Input
              placeholder="e.g. Discharging commenced"
              value={newActivity.activityName}
              onChange={(e) =>
                setNewActivity((prev) => ({ ...prev, activityName: e.target.value }))
              }
              className="h-8 text-xs"
            />
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Start Date</label>
            <Input
              type="date"
              value={newActivity.startDate}
              onChange={(e) =>
                setNewActivity((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="h-8 text-xs"
            />
          </div>

          {/* Start Time */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Start Time</label>
            <Input
              type="time"
              value={newActivity.startTime}
              onChange={(e) =>
                setNewActivity((prev) => ({ ...prev, startTime: e.target.value }))
              }
              className="h-8 text-xs"
            />
          </div>

          {/* Stop Date */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Stop Date</label>
            <Input
              type="date"
              value={newActivity.stopDate}
              onChange={(e) =>
                setNewActivity((prev) => ({ ...prev, stopDate: e.target.value }))
              }
              className="h-8 text-xs"
            />
          </div>

          {/* Stop Time */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Stop Time</label>
            <Input
              type="time"
              value={newActivity.stopTime}
              onChange={(e) =>
                setNewActivity((prev) => ({ ...prev, stopTime: e.target.value }))
              }
              className="h-8 text-xs"
            />
          </div>

          {/* Remarks */}
          <div className="space-y-1 sm:col-span-4 lg:col-span-5">
            <label className="font-bold text-slate-700 block">Remarks / Notes</label>
            <Input
              placeholder="e.g. Shore hoses connected; weather clear"
              value={newActivity.remarks}
              onChange={(e) =>
                setNewActivity((prev) => ({ ...prev, remarks: e.target.value }))
              }
              className="h-8 text-xs"
            />
          </div>

          {/* Add Activity Button */}
          <div className="sm:col-span-2 lg:col-span-1 flex items-end">
            <Button
              type="button"
              size="sm"
              onClick={handleAddManualActivity}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8 rounded-lg"
            >
              Add Activity
            </Button>
          </div>
        </div>
      </div>

      {/* 3. SOF Table matching Section 11 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Statement of Facts Activity Log ({activities.length})
          </span>
        </div>

        {activities.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Activity</th>
                  <th className="py-2.5 px-3">Start Date</th>
                  <th className="py-2.5 px-3">Start Time</th>
                  <th className="py-2.5 px-3">Stop Date</th>
                  <th className="py-2.5 px-3">Stop Time</th>
                  <th className="py-2.5 px-3">Remarks</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {activities.map((act) => {
                  const startDate = act.startTime ? act.startTime.split("T")[0] : "—";
                  const startTime = act.startTime && act.startTime.includes("T") ? act.startTime.split("T")[1].substring(0, 5) : "—";
                  const stopDate = act.stopTime ? act.stopTime.split("T")[0] : "—";
                  const stopTime = act.stopTime && act.stopTime.includes("T") ? act.stopTime.split("T")[1].substring(0, 5) : "—";

                  return (
                    <tr key={act.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {act.activityName}
                      </td>
                      <td className="py-2.5 px-3">{startDate}</td>
                      <td className="py-2.5 px-3 font-mono">{startTime}</td>
                      <td className="py-2.5 px-3">{stopDate}</td>
                      <td className="py-2.5 px-3 font-mono">{stopTime}</td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                        {act.remarks || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveActivity(act.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition"
                          title="Remove Activity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8">
            <EmptyState
              icon={FileText}
              title="No Statement of Facts uploaded"
              description="Upload an SOF PDF or use the activity form above to log vessel operations and stoppages."
            />
          </div>
        )}
      </div>
    </div>
  );
}
