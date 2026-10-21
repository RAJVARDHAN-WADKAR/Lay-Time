import React, { useState } from "react";
import { Claim, ClaimCalculation } from "@/lib/types";
import { formatCurrency, formatMinutesToDuration } from "@/lib/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/inputs";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/lib/context/AuthContext";
import { ShieldCheck, Edit3, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/lib/hooks/useToast";
import { Can } from "@/components/auth/Can";

interface ClaimCalculationsTabProps {
  calculationResult: ClaimCalculation;
  claim?: Claim;
  onUpdateClaim?: (updates: Partial<Claim>) => Promise<void>;
}

export function ClaimCalculationsTab({
  calculationResult,
  claim,
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
      </Card>

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
