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
import { RoleAccessControlMatrix, AccessItem } from "@/components/dashboard/shared/RoleAccessControlMatrix";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/lib/context/AuthContext";
import {
  FileSpreadsheet,
  Clock,
  Shield,
  Bell,
  MessageSquare,
  ArrowRight,
  Ship,
  CheckCircle2,
  XCircle,
  Eye,
  FileCheck,
  FileText,
  Briefcase,
  Layers,
  Scale
} from "lucide-react";

// Permissions for Internal Reviewer
const REVIEWER_GRANTED_ACCESS: AccessItem[] = [
  {
    id: "rev-g1",
    name: "Company-Wide Claims Inspection",
    category: "Claims",
    description: "Read-only inspection across all voyage demurrage files, ports, and charterer accounts.",
    status: "granted",
    badge: "Read-Only"
  },
  {
    id: "rev-g2",
    name: "Statement of Facts & Timeline Review",
    category: "Claims",
    description: "Review recorded Statement of Facts events, port delays, rain stoppages, and shifting deductions.",
    status: "granted",
    badge: "Audit View"
  },
  {
    id: "rev-g3",
    name: "Stored Laytime Calculations Audit",
    category: "Calculations",
    description: "Inspect mathematical calculations, deduction allocations, pumping allowances, and demurrage summaries.",
    status: "granted",
    badge: "Math Audit"
  },
  {
    id: "rev-g4",
    name: "RAC Portfolio Inspection",
    category: "RAC",
    description: "Inspect all Recoverable Additional Cost dispute cases, tariff allocations, and linked invoices.",
    status: "granted",
    badge: "RAC Oversight"
  },
  {
    id: "rev-g5",
    name: "Commercial Negotiation History Oversight",
    category: "Commercial",
    description: "Inspect immutable audit logs of all counter-offer proposals, timestamps, and settlement agreements.",
    status: "granted",
    badge: "Negotiation Audit"
  },
  {
    id: "rev-g6",
    name: "Invoices & Payment Records Inspection",
    category: "Commercial",
    description: "Examine billing invoices, payment statuses, and outstanding accounting reconciliations.",
    status: "granted",
    badge: "Billing View"
  },
  {
    id: "rev-g7",
    name: "Executive Analytics & PDF Audit Export",
    category: "Commercial",
    description: "Generate and export official compliance PDF statements and Excel/CSV summary ledgers.",
    status: "granted",
    badge: "Export Audit"
  },
  {
    id: "rev-g8",
    name: "Comprehensive System Audit Trail",
    category: "Admin",
    description: "Inspect immutable security logs, user session activities, and status transition audit trails.",
    status: "granted",
    badge: "Audit Log"
  }
];

const REVIEWER_REMOVED_ACCESS: AccessItem[] = [
  {
    id: "rev-r1",
    name: "Claim Creation, Editing, or Deletion",
    category: "Claims",
    description: "Strictly prohibited from creating new claims, modifying fields, or deleting records.",
    status: "removed",
    reason: "Zero-Mutation Policy: Independent compliance auditors must not alter operational claim records."
  },
  {
    id: "rev-r2",
    name: "Laytime Calculations Execution or Override",
    category: "Calculations",
    description: "Cannot execute new calculations or override established laytime results.",
    status: "removed",
    reason: "Calculation execution and overrides are reserved for qualified analysts and operational leads."
  },
  {
    id: "rev-r3",
    name: "OCR Timesheet Upload & SoF Entry",
    category: "Documents",
    description: "Cannot upload timesheet scans or transcribe Statement of Facts events.",
    status: "removed",
    reason: "Document transcription is reserved for active processing staff."
  },
  {
    id: "rev-r4",
    name: "Commercial Negotiation Offer Submission",
    category: "Commercial",
    description: "Cannot submit proposals, respond to counterparties, or finalize settlements.",
    status: "removed",
    reason: "Auditors observe negotiations for compliance but hold no commercial bargaining authority."
  },
  {
    id: "rev-r5",
    name: "RAC Finding Authorization or Closure",
    category: "RAC",
    description: "Cannot authorize ancillary costs, contest deductions, or close RAC disputes.",
    status: "removed",
    reason: "Operational authorizations require Supervisor sign-off."
  },
  {
    id: "rev-r6",
    name: "User Provisioning & System Settings",
    category: "Admin",
    description: "Blocked from user management and system settings configuration.",
    status: "removed",
    reason: "Administrative governance belongs strictly to IT Administration."
  }
];

