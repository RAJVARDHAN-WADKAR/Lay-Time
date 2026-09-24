"use client";

import React, { useState, useEffect } from "react";
import { Claim, OwnerComparison } from "@/lib/types";
import { getOwnerComparison, saveOwnerComparison } from "@/lib/api/claims";
import { formatCurrency } from "@/lib/utils/formatters";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scale, Save, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";

interface ClaimOwnerComparisonTabProps {
  claim: Claim;
  canEdit: boolean;
}

export function ClaimOwnerComparisonTab({ claim, canEdit }: ClaimOwnerComparisonTabProps) {
  const [comparison, setComparison] = useState<OwnerComparison>({
    claimId: claim.id,
    ownerDemurrageAmount: Math.round(claim.claimFiledAmount * 1.1),
    ownerLaytimeHours: 74.0,
    internalDemurrageAmount: claim.claimFiledAmount,
    internalLaytimeHours: 64.0,
    differenceAmount: Math.round(claim.claimFiledAmount * 0.1),
    differenceHours: 10.0,
    explanation: "Owner statement omits 10 hours of shore crane breakdown stoppage deducted under BPVOY4 Clause 18."
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    getOwnerComparison(claim.id).then((comp) => {
      if (comp) setComparison(comp);
    });
  }, [claim.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const diffAmt = (comparison.ownerDemurrageAmount || 0) - (comparison.internalDemurrageAmount || 0);
      const diffHrs = (comparison.ownerLaytimeHours || 0) - (comparison.internalLaytimeHours || 0);

      const saved = await saveOwnerComparison(claim.id, {
        ...comparison,
        differenceAmount: diffAmt,
        differenceHours: Math.round(diffHrs * 10) / 10
      });
      setComparison(saved);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      alert("Failed to save owner comparison");
    } finally {
      setIsSaving(false);
    }
  };

  const diffAmount = (comparison.ownerDemurrageAmount || 0) - (comparison.internalDemurrageAmount || 0);
  const diffHours = (comparison.ownerLaytimeHours || 0) - (comparison.internalLaytimeHours || 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Owner vs Internal Calculation Comparison</h3>
            <p className="text-xs text-slate-500">
              Reconcile discrepancies between Owner&apos;s claim submission and Internal verified laytime calculation
            </p>
          </div>
        </div>

        {canEdit && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 px-4 rounded-lg flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? "Saving..." : "Save Comparison"}</span>
          </Button>
        )}
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Owner vs Internal comparison saved to database successfully.</span>
        </div>
      )}

      {/* Side by Side Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Owner Submission Card */}
        <Card className="p-5 border-t-4 border-t-amber-500 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Owner Calculation</span>
            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">As Filed</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Owner Demurrage Amount ($ USD)</label>
              <input
                type="number"
                disabled={!canEdit}
                value={comparison.ownerDemurrageAmount}
                onChange={(e) => setComparison({ ...comparison, ownerDemurrageAmount: Number(e.target.value) })}
                className="w-full text-sm font-bold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Owner Laytime Used (Hours)</label>
              <input
                type="number"
                step="0.5"
                disabled={!canEdit}
                value={comparison.ownerLaytimeHours}
                onChange={(e) => setComparison({ ...comparison, ownerLaytimeHours: Number(e.target.value) })}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
          </div>
        </Card>

        {/* Internal Verified Calculation Card */}
        <Card className="p-5 border-t-4 border-t-blue-600 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Internal Calculation</span>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">System Verified</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Internal Demurrage Amount ($ USD)</label>
              <input
                type="number"
                disabled={!canEdit}
                value={comparison.internalDemurrageAmount}
                onChange={(e) => setComparison({ ...comparison, internalDemurrageAmount: Number(e.target.value) })}
                className="w-full text-sm font-bold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Internal Laytime Used (Hours)</label>
              <input
                type="number"
                step="0.5"
                disabled={!canEdit}
                value={comparison.internalLaytimeHours}
                onChange={(e) => setComparison({ ...comparison, internalLaytimeHours: Number(e.target.value) })}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
          </div>
        </Card>

        {/* Variance / Discrepancy Card */}
        <Card className={`p-5 border-t-4 ${diffAmount !== 0 ? "border-t-rose-500 bg-rose-50/20" : "border-t-emerald-500 bg-emerald-50/20"} space-y-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Net Variance</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${diffAmount !== 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
              {diffAmount !== 0 ? "Contention" : "Reconciled"}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Financial Discrepancy:</span>
              <span className={`text-lg font-extrabold ${diffAmount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {diffAmount > 0 ? `+${formatCurrency(diffAmount)}` : formatCurrency(diffAmount)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Owner overclaim against internal audit</span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Time Discrepancy:</span>
              <span className="text-sm font-bold text-slate-800">
                {diffHours > 0 ? `+${diffHours} Hours` : `${diffHours} Hours`}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Explanation Textarea */}
      <Card className="p-5 space-y-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Variance Justification & Legal Clause Explanation
        </h4>
        <textarea
          rows={4}
          disabled={!canEdit}
          value={comparison.explanation}
          onChange={(e) => setComparison({ ...comparison, explanation: e.target.value })}
          placeholder="Document the exact Charterparty clauses, rain logs, or shore breakdown deductions accounting for the difference..."
          className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed focus:outline-hidden focus:border-blue-500"
        />
      </Card>
    </div>
  );
}
