"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getClaims, getClaimById, getSettings, updateClaim } from "@/lib/api";
import { Claim, CalculationAssumptions, DeductionItem, SoFActivity } from "@/lib/types";
import { DEFAULT_ASSUMPTIONS } from "@/lib/calculations";
import { formatCurrency, formatMinutesToDuration } from "@/lib/utils/formatters";
import { exportClaimPdf } from "@/lib/utils/exportPdf";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/inputs";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/lib/hooks/useToast";
import {
  Calculator,
  Clock,
  DollarSign,
  Plus,
  Trash2,
  Download,
  RotateCcw,
  Layers,
  Ship,
  Sparkles,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";

import { OilChemCalculator } from "@/components/calculations/OilChemCalculator";
import { RacCalculator } from "@/components/calculations/RacCalculator";
import { Briefcase } from "lucide-react";

export default function CalculationsPage() {
  const { success, info } = useToast();
  const [calculatorTab, setCalculatorTab] = useState<"standard" | "oilchem" | "rac">("standard");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string>("");
  const [claim, setClaim] = useState<Claim | null>(null);
  const [assumptions, setAssumptions] = useState<CalculationAssumptions>(DEFAULT_ASSUMPTIONS);
  const [isLoading, setIsLoading] = useState(true);

  // Scratchpad / Interactive Parameters (when no claim selected or custom testing)
  const [scratchpadMode, setScratchpadMode] = useState<boolean>(false);
  const [allowedHours, setAllowedHours] = useState<number | string>("");
  const [demurrageRate, setDemurrageRate] = useState<number | string>("");
  const [despatchRate, setDespatchRate] = useState<number | string>("");
  const [opsStart, setOpsStart] = useState<string>("");
  const [opsEnd, setOpsEnd] = useState<string>("");

  // Deductions List
  const [deductions, setDeductions] = useState<DeductionItem[]>([]);

  // New Deduction Form State
  const [newDeduction, setNewDeduction] = useState({
    type: "Weather Delay",
    startTime: "",
    stopTime: "",
    percentageTime: 100,
    prorata: 100,
    remarks: "",
  });

  const loadData = async () => {
    setIsLoading(true);
    const [allClaims, stg] = await Promise.all([getClaims(), getSettings()]);
    setClaims(allClaims);
    setAssumptions(stg);
    if (allClaims.length > 0 && !selectedClaimId && !scratchpadMode) {
      setSelectedClaimId(allClaims[0].id);
      setClaim(allClaims[0]);
      setDeductions(allClaims[0].deductions || []);
    } else if (allClaims.length === 0) {
      setClaim(null);
      setSelectedClaimId("");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();

    const handleStorage = () => loadData();
    window.addEventListener("demurrage_storage_change", handleStorage);
    return () => window.removeEventListener("demurrage_storage_change", handleStorage);
  }, []);

  const handleClaimChange = async (id: string) => {
    setSelectedClaimId(id);
    if (!id) {
      setClaim(null);
      setDeductions([]);
      return;
    }
    setIsLoading(true);
    const c = await getClaimById(id);
    setClaim(c);
    if (c) {
      setDeductions(c.deductions || []);
    }
    setIsLoading(false);
  };

  const handleAddDeduction = async () => {
    if (!newDeduction.startTime || !newDeduction.stopTime) {
      info("Missing Timestamps", "Please enter start and stop times for the deduction.");
      return;
    }

    const startMs = new Date(newDeduction.startTime).getTime();
    const stopMs = new Date(newDeduction.stopTime).getTime();
    const grossHours = Math.max((stopMs - startMs) / (1000 * 3600), 0);
    const deductionHours =
      Math.round(
        grossHours *
          (Number(newDeduction.percentageTime) / 100) *
          (Number(newDeduction.prorata) / 100) *
          100
      ) / 100;

    const item: DeductionItem = {
      id: `ded-${Date.now()}`,
      claimId: claim?.id || "",
      type: newDeduction.type,
      startTime: newDeduction.startTime,
      stopTime: newDeduction.stopTime,
      percentageTime: Number(newDeduction.percentageTime) || 100,
      prorata: Number(newDeduction.prorata) || 100,
      deductionHours,
      remarks: newDeduction.remarks,
    };

    const updated = [...deductions, item];
    setDeductions(updated);

    if (claim) {
      await updateClaim(claim.id, { deductions: updated });
    }

    setNewDeduction({
      type: "Weather Delay",
      startTime: "",
      stopTime: "",
      percentageTime: 100,
      prorata: 100,
      remarks: "",
    });
    success("Deduction Added", `${item.type} (${deductionHours}h) added to calculation`);
  };

  const handleRemoveDeduction = async (id: string) => {
    const updated = deductions.filter((d) => d.id !== id);
    setDeductions(updated);
    if (claim) {
      await updateClaim(claim.id, { deductions: updated });
    }
  };

  // Live Laytime Math Engine
  const calculation = useMemo(() => {
    if (!claim && !scratchpadMode && !opsStart) {
      return null;
    }

    let grossMinutes = 0;
    let ratePerDay = 0;
    let despRatePerDay = 0;
    let allowedMinutes = 0;

    if (claim && !scratchpadMode) {
      ratePerDay = Number(claim.demurrageRatePerDay) || 0;
      despRatePerDay = ratePerDay / 2;

      // Gross from activities or dates
      if (claim.activities && claim.activities.length > 0) {
        for (const act of claim.activities) {
          if (act.startTime && act.stopTime) {
            const s = new Date(act.startTime).getTime();
            const e = new Date(act.stopTime).getTime();
            if (!isNaN(s) && !isNaN(e) && e > s) {
              grossMinutes += Math.round((e - s) / 60000);
            }
          }
        }
      } else if (claim.layday && claim.voyageEndDate) {
        const s = new Date(claim.layday).getTime();
        const e = new Date(claim.voyageEndDate).getTime();
        if (!isNaN(s) && !isNaN(e) && e > s) {
          grossMinutes = Math.round((e - s) / 60000);
        }
      }

      // Allowed from berths or default
      if (claim.ports && claim.ports.length > 0) {
        for (const p of claim.ports) {
          for (const b of p.berths || []) {
            if (b.loadRate > 0 && b.quantity > 0) {
              const days = b.quantity / b.loadRate;
              allowedMinutes += Math.round(days * 24 * 60);
            }
          }
        }
      }
      if (allowedMinutes === 0 && grossMinutes > 0) {
        allowedMinutes = 1440;
      }
    } else {
      // Scratchpad Mode
      ratePerDay = Number(demurrageRate) || 0;
      despRatePerDay = Number(despatchRate) || ratePerDay / 2;
      allowedMinutes = Math.round((Number(allowedHours) || 0) * 60);

      if (opsStart && opsEnd) {
        const s = new Date(opsStart).getTime();
        const e = new Date(opsEnd).getTime();
        if (!isNaN(s) && !isNaN(e) && e > s) {
          grossMinutes = Math.round((e - s) / 60000);
        }
      }
    }

    if (grossMinutes === 0 && allowedMinutes === 0 && deductions.length === 0) {
      return null;
    }

    // Sum Deductions
    let deductionMinutes = 0;
    for (const d of deductions) {
      deductionMinutes += Math.round((d.deductionHours || 0) * 60);
    }
    if (claim?.activities) {
      for (const act of claim.activities) {
        if (act.percentageCounted < 100 && act.durationMinutes) {
          deductionMinutes += Math.round(act.durationMinutes * (1 - act.percentageCounted / 100));
        }
      }
    }

    const netLaytimeMinutes = Math.max(grossMinutes - deductionMinutes, 0);
    const timeExceededMinutes = Math.max(netLaytimeMinutes - allowedMinutes, 0);
    const timeSavedMinutes = Math.max(allowedMinutes - netLaytimeMinutes, 0);

    const ratePerMinute = ratePerDay / (24 * 60);
    const despRatePerMinute = despRatePerDay / (24 * 60);

    const demurrageAmount = Math.round(timeExceededMinutes * ratePerMinute * 100) / 100;
    const despatchAmount = Math.round(timeSavedMinutes * despRatePerMinute * 100) / 100;

    return {
      totalTime: grossMinutes,
      deductedTime: deductionMinutes,
      netLaytime: netLaytimeMinutes,
      laytimeAllowed: allowedMinutes,
      laytimeUsed: netLaytimeMinutes,
      demurrageAmount,
      despatchAmount,
      timeExceededMinutes,
      timeSavedMinutes,
    };
  }, [claim, scratchpadMode, opsStart, opsEnd, demurrageRate, despatchRate, allowedHours, deductions]);

  const handleExportPDF = () => {
    if (claim) {
      exportClaimPdf(claim);
      success("Export Successful", "Calculation statement PDF downloaded.");
    } else {
      info("Export Note", "Select a claim record to export formal settlement statement PDF.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-bold">
        <button
          onClick={() => setCalculatorTab("standard")}
          className={`pb-3 border-b-2 transition ${
            calculatorTab === "standard" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Standard Laytime &amp; Demurrage Calculator
        </button>
        <button
          onClick={() => setCalculatorTab("oilchem")}
          className={`pb-3 border-b-2 transition flex items-center space-x-1.5 ${
            calculatorTab === "oilchem" ? "border-cyan-600 text-cyan-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Oil &amp; Chemical Cargo Calculator</span>
          <span className="bg-cyan-100 text-cyan-800 text-[10px] px-1.5 py-0.2 rounded font-bold">Liquid Tanker</span>
        </button>
        <button
          onClick={() => setCalculatorTab("rac")}
          className={`pb-3 border-b-2 transition flex items-center space-x-1.5 ${
            calculatorTab === "rac" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Briefcase className="h-3.5 w-3.5 mr-1 text-indigo-600" />
          <span>RAC Recoverable Costs Engine</span>
          <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.2 rounded font-bold">Rule Engine</span>
        </button>
      </div>

      {calculatorTab === "oilchem" ? (
        <OilChemCalculator />
      ) : calculatorTab === "rac" ? (
        <RacCalculator />
      ) : (
        <>
          {/* 1. Header & Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Standard Laytime Calculator
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated demurrage &amp; despatch calculation engine with operational deduction auditing
              </p>
            </div>

        {/* Claim Selector or Mode */}
        <div className="flex flex-wrap items-center gap-2.5">
          {!scratchpadMode ? (
            <>
              <select
                value={selectedClaimId}
                onChange={(e) => handleClaimChange(e.target.value)}
                className="text-xs font-semibold rounded-xl border border-slate-300 px-3.5 py-2 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 min-w-[200px]"
              >
                <option value="">-- Select a Claim --</option>
                {claims.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} — {c.shipName}
                  </option>
                ))}
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setScratchpadMode(true);
                  setClaim(null);
                  setSelectedClaimId("");
                }}
                className="text-xs h-9 px-3 bg-white rounded-xl"
              >
                Scratchpad Mode
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setScratchpadMode(false);
                if (claims.length > 0) {
                  handleClaimChange(claims[0].id);
                }
              }}
              className="text-xs h-9 px-3 bg-white rounded-xl"
            >
              Back to Claims Mode
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleExportPDF}
            disabled={!claim}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 px-4 rounded-xl flex items-center space-x-1.5 shadow-xs"
          >
            <Download className="h-4 w-4" />
            <span>Export Statement</span>
          </Button>
        </div>
      </div>

      {/* Scratchpad Interactive Inputs */}
      {scratchpadMode && (
        <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl">
          <CardHeader className="p-5 pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900">
              Scratchpad Parameter Inputs
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Enter hypothetical voyage variables to test laytime and demurrage on the fly
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs text-left">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Operations Start</label>
                <Input
                  type="datetime-local"
                  value={opsStart}
                  onChange={(e) => setOpsStart(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Operations End</label>
                <Input
                  type="datetime-local"
                  value={opsEnd}
                  onChange={(e) => setOpsEnd(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Laytime Allowed (Hours)</label>
                <Input
                  type="number"
                  placeholder="e.g. 72"
                  value={allowedHours}
                  onChange={(e) => setAllowedHours(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Demurrage Rate ($/day)</label>
                <Input
                  type="number"
                  placeholder="e.g. 28000"
                  value={demurrageRate}
                  onChange={(e) => setDemurrageRate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Despatch Rate ($/day)</label>
                <Input
                  type="number"
                  placeholder="e.g. 14000"
                  value={despatchRate}
                  onChange={(e) => setDespatchRate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. SECTION 12: CALCULATION SUMMARY */}
      <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Calculator className="h-4 w-4 text-blue-600" />
              <span>Calculation Summary</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {claim
                ? `Results for ${claim.shipName} (${claim.id})`
                : scratchpadMode
                ? "Interactive scratchpad computation"
                : "No claim selected"}
            </CardDescription>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Demurrage / Despatch Amount
            </span>
            <span className="text-2xl font-black text-blue-600">
              {calculation
                ? formatCurrency(
                    calculation.demurrageAmount > 0
                      ? calculation.demurrageAmount
                      : -calculation.despatchAmount
                  )
                : "$0.00"}
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {calculation ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {/* Total Time */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Time</span>
                <span className="text-lg font-extrabold text-slate-900 mt-1 block">
                  {formatMinutesToDuration(calculation.totalTime)}
                </span>
                <span className="text-[10px] text-slate-400">Gross elapsed duration</span>
              </div>

              {/* Deducted Time */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                <span className="text-[11px] font-bold text-amber-800 uppercase block">Deducted Time</span>
                <span className="text-lg font-extrabold text-amber-900 mt-1 block">
                  {formatMinutesToDuration(calculation.deductedTime)}
                </span>
                <span className="text-[10px] text-amber-700">Weather &amp; delays</span>
              </div>

              {/* Net Laytime */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200">
                <span className="text-[11px] font-bold text-blue-800 uppercase block">Net Laytime</span>
                <span className="text-lg font-extrabold text-blue-900 mt-1 block">
                  {formatMinutesToDuration(calculation.netLaytime)}
                </span>
                <span className="text-[10px] text-blue-700">Total minus deductions</span>
              </div>

              {/* Laytime Allowed */}
              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200">
                <span className="text-[11px] font-bold text-purple-800 uppercase block">Laytime Allowed</span>
                <span className="text-lg font-extrabold text-purple-900 mt-1 block">
                  {formatMinutesToDuration(calculation.laytimeAllowed)}
                </span>
                <span className="text-[10px] text-purple-700">Contractual limit</span>
              </div>

              {/* Laytime Used */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Laytime Used</span>
                <span className="text-lg font-extrabold text-slate-900 mt-1 block">
                  {formatMinutesToDuration(calculation.laytimeUsed)}
                </span>
                <span className="text-[10px] text-slate-400">Net counted hours</span>
              </div>

              {/* Amount */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-800 uppercase block">Final Amount</span>
                <span className="text-lg font-extrabold text-emerald-900 mt-1 block">
                  {formatCurrency(calculation.demurrageAmount)}
                </span>
                <span className="text-[10px] text-emerald-700">
                  {calculation.timeExceededMinutes > 0 ? "Demurrage" : "Despatch"}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-8">
              <EmptyState
                icon={Calculator}
                title="No calculation available"
                description="Select an existing claim from the top dropdown or switch to Scratchpad mode to run laytime calculations."
                actionText={claims.length === 0 ? "Create First Claim" : undefined}
                actionHref={claims.length === 0 ? "/claims/create" : undefined}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. SECTION 13: DEDUCTIONS TABLE */}
      <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span>Deductions Table</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Weather delays, shore breakdowns, shifting, and exceptions
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {/* Add Deduction Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 p-4 bg-slate-50/60 rounded-xl border border-slate-200 text-left text-xs">
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
                  setNewDeduction((prev) => ({
                    ...prev,
                    percentageTime: Number(e.target.value) || 0,
                  }))
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
                      <td className="py-2.5 px-3 text-right font-bold text-amber-700">
                        {d.deductionHours}h
                      </td>
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
              No deductions recorded. Use the &quot;Add Deduction&quot; form above to record rain, weather delays, or mechanical breakdowns.
            </div>
          )}
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}