// Permissions for External Client
const CLIENT_GRANTED_ACCESS: AccessItem[] = [
  {
    id: "cli-g1",
    name: "Registered Voyage Claims Portal",
    category: "Claims",
    description: "View demurrage claims and settlement statuses registered specifically for your charterer account.",
    status: "granted",
    badge: "Own Fleet"
  },
  {
    id: "cli-g2",
    name: "Shared Contract & Voyage Documents",
    category: "Documents",
    description: "Download verified Statement of Facts, Port Logs, Notice of Readiness, and Surveyor Reports.",
    status: "granted",
    badge: "Shared Docs"
  },
  {
    id: "cli-g3",
    name: "Evidence Documents Upload",
    category: "Documents",
    description: "Upload requested counter-evidence, letters of protest, and commercial correspondence to claim files.",
    status: "granted",
    badge: "Upload Evidence"
  },
  {
    id: "cli-g4",
    name: "Final Commercial Offer Approval",
    category: "Commercial",
    description: "Review and formally submit acceptance of final agreed demurrage counter-offer proposals.",
    status: "granted",
    badge: "Approve Offer"
  },
  {
    id: "cli-g5",
    name: "In-App Dispute Notifications",
    category: "Commercial",
    description: "Receive immediate notifications regarding counterparty offers, document requests, and settlements.",
    status: "granted",
    badge: "Notifications"
  }
];

const CLIENT_REMOVED_ACCESS: AccessItem[] = [
  {
    id: "cli-r1",
    name: "Other Charterers' Claims (Multi-Tenant)",
    category: "Claims",
    description: "Strictly isolated from viewing other clients' claims, vessels, or commercial agreements.",
    status: "removed",
    reason: "Row-Level Data Isolation (RLS): Complete segregation between charterer counterparties."
  },
  {
    id: "cli-r2",
    name: "Internal Laytime Math Engine & Overrides",
    category: "Calculations",
    description: "Cannot access internal calculation tools, deduction allocations, or supervisor overrides.",
    status: "removed",
    reason: "Proprietary laytime models and internal calculation adjustments remain confidential."
  },
  {
    id: "cli-r3",
    name: "RAC (Recoverable Additional Costs) Module",
    category: "RAC",
    description: "Completely excluded from RAC cases, ancillary cost recovery portfolios, and internal port tariff disputes.",
    status: "removed",
    reason: "RAC recovery is strictly internal to shipowners and commercial operators."
  },
  {
    id: "cli-r4",
    name: "Minimum Acceptable Settlement Amount",
    category: "Commercial",
    description: "Cannot view owner's bottom-line minimum acceptable amount or private contention notes.",
    status: "removed",
    reason: "Commercial confidentiality: Internal negotiation thresholds are never disclosed to counterparties."
  },
  {
    id: "cli-r5",
    name: "Internal Deliberations & Operations Notes",
    category: "Claims",
    description: "Cannot view internal processor commentary, legal risk assessments, or team task lists.",
    status: "removed",
    reason: "Internal working files and strategy deliberations are strictly restricted to company staff."
  },
  {
    id: "cli-r6",
    name: "System Administration, Users, & Settings",
    category: "Admin",
    description: "Blocked from user directories, application settings, and audit logs.",
    status: "removed",
    reason: "Zero-Trust policy: External portals have no access to internal system administration."
  }
];

