"use client";

import React from "react";
import { Claim } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Briefcase, Ship, DollarSign } from "lucide-react";

interface AccountPortfolioCardsProps {
  claims: Claim[];
  onSelectAccount?: (account: string) => void;
  selectedAccount?: string;
}

export function AccountPortfolioCards({ claims, onSelectAccount, selectedAccount }: AccountPortfolioCardsProps) {
  const accounts = [
    { name: "Sokana3", color: "blue", tag: "Major Fleet" },
    { name: "Eastport USA LLC", color: "purple", tag: "US Maritime" },
    { name: "Peregrine Tankers", color: "emerald", tag: "Clean Tankers" },
    { name: "Norstar", color: "amber", tag: "Chemical / Crude" }
  ];

  const accountStats = accounts.map((acc) => {
    const matching = claims.filter((c) => c.accountName === acc.name);
    const count = matching.length;
    const totalFiled = matching.reduce((sum, c) => sum + (c.claimFiledAmount || 0), 0);
    const totalBillable = matching.reduce((sum, c) => sum + (c.billableAmount || 0), 0);
    const agreedCount = matching.filter((c) => c.claimStatus === "7. Agreed" || c.claimStatus === "Settled").length;
    return {
      ...acc,
      count,
      totalFiled,
      totalBillable,
      agreedCount
    };
  });

  return (
    <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl">
      <CardHeader className="p-5 pb-3 border-b border-slate-100">
        <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <Briefcase className="h-4 w-4 text-purple-600" />
          <span>Client Portfolios & Account Exposure</span>
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Demurrage volumes and operational activity partitioned by corporate client account
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {accountStats.map((acc) => {
            const isSelected = selectedAccount === acc.name;
            return (
              <div
                key={acc.name}
                onClick={() => onSelectAccount && onSelectAccount(isSelected ? "" : acc.name)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "ring-2 ring-purple-600 shadow-sm border-purple-600 bg-purple-50/50"
                    : "border-slate-200 hover:border-slate-300 hover:shadow-xs bg-slate-50/60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-slate-900 truncate" title={acc.name}>
                      {acc.name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                      {acc.tag}
                    </span>
                  </div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-xl font-black text-slate-900">{acc.count}</span>
                    <span className="text-[11px] font-semibold text-slate-500">claims</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-1 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-[11px]">Demurrage:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(acc.totalFiled)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span className="text-[11px]">Agreed/Settled:</span>
                    <span className="font-semibold text-emerald-600">{acc.agreedCount} files</span>
                  </div>
                  {acc.totalBillable > 0 && (
                    <div className="flex justify-between items-center text-purple-700">
                      <span className="text-[10px] font-semibold">Billable Fees:</span>
                      <span className="font-bold text-[11px]">{formatCurrency(acc.totalBillable)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
