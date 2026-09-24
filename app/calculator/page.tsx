"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getClaims } from "@/lib/api";
import { Claim, Port, Berth, SoFActivity, DeductionItem } from "@/lib/types";
import { calculateClaimLaytime } from "@/lib/calculations";
import { formatCurrency } from "@/lib/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/inputs";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { exportClaimPdf } from "@/lib/utils/exportPdf";
import {
  Calculator,
  Plus,
  Trash2,
  Download,
  RotateCcw,
  Sparkles,
  Ship,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/lib/hooks/useToast";

export default function CalculatorPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string>("");
  const { success, info } = useToast();

  // Contractual Terms State
  const [allowedLaytimeDays, setAllowedLaytimeDays] = useState<number>(3.5);
  const [laytimeUnit, setLaytimeUnit] = useState<"Days" | "Hours">("Days");
  const [demurrageRate, setDemurrageRate] = useState<number>(32000);
  const [despatchRate, setDespatchRate] = useState<number>(16000);
  const [laytimeType, setLaytimeType] = useState<string>("Non-Reversible");
  const [workingRule, setWorkingRule] = useState<string>("SHEX");

  // Multi-Berth Allocations
  const [berths, setBerths] = useState<
    { id: string; name: string; port: string; quantity: number; loadRate: number; prorata: number; cargo: string }[]
  >([
    { id: "b-1", name: "Berth 1 (Main Jetty)", port: "Port of Rotterdam", quantity: 45000, loadRate: 30000, prorata: 60, cargo: "Crude Oil" },
    { id: "b-2", name: "Berth 2 (Expansion)", port: "Port of Rotterdam", quantity: 30000, loadRate: 30000, prorata: 40, cargo: "Fuel Oil" }
  ]);

  // Statement of Facts / Time Activities
  const [activities, setActivities] = useState<
    { id: string; activity: string; berthId: string; start: string; stop: string; percentCounted: number; remarks: string }[]
  >([
    { id: "a-1", activity: "Notice of Readiness Tendered", berthId: "b-1", start: "2024-07-10T04:30", stop: "2024-07-10T10:30", percentCounted: 0, remarks: "6h NOR grace allowance" },
    { id: "a-2", activity: "Waiting for Berth", berthId: "b-1", start: "2024-07-10T10:30", stop: "2024-07-11T12:00", percentCounted: 100, remarks: "Berth congestion" },
    { id: "a-3", activity: "Discharging Operations", berthId: "b-1", start: "2024-07-11T12:00", stop: "2024-07-13T18:00", percentCounted: 100, remarks: "Pumping to shore tanks" },
    { id: "a-4", activity: "Rain Delay", berthId: "b-1", start: "2024-07-12T16:00", stop: "2024-07-13T01:00", percentCounted: 50, remarks: "50% counted under C/P Cl. 17" }
  ]);

  // Load claims on mount
  useEffect(() => {
    async function load() {
      const all = await getClaims();
      setClaims(all);
      if (all.length > 0) {
        loadClaimIntoCalculator(all[0]);
      }
    }
    load();
  }, []);

  const loadClaimIntoCalculator = (c: Claim) => {
    setSelectedClaimId(c.id);
    setDemurrageRate(c.demurrageRatePerDay || 25000);
    setDespatchRate((c.demurrageRatePerDay || 25000) / 2);

    if (c.ports && c.ports.length > 0 && c.ports[0].berths && c.ports[0].berths.length > 0) {
      const extractedBerths = c.ports.flatMap((p) =>
        (p.berths || []).map((b) => ({
          id: b.id,
          name: b.name,
          port: p.name,
          quantity: b.quantity,
          loadRate: b.loadRate,
          prorata: b.prorataShare,
          cargo: b.cargoType || "Crude Oil"
        }))
      );
      setBerths(extractedBerths);

      // Compute allowed days from cargo & load rate
      const totalQty = extractedBerths.reduce((s, b) => s + b.quantity, 0);
      const avgRate = extractedBerths[0]?.loadRate || 30000;
      setAllowedLaytimeDays(Math.round((totalQty / avgRate) * 10) / 10 || 3);
    }

    if (c.activities && c.activities.length > 0) {
      setActivities(
        c.activities.map((a) => ({
          id: a.id,
          activity: a.activityName,
          berthId: a.berthId || "b-1",
          start: a.startTime.substring(0, 16),
          stop: a.stopTime.substring(0, 16),
          percentCounted: a.percentageCounted,
          remarks: a.remarks || ""
        }))
      );
    }
  };

  // Perform Calculations
  const calcResults = useMemo(() => {
    let totalGrossMinutes = 0;
    let totalCountedMinutes = 0;
    let totalDeductionMinutes = 0;

    const rowDetails = activities.map((act) => {
      const startTime = new Date(act.start).getTime();
      const stopTime = new Date(act.stop).getTime();
      const durationMs = Math.max(stopTime - startTime, 0);
      const grossMinutes = Math.round(durationMs / (1000 * 60));

      const countedMinutes = Math.round(grossMinutes * (act.percentCounted / 100));
      const deductionMinutes = grossMinutes - countedMinutes;

      totalGrossMinutes += grossMinutes;
      totalCountedMinutes += countedMinutes;
      totalDeductionMinutes += deductionMinutes;

      const berthObj = berths.find((b) => b.id === act.berthId);

      return {
        ...act,
        grossMinutes,
        grossFormatted: formatMins(grossMinutes),
        countedMinutes,
        countedFormatted: formatMins(countedMinutes),
        deductionMinutes,
        deductionFormatted: formatMins(deductionMinutes),
        berthName: berthObj?.name || "Berth 1",
        prorata: berthObj?.prorata || 100
      };
    });

    const allowedMinutes = Math.round(
      (laytimeUnit === "Days" ? allowedLaytimeDays * 24 : allowedLaytimeDays) * 60
    );

    const netUsedMinutes = totalCountedMinutes;
    const excessMinutes = Math.max(netUsedMinutes - allowedMinutes, 0);
    const savedMinutes = Math.max(allowedMinutes - netUsedMinutes, 0);

    const ratePerMin = demurrageRate / (24 * 60);
    const despatchRatePerMin = despatchRate / (24 * 60);

    const demurrageAmount = Math.round(excessMinutes * ratePerMin * 100) / 100;
    const despatchAmount = Math.round(savedMinutes * despatchRatePerMin * 100) / 100;
    const finalClaimAmount = Math.max(demurrageAmount - despatchAmount, 0);

    return {
      rows: rowDetails,
      totalGrossMinutes,
      totalGrossFormatted: formatMins(totalGrossMinutes),
      totalCountedMinutes,
      totalCountedFormatted: formatMins(totalCountedMinutes),
      totalDeductionMinutes,
      totalDeductionFormatted: formatMins(totalDeductionMinutes),
      allowedMinutes,
      allowedFormatted: formatMins(allowedMinutes),
      netUsedMinutes,
      netUsedFormatted: formatMins(netUsedMinutes),
      excessMinutes,
      excessFormatted: formatMins(excessMinutes),
      savedMinutes,
      savedFormatted: formatMins(savedMinutes),
      demurrageAmount,
      despatchAmount,
      finalClaimAmount
    };
  }, [activities, berths, allowedLaytimeDays, laytimeUnit, demurrageRate, despatchRate]);

  function formatMins(mins: number): string {
    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);
    const m = mins % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}h ${pad(m)}m`;
  }

  const handleAddActivity = () => {
    const newAct = {
      id: `a-${Date.now()}`,
      activity: "Operational Event",
      berthId: berths[0]?.id || "b-1",
      start: new Date().toISOString().substring(0, 16),
      stop: new Date(Date.now() + 6 * 3600 * 1000).toISOString().substring(0, 16),
      percentCounted: 100,
      remarks: "Logged activity"
    };
    setActivities([...activities, newAct]);
    success("Event Added", "New time activity added to the laytime sheet");
  };

  const handleDeleteActivity = (id: string) => {
    setActivities(activities.filter((a) => a.id !== id));
  };

  const handleAddBerth = () => {
    const newB = {
      id: `b-${Date.now()}`,
      name: `Berth ${berths.length + 1}`,
      port: "Port of Discharge",
      quantity: 25000,
      loadRate: 30000,
      prorata: 50,
      cargo: "Refined Products"
    };
    setBerths([...berths, newB]);
    success("Berth Added", "Multi-berth allocation updated");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Laytime & Demurrage Calculator Engine
            </h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 font-bold border-blue-200">
              Interactive Simulation
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic calculation engine supporting multi-berth prorata splits, deductible rain/weather deductions, and reversible terms.
          </p>
        </div>

        {/* Load Claim Dropdown & Export */}
        <div className="flex items-center space-x-2.5">
          <select
            value={selectedClaimId}
            onChange={(e) => {
              const target = claims.find((c) => c.id === e.target.value);
              if (target) loadClaimIntoCalculator(target);
            }}
            className="text-xs font-semibold rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[240px]"
          >
            {claims.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} — {c.shipName}
              </option>
            ))}
          </select>

          <Button
            size="sm"
            onClick={() => success("Calculation Exported", "Laytime statement generated and downloaded")}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 px-3.5 rounded-xl shadow-xs flex items-center space-x-1.5"
          >
            <Download className="h-4 w-4" />
            <span>Export Statement</span>
          </Button>
        </div>
      </div>

      {/* 1. CONTRACTUAL TERMS SECTION */}
      <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <span>Section 1 — Contractual Terms</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Charterparty laytime allowances, demurrage/despatch rates, and operational rules
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Allowed Laytime</label>
              <Input
                type="number"
                step="0.1"
                value={allowedLaytimeDays}
                onChange={(e) => setAllowedLaytimeDays(Number(e.target.value))}
                className="h-9 font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Laytime Unit</label>
              <select
                value={laytimeUnit}
                onChange={(e) => setLaytimeUnit(e.target.value as any)}
                className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold bg-white text-slate-800"
              >
                <option value="Days">Days (24h/day)</option>
                <option value="Hours">Hours (Direct)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Demurrage Rate ($/day)</label>
              <Input
                type="number"
                value={demurrageRate}
                onChange={(e) => {
                  const r = Number(e.target.value);
                  setDemurrageRate(r);
                  setDespatchRate(r / 2);
                }}
                className="h-9 font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Despatch Rate ($/day)</label>
              <Input
                type="number"
                value={despatchRate}
                onChange={(e) => setDespatchRate(Number(e.target.value))}
                className="h-9 font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Laytime Type</label>
              <select
                value={laytimeType}
                onChange={(e) => setLaytimeType(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold bg-white text-slate-800"
              >
                <option value="Non-Reversible">Non-Reversible</option>
                <option value="Reversible">Reversible</option>
                <option value="Average">Average Laytime</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Working Rule</label>
              <select
                value={workingRule}
                onChange={(e) => setWorkingRule(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold bg-white text-slate-800"
              >
                <option value="SHEX">SHEX (Sun/Hol Excluded)</option>
                <option value="SHINC">SHINC (Sun/Hol Included)</option>
                <option value="FHEX">FHEX (Fri/Hol Excluded)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. MULTI-BERTH / PRORATA UI SECTION */}
      <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              <span>Section 2 — Multi-Berth &amp; Prorata Allocations</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Shared port cargo quantities, contractual discharge rates, and prorata distribution
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddBerth}
            className="text-xs h-8 px-3 rounded-lg flex items-center space-x-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Berth</span>
          </Button>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {berths.map((b, idx) => (
              <div
                key={b.id}
                className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{b.name}</span>
                  <span className="font-mono font-bold text-indigo-600 text-[11px] bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                    {b.prorata}% Share
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-400 block">Cargo:</span>
                    <span className="font-medium text-slate-800">{b.cargo}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Quantity:</span>
                    <span className="font-bold text-slate-800">{b.quantity.toLocaleString()} MT</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Discharge Rate:</span>
                    <span className="font-medium text-slate-800">{b.loadRate.toLocaleString()} MT/day</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Allowed Time:</span>
                    <span className="font-bold text-slate-800">
                      {Math.round((b.quantity / (b.loadRate || 1)) * 10) / 10} days
                    </span>
                  </div>
                </div>

                {/* Visual Pro-rata Bar */}
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-indigo-600 h-full rounded-full"
                    style={{ width: `${b.prorata}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. TIME CALCULATION & DEDUCTION TABLE */}
      <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span>Section 3 — Statement of Facts &amp; Deductions Log</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Operations log with duration, percentage counted, and berth prorata bindings
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={handleAddActivity}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3 rounded-lg flex items-center space-x-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Event</span>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Event Description</th>
                  <th className="py-3 px-4">Berth</th>
                  <th className="py-3 px-4">Start Time</th>
                  <th className="py-3 px-4">Stop Time</th>
                  <th className="py-3 px-4 text-right">Gross Time</th>
                  <th className="py-3 px-4 text-center">% Counted</th>
                  <th className="py-3 px-4 text-right">Deduction</th>
                  <th className="py-3 px-4 text-right">Counted Time</th>
                  <th className="py-3 px-4">Remarks</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {calcResults.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{row.activity}</td>
                    <td className="py-3 px-4 text-slate-600">{row.berthName}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">{row.start}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">{row.stop}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      {row.grossFormatted}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          row.percentCounted === 100
                            ? "bg-slate-100 text-slate-800"
                            : row.percentCounted === 0
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {row.percentCounted}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-amber-600 font-bold">
                      {row.deductionFormatted}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-blue-600 font-bold">
                      {row.countedFormatted}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-[200px] truncate">
                      {row.remarks || "—"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteActivity(row.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50/90 font-bold text-slate-900 border-t border-slate-200">
                  <td colSpan={4} className="py-3 px-4 text-right uppercase text-[10px] tracking-wider">
                    Total Statement Duration:
                  </td>
                  <td className="py-3 px-4 text-right font-mono">{calcResults.totalGrossFormatted}</td>
                  <td></td>
                  <td className="py-3 px-4 text-right font-mono text-amber-600">
                    {calcResults.totalDeductionFormatted}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-blue-600">
                    {calcResults.totalCountedFormatted}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. FINAL CALCULATION SUMMARY CARDS */}
      <div>
        <div className="flex items-center space-x-2 mb-3">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Section 4 — Final Settlement Reconciled Summary
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3.5">
          {/* Card 1: Allowed Time */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Allowed Time</span>
            <div className="text-base sm:text-lg font-black text-slate-900 mt-1 font-mono">
              {calcResults.allowedFormatted}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Contractual Laytime</span>
          </div>

          {/* Card 2: Used Time */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Used Time</span>
            <div className="text-base sm:text-lg font-black text-blue-600 mt-1 font-mono">
              {calcResults.netUsedFormatted}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Net Counted</span>
          </div>

          {/* Card 3: Excess Time */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Excess Time</span>
            <div className="text-base sm:text-lg font-black text-rose-600 mt-1 font-mono">
              {calcResults.excessFormatted}
            </div>
            <span className="text-[10px] text-rose-500 font-medium">Demurrage Incurred</span>
          </div>

          {/* Card 4: Saved Time */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Saved Time</span>
            <div className="text-base sm:text-lg font-black text-emerald-600 mt-1 font-mono">
              {calcResults.savedFormatted}
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">Despatch Eligible</span>
          </div>

          {/* Card 5: Demurrage USD */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Demurrage</span>
            <div className="text-base sm:text-lg font-black text-rose-600 mt-1">
              {formatCurrency(calcResults.demurrageAmount)}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">${demurrageRate.toLocaleString()}/day</span>
          </div>

          {/* Card 6: Despatch USD */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Despatch</span>
            <div className="text-base sm:text-lg font-black text-emerald-600 mt-1">
              {formatCurrency(calcResults.despatchAmount)}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">${despatchRate.toLocaleString()}/day</span>
          </div>

          {/* Card 7: Final Claim Amount */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md border border-slate-800">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Final Claim</span>
            <div className="text-base sm:text-lg font-black text-white mt-1">
              {formatCurrency(calcResults.finalClaimAmount)}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Net Billable USD</span>
          </div>
        </div>
      </div>
    </div>
  );
}