export function ReviewerClientDashboard() {
  const { currentUser, role } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const isClient =
    role === "Client" ||
    Boolean(
      currentUser?.clientId ||
        (currentUser as any)?.client_id ||
        (currentUser as any)?.assignedClientId
    );

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

  const metrics = useMemo(() => {
    return calculateDashboardMetrics(claims, unreadCount);
  }, [claims, unreadCount]);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center space-x-1 ${
                isClient
                  ? "bg-cyan-50 text-cyan-900 border border-cyan-300"
                  : "bg-emerald-50 text-emerald-900 border border-emerald-300"
              }`}
            >
              {isClient ? <Ship className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              <span>{isClient ? "Dedicated Client Partner Portal" : "Dedicated Reviewer Compliance Dashboard"}</span>
            </span>
            <span className="text-xs text-slate-500">
              Welcome back, <strong className="text-slate-800">{currentUser?.name || (isClient ? "Client Partner" : "Compliance Auditor")}</strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {isClient ? "Client Demurrage Overview & Fleet Claims" : "Independent Legal & Compliance Audit Inspection"}
          </h1>
          <p className="text-xs text-slate-500">
            {isClient
              ? "Secure external portal for charterer claim oversight, verified evidence files, and negotiation acceptance."
              : "Read-only audit inspection environment for internal legal counsel, external auditors, and regulatory reviewers."}
          </p>
        </div>

        {/* Quick Actions: View only */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/claims">
            <Button variant="outline" size="sm" className="text-xs font-semibold h-9 px-3.5 bg-white rounded-xl flex items-center space-x-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              <span>{isClient ? "My Fleet Claims" : "Claims Ledger"}</span>
            </Button>
          </Link>
          <Link href="/notifications">
            <Button variant="outline" size="sm" className="text-xs font-semibold h-9 px-3.5 bg-white rounded-xl flex items-center space-x-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
              <Bell className="h-4 w-4 text-purple-600" />
              <span>Notifications</span>
            </Button>
          </Link>
          {!isClient && (
            <Link href="/reports">
              <Button variant="outline" size="sm" className="text-xs font-semibold h-9 px-3.5 bg-white rounded-xl flex items-center space-x-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
                <FileText className="h-4 w-4 text-emerald-600" />
                <span>Audit Reports</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 2. Summary KPI Cards */}
      {isClient ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Registered Claims"
            value={String(claims.length)}
            subtitle={`${metrics.openClaimsCount} Open Files`}
            icon={Ship}
            variant="blue"
            trend="Active Files"
          />
          <KPICard
            title="Claimed Demurrage"
            value={formatCurrency(metrics.totalDemurrageOwed)}
            subtitle="Under Review"
            icon={Scale}
            variant="green"
            trend="Exposure"
          />
          <KPICard
            title="Disputed / Active"
            value={String(claims.filter((c) => c.claimStatus === "Disputed" || c.claimStatus === "Review").length)}
            subtitle="Negotiations Active"
            icon={MessageSquare}
            variant="amber"
            trend="Action Required"
          />
          <KPICard
            title="Unread Notices"
            value={String(unreadCount)}
            subtitle="Claim Updates"
            icon={Bell}
            variant="rose"
            trend={unreadCount > 0 ? "New Messages" : "All Read"}
          />
        </div>
      ) : (
        <KPIGrid metrics={metrics} claims={claims} />
      )}

      {/* 3. Claims Overview Chart */}
      <ClaimOverviewChart claims={claims} metrics={metrics} isMounted={isMounted} />

      {/* 4. Client/Reviewer Feeds & Claims Table */}
      {isClient ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ClientClaimsList claims={claims} />
          <ClientNegotiationFeed notifications={notifications} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentClaimsTable
              claims={claims}
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

      {/* 5. Comprehensive Role Access Control Matrix */}
      <RoleAccessControlMatrix
        roleName={isClient ? "Charterer Client Counterparty" : "Internal Reviewer & Auditor"}
        roleCode={isClient ? "CLIENT" : "REVIEWER"}
        roleScope={isClient ? "Own Client Demurrage Only (RLS Enforced)" : "Company-Wide Read-Only Inspection"}
        purpose={
          isClient
            ? "External counterparty portal for charterer clients to inspect registered voyage claims, review verified Statement of Facts, upload requested contract evidence, and approve final settlement counter-offers. Completely isolated from internal calculations, RAC findings, and other clients' claims."
            : "Strictly read-only compliance inspection mode for internal legal counsel, external auditors, and regulatory inspectors. Full visibility across all voyage files, stored laytime math, RAC portfolios, and immutable audit logs with a strict zero-mutation policy."
        }
        grantedPermissions={isClient ? CLIENT_GRANTED_ACCESS : REVIEWER_GRANTED_ACCESS}
        removedPermissions={isClient ? CLIENT_REMOVED_ACCESS : REVIEWER_REMOVED_ACCESS}
      />
    </div>
  );
}
