"use client";

import React from "react";
import { KPICard } from "@/components/ui/kpi-card";
import { formatCurrency } from "@/lib/utils/formatters";
import { DashboardMetrics, Claim } from "@/lib/types";
import { DollarSign, CheckCircle2, TrendingUp, AlertCircle } from "lucide-react";

interface KPIGridProps {
  metrics: DashboardMetrics;
  claims: Claim[];
}

export function KPIGrid({ metrics, claims }: KPIGridProps) {
  const disputedCount = claims.filter((c) => c.claimStatus === "Disputed").length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Demurrage Owed */}
      <KPICard
        title="Demurrage Owed"
        value={formatCurrency(metrics.totalDemurrageOwed)}
        subtitle={`${metrics.openClaimsCount} Claims`}
        icon={DollarSign}
        variant="blue"
        trend={metrics.totalClaimsCount > 0 ? "Active Exposure" : undefined}
      />

      {/* Card 2: Demurrage Received */}
      <KPICard
        title="Demurrage Received"
        value={formatCurrency(metrics.totalDemurrageReceived)}
        subtitle={`${metrics.settledClaimsCount} Claims`}
        icon={CheckCircle2}
        variant="green"
        trend={metrics.settledClaimsCount > 0 ? "Collected" : undefined}
      />

      {/* Card 3: Exposure */}
      <KPICard
        title="Exposure"
        value={formatCurrency(metrics.totalExposure)}
        subtitle={`${metrics.openClaimsCount} Claims`}
        icon={TrendingUp}
        variant="amber"
        trend={metrics.totalExposure > 0 ? "Unsettled Balance" : undefined}
      />

      {/* Card 4: Under Contention */}
      <KPICard
        title="Under Contention"
        value={formatCurrency(metrics.amountUnderContention)}
        subtitle={`${disputedCount} Claims`}
        icon={AlertCircle}
        variant="rose"
        trend={metrics.amountUnderContention > 0 ? "Disputed" : undefined}
      />
    </div>
  );
}
