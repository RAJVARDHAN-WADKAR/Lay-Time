import React, { useState } from "react";
import { Claim, ClaimCalculation, LaytimeDayRule } from "@/lib/types";
import { formatCurrency, formatMinutesToDuration } from "@/lib/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/inputs";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/lib/context/AuthContext";
import { ShieldCheck, Edit3, Calendar, Clock } from "lucide-react";
import { useToast } from "@/lib/hooks/useToast";

interface ClaimCalculationsTabProps {
  calculationResult: ClaimCalculation;
  claim?: Claim;
  userCanEdit?: boolean;
  onUpdateClaim?: (updates: Partial<Claim>) => Promise<void>;
}

const DAY_RULES: Array<{ value: LaytimeDayRule; label: string }> = [
  { value: "SHINC", label: "SHINC (Sundays & Holidays Included)" },
  { value: "SHEX", label: "SHEX (Sundays & Holidays Excepted)" },
  { value: "SHEXUU", label: "SHEXUU (Sundays & Holidays Excepted Unless Used)" },
  { value: "FHINC", label: "FHINC (Fridays & Holidays Included)" },
  { value: "FHEX", label: "FHEX (Fridays & Holidays Excepted)" },
  { value: "FHEXUU", label: "FHEXUU (Fridays & Holidays Excepted Unless Used)" },
  { value: "SSHEX", label: "SSHEX (Sat, Sun & Holidays Excepted)" }
];

