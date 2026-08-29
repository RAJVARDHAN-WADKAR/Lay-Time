"use client";

import React, { useState, useMemo } from "react";
import { Port, SoFActivity, DeductionItem } from "@/lib/types";
import { ClaimFormData } from "./Step1General";
import { formatCurrency, formatMinutesToDuration } from "@/lib/utils/formatters";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/inputs";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Calculator,
  Clock,
  DollarSign,
  Plus,
  Trash2,
  Ship,
  Anchor,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Briefcase,
} from "lucide-react";

interface Step4ReviewProps {
  formData: ClaimFormData;
  ports: Port[];
  activities: SoFActivity[];
  deductions: DeductionItem[];
  setDeductions: React.Dispatch<React.SetStateAction<DeductionItem[]>>;
}

export function Step4Review({
  formData,
  ports,
  activities,
  deductions,
  setDeductions,
}: Step4ReviewProps) {
  // New Deduction Form State
  const [newDeduction, setNewDeduction] = useState<Omit<DeductionItem, "id" | "deductionHours">>({
    type: "Weather Delay",
    startTime: "",
    stopTime: "",
    percentageTime: 100,
    prorata: 100,
    remarks: "",
  });

  const handleAddDeduction = () => {
    if (!newDeduction.startTime || !newDeduction.stopTime) return;

    const startMs = new Date(newDeduction.startTime).getTime();
    const stopMs = new Date(newDeduction.stopTime).getTime();
    const grossHours = Math.max((stopMs - startMs) / (1000 * 3600), 0);
    const deductionHours = Math.round(
      grossHours * (Number(newDeduction.percentageTime) / 100) * (Number(newDeduction.prorata) / 100) * 100
    ) / 100;

    const item: DeductionItem = {
      id: `ded-${Date.now()}`,
      type: newDeduction.type,
      startTime: newDeduction.startTime,
      stopTime: newDeduction.stopTime,
      percentageTime: Number(newDeduction.percentageTime) || 100,
      prorata: Number(newDeduction.prorata) || 100,
      deductionHours,
      remarks: newDeduction.remarks,
    };

    setDeductions((prev) => [...prev, item]);
    setNewDeduction({
      type: "Weather Delay",
      startTime: "",
      stopTime: "",
      percentageTime: 100,
      prorata: 100,
      remarks: "",
    });
  };

  const handleRemoveDeduction = (id: string) => {
    setDeductions((prev) => prev.filter((d) => d.id !== id));
  };

  // Laytime Calculation Engine
  const calculation = useMemo(() => {
    const demurrageRate = Number(formData.demurrageRatePerDay) || 0;

    // 1. Calculate Gross Time from Activities or Dates
    let totalGrossMinutes = 0;
    if (activities.length > 0) {
      for (const act of activities) {
        if (act.startTime && act.stopTime) {
          const s = new Date(act.startTime).getTime();
          const e = new Date(act.stopTime).getTime();
          if (!isNaN(s) && !isNaN(e) && e > s) {
            totalGrossMinutes += Math.round((e - s) / 60000);
          }
        }
      }
    } else if (formData.voyageEndDate && formData.layday) {
      const s = new Date(formData.layday).getTime();
      const e = new Date(formData.voyageEndDate).getTime();
      if (!isNaN(s) && !isNaN(e) && e > s) {
        totalGrossMinutes = Math.round((e - s) / 60000);
      }
    }

    // 2. Calculate Deducted Time from Deductions & SOF percentage deductions
    let totalDeductionMinutes = 0;
    for (const d of deductions) {
      totalDeductionMinutes += Math.round((d.deductionHours || 0) * 60);
    }
    for (const act of activities) {
      if (act.percentageCounted < 100 && act.durationMinutes) {
        const deducted = act.durationMinutes * (1 - act.percentageCounted / 100);
        totalDeductionMinutes += Math.round(deducted);
      }
    }

    // 3. Net Laytime Used
    const netLaytimeMinutes = Math.max(totalGrossMinutes - totalDeductionMinutes, 0);

    // 4. Laytime Allowed (computed from cargo quantity / load rate across all berths, or default)
    let totalAllowedMinutes = 0;
    let totalCargo = 0;
    for (const p of ports) {
      for (const b of p.berths || []) {
        totalCargo += b.quantity || 0;
        if (b.loadRate > 0 && b.quantity > 0) {
          const daysAllowed = b.quantity / b.loadRate;
          totalAllowedMinutes += Math.round(daysAllowed * 24 * 60);
        }
      }
    }
    if (totalAllowedMinutes === 0 && totalGrossMinutes > 0) {
      totalAllowedMinutes = 1440; // fallback 24h allowed if unspecified
    }

    // 5. Exceeded or Saved
    const timeExceededMinutes = Math.max(netLaytimeMinutes - totalAllowedMinutes, 0);
    const timeSavedMinutes = Math.max(totalAllowedMinutes - netLaytimeMinutes, 0);

    // 6. Demurrage / Despatch Amounts
    const ratePerMin = demurrageRate / (24 * 60);
    const demurrageAmount = Math.round(timeExceededMinutes * ratePerMin * 100) / 100;
    const despatchAmount = Math.round(timeSavedMinutes * (ratePerMin / 2) * 100) / 100;

    return {
      totalGrossMinutes,
      totalDeductionMinutes,
      netLaytimeMinutes,
      totalAllowedMinutes,
      timeExceededMinutes,
      timeSavedMinutes,
      demurrageAmount,
      despatchAmount,
      totalCargo,
    };
  }, [formData, ports, activities, deductions]);

  return (
    <div className="space-y-6 text-xs text-left">
      {/* 1. SECTION 12 & 14: CALCULATION SUMMARY */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Calculator className="h-4 w-4 text-blue-600" />
              <span>Calculation Summary</span>
            </h3>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Live laytime calculation engine results based on entered parameters
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Net Demurrage / Despatch
            </span>
            <span className="text-xl font-black text-blue-600">
              {formatCurrency(calculation.demurrageAmount > 0 ? calculation.demurrageAmount : -calculation.despatchAmount)}
            </span>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Time */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Time</span>
            <span className="text-base font-extrabold text-slate-900 mt-1 block">
              {formatMinutesToDuration(calculation.totalGrossMinutes)}
            </span>
          </div>

          {/* Deducted Time */}
          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
            <span className="text-[10px] font-bold text-amber-700 uppercase block">Deducted Time</span>
            <span className="text-base font-extrabold text-amber-800 mt-1 block">
              {formatMinutesToDuration(calculation.totalDeductionMinutes)}
            </span>
          </div>

          {/* Net Laytime */}
          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200">
            <span className="text-[10px] font-bold text-blue-700 uppercase block">Net Laytime</span>
            <span className="text-base font-extrabold text-blue-900 mt-1 block">
              {formatMinutesToDuration(calculation.netLaytimeMinutes)}
            </span>
          </div>

          {/* Laytime Allowed */}
          <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200">
            <span className="text-[10px] font-bold text-purple-700 uppercase block">Laytime Allowed</span>
            <span className="text-base font-extrabold text-purple-900 mt-1 block">
              {formatMinutesToDuration(calculation.totalAllowedMinutes)}
            </span>
          </div>

          {/* Laytime Used */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Laytime Used</span>
            <span className="text-base font-extrabold text-slate-900 mt-1 block">
              {formatMinutesToDuration(calculation.netLaytimeMinutes)}
            </span>
          </div>

          {/* Demurrage / Despatch Amount */}
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-700 uppercase block">Amount (USD)</span>
            <span className="text-base font-extrabold text-emerald-800 mt-1 block">
              {formatCurrency(calculation.demurrageAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. SECTION 13: DEDUCTIONS TABLE */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>Operational Deductions &amp; Weather Delays</span>
          </h4>
        </div>

        {/* Add Deduction Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 p-3.5 bg-slate-50/60 rounded-xl border border-slate-200">
          {/* Deduction Type */}
          <div className="space-y-1 sm:col-span-2">
            <label className="font-bold text-slate-700 block">Deduction Type</label>
            <Select
              value={newDeduction.type}
              onChange={(e) =>
                setNewDeduction((prev) => ({ ...prev, type: e.target.value }))
              }
              className="h-8 text-xs bg-white"
            >
              <option value="Weather Delay">Weather Delay</option>
              <option value="Shore Breakdown">Shore Breakdown</option>
              <option value="Crew Change">Crew Change</option>
              <option value="Idle Time">Idle Time</option>
              <option value="Rain">Rain</option>
              <option value="Waiting for berth">Waiting for berth</option>
              <option value="Strike">Strike</option>
              <option value="Holiday">Holiday</option>
              <option value="Others">Others</option>
            </Select>
          </div>

          {/* Start Time */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Start Time</label>
            <Input
              type="datetime-local"
              value={newDeduction.startTime}
              onChange={(e) =>
                setNewDeduction((prev) => ({ ...prev, startTime: e.target.value }))
              }
              className="h-8 text-xs bg-white"
            />
          </div>

          {/* Stop Time */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Stop Time</label>
            <Input
              type="datetime-local"
              value={newDeduction.stopTime}
              onChange={(e) =>
                setNewDeduction((prev) => ({ ...prev, stopTime: e.target.value }))
              }
              className="h-8 text-xs bg-white"
            />
          </div>

          {/* % Time */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">% Time</label>
            <Input
              type="number"
              placeholder="100"
              value={newDeduction.percentageTime}
              onChange={(e) =>
                setNewDeduction((prev) => ({ ...prev, percentageTime: Number(e.target.value) || 0 }))
              }
              className="h-8 text-xs bg-white"
            />
          </div>

          {/* Add Deduction Button */}
          <div className="flex items-end">
            <Button
              type="button"
              size="sm"
              onClick={handleAddDeduction}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8 rounded-lg flex items-center justify-center space-x-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Deduction</span>
            </Button>
          </div>
        </div>

        {/* Deductions Table List */}
        {deductions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Deduction Type</th>
                  <th className="py-2.5 px-3">Start Time</th>
                  <th className="py-2.5 px-3">Stop Time</th>
                  <th className="py-2.5 px-3 text-right">% Time</th>
                  <th className="py-2.5 px-3 text-right">Prorata (%)</th>
                  <th className="py-2.5 px-3 text-right">Deduction (hrs)</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {deductions.map((d) => (
                  <tr key={d.id}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{d.type}</td>
                    <td className="py-2.5 px-3 font-mono">{d.startTime.replace("T", " ")}</td>
                    <td className="py-2.5 px-3 font-mono">{d.stopTime.replace("T", " ")}</td>
                    <td className="py-2.5 px-3 text-right">{d.percentageTime}%</td>
                    <td className="py-2.5 px-3 text-right">{d.prorata}%</td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-700">{d.deductionHours}h</td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveDeduction(d.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition"
                        title="Remove Deduction"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            No deductions added yet. Use the form above to record weather delays or equipment stoppages.
          </div>
        )}
      </div>

      {/* 3. Final Summary Card */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
          <Ship className="h-3.5 w-3.5 text-blue-600" />
          <span>Claim Verification Summary</span>
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div>
            <span className="text-slate-400 block text-[11px]">Vessel:</span>
            <span className="font-bold text-slate-800">{formData.shipName || "—"}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Account / Client:</span>
            <span className="font-bold text-slate-800">{formData.accountName || "—"}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Charterparty:</span>
            <span className="font-bold text-slate-800">{formData.cpType}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Demurrage Rate:</span>
            <span className="font-bold text-slate-800">
              {formatCurrency(Number(formData.demurrageRatePerDay) || 0)} / day
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-start space-x-2 text-[11px] text-indigo-700 bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100">
          <Briefcase className="h-4 w-4 shrink-0 text-indigo-600 mt-0.5" />
          <span>
            <strong>RAC Integration:</strong> Once published, you can attach Recoverable Additional Costs (RAC) files, port tariff contentions, and pumping warranties directly inside this claim&apos;s <em>RAC Recoverables</em> tab.
          </span>
        </div>
      </div>
    </div>
  );
}
