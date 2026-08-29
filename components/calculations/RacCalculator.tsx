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
  AlertCircle,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/formatters";

export function RacCalculator() {
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const handleSelectCase = (id: string) => {
    setSelectedCaseId(id);
    const found = cases.find((c) => c.id === id);
    if (found?.calculation) {
      setActiveCalculation(found.calculation);
      setRuleVersion(found.calculation.ruleVersion || "1.0");
    }
  };

  const handleAddCategory = () => {
    setCategories([
      ...categories,
      { category: "Additional Port Cost", unitCost: 1000, quantity: 1, total: 1000, deductiblePercent: 0 }
    ]);
  };

  const handleRemoveCategory = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const handleAddAdjustment = () => {
    setAdjustments([
      ...adjustments,
      { id: `adj-${Date.now()}`, description: "Custom Adjustment / Dispute Clause", amount: 1000, isDeduction: true }
    ]);
  };

  const handleRemoveAdjustment = (id: string) => {
    setAdjustments(adjustments.filter((a) => a.id !== id));
  };

  const handleExecuteCalculation = async () => {
    if (!selectedCaseId) return;
    setCalculating(true);
    try {
      const result = await runRacCalculation({
        racCaseId: selectedCaseId,
        ruleVersion,
        parameters: {
          baseRate,
          unitType,
          graceAllowanceHours,
          counterpartyAllowance,
          taxPercent,
          prorataFactor,
          costCategories: categories
        },
        inputs: {
          quantity,
          baseRate
        },
        adjustments
      });

      setActiveCalculation(result.calculation);
    } catch (e: any) {
      console.error(e);
    } finally {
      setCalculating(false);
    }
  };

  const selectedCase = cases.find((c) => c.id === selectedCaseId);

  return (
    <div className="space-y-6">
      {/* Header & Case Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
              Rule Engine v1.0
            </span>
            <span className="text-xs text-slate-500">Configurable Dispute Math</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
            <Briefcase className="h-6 w-6 text-indigo-600" />
            <span>RAC &amp; Recoverable Costs Engine</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Parameter-driven mathematical engine for additional port tariffs, detention, and shifting contention recoveries.
          </p>
        </div>

        {/* Selected Case Dropdown */}
        <div className="flex items-center space-x-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Select Attached RAC Case:
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => handleSelectCase(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden min-w-[240px]"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.racReference} - {c.shipName} ({formatCurrency(c.totalAmount)})
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={handleExecuteCalculation}
            disabled={calculating || !selectedCaseId}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-lg shadow-indigo-900/20 flex items-center space-x-1.5 mt-4 sm:mt-5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${calculating ? "animate-spin" : ""}`} />
            <span>Run Formula</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Parameters on Left, Output on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Parameters & Cost Breakdown */}
        <div className="lg:col-span-7 space-y-6">
          {/* Base Parameters Card */}
          <Card className="p-5 border-slate-200 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
              <Calculator className="h-4 w-4 text-indigo-600" />
              <span>Base Formula Parameters</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rule Engine Version</label>
                <input
                  type="text"
                  value={ruleVersion}
                  onChange={(e) => setRuleVersion(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unit Tariff Basis</label>
                <select
                  value={unitType}
                  onChange={(e) => setUnitType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium"
                >
                  <option value="Hours">Hours (Hourly Tariff)</option>
                  <option value="Days">Days (Daily Rate)</option>
                  <option value="Metric Tons">Metric Tons (Volume Basis)</option>
                  <option value="Lump Sum">Lump Sum (Fixed Fee)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Base Rate (USD)</label>
                <input
                  type="number"
                  value={baseRate}
                  onChange={(e) => setBaseRate(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs mt-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contract Quantity / Time</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Grace Allowance (Hours)</label>
                <input
                  type="number"
                  value={graceAllowanceHours}
                  onChange={(e) => setGraceAllowanceHours(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Prorata Factor (0.1 - 1.0)</label>
                <input
                  type="number"
                  step="0.05"
                  value={prorataFactor}
                  onChange={(e) => setProrataFactor(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium"
                />
              </div>
            </div>
          </Card>

          {/* Itemized Categories Table */}
          <Card className="p-5 border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Layers className="h-4 w-4 text-indigo-600" />
                <span>Itemized Cost Categories</span>
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddCategory}
                className="text-xs h-7 px-2.5 flex items-center space-x-1"
              >
                <Plus className="h-3 w-3" />
                <span>Add Item</span>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2">Cost Category</th>
                    <th className="p-2">Unit Cost</th>
                    <th className="p-2">Qty</th>
                    <th className="p-2">Deduct %</th>
                    <th className="p-2 text-right">Total (USD)</th>
                    <th className="p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map((c, idx) => (
                    <tr key={idx}>
                      <td className="p-2">
                        <input
                          type="text"
                          value={c.category}
                          onChange={(e) => {
                            const copy = [...categories];
                            copy[idx].category = e.target.value;
                            setCategories(copy);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={c.unitCost}
                          onChange={(e) => {
                            const copy = [...categories];
                            copy[idx].unitCost = Number(e.target.value);
                            copy[idx].total = copy[idx].unitCost * copy[idx].quantity;
                            setCategories(copy);
                          }}
                          className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={c.quantity}
                          onChange={(e) => {
                            const copy = [...categories];
                            copy[idx].quantity = Number(e.target.value);
                            copy[idx].total = copy[idx].unitCost * copy[idx].quantity;
                            setCategories(copy);
                          }}
                          className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={c.deductiblePercent}
                          onChange={(e) => {
                            const copy = [...categories];
                            copy[idx].deductiblePercent = Number(e.target.value);
                            setCategories(copy);
                          }}
                          className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="p-2 text-right font-bold text-slate-900">
                        {formatCurrency(c.total)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleRemoveCategory(idx)}
                          className="text-slate-400 hover:text-rose-600 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Adjustments & Dispute Allowances */}
          <Card className="p-5 border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span>Adjustments &amp; Clause Deductions</span>
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddAdjustment}
                className="text-xs h-7 px-2.5 flex items-center space-x-1"
              >
                <Plus className="h-3 w-3" />
                <span>Add Adjustment</span>
              </Button>
            </div>

            <div className="space-y-2">
              {adjustments.map((adj) => (
                <div key={adj.id} className="flex items-center space-x-3 p-2 bg-slate-50 rounded-lg text-xs">
                  <input
                    type="text"
                    value={adj.description}
                    onChange={(e) => {
                      setAdjustments(adjustments.map((a) => (a.id === adj.id ? { ...a, description: e.target.value } : a)));
                    }}
                    className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                  />
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-500">$</span>
                    <input
                      type="number"
                      value={adj.amount}
                      onChange={(e) => {
                        setAdjustments(adjustments.map((a) => (a.id === adj.id ? { ...a, amount: Number(e.target.value) } : a)));
                      }}
                      className="w-24 bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveAdjustment(adj.id)}
                    className="text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Output: Live Formula Result & Step Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-linear-to-b from-slate-900 to-indigo-950 text-white p-6 rounded-2xl border border-indigo-800/40 shadow-xl">
            <div className="flex items-center justify-between border-b border-indigo-800/50 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">
                  Computed Result
                </span>
                <div className="text-2xl font-black text-white mt-0.5">
                  {formatCurrency(activeCalculation?.calculatedResult || selectedCase?.totalAmount || 0)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Rule Version</span>
                <span className="text-xs font-mono font-bold text-indigo-300">{ruleVersion}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Formula Step Breakdown
              </h4>

              {activeCalculation?.formulaBreakdown && activeCalculation.formulaBreakdown.length > 0 ? (
                <div className="space-y-2">
                  {activeCalculation.formulaBreakdown.map((st, i) => (
                    <div key={i} className="p-3 bg-slate-950/70 border border-indigo-950 rounded-xl text-xs">
                      <div className="flex items-center justify-between text-indigo-300 font-bold">
                        <span>{st.step}</span>
                        <span className="font-mono text-white">{formatCurrency(st.value)}</span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 mt-1">{st.formula}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-950/50 rounded-xl text-xs text-slate-400 border border-dashed border-slate-800 text-center">
                  Click &ldquo;Run Formula&rdquo; to compute multi-tiered tariff steps and adjustments.
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-indigo-800/50 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Deterministic Calculation</span>
              </div>
              <span>Audited by {currentUser?.name || "Demurrage Analyst"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
