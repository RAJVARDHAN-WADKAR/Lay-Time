const fs = require('fs');
const path = require('path');

const code = `"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getClaims, getClaimById, getSettings } from "@/lib/api";
import { Claim, ClaimCalculation, CalculationAssumptions } from "@/lib/types";
import { calculateClaimLaytime, DEFAULT_ASSUMPTIONS } from "@/lib/calculations";
import { formatCurrency, formatMinutesToDuration } from "@/lib/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, Input } from "@/components/ui/inputs";
import { exportClaimPdf } from "@/lib/utils/exportPdf";
import {
  Calculator,
  Anchor,
  Layers,
  Settings as SettingsIcon,
  Download,
  Info,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  RotateCcw,
} from "lucide-react";

export default function CalculationsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string>("CLM-2024-001");
  const [claim, setClaim] = useState<Claim | null>(null);
  const [assumptions, setAssumptions] = useState<CalculationAssumptions>(DEFAULT_ASSUMPTIONS);
  const [isLoading, setIsLoading] = useState(true);

  // Manual Demurrage Override for a berth
  const [berthOverrides, setBerthOverrides] = useState<Record<string, number>>({});

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const [allClaims, stg] = await Promise.all([getClaims(), getSettings()]);
      setClaims(allClaims);
      setAssumptions(stg);
      const active = allClaims.find((c) => c.id === selectedClaimId) || allClaims[0];
      setClaim(active);
      if (active) setSelectedClaimId(active.id);
      setIsLoading(false);
    }
    load();
  }, []);

  const handleClaimChange = async (id: string) => {
    setSelectedClaimId(id);
    setIsLoading(true);
    const c = await getClaimById(id);
    setClaim(c);
    setIsLoading(false);
  };

  // Compute live calculation using the pure calculation engine
  const calculationResult: ClaimCalculation | null = useMemo(() => {
    if (!claim) return null;
    const calc = calculateClaimLaytime(claim, assumptions);

    // Apply manual berth overrides if set
    if (Object.keys(berthOverrides).length > 0) {
      calc.portCalculations.forEach((p) => {
        p.berthCalculations.forEach((b) => {
          if (berthOverrides[b.berthId] !== undefined) {
            b.overriddenDemurrage = berthOverrides[b.berthId];
            b.isOverridden = true;
          }
        });
        p.totalDemurrageAmount = p.berthCalculations.reduce(
          (acc, b) => acc + (b.overriddenDemurrage !== undefined ? b.overriddenDemurrage : b.demurrageAmount),
          0
        );
      });
      calc.calculatedDemurrageAmount = calc.portCalculations.reduce(
        (acc, p) => acc + p.totalDemurrageAmount,
        0
      );
      calc.finalPayableAmount = Math.max(
        calc.calculatedDemurrageAmount - calc.calculatedDespatchAmount,
        0
      );
    }

    return calc;
  }, [claim, assumptions, berthOverrides]);

  const handleOverrideBerth = (berthId: string, amountStr: string) => {
    const val = parseFloat(amountStr);
    if (!isNaN(val)) {
      setBerthOverrides((prev) => ({ ...prev, [berthId]: val }));
    }
  };

  const handleClearOverrides = () => {
    setBerthOverrides({});
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Laytime & Demurrage Calculation Engine</h1>
            <Badge variant="purple">Pure Logic Engine</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated multi-berth laytime reconciliation, deduction algorithms, and demurrage rate computation.
          </p>
        </div>

        {/* Claim Selector & Download */}
        <div className="flex items-center space-x-2">
          <Select
            value={selectedClaimId}
            onChange={(e) => handleClaimChange(e.target.value)}
            className="w-72 text-xs font-semibold"
          >
            {claims.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} — {c.shipName} ({c.accountName.split(" ")[0]})
              </option>
            ))}
          </Select>

          {claim && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportClaimPdf(claim, calculationResult)}
              className="flex items-center space-x-1.5 text-xs text-slate-700"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export PDF</span>
            </Button>
          )}
        </div>
      </div>

      {calculationResult && claim && (
        <div className="space-y-6 text-xs">
          {/* Top Master Summary Banner */}
          <Card className="border-blue-200 bg-gradient-to-r from-blue-900 via-slate-900 to-slate-900 text-white shadow-md">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center space-x-2 text-blue-300 font-semibold uppercase tracking-wider text-[11px]">
                    <Calculator className="h-4 w-4" />
                    <span>Voyage Calculation Summary — {claim.shipName}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mt-1">
                    {formatCurrency(calculationResult.finalPayableAmount)}
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Rate: {formatCurrency(claim.demurrageRatePerDay)} / day ({claim.cpType} terms)
                  </p>
                </div>

                {/* 4 Metric Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white/10 backdrop-blur p-3 rounded-lg border border-white/10">
                    <span className="text-slate-300 block text-[10px] uppercase font-semibold">Allowed Laytime</span>
                    <span className="text-base font-bold text-white mt-0.5 block">
                      {formatMinutesToDuration(calculationResult.totalAllowedMinutes)}
                    </span>
                  </div>
                  <div className="bg-white/10 backdrop-blur p-3 rounded-lg border border-white/10">
                    <span className="text-slate-300 block text-[10px] uppercase font-semibold">Gross Elapsed</span>
                    <span className="text-base font-bold text-white mt-0.5 block">
                      {formatMinutesToDuration(calculationResult.totalGrossMinutes)}
                    </span>
                  </div>
                  <div className="bg-white/10 backdrop-blur p-3 rounded-lg border border-white/10">
                    <span className="text-slate-300 block text-[10px] uppercase font-semibold">Total Deductions</span>
                    <span className="text-base font-bold text-amber-300 mt-0.5 block">
                      {formatMinutesToDuration(calculationResult.totalDeductionsMinutes)}
                    </span>
                  </div>
                  <div className="bg-white/10 backdrop-blur p-3 rounded-lg border border-white/10">
                    <span className="text-slate-300 block text-[10px] uppercase font-semibold">Time Exceeded</span>
                    <span className="text-base font-bold text-rose-300 mt-0.5 block">
                      {formatMinutesToDuration(calculationResult.netDemurrageMinutes)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configured Assumptions Panel */}
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
              <div className="flex items-center space-x-2">
                <SettingsIcon className="h-4 w-4 text-slate-600" />
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Active Business Rule Assumptions
                </CardTitle>
              </div>
              <span className="text-[10px] text-slate-400">Configurable in Settings</span>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Laytime Principle</span>
                <span className="font-bold text-slate-800">Once on Demurrage Always on Demurrage (OOD-AOD)</span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Weekend / Holiday Rule</span>
                <span className="font-bold text-slate-800">SHEX (Sundays & Holidays Excluded)</span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Notice Grace Allowance</span>
                <span className="font-bold text-slate-800">{assumptions.noticeGracePeriodHours} hours after NOR</span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Weather Working Days</span>
                <span className="font-bold text-slate-800">WWD 24 Consecutive Hours</span>
              </div>
            </CardContent>
          </Card>

          {/* Berth and Port Breakdown Tables */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Multi-Berth Hierarchy & Laytime Breakdown</h3>
              {Object.keys(berthOverrides).length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearOverrides} className="text-xs text-rose-600">
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset Manual Overrides
                </Button>
              )}
            </div>

            {calculationResult.portCalculations.map((portCalc) => (
              <Card key={portCalc.portId} className="border-slate-200 shadow-xs bg-white">
                <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Anchor className="h-4 w-4 text-blue-600" />
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      {portCalc.portName} ({portCalc.portType})
                    </CardTitle>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 mr-2">Port Subtotal:</span>
                    <span className="font-bold text-sm text-blue-700">
                      {formatCurrency(portCalc.totalDemurrageAmount)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {portCalc.berthCalculations.map((berthCalc) => (
                    <div
                      key={berthCalc.berthId}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                        <div>
                          <div className="font-bold text-sm text-slate-900">{berthCalc.berthName}</div>
                          <div className="text-[11px] text-slate-500">
                            Volume: {berthCalc.cargoQuantity.toLocaleString()} MT | Rate: {berthCalc.loadRate.toLocaleString()} MT/day
                          </div>
                        </div>

                        {/* Demurrage with manual override input */}
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] font-semibold text-slate-600">Calculated:</span>
                          <span className="font-bold text-slate-900">
                            {formatCurrency(berthCalc.demurrageAmount)}
                          </span>

                          <span className="text-slate-300">|</span>

                          <span className="text-[11px] font-semibold text-slate-600">Override ($):</span>
                          <Input
                            type="number"
                            placeholder="Override"
                            className="w-28 h-7 text-xs"
                            value={berthOverrides[berthCalc.berthId] ?? ""}
                            onChange={(e) => handleOverrideBerth(berthCalc.berthId, e.target.value)}
                          />

                          {berthCalc.isOverridden && (
                            <Badge variant="warning" className="text-[10px]">
                              Overridden
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Berth Metrics Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-3 rounded-lg border border-slate-200">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Allowed Laytime</span>
                          <span className="font-semibold text-slate-800">{berthCalc.allowedLaytimeFormatted}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Gross Operations</span>
                          <span className="font-semibold text-slate-800">{berthCalc.grossElapsedFormatted}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Deductions Total</span>
                          <span className="font-semibold text-rose-600">{berthCalc.deductionFormatted}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Net Laytime Used</span>
                          <span className="font-semibold text-slate-900">{berthCalc.netLaytimeUsedFormatted}</span>
                        </div>
                      </div>

                      {/* Berth Deduction Category Breakdown */}
                      {berthCalc.deductionsByCategory.length > 0 && (
                        <div className="pt-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                            Deductions Applied for {berthCalc.berthName}:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {berthCalc.deductionsByCategory.map((d) => (
                              <div
                                key={d.category}
                                className="bg-white border border-slate-200 px-2.5 py-1 rounded text-[11px] flex items-center space-x-1.5 shadow-2xs"
                              >
                                <span className="font-semibold text-slate-700">{d.category}:</span>
                                <span className="text-rose-600 font-bold">{d.durationFormatted}</span>
                                <span className="text-slate-400 text-[10px]">({d.percentageDeducted}% deducted)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync(path.join(process.cwd(), 'app/calculations/page.tsx'), code, 'utf8');
console.log('Successfully wrote app/calculations/page.tsx');
