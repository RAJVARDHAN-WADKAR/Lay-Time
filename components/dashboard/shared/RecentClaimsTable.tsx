"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils/formatters";
import { Claim } from "@/lib/types";
import { Ship, ArrowRight } from "lucide-react";

interface RecentClaimsTableProps {
  claims: Claim[];
  title?: string;
  subtitle?: string;
  viewAllHref?: string;
  maxRows?: number;
}

export function RecentClaimsTable({
  claims,
  title = "Recent Claims",
  subtitle = "Latest registered maritime claims",
  viewAllHref = "/claims",
  maxRows = 5,
}: RecentClaimsTableProps) {
  const displayClaims = claims.slice(0, maxRows);

  return (
    <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl h-full flex flex-col justify-between">
      <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Ship className="h-4 w-4 text-blue-600" />
            <span>{title}</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            {subtitle}
          </CardDescription>
        </div>

        <Link href={viewAllHref}>
          <Button variant="ghost" size="sm" className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50">
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="p-5 flex-1">
        {displayClaims.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-2">Claim Name / Ship</th>
                  <th className="pb-2">Claim No.</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Days Open</th>
                  <th className="pb-2 text-right">Demurrage</th>
                  <th className="pb-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {displayClaims.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 font-bold text-slate-900">
                      <Link href={`/claims/${c.id}`} className="hover:text-blue-600">
                        <div>{c.claimName || c.shipName}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{c.shipName}</div>
                      </Link>
                    </td>
                    <td className="py-3 font-mono text-[11px] text-slate-600">{c.id}</td>
                    <td className="py-3">
                      <StatusBadge status={c.claimStatus} />
                    </td>
                    <td className="py-3 text-right font-medium text-slate-600">
                      {c.daysOpen || 0}d
                    </td>
                    <td className="py-3 text-right font-bold text-slate-900">
                      {formatCurrency(c.claimFiledAmount)}
                    </td>
                    <td className="py-3 text-center">
                      <Link href={`/claims/${c.id}`}>
                        <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] text-blue-600 hover:bg-blue-50">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8">
            <EmptyState
              icon={Ship}
              title="No recent claims"
              description="There are currently no claims registered in this scope."
              actionText="View Ledger"
              actionHref={viewAllHref}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
