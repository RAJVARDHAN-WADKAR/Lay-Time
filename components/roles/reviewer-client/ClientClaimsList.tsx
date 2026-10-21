"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/utils/formatters";
import { Claim } from "@/lib/types";
import { Ship, ArrowRight } from "lucide-react";

interface ClientClaimsListProps {
  claims: Claim[];
}

export function ClientClaimsList({ claims }: ClientClaimsListProps) {
  return (
    <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl">
      <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Ship className="h-4 w-4 text-emerald-600" />
            <span>My Voyage Claims</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Claims accessible under your organization account
          </CardDescription>
        </div>
        <Link href="/claims">
          <Button variant="ghost" size="sm" className="text-xs font-semibold text-emerald-600 hover:bg-emerald-50">
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-5">
        <div className="space-y-3">
          {claims.slice(0, 5).map((c) => (
            <div
              key={c.id}
              className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs hover:bg-slate-100/60 transition"
            >
              <div>
                <div className="font-bold text-slate-900">{c.shipName}</div>
                <div className="text-[10px] text-slate-400 font-mono">{c.id} • {c.voyageNumber || "VOY-01"}</div>
              </div>
              <div className="flex items-center space-x-3">
                <StatusBadge status={c.claimStatus} />
                <span className="font-extrabold text-slate-900">{formatCurrency(c.claimFiledAmount)}</span>
                <Link href={`/claims/${c.id}`}>
                  <Button size="sm" variant="outline" className="h-7 px-2.5 text-[11px] text-blue-600 hover:bg-blue-50">
                    Inspect
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
