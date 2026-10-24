"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getClaims, getNotifications } from "@/lib/api";
import { Claim, NotificationRecord } from "@/lib/types";
import { calculateDashboardMetrics } from "@/lib/mock/aggregate";
import { formatCurrency } from "@/lib/utils/formatters";
import { KPIGrid } from "@/components/dashboard/shared/KPIGrid";
import { KPICard } from "@/components/ui/kpi-card";
import { ClaimOverviewChart } from "@/components/dashboard/shared/ClaimOverviewChart";
import { RecentClaimsTable } from "@/components/dashboard/shared/RecentClaimsTable";
import { ClientClaimsList } from "@/components/roles/reviewer-client/ClientClaimsList";
import { ClientNegotiationFeed } from "@/components/roles/reviewer-client/ClientNegotiationFeed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/lib/context/AuthContext";
import {
  FileSpreadsheet,
  Clock,
  Shield,
  MessageSquare,
  ArrowRight,
  Ship,
  CheckCircle2,
  Eye,
  FileCheck,
  Scale,
  RefreshCw
} from "lucide-react";

export function ReviewerClientDashboard() {
  const { currentUser } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const isClient = currentUser?.role === "Client" || !!currentUser?.clientId;

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [cls, notifs] = await Promise.all([
        getClaims().catch(() => []),
        getNotifications().catch(() => [])
      ]);
      setClaims(cls);
      setNotifications(notifs);
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

  // Client view: filter to organization claims
  const clientClaims = useMemo(() => {
    if (!isClient) return claims;
    const clientName = (currentUser?.clientName || "Sokana").toLowerCase();
    return claims.filter((c) =>
      c.accountName?.toLowerCase().includes(clientName) ||
      c.clientId === currentUser?.clientId ||
      c.claimName?.toLowerCase().includes(clientName)
    );
  }, [claims, isClient, currentUser]);

  const activeClaimsList = isClient ? clientClaims : claims;

  const metrics = useMemo(() => {
    return calculateDashboardMetrics(activeClaimsList, unreadCount);
  }, [activeClaimsList, unreadCount]);

  const totalAgreedSettled = activeClaimsList.reduce((sum, c) => sum + (c.agreedAmount || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center space-x-1 ${
                isClient
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-indigo-50 text-indigo-800 border border-indigo-200"
              }`}
            >
              {isClient ? <Ship className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              <span>{isClient ? "Charterer Counterparty Portal" : "Internal Compliance Reviewer"}</span>
            </span>
            <span className="text-xs text-slate-500">
              Logged in as <strong className="text-slate-800">{currentUser?.name || "Representative"}</strong>
              {currentUser?.clientName && (
                <span className="text-emerald-700 font-semibold ml-1">({currentUser.clientName})</span>
              )}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {isClient ? "Demurrage Claims & Counterparty Settlement Portal" : "Legal & Compliance Audit Console"}
          </h1>
          <p className="text-xs text-slate-500">
            {isClient
              ? "Dedicated counterparty space for reviewing filed voyage claims, inspection of Statements of Facts, and agreement approvals."
              : "Read-only inspection portal for legal counsel and external auditors with comprehensive audit trail visibility."}
          </p>
        </div>

        {/* Quick Portal Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/claims">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 shadow-sm flex items-center space-x-1.5 rounded-xl cursor-pointer">
              <FileSpreadsheet className="h-4 w-4" />
              <span>{isClient ? "My Claims Ledger" : "Audit Claims"}</span>
            </Button>
          </Link>
          <Link href="/documents">
            <Button variant="outline" size="sm" className="text-xs font-semibold h-9 px-3.5 bg-white rounded-xl flex items-center space-x-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
              <FileCheck className="h-4 w-4 text-emerald-600" />
              <span>{isClient ? "Upload Documents" : "Inspect Archive"}</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            className="h-9 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900"
            title="Refresh portal data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 2. Key Metrics Grid */}
      {isClient ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Organization Claims"
            value={String(activeClaimsList.length)}
            subtitle="Registered Voyages"
            icon={Ship}
            variant="blue"
            trend="Active Files"
          />
          <KPICard
            title="Demurrage Filed"
            value={formatCurrency(metrics.totalDemurrageOwed)}
            subtitle="Gross Counterparty Claim"
            icon={FileSpreadsheet}
            variant="amber"
            trend="Under Review"
          />
          <KPICard
            title="Agreed Settlement"
            value={formatCurrency(totalAgreedSettled)}
            subtitle={`${metrics.settledClaimsCount} Claims Concluded`}
            icon={CheckCircle2}
            variant="green"
            trend="Confirmed"
          />
          <KPICard
            title="Disputed Contentions"
            value={formatCurrency(metrics.amountUnderContention)}
            subtitle="Requires Clarification"
            icon={Clock}
            variant="rose"
            trend={metrics.amountUnderContention > 0 ? "Under Negotiation" : "Clear"}
          />
        </div>
      ) : (
        <KPIGrid metrics={metrics} claims={activeClaimsList} />
      )}

      {/* 3. Trend Chart */}
      <ClaimOverviewChart claims={activeClaimsList} metrics={metrics} isMounted={isMounted} />

      {/* 4. Claims Table & Feeds */}
      {isClient ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ClientClaimsList claims={activeClaimsList} />
          <ClientNegotiationFeed notifications={notifications} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentClaimsTable
              claims={activeClaimsList}
              title="Inspection Claims Ledger"
              subtitle="Comprehensive voyage file records under compliance review"
              viewAllHref="/claims"
            />
          </div>
          <div>
            <ClientNegotiationFeed notifications={notifications} />
          </div>
        </div>
      )}
    </div>
  );
}
