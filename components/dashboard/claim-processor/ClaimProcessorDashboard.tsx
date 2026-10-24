"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getClaims, getNotifications, getDocuments } from "@/lib/api";
import { Claim, NotificationRecord, DocumentRecord } from "@/lib/types";
import { calculateDashboardMetrics } from "@/lib/mock/aggregate";
import { formatCurrency } from "@/lib/utils/formatters";
import { KPICard } from "@/components/ui/kpi-card";
import { TrackerPipeline } from "@/components/dashboard/shared/TrackerPipeline";
import { ClaimOverviewChart } from "@/components/dashboard/shared/ClaimOverviewChart";
import { RecentClaimsTable } from "@/components/dashboard/shared/RecentClaimsTable";
import { OperationalTasks } from "@/components/dashboard/shared/OperationalTasks";
import { ProcessorWorkbench } from "@/components/roles/claim-processor/ProcessorWorkbench";
import { ProcessorTimebarWatch } from "@/components/roles/claim-processor/ProcessorTimebarWatch";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/context/AuthContext";
import {
  PlusCircle,
  Calculator,
  ScanText,
  Clock,
  FileCheck,
  Ship,
  TrendingUp,
  RefreshCw
} from "lucide-react";

export function ClaimProcessorDashboard() {
  const { currentUser } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [cls, notifs, docs] = await Promise.all([
        getClaims().catch(() => []),
        getNotifications().catch(() => []),
        getDocuments().catch(() => [])
      ]);
      setClaims(cls);
      setNotifications(notifs);
      setDocuments(docs);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    loadData();
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  // Filter claims assigned to this processor or portfolio
  const assignedClaims = useMemo(() => {
    if (!claims || claims.length === 0) return [];
    return claims.filter(
      (c) =>
        c.assignedTo?.toLowerCase().includes("rohit") ||
        c.assignedTo?.toLowerCase().includes("sarah") ||
        c.assignedTo === currentUser?.name ||
        c.assignedTo === currentUser?.id ||
        c.assignedTo === currentUser?.email
    );
  }, [claims, currentUser]);

  const displayedClaims = useMemo(() => {
    if (!selectedStage) return assignedClaims;
    return assignedClaims.filter((c) => c.claimStatus === selectedStage);
  }, [assignedClaims, selectedStage]);

  const metrics = useMemo(() => {
    return calculateDashboardMetrics(assignedClaims, unreadCount);
  }, [assignedClaims, unreadCount]);

  const urgentTimebarCount = assignedClaims.filter(
    (c) => Boolean(c.timebarred) || (c.claimTimebarDays && c.claimTimebarDays <= 14)
  ).length;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-blue-50 text-blue-800 border border-blue-200 uppercase flex items-center space-x-1">
              <Ship className="h-3 w-3" />
              <span>Claim Processor Workbench</span>
            </span>
            <span className="text-xs text-slate-500">
              Assigned Analyst: <strong className="text-slate-800">{currentUser?.name || "Demurrage Analyst"}</strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Assigned Demurrage Queue & Calculations
          </h1>
          <p className="text-xs text-slate-500">
            Workbench for Statement of Facts reconciliation, laytime calculations, and timebar tracking on your assigned voyages.
          </p>
        </div>

        {/* Quick Analyst Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/claims/create">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 px-4 shadow-sm flex items-center space-x-1.5 rounded-xl cursor-pointer">
              <PlusCircle className="h-4 w-4" />
              <span>New Claim</span>
            </Button>
          </Link>
          <Link href="/calculator">
            <Button variant="outline" size="sm" className="text-xs font-semibold h-9 px-3.5 bg-white rounded-xl flex items-center space-x-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
              <Calculator className="h-4 w-4 text-blue-600" />
              <span>Laytime Calculator</span>
            </Button>
          </Link>
          <Link href="/ocr">
            <Button variant="outline" size="sm" className="text-xs font-semibold h-9 px-3.5 bg-white rounded-xl flex items-center space-x-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
              <ScanText className="h-4 w-4 text-emerald-600" />
              <span>OCR & SoF</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            className="h-9 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900"
            title="Refresh assigned queue"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 2. Processor Specific KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Assigned Claims"
          value={String(assignedClaims.length)}
          subtitle={`${metrics.openClaimsCount} Total Active`}
          icon={Ship}
          variant="blue"
          trend="In Workbench"
        />
        <KPICard
          title="Demurrage Exposure"
          value={formatCurrency(metrics.totalDemurrageOwed)}
          subtitle={`${metrics.openClaimsCount} Open Files`}
          icon={TrendingUp}
          variant="green"
          trend="Active Claims"
        />
        <KPICard
          title="Approaching Time-Bar"
          value={String(urgentTimebarCount)}
          subtitle="Deadlines < 14 Days"
          icon={Clock}
          variant="amber"
          trend={urgentTimebarCount > 0 ? "Urgent Action" : "Compliant"}
        />
        <KPICard
          title="Awaiting SoF / Docs"
          value={String(metrics.claimsAwaitingDocs)}
          subtitle="Documents Missing"
          icon={FileCheck}
          variant="rose"
          trend="Pending Review"
        />
      </div>

      {/* 3. Maritime Claim Lifecycle Pipeline */}
      <TrackerPipeline
        claims={assignedClaims}
        selectedStage={selectedStage}
        onSelectStage={(stage) => setSelectedStage(stage)}
      />

      {selectedStage && (
        <div className="flex items-center space-x-2 text-xs bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-xl">
          <span className="font-semibold">Filtering by Stage:</span>
          <span className="bg-white px-2 py-0.5 rounded border border-blue-300 font-bold">{selectedStage}</span>
          <button
            onClick={() => setSelectedStage("")}
            className="text-xs text-blue-600 underline font-semibold ml-2 hover:text-blue-900 cursor-pointer"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* 4. Analyst Shortcuts & Time-Bar Watch */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProcessorWorkbench />
        <ProcessorTimebarWatch claims={assignedClaims} />
      </div>

      {/* 5. Claims Overview Trend Chart */}
      <ClaimOverviewChart claims={displayedClaims} metrics={metrics} isMounted={isMounted} />

      {/* 6. Assigned Claims Ledger & Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentClaimsTable
            claims={displayedClaims}
            title={selectedStage ? `Assigned Claims (${selectedStage})` : "My Assigned Claims"}
            subtitle="Active maritime claims registered to your processing queue"
            viewAllHref="/claims"
          />
        </div>
        <div>
          <OperationalTasks metrics={metrics} />
        </div>
      </div>
    </div>
  );
}
