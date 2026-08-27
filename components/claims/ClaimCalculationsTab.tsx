import React from "react";
import { ClaimCalculation } from "@/lib/types";
import { formatCurrency, formatMinutesToDuration } from "@/lib/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function ClaimCalculationsTab({ calculationResult }: { calculationResult: ClaimCalculation }) {
  return (
    <div className="space-y-6 text-xs">
      <Card className="border-blue-200 bg-blue-50/40 shadow-xs">
        <CardHeader className="p-5 pb-3 border-b border-blue-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-blue-950">Master Claim Laytime Summary</CardTitle>
            <CardDescription>Pure deterministic calculation engine results across all ports</CardDescription>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 block">Final Payable Demurrage</span>
            <span className="text-2xl font-bold text-blue-900">
              {formatCurrency(calculationResult.finalPayableAmount)}
            </span>
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
    </div>
  );
}
