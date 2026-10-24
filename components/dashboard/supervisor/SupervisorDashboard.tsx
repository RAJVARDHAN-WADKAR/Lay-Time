"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getClaims, getNotifications, getDocuments } from "@/lib/api";
import { getRacCases } from "@/lib/api/rac";
import { Claim, NotificationRecord, DocumentRecord, RacCase } from "@/lib/types";
import { calculateDashboardMetrics } from "@/lib/mock/aggregate";
import { formatCurrency } from "@/lib/utils/formatters";
import { KPIGrid } from "@/components/dashboard/shared/KPIGrid";
import { TrackerPipeline } from "@/components/dashboard/shared/TrackerPipeline";
import { AccountPortfolioCards } from "@/components/dashboard/shared/AccountPortfolioCards";
import { ClaimOverviewChart } from "@/components/dashboard/shared/ClaimOverviewChart";
import { RecentClaimsTable } from "@/components/dashboard/shared/RecentClaimsTable";
import { OperationalTasks } from "@/components/dashboard/shared/OperationalTasks";
import { SupervisorApprovalQueue } from "@/components/roles/supervisor/SupervisorApprovalQueue";
import { SupervisorExposureSummary } from "@/components/roles/supervisor/SupervisorExposureSummary";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/context/AuthContext";
import {
  PlusCircle,
  Briefcase,
  Users,
  ShieldCheck,
  ArrowRight,
  Calculator,
  RefreshCw
} from "lucide-react";

export function SupervisorDashboard() {
  const { currentUser } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [racCases, setRacCases] = useState<RacCase[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [cls, racs, notifs, docs] = await Promise.all([
        getClaims().catch(() => []),
        getRacCases().catch(() => []),
        getNotifications().catch(() => []),
        getDocuments().catch(() => [])
      ]);
      setClaims(cls);
      setRacCases(racs);
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

  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      if (selectedStage && c.claimStatus !== selectedStage) return false;
      if (selectedAccount && c.accountName !== selectedAccount) return false;
      return true;
    });
  }, [claims, selectedStage, selectedAccount]);

  const metrics = useMemo(() => {
    return calculateDashboardMetrics(filteredClaims, unreadCount);
  }, [filteredClaims, unreadCount]);

  const totalRacOutstanding = racCases.reduce((sum, c) => sum + (c.outstandingAmount || 0), 0);
  const totalCombinedExposure = metrics.totalExposure + totalRacOutstanding;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-amber-50 text-amber-900 border border-amber-300 uppercase flex items-center space-x-1">
              <ShieldCheck className="h-3 w-3" />
              <span>Operations Supervisor Dashboard</span>
            </span>
            <span className="text-xs text-slate-500">
              Welcome back, <strong className="text-slate-800">{currentUser?.name || "Operations Lead"}</strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Demurrage Operations & Settlement Oversight
          </h1>
          <p className="text-xs text-slate-500">
            Operations control center for laytime approvals, calculation overrides, RAC portfolios, and commercial settlements.
          </p>
        </div>

        {/* Supervisor Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/claims/create">
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold h-9 px-4 shadow-sm flex items-center space-x-1.5 rounded-xl cursor-pointer">
              <PlusCircle className="h-4 w-4" />
              <span>Create Claim</span>
            </Button>
          </Link>
          <Link href="/calculator">
            <Button variant="outline" size="sm" className="text-xs font-semibold h-9 px-3.5 bg-white rounded-xl flex items-center space-x-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
              <Calculator className="h-4 w-4 text-blue-600" />
              <span>Laytime Engine</span>
            </Button>
          </Link>
          <Link href="/rac">
            <Button variant="outline" size="sm" className="text-xs font-semibold h-9 px-3.5 bg-white rounded-xl flex items-center space-x-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
              <Briefcase className="h-4 w-4 text-indigo-600" />
              <span>RAC Dashboard</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            className="h-9 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900"
            title="Refresh tracker data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 2. Four Summary KPI Cards */}
      <KPIGrid metrics={metrics} claims={filteredClaims} />

      {/* 3. Maritime Claim Lifecycle Pipeline (10 Tracker Stages) */}
      <TrackerPipeline
        claims={claims}
        selectedStage={selectedStage}
        onSelectStage={(stage) => setSelectedStage(stage)}
      />

      {/* 4. Client Portfolios & Account Exposure */}
      <AccountPortfolioCards
        claims={claims}
        selectedAccount={selectedAccount}
        onSelectAccount={(account) => setSelectedAccount(account)}
      />

      {/* Active Filter Indicators */}
      {(selectedStage || selectedAccount) && (
        <div className="flex items-center space-x-2 text-xs bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-xl">
          <span className="font-semibold">Active Filter:</span>
          {selectedStage && <span className="bg-white px-2 py-0.5 rounded border border-blue-300 font-bold">Stage: {selectedStage}</span>}
          {selectedAccount && <span className="bg-white px-2 py-0.5 rounded border border-blue-300 font-bold">Account: {selectedAccount}</span>}
          <button
            onClick={() => { setSelectedStage(""); setSelectedAccount(""); }}
            className="text-xs text-blue-600 underline font-semibold ml-2 hover:text-blue-900 cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* 5. Supervisor Approval Queue & Exposure Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SupervisorApprovalQueue claims={claims} />
        <SupervisorExposureSummary claims={claims} racCases={racCases} />
      </div>

      {/* 6. Claims Overview Trend Chart */}
      <ClaimOverviewChart claims={filteredClaims} metrics={metrics} isMounted={isMounted} />

      {/* 7. Recent Claims & Operational Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentClaimsTable
            claims={filteredClaims}
            title={selectedStage ? `Claims: ${selectedStage}` : "Operational Claims Ledger"}
            subtitle="Master queue of ongoing and settled maritime demurrage files"
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