export function ClaimCalculationsTab({
  calculationResult,
  claim,
  userCanEdit = false,
  onUpdateClaim
}: ClaimCalculationsTabProps) {
  const { canOverrideCalculation, role } = useAuth();
  const { success, error } = useToast();
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideAmount, setOverrideAmount] = useState<number>(
    claim?.overriddenDemurrage ?? calculationResult.finalPayableAmount
  );
  const [overrideReason, setOverrideReason] = useState<string>(
    claim?.overrideReason ?? ""
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      error("Reason Required", "Please specify a commercial or operational justification for the calculation override.");
      return;
    }
    if (!onUpdateClaim || !claim) return;

    setIsSaving(true);
    try {
      await onUpdateClaim({
        isOverridden: true,
        overriddenDemurrage: Number(overrideAmount),
        overrideReason: overrideReason.trim()
      });
      success("Calculation Overridden", `Override applied with justification: ${overrideReason}`);
      setIsOverrideModalOpen(false);
    } catch (e: any) {
      error("Override Failed", e.message || "Failed to save calculation override");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetOverride = async () => {
    if (!onUpdateClaim || !claim) return;
    setIsSaving(true);
    try {
      await onUpdateClaim({
        isOverridden: false,
        overriddenDemurrage: undefined,
        overrideReason: undefined
      });
      success("Override Cleared", "Restored deterministic calculations.");
    } catch (e: any) {
      error("Reset Failed", e.message || "Failed to clear override");
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="space-y-6 text-xs">
      <Card className="border-blue-200 bg-blue-50/40 shadow-xs">
        <CardHeader className="p-5 pb-3 border-b border-blue-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-blue-950">Master Claim Laytime Summary</CardTitle>
            <CardDescription>Pure deterministic calculation engine results across all ports</CardDescription>
          </div>
          <div className="text-right space-y-1">
            <span className="text-xs text-slate-500 block">Final Payable Demurrage</span>
            {claim?.isOverridden ? (
              <div>
                <span className="text-2xl font-bold text-amber-700">
                  {formatCurrency(claim.overriddenDemurrage ?? calculationResult.finalPayableAmount)}
                </span>
                <span className="text-[10px] text-slate-400 line-through block">
                  Calculated: {formatCurrency(calculationResult.finalPayableAmount)}
                </span>
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                  Overridden by Supervisor
                </Badge>
                {claim.overrideReason && (
                  <p className="text-[10px] text-amber-800 italic max-w-xs mt-0.5">
                    Reason: {claim.overrideReason}
                  </p>
                )}
              </div>
            ) : (
              <span className="text-2xl font-bold text-blue-900">
                {formatCurrency(calculationResult.finalPayableAmount)}
              </span>
            )}

            {canOverrideCalculation && onUpdateClaim && (
              <div className="pt-2 flex justify-end space-x-1.5">
                <Button
                  size="sm"
                  onClick={() => setIsOverrideModalOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] h-7 px-2.5 rounded-lg"
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  {claim?.isOverridden ? "Edit Override" : "Override with Reason"}
                </Button>
                {claim?.isOverridden && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleResetOverride}
                    className="text-[11px] h-7 px-2 text-slate-600 hover:bg-slate-100"
                  >
                    Reset
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-slate-500 block">Total Gross Time</span>
            <span className="font-bold text-slate-900">
              {formatMinutesToDuration(calculationResult.totalGrossMinutes)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Total Deductions</span>
            <span className="font-bold text-rose-600">
              {formatMinutesToDuration(calculationResult.totalDeductionsMinutes)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Net Laytime Used</span>
            <span className="font-bold text-slate-900">
              {formatMinutesToDuration(calculationResult.totalNetLaytimeMinutes)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Allowed Laytime</span>
            <span className="font-bold text-slate-900">
              {formatMinutesToDuration(calculationResult.totalAllowedMinutes)}
            </span>
          </div>
        </CardContent>

        {/* Contractual Day Rule, Holidays & Once-on-Demurrage Banner + Selector */}
        <div className="px-5 pb-4 pt-2 border-t border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-blue-100 text-blue-900 border-blue-300 font-bold text-[11px]">
              Day rule: {calculationResult.dayRule || claim?.dayRule || "SHEX"}, holidays:{" "}
              {calculationResult.holidaysExcludedCount ?? 0} excluded
            </Badge>
            <Badge
              variant="outline"
              className={`text-[11px] font-semibold ${
                calculationResult.onceOnDemurrage !== false
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-slate-100 text-slate-700 border-slate-300"
              }`}
            >
              Once on Demurrage: {calculationResult.onceOnDemurrage !== false ? "ON" : "OFF"}
            </Badge>
            <Badge
              variant="outline"
              className={`text-[11px] font-semibold ${
                calculationResult.overlapBlocked
                  ? "bg-rose-100 text-rose-800 border-rose-300"
                  : "bg-white text-slate-700"
              }`}
            >
              Overlap policy: {calculationResult.overlapPolicy || claim?.overlapPolicy || "block"}
              {(calculationResult.overlapAffectedMinutes ?? 0) > 0
                ? ` (${calculationResult.overlapAffectedMinutes}m affected)`
                : ""}
            </Badge>
          </div>

          {userCanEdit && onUpdateClaim && claim && (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label="Laytime Day Rule"
                value={claim.dayRule || calculationResult.dayRule || "SHEX"}
                onChange={async (e) => {
                  const nextRule = e.target.value as LaytimeDayRule;
                  try {
                    await onUpdateClaim({ dayRule: nextRule });
                    success("Day Rule Updated", `Recalculated laytime under ${nextRule}.`);
                  } catch (err: any) {
                    error("Update Failed", err?.message || "Could not update day rule.");
                  }
                }}
                className="h-8 text-xs bg-white w-64"
              >
                {DAY_RULES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>

              <Select
                aria-label="Overlap Resolution Policy"
                value={claim.overlapPolicy || calculationResult.overlapPolicy || "block"}
                onChange={async (e) => {
                  const nextPolicy = e.target.value as "block" | "exception_wins";
                  try {
                    await onUpdateClaim({ overlapPolicy: nextPolicy });
                    success("Overlap Policy Updated", `Recalculated laytime under "${nextPolicy}".`);
                  } catch (err: any) {
                    error("Update Failed", err?.message || "Could not update overlap policy.");
                  }
                }}
                className="h-8 text-xs bg-white w-48"
              >
                <option value="block">Overlap: Block on Conflict</option>
                <option value="exception_wins">Overlap: Exception Wins</option>
              </Select>

              <label className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={claim.onceOnDemurrage !== false}
                  onChange={async (e) => {
                    try {
                      await onUpdateClaim({ onceOnDemurrage: e.target.checked });
                      success(
                        "Demurrage Rule Updated",
                        `Once on demurrage, always on demurrage: ${e.target.checked ? "ON" : "OFF"}.`
                      );
                    } catch (err: any) {
                      error("Update Failed", err?.message || "Could not update switch.");
                    }
                  }}
                />
                <span>Once on Demurrage</span>
              </label>
            </div>
          )}
        </div>
      </Card>

      {/* Per-Day Port-Local Laytime Breakdown Table */}
      {calculationResult.dailyBreakdown && calculationResult.dailyBreakdown.length > 0 && (
        <Card className="border-slate-200 shadow-xs overflow-hidden">
          <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span>Per-Day Laytime Breakdown ({calculationResult.dayRule || "SHEX"})</span>
              </CardTitle>
              <CardDescription className="text-[11px]">
                Port-local calendar days with counted minutes, weekend/holiday exclusions, and demurrage accrual
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Weekday</th>
                  <th className="p-2.5">Time Zone</th>
                  <th className="p-2.5">Counted</th>
                  <th className="p-2.5">Excluded</th>
                  <th className="p-2.5">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calculationResult.dailyBreakdown.map((day) => (
                  <tr
                    key={day.date}
                    className={day.excludedMinutes > 0 && day.countedMinutes === 0 ? "bg-amber-50/50" : "hover:bg-slate-50"}
                  >
                    <td className="p-2.5 font-mono font-semibold text-slate-900">{day.date}</td>
                    <td className="p-2.5 font-medium text-slate-700">{day.weekday}</td>
                    <td className="p-2.5 font-mono text-[10px] text-slate-500">{day.timezone}</td>
                    <td className="p-2.5 font-bold text-emerald-700">
                      {day.countedMinutes}m ({formatMinutesToDuration(day.countedMinutes)})
                    </td>
                    <td className="p-2.5 font-bold text-rose-600">
                      {day.excludedMinutes}m ({formatMinutesToDuration(day.excludedMinutes)})
                    </td>
                    <td className="p-2.5 text-slate-600">{day.reasons.join("; ") || "Counted"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Port & Berth Calculation Hierarchy</h4>
        {calculationResult.portCalculations.map((pCalc) => (
          <Card key={pCalc.portId} className="border-slate-200 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
              <span className="font-bold text-sm text-slate-900">{pCalc.portName} ({pCalc.portType})</span>
              <span className="font-bold text-blue-700">{formatCurrency(pCalc.totalDemurrageAmount)}</span>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {pCalc.berthCalculations.map((bCalc) => (
                <div key={bCalc.berthId} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>{bCalc.berthName}</span>
                    <span className="text-blue-600">{formatCurrency(bCalc.demurrageAmount)}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600">
                    <div>Allowed: {bCalc.allowedLaytimeFormatted}</div>
                    <div>Gross: {bCalc.grossElapsedFormatted}</div>
                    <div>Deductions: {bCalc.deductionFormatted}</div>
                    <div>Net Used: {bCalc.netLaytimeUsedFormatted}</div>
                  </div>
                  {bCalc.deductionsByCategory.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Deduction Logs:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {bCalc.deductionsByCategory.map((d) => (
                          <span key={d.category} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px]">
                            {d.category}: {d.durationFormatted} ({d.percentageDeducted}%)
                          </span>
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

      {/* Override Calculation Modal (Supervisor with Reason) */}
      <Modal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        title="Supervisor Calculation Override"
        maxWidth="md"
      >
        <form onSubmit={handleApplyOverride} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
            <p className="font-bold flex items-center mb-1">
              <ShieldCheck className="h-3.5 w-3.5 mr-1 text-amber-600" />
              Supervisor Authority Gating
            </p>
            Under company governance rules, manual calculation overrides require a formal operational or commercial justification for audit compliance.
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Overridden Demurrage Payable ($)</label>
            <Input
              type="number"
              value={overrideAmount}
              onChange={(e) => setOverrideAmount(Number(e.target.value))}
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Justification Reason * (Mandatory)</label>
            <textarea
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-amber-500"
              rows={3}
              placeholder="e.g. Commercial compromise per charterers email dated 12-Oct; 50% waiver on rain delay approved by Owner."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOverrideModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSaving}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Apply Override
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
