"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/utils/formatters";
import { Claim } from "@/lib/types";
import { CheckCircle2, Clock, ArrowRight } from "lucide-react";

interface SupervisorApprovalQueueProps {
  claims: Claim[];
}

export function SupervisorApprovalQueue({ claims }: SupervisorApprovalQueueProps) {
  const pendingApprovals = claims.filter(
    (c) => c.claimStatus === "Review" || c.claimStatus === "Incomplete"
  );

  return (
    <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl">
      <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Clock className="h-4 w-4 text-purple-600" />
            <span>Supervisor Approval Queue</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Claims requiring supervisory review and settlement confirmation
          </CardDescription>
        </div>
        <Link href="/claims">
          <Button variant="ghost" size="sm" className="text-xs font-semibold text-purple-600 hover:bg-purple-50">
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-5">
        {pendingApprovals.length > 0 ? (
          <div className="space-y-3">
            {pendingApprovals.slice(0, 4).map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">{c.shipName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{c.id}</div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="font-extrabold text-slate-900">{formatCurrency(c.claimFiledAmount)}</span>
                  <Link href={`/claims/${c.id}`}>
                    <Button size="sm" variant="outline" className="h-7 px-2.5 text-[11px] text-purple-700 hover:bg-purple-50 border-purple-200">
                      Review
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 text-xs">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
            <p>No claims currently awaiting approval in your queue.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
