"use client";

import React from "react";
import { Claim } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Layers, ArrowRight } from "lucide-react";
import Link from "next/link";

interface TrackerPipelineProps {
  claims: Claim[];
  selectedStage?: string;
  onSelectStage?: (stage: string) => void;
}

export const TRACKER_STAGES = [
  { key: "3. Pending Info from Owners", label: "Pending Info", color: "bg-amber-500", border: "border-amber-300", bgLight: "bg-amber-50 text-amber-900" },
  { key: "4. Calculation Sent to Owners", label: "Sent to Owners", color: "bg-indigo-500", border: "border-indigo-300", bgLight: "bg-indigo-50 text-indigo-900" },
  { key: "5. Claim Filed", label: "Claim Filed", color: "bg-blue-600", border: "border-blue-300", bgLight: "bg-blue-50 text-blue-900" },
  { key: "6. Waiting Charterers Response", label: "Waiting Response", color: "bg-purple-600", border: "border-purple-300", bgLight: "bg-purple-50 text-purple-900" },
  { key: "7. Agreed", label: "Agreed", color: "bg-emerald-600", border: "border-emerald-300", bgLight: "bg-emerald-50 text-emerald-900" },
  { key: "8. Disputed", label: "Disputed", color: "bg-rose-600", border: "border-rose-300", bgLight: "bg-rose-50 text-rose-900" },
  { key: "9. Legal", label: "Legal Escalation", color: "bg-red-700", border: "border-red-300", bgLight: "bg-red-50 text-red-900" },
  { key: "2. Nil Demurrage (No Claim)", label: "Nil Demurrage", color: "bg-slate-400", border: "border-slate-300", bgLight: "bg-slate-100 text-slate-800" },
  { key: "10. Claim Closed", label: "Claim Closed", color: "bg-zinc-600", border: "border-zinc-300", bgLight: "bg-zinc-100 text-zinc-800" },
  { key: "11. Commercial Write Off", label: "Write Off", color: "bg-neutral-400", border: "border-neutral-300", bgLight: "bg-neutral-100 text-neutral-600" }
];

export function TrackerPipeline({ claims, selectedStage, onSelectStage }: TrackerPipelineProps) {
  // Aggregate counts and amounts per stage
  const stageStats = TRACKER_STAGES.map((st) => {
    const matching = claims.filter((c) => c.claimStatus === st.key);
    const count = matching.length;
    const totalAmount = matching.reduce((sum, c) => sum + (c.claimFiledAmount || 0), 0);
    const agreedAmount = matching.reduce((sum, c) => sum + (c.agreedAmount || 0), 0);
    return {
      ...st,
      count,
      totalAmount,
      agreedAmount
    };
  });

  return (
    <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
      <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Layers className="h-4 w-4 text-blue-600" />
            <span>Maritime Claim Lifecycle Pipeline (Tracker Stages)</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Operational status progression across all active voyages and settlements
          </CardDescription>
        </div>
        <Link href="/claims">
          <span className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center space-x-1 cursor-pointer">
            <span>View Full Ledger</span>
            <ArrowRight className="h-3 w-3" />
          </span>
        </Link>
      </CardHeader>

      <CardContent className="p-5">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {stageStats.map((st) => {
            const isSelected = selectedStage === st.key;
            return (
              <div
                key={st.key}
                onClick={() => onSelectStage && onSelectStage(isSelected ? "" : st.key)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "ring-2 ring-blue-500 shadow-sm border-blue-500 bg-blue-50/40"
                    : "border-slate-200 hover:border-slate-300 hover:shadow-xs bg-slate-50/50"
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-1.5">
                  <span className={`h-2 w-2 rounded-full ${st.color}`} />
                  <span className="text-[11px] font-bold text-slate-800 truncate" title={st.label}>
                    {st.label}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-black text-slate-900">{st.count}</span>
                  <span className="text-[10px] font-bold text-slate-500">claims</span>
                </div>
                <div className="text-[10px] font-semibold text-slate-600 truncate mt-1">
                  {formatCurrency(st.key === "7. Agreed" ? st.agreedAmount : st.totalAmount)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
