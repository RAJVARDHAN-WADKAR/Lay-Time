const fs = require('fs');
const path = require('path');

const settingsCode = `"use client";

import React, { useState, useEffect } from "react";
import { getSettings, updateSettings, resetSettings, clearAllClaims, clearAllDocuments, loadDemoSeedClaims } from "@/lib/api";
import { CalculationAssumptions } from "@/lib/types";
import { DEFAULT_ASSUMPTIONS } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/inputs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/lib/hooks/useToast";
import {
  Settings as SettingsIcon,
  Save,
  RotateCcw,
  Sliders,
  ShieldCheck,
  Info,
  Layers,
  Database,
  Trash2,
  DownloadCloud,
  Sparkles,
} from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<CalculationAssumptions>(DEFAULT_ASSUMPTIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isDataActionRunning, setIsDataActionRunning] = useState(false);

  const { success, info } = useToast();

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const data = await getSettings();
      setSettings(data);
      setIsLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    await updateSettings(settings);
    setIsSaved(true);
    success("Settings Saved", "Maritime calculation assumptions updated");
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleReset = async () => {
    const reset = await resetSettings();
    setSettings(reset);
    setIsSaved(true);
    info("Reset Complete", "Assumptions restored to factory defaults");
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleClearAllData = async () => {
    setIsDataActionRunning(true);
    await Promise.all([clearAllClaims(), clearAllDocuments()]);
    setIsDataActionRunning(false);
    success("Data Cleared", "All claims and document queues have been emptied");
  };

  const handleLoadDemoSeed = async () => {
    setIsDataActionRunning(true);
    await loadDemoSeedClaims();
    setIsDataActionRunning(false);
    success("Demo Data Loaded", "12 sample voyage claims and Statement of Facts restored");
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings & Laytime Rules</h1>
          <p className="text-xs text-slate-500 mt-1">
            Global maritime calculation rules, OCR confidence thresholds, and dataset controls.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="text-xs">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset Defaults
          </Button>
          <Button onClick={handleSave} className="flex items-center space-x-1.5 text-xs bg-blue-600 hover:bg-blue-700">
            <Save className="h-3.5 w-3.5" />
            <span>{isSaved ? "Saved!" : "Save Assumptions"}</span>
          </Button>
        </div>
      </div>

      {/* Dataset State Controls */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">Application Dataset Controls</CardTitle>
            <CardDescription>Manage active in-memory voyage records and mock data</CardDescription>
          </div>
          <Badge variant="outline">Mock State</Badge>
        </CardHeader>
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div>
            <h4 className="font-bold text-slate-800">Clear or Populate Dataset</h4>
            <p className="text-slate-500 text-[11px] mt-0.5 max-w-md">
              Start completely clean with zero records, or reload the pre-configured 12-claim sample dataset.
            </p>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAllData}
              isLoading={isDataActionRunning}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              <span>Clear All Claims</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadDemoSeed}
              isLoading={isDataActionRunning}
              className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <DownloadCloud className="h-3.5 w-3.5 mr-1" />
              <span>Load 12 Sample Claims</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Demo Architecture Notice Banner */}
      <Card className="border-blue-200 bg-blue-50/50 shadow-xs">
        <CardContent className="p-5 flex items-start space-x-3 text-xs text-blue-900">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="space-y-1.5 leading-relaxed">
            <h4 className="font-bold text-sm text-blue-950">Frontend Mock Sandbox Environment</h4>
            <p>
              This entire application is running purely client-side with typed mock data. There is no external database, OCR server, or auth backend connected.
            </p>
            <p className="text-blue-800 text-[11px]">
              All data interactions are routed through <code>@/lib/api/*</code>. In a production build, these async mock functions are replaced with real backend API endpoints.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Engine Business Rules */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sliders className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-bold text-slate-900">
              Laytime Calculation Engine Assumptions
            </CardTitle>
          </div>
          <Badge variant="purple">Pure Logic Engine</Badge>
        </CardHeader>
        <CardContent className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Demurrage Laytime Rule Principle
              </label>
              <Select
                value={settings.laytimeRule}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    laytimeRule: e.target.value as any,
                  })
                }
              >
                <option value="OOD_AOD">Once on Demurrage Always on Demurrage (OOD-AOD)</option>
                <option value="REVERSIBLE">Reversible Laytime (Load & Discharge Combined)</option>
                <option value="NON_REVERSIBLE">Non-Reversible Laytime (Separate Calculations)</option>
              </Select>
              <p className="text-[10px] text-slate-400 mt-1">
                Governs whether deductions like rain continue once vessel enters demurrage.
              </p>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Weekend / Holiday Standard Clause
              </label>
              <Select
                value={settings.weekendRule}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    weekendRule: e.target.value as any,
                  })
                }
              >
                <option value="SHEX">SHEX (Sundays and Holidays Excluded)</option>
                <option value="SHINC">SHINC (Sundays and Holidays Included)</option>
                <option value="FHEX">FHEX (Fridays and Holidays Excluded)</option>
                <option value="FHINC">FHINC (Fridays and Holidays Included)</option>
              </Select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Notice of Readiness (NOR) Grace Allowance (Hours)
              </label>
              <Input
                type="number"
                value={settings.noticeGracePeriodHours}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    noticeGracePeriodHours: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Hours granted before laytime begins counting post-NOR acceptance (default: 6h).
              </p>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                OCR Confidence Discrepancy Threshold
              </label>
              <Input
                type="number"
                step="0.05"
                min="0.1"
                max="1.0"
                value={settings.ocrConfidenceThreshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    ocrConfidenceThreshold: parseFloat(e.target.value) || 0.8,
                  })
                }
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Values below this threshold will be flagged as low-confidence OCR discrepancies.
              </p>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Base Currency</label>
              <Select
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              >
                <option value="USD">USD ($) — United States Dollar</option>
                <option value="EUR">EUR (€) — Euro</option>
                <option value="GBP">GBP (£) — British Pound</option>
                <option value="SGD">SGD (S$) — Singapore Dollar</option>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <label className="flex items-center space-x-2 font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.applyWeatherWorkingDay24CH}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      applyWeatherWorkingDay24CH: e.target.checked,
                    })
                  }
                  className="rounded text-blue-600"
                />
                <span>Apply Weather Working Days 24 Consecutive Hours (WWD 24 CH)</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
`;

fs.writeFileSync(path.join(process.cwd(), 'app/settings/page.tsx'), settingsCode, 'utf8');
console.log('Updated app/settings/page.tsx with dataset controls');
