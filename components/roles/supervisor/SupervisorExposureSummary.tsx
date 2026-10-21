"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/formatters";
import { Claim, RacCase } from "@/lib/types";
import { DollarSign, TrendingUp, AlertTriangle } from "lucide-react";

interface SupervisorExposureSummaryProps {
  claims: Claim[];
  racCases: RacCase[];
}

export function SupervisorExposureSummary({ claims, racCases }: SupervisorExposureSummaryProps) {
  const demurrageExposure = claims.reduce((sum, c) => sum + (c.claimFiledAmount || 0), 0);
  const racExposure = racCases.reduce((sum, c) => sum + (c.outstandingAmount || 0), 0);
  const totalExposure = demurrageExposure + racExposure;

  return (
    <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl">
      <CardHeader className="p-5 pb-3 border-b border-slate-100">
        <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          <span>Maritime Portfolio Exposure Analysis</span>
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Consolidated breakdown of demurrage and ancillary recoverable claims
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Demurrage Exposure</span>
            <div className="text-lg font-black text-blue-900 mt-1">{formatCurrency(demurrageExposure)}</div>
            <span className="text-[10px] text-blue-700">{claims.length} Voyage Files</span>
          </div>
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">RAC Ancillary Costs</span>
            <div className="text-lg font-black text-indigo-900 mt-1">{formatCurrency(racExposure)}</div>
            <span className="text-[10px] text-indigo-700">{racCases.length} Active Cases</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900 text-white border border-slate-800">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Combined Total Exposure</span>
            <div className="text-lg font-black text-white mt-1">{formatCurrency(totalExposure)}</div>
            <span className="text-[10px] text-slate-400">Total Capital at Risk</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
