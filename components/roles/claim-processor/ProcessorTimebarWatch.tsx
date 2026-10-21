"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Claim } from "@/lib/types";
import { Clock, AlertTriangle, ArrowRight } from "lucide-react";

interface ProcessorTimebarWatchProps {
  claims: Claim[];
}

export function ProcessorTimebarWatch({ claims }: ProcessorTimebarWatchProps) {
  const urgentClaims = claims.filter(
    (c) => c.claimStatus === "Timebarred" || Boolean(c.timebarred) || Boolean(c.claimTimebarDays && c.claimTimebarDays <= 14)
  );

  return (
    <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl">
      <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span>Time-Bar Deadline Watch</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Claims approaching contractual notice expiry
          </CardDescription>
        </div>
        <Link href="/timebar">
          <Button variant="ghost" size="sm" className="text-xs font-semibold text-amber-600 hover:bg-amber-50">
            <span>Monitor</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-5">
        {urgentClaims.length > 0 ? (
          <div className="space-y-2.5">
            {urgentClaims.slice(0, 3).map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-amber-950">{c.shipName}</div>
                  <div className="text-[10px] text-amber-700">{c.id} • {c.claimTimebarDays ? `${c.claimTimebarDays}d deadline` : "Timebar risk"}</div>
                </div>
                <Link href={`/claims/${c.id}`}>
                  <Button size="sm" className="h-7 px-2.5 text-[11px] bg-amber-600 hover:bg-amber-700 text-white font-bold">
                    File Notice
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-slate-400 text-xs">
            <p>All active claims are within contractual time-bar deadlines.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
