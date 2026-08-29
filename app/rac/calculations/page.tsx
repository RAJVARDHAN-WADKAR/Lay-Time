"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { getRacCases, runRacCalculation } from "@/lib/api/rac";
import { RacCase, RacCalculation } from "@/lib/types";
import {
  Layers,
  Calculator,
  RefreshCw,
  Save,
  CheckCircle2,
  DollarSign,
  Plus,
  Trash2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/formatters";

export default function RacCalculationsPage() {
  const { currentUser, role } = useAuth();
  const [cases, setCases] = useState<RacCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  // Parameter Sets
  const [ruleVersion, setRuleVersion] = useState("1.0");
  const [unitType, setUnitType] = useState<"Hours" | "Days" | "Metric Tons" | "Lump Sum">("Hours");
  const [baseRate, setBaseRate] = useState(2500);
  const [quantity, setQuantity] = useState(24);
  const [graceAllowanceHours, setGraceAllowanceHours] = useState(2.0);
  const [counterpartyAllowance, setCounterpartyAllowance] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [prorataFactor, setProrataFactor] = useState(1.0);

  // Itemized categories
  const [categories, setCategories] = useState([
    { category: "Tug Standby & Assist", unitCost: 1500, quantity: 12, total: 18000, deductiblePercent: 0 },
    { category: "Pilotage Surcharge", unitCost: 1200, quantity: 8, total: 9600, deductiblePercent: 0 }
  ]);

  // Adjustments
  const [adjustments, setAdjustments] = useState([
    { id: "adj-1", description: "Contractual Grace Period Allowance", amount: 3000, isDeduction: true }
  ]);

  const [activeCalculation, setActiveCalculation] = useState<RacCalculation | null>(null);

  const loadCases = async () => {
    setLoading(true);
    try {
      const data = await getRacCases();
      setCases(data);
      if (data.length > 0) {
        setSelectedCaseId(data[0].id);
        if (data[0].calculation) {
          setActiveCalculation(data[0].calculation);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const handleSelectCase = (id: string) => {
    setSelectedCaseId(id);
    const target = cases.find((c) => c.id === id);
    if (target?.calculation) {
      setActiveCalculation(target.calculation);
    }
  };

  const handleRunCalculation = async () => {
    if (!selectedCaseId) return;
    setCalculating(true);
    try {
      const calcResult = await runRacCalculation(selectedCaseId, {
        ruleVersion,
        parameters: {
          baseRate,
          unitType,
          graceAllowanceHours,
          taxOrVatPercent: taxPercent,
          prorataFactor,
          costCategories: categories
        },
        inputs: {
          quantityOrDuration: quantity,
          agreedDailyOrHourlyRate: baseRate,
          actualIncurredCost: categories.reduce((a, b) => a + b.unitCost * b.quantity, 0),
          counterpartyAllowance
        },
        adjustments
      });

      setActiveCalculation(calcResult.calculation);
      alert("RAC Calculation recomputed and saved to database successfully!");
    } catch (e: any) {
      alert(e.message || "Failed to compute calculation");
    } finally {
      setCalculating(false);
    }
  };

  const selectedCase = cases.find((c) => c.id === selectedCaseId);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Configurable RAC Calculation Engine</h1>
            <p className="text-xs text-slate-500">
              Parameter-driven tariff models, deductions, prorata allocations, and breakdown verification
            </p>
          </div>
        </div>

        {/* Case selector dropdown */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-600">Select Case:</span>
          <select
            value={selectedCaseId}
            onChange={(e) => handleSelectCase(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-hidden focus:border-blue-500"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.racReference} - {c.shipName} ({formatCurrency(c.totalAmount)})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Parameter & Input Setup */}
        <Card className="p-5 lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-sm font-bold text-slate-900">Calculation Parameters & Ruleset</h2>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500">Ruleset Version:</span>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">v{ruleVersion}</span>
            </div>
          </div>

          {/* Core Calculation Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit Tariff Basis</label>
              <select
                value={unitType}
                onChange={(e) => setUnitType(e.target.value as any)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="Hours">Hours</option>
                <option value="Days">Days</option>
                <option value="Metric Tons">Metric Tons</option>
                <option value="Lump Sum">Lump Sum</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit Rate ($ USD)</label>
              <input
                type="number"
                value={baseRate}
                onChange={(e) => setBaseRate(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Total Quantity / Duration</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contract Grace Allowance (Hours)</label>
              <input
                type="number"
                value={graceAllowanceHours}
                onChange={(e) => setGraceAllowanceHours(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Counterparty Baseline Deductible</label>
              <input
                type="number"
                value={counterpartyAllowance}
                onChange={(e) => setCounterpartyAllowance(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Prorata Factor (0.0 to 1.0)</label>
              <input
                type="number"
                step="0.05"
                value={prorataFactor}
                onChange={(e) => setProrataFactor(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          {/* Itemized Categories */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Itemized Cost Categories</h3>
            </div>
            <div className="space-y-2">
              {categories.map((cat, i) => (
                <div key={i} className="flex items-center space-x-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    value={cat.category}
                    onChange={(e) => {
                      const upd = [...categories];
                      upd[i].category = e.target.value;
                      setCategories(upd);
                    }}
                    className="flex-1 bg-white border border-slate-200 rounded px-2 py-1"
                  />
                  <input
                    type="number"
                    value={cat.unitCost}
                    placeholder="Rate"
                    onChange={(e) => {
                      const upd = [...categories];
                      upd[i].unitCost = Number(e.target.value);
                      setCategories(upd);
                    }}
                    className="w-24 bg-white border border-slate-200 rounded px-2 py-1 text-right"
                  />
                  <span className="text-slate-400">×</span>
                  <input
                    type="number"
                    value={cat.quantity}
                    placeholder="Qty"
                    onChange={(e) => {
                      const upd = [...categories];
                      upd[i].quantity = Number(e.target.value);
                      setCategories(upd);
                    }}
                    className="w-16 bg-white border border-slate-200 rounded px-2 py-1 text-right"
                  />
                  <span className="font-bold text-slate-800 w-24 text-right">
                    {formatCurrency(cat.unitCost * cat.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Adjustments & Deductions */}
          <div className="space-y-3 pt-4 border-t">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Dispute Adjustments</h3>
            <div className="space-y-2">
              {adjustments.map((adj, i) => (
                <div key={adj.id} className="flex items-center space-x-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    value={adj.description}
                    onChange={(e) => {
                      const upd = [...adjustments];
                      upd[i].description = e.target.value;
                      setAdjustments(upd);
                    }}
                    className="flex-1 bg-white border border-slate-200 rounded px-2 py-1"
                  />
                  <input
                    type="number"
                    value={adj.amount}
                    onChange={(e) => {
                      const upd = [...adjustments];
                      upd[i].amount = Number(e.target.value);
                      setAdjustments(upd);
                    }}
                    className="w-28 bg-white border border-slate-200 rounded px-2 py-1 text-right"
                  />
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded">Deduction</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          {role !== "Reviewer" && (
            <div className="pt-3 border-t flex justify-end">
              <Button
                onClick={handleRunCalculation}
                disabled={calculating}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 h-9 flex items-center space-x-1.5 rounded-lg cursor-pointer"
              >
                <Calculator className="h-4 w-4" />
                <span>{calculating ? "Evaluating Formula..." : "Recompute & Save to DB"}</span>
              </Button>
            </div>
          )}
        </Card>

        {/* Right Column: Calculated Audit & Breakdown */}
        <div className="space-y-5">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Calculated Recovery Audit</h3>
            <div className="bg-blue-50/80 p-4 rounded-xl text-center space-y-1">
              <span className="text-xs text-blue-700 font-semibold">Net Recoverable Amount</span>
              <div className="text-2xl font-black text-blue-900">
                {formatCurrency(activeCalculation?.calculatedResult || selectedCase?.totalAmount || 0)}
              </div>
              <span className="text-[10px] text-blue-600 font-medium">Status: {activeCalculation?.calculationStatus || "Verified"}</span>
            </div>

            <div className="space-y-2 pt-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Case Reference:</span>
                <span className="font-bold text-slate-900">{selectedCase?.racReference}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Vessel:</span>
                <span className="font-semibold text-slate-800">{selectedCase?.shipName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Client:</span>
                <span className="font-semibold text-slate-800">{selectedCase?.clientName}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Evaluated At:</span>
                <span className="text-slate-600">{activeCalculation?.calculatedAt ? new Date(activeCalculation.calculatedAt).toLocaleDateString() : "Live"}</span>
              </div>
            </div>
          </Card>

          {/* Breakdown Steps Card */}
          <Card className="p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Formula Steps Verification</h4>
            <div className="space-y-2 text-xs">
              {(activeCalculation?.formulaBreakdown || [
                { step: "1. Base Incurred Cost", formula: "Gross Cost Sum", value: selectedCase?.totalAmount || 0 },
                { step: "2. Net Recoverable Result", formula: "Gross - Allowances", value: selectedCase?.totalAmount || 0 }
              ]).map((st, i) => (
                <div key={i} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>{st.step}</span>
                    <span>{formatCurrency(st.value)}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{st.formula}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
