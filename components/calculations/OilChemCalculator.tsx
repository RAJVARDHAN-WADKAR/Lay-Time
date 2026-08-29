"use client";

import React, { useState } from "react";
import { calculateOilChemPumping } from "@/lib/calculations/oilChem";
import { OilChemCalculation } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/formatters";
import {
  Droplets,
  Calculator,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info
} from "lucide-react";

export function OilChemCalculator() {
  const [form, setForm] = useState({
    cargoName: "Arabian Heavy Crude Oil",
    cargoType: "Crude Oil" as const,
    quantityMetricTons: 65000,
    density15C: 0.892,
    temperatureC: 32.5,
    pumpingWarrantyRateM3H: 3000,
    pumpingWarrantyPressureBar: 7.0,
    cowAllowedHours: 2.0,
    manifoldConnectionHours: 1.5,
    actualPumpingHours: 29.5,
    hourlyRate: 1400,
    notes: "Charterparty Clause 19 Pumping Warranty - 3,000 M3/Hr against 7.0 bar backpressure."
  });

  const [result, setResult] = useState<OilChemCalculation>(() => calculateOilChemPumping(form));
  const [saved, setSaved] = useState(false);

  const handleCompute = (e: React.FormEvent) => {
    e.preventDefault();
    const res = calculateOilChemPumping(form);
    setResult(res);
  };

  const handleSaveToDb = async () => {
    try {
      await fetch("/api/oil-chem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert("Failed to save oil/chem calculation");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl">
            <Droplets className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Oil & Chemical Cargo Pumping Warranty Calculator</h2>
            <p className="text-xs text-slate-500">
              Liquid cargo laytime rules, ASTM Table 54B temperature/VCF correction, COW allowances & backpressure evaluation
            </p>
          </div>
        </div>

        <Button
          onClick={handleSaveToDb}
          className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold h-9 px-4 rounded-lg flex items-center space-x-1.5 shadow-xs"
        >
          <Save className="h-4 w-4" />
          <span>Save Pumping Audit</span>
        </Button>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Oil/Chemical Pumping Warranty record saved to database.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Inputs */}
        <Card className="p-5 lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b pb-2">
            Cargo & Terminal Pumping Parameters
          </h3>

          <form onSubmit={handleCompute} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cargo Grade Name</label>
                <input
                  type="text"
                  value={form.cargoName}
                  onChange={(e) => setForm({ ...form, cargoName: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cargo Classification</label>
                <select
                  value={form.cargoType}
                  onChange={(e) => setForm({ ...form, cargoType: e.target.value as any })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="Crude Oil">Crude Oil</option>
                  <option value="Fuel Oil">Fuel Oil</option>
                  <option value="Clean Petroleum Product">Clean Petroleum Product</option>
                  <option value="Chemical Grade A">Chemical Grade A</option>
                  <option value="Chemical Grade B">Chemical Grade B</option>
                  <option value="Vegetable Oil">Vegetable Oil</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bill of Lading Tonnage (MT)</label>
                <input
                  type="number"
                  value={form.quantityMetricTons}
                  onChange={(e) => setForm({ ...form, quantityMetricTons: Number(e.target.value) })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observed Density @ 15°C (g/cm³)</label>
                <input
                  type="number"
                  step="0.001"
                  value={form.density15C}
                  onChange={(e) => setForm({ ...form, density15C: Number(e.target.value) })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cargo Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.temperatureC}
                  onChange={(e) => setForm({ ...form, temperatureC: Number(e.target.value) })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Guaranteed Pumping Rate (M³/Hr)</label>
                <input
                  type="number"
                  value={form.pumpingWarrantyRateM3H}
                  onChange={(e) => setForm({ ...form, pumpingWarrantyRateM3H: Number(e.target.value) })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">COW (Crude Oil Wash) Allowance (Hrs)</label>
                <input
                  type="number"
                  step="0.5"
                  value={form.cowAllowedHours}
                  onChange={(e) => setForm({ ...form, cowAllowedHours: Number(e.target.value) })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Manifold Connection Allowance (Hrs)</label>
                <input
                  type="number"
                  step="0.5"
                  value={form.manifoldConnectionHours}
                  onChange={(e) => setForm({ ...form, manifoldConnectionHours: Number(e.target.value) })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Actual Discharging Time (Hrs)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.actualPumpingHours}
                  onChange={(e) => setForm({ ...form, actualPumpingHours: Number(e.target.value) })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Demurrage Hourly Rate ($ USD/Hr)</label>
                <input
                  type="number"
                  value={form.hourlyRate}
                  onChange={(e) => setForm({ ...form, hourlyRate: Number(e.target.value) })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <Button type="submit" size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-4">
                Recalculate Pumping Warranty
              </Button>
            </div>
          </form>
        </Card>

        {/* Results Card */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4 border-t-4 border-t-cyan-500">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b pb-2">
              Pumping Warranty Audit Result
            </h3>

            <div className="bg-cyan-50/70 p-4 rounded-xl text-center space-y-1">
              <span className="text-xs text-cyan-800 font-semibold">Excess Pumping Demurrage</span>
              <div className="text-2xl font-black text-cyan-900">
                {formatCurrency(result.excessPumpingDemurrage)}
              </div>
              <span className="text-[11px] text-cyan-700 font-bold">
                {result.excessPumpingHours} Hours Excess Discharging Time
              </span>
            </div>

            <div className="space-y-2 text-xs pt-1">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">ASTM 54B VCF Factor:</span>
                <span className="font-mono font-bold text-slate-800">{result.vcfFactor}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Corrected Volume (M³):</span>
                <span className="font-bold text-slate-800">
                  {Math.round(result.correctedQuantity / result.density15C).toLocaleString()} M³
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Allowed Pumping Time:</span>
                <span className="font-bold text-slate-800">{result.allowedPumpingHours} Hours</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Actual Pumping Time:</span>
                <span className="font-bold text-slate-800">{result.actualPumpingHours} Hours</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">COW & Manifold Allowance:</span>
                <span className="font-semibold text-emerald-700">
                  +{(result.cowAllowedHours + result.manifoldConnectionHours)} Hours
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
