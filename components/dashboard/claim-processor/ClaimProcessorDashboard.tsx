"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getClaims, getNotifications, getDocuments } from "@/lib/api";
import { Claim, NotificationRecord, DocumentRecord } from "@/lib/types";
import { calculateDashboardMetrics } from "@/lib/mock/aggregate";
import { formatCurrency } from "@/lib/utils/formatters";
import { KPICard } from "@/components/ui/kpi-card";
import { ClaimOverviewChart } from "@/components/dashboard/shared/ClaimOverviewChart";
import { RecentClaimsTable } from "@/components/dashboard/shared/RecentClaimsTable";
import { OperationalTasks } from "@/components/dashboard/shared/OperationalTasks";
import { ProcessorWorkbench } from "@/components/roles/claim-processor/ProcessorWorkbench";
import { ProcessorTimebarWatch } from "@/components/roles/claim-processor/ProcessorTimebarWatch";
import { RoleAccessControlMatrix, AccessItem } from "@/components/dashboard/shared/RoleAccessControlMatrix";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/context/AuthContext";
import {
  PlusCircle,
  Calculator,
  ScanText,
  Clock,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Ship,
  TrendingUp,
  FileCheck,
  Briefcase
} from "lucide-react";

const PROCESSOR_GRANTED_ACCESS: AccessItem[] = [
  {
    id: "proc-g1",
    name: "Assigned Claims Workbench",
    category: "Claims",
    description: "View, update, and manage all voyage demurrage claims assigned to your processing portfolio.",
    status: "granted",
    badge: "Assigned Only"
  },
  {
    id: "proc-g2",
    name: "Claim Creation & Auto-Assignment",
    category: "Claims",
    description: "Create new voyage demurrage claims; created claims are automatically assigned to your queue.",
    status: "granted",
    badge: "Create Claim"
  },
  {
    id: "proc-g3",
    name: "Statement of Facts Event Entry",
    category: "Claims",
    description: "Record berth shifts, rain stoppages, notice of readiness (NOR), and cargo operational events.",
    status: "granted",
    badge: "SoF Entry"
  },
  {
    id: "proc-g4",
    name: "Laytime Calculator Execution",
    category: "Calculations",
    description: "Compute allowed vs used time, reversible laytime terms, weather deductions, and demurrage/despatch.",
    status: "granted",
    badge: "Run Math"
  },
  {
    id: "proc-g5",
    name: "OCR Timesheet Extraction",
    category: "Documents",
    description: "Upload timesheet PDFs and images; extract timestamped port events automatically via OCR.",
    status: "granted",
    badge: "OCR Studio"
  },
  {
    id: "proc-g6",
    name: "RAC Ancillary Cost Logging",
    category: "RAC",
    description: "Log recoverable additional costs (tugs, shifting, pilots) and submit for supervisory authorization.",
    status: "granted",
    badge: "Log Findings"
  },
  {
    id: "proc-g7",
    name: "Time-Bar Deadline Monitoring",
    category: "Claims",
    description: "Track 30-day notice of claim and 90-day formal claim expiry dates on assigned voyages.",
    status: "granted",
    badge: "Timebar Watch"
  },
  {
    id: "proc-g8",
    name: "Negotiation Offer Drafting",
    category: "Commercial",
    description: "Draft proposed settlement offers and log incoming counterparty counter-proposals.",
    status: "granted",
    badge: "Draft Offers"
  },
  {
    id: "proc-g9",
    name: "Draft Invoicing & Payment Records",
    category: "Commercial",
    description: "Record preliminary demurrage billing invoices and log received payments (queued for supervisor sign-off).",
    status: "granted",
    badge: "Draft Invoices"
  },
  {
    id: "proc-g10",
    name: "Evidence Documents Upload",
    category: "Documents",
    description: "Upload contracts, bills of lading, surveyor letters of protest, and pumping logs to claim files.",
    status: "granted",
    badge: "Upload Files"
  }
];

const PROCESSOR_REMOVED_ACCESS: AccessItem[] = [
  {
    id: "proc-r1",
    name: "Claim Approval & Settlement Confirmation",
    category: "Claims",
    description: "Cannot approve claims for issuance or confirm final commercial settlements.",
    status: "removed",
    reason: "Separation of Duties: Financial settlements require Supervisor review and sign-off."
  },
  {
    id: "proc-r2",
    name: "Calculation Overrides",
    category: "Calculations",
    description: "Cannot override calculated demurrage amounts or bypass mathematical formulas.",
    status: "removed",
    reason: "Only the Operations Supervisor can issue commercial calculation overrides."
  },
  {
    id: "proc-r3",
    name: "Minimum Acceptable Amount (Confidential)",
    category: "Commercial",
    description: "Cannot view or set the confidential bottom-line minimum acceptable settlement figure.",
    status: "removed",
    reason: "Strict commercial confidentiality: Bottom-line figures are restricted to Supervisor & Management."
  },
  {
    id: "proc-r4",
    name: "Billable Amount ($) Modification",
    category: "Commercial",
    description: "Cannot alter final billable commercial amounts on approved claims.",
    status: "removed",
    reason: "Billable amounts are protected against unauthorized analyst changes."
  },
  {
    id: "proc-r5",
    name: "RAC Finding Authorization & Closure",
    category: "RAC",
    description: "Cannot authorize ancillary costs or close RAC dispute cases.",
    status: "removed",
    reason: "RAC authorization requires technical verification by the Operations Supervisor."
  },
  {
    id: "proc-r6",
    name: "Claim Reassignment & Deletion",
    category: "Claims",
    description: "Cannot reassign claims between analysts or delete claim records.",
    status: "removed",
    reason: "Workload distribution and claim purging are reserved for Supervisors and Administrators."
  },
  {
    id: "proc-r7",
    name: "User Management Access (/users)",
    category: "Admin",
    description: "Blocked from user directory administration, account provisioning, and role assignment.",
    status: "removed",
    reason: "Zero-Trust policy: Claim Processors have no administrative user access."
  },
  {
    id: "proc-r8",
    name: "Company Settings Access (/settings)",
    category: "Admin",
    description: "Blocked from company configurations and charterparty default rules.",
    status: "removed",
    reason: "System parameters are locked to IT Administration."
  },
  {
    id: "proc-r9",
    name: "Company-Wide Analytics & Financial Reports",
    category: "Commercial",
    description: "Removed from macro portfolio analytics and company financial reporting.",
    status: "removed",
    reason: "Analysts focus on their assigned workbench; macro corporate reports belong to leadership."
  },
  {
    id: "proc-r10",
    name: "Immutable Audit Trail Logs",
    category: "Admin",
    description: "Blocked from system-wide audit logs and administrative security logs.",
    status: "removed",
    reason: "Audit log inspection is restricted to Governance, Compliance, and IT Administration."
  }
];

export function ClaimProcessorDashboard() {
  const { currentUser } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
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

  const metrics = useMemo(() => {
    return calculateDashboardMetrics(claims, unreadCount);
  }, [claims, unreadCount]);

  // Filter claims assigned to this processor if assignedTo is populated
  const assignedClaims = useMemo(() => {
    if (!currentUser) return claims;
    const userEmail = (currentUser.email || "").toLowerCase();
    const userName = (currentUser.name || "").toLowerCase();
    return claims.filter((c) => {
      const assigned = (c.assignedTo || "").toLowerCase();
      return (
        !c.assignedTo ||
        assigned === userEmail ||
        assigned === userName ||
        assigned.includes(userName) ||
        assigned.includes("processor") ||
        assigned.includes("rohit")
      );
    });
  }, [claims, currentUser]);

  const urgentTimebarCount = claims.filter(
    (c) => c.claimStatus === "Timebarred" || Boolean(c.timebarred) || Boolean(c.claimTimebarDays && c.claimTimebarDays <= 14)
  ).length;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-blue-50 text-blue-800 border border-blue-300 uppercase flex items-center space-x-1">
              <FileSpreadsheet className="h-3 w-3" />
              <span>Dedicated Claim Processor Dashboard</span>
            </span>
            <span className="text-xs text-slate-500">
              Welcome back, <strong className="text-slate-800">{currentUser?.name || "Demurrage Analyst"}</strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Assigned Claims & Laytime Calculations
          </h1>
          <p className="text-xs text-slate-500">
            Analyst workbench for voyage laytime calculation, Statement of Facts reconciliation, and OCR parsing.
          </p>
        </div>

        {/* Processor Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/claims/create">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 px-4 shadow-sm flex items-center space-x-1.5 rounded-xl cursor-pointer">
              <PlusCircle className="h-4 w-4" />
              <span>Create Claim</span>
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

      {/* 3. Analyst Shortcuts & Time-Bar Watch */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProcessorWorkbench />
        <ProcessorTimebarWatch claims={assignedClaims} />
      </div>

      {/* 4. Claims Overview Chart */}
      <ClaimOverviewChart claims={assignedClaims} metrics={metrics} isMounted={isMounted} />

      {/* 5. Assigned Claims Ledger & Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentClaimsTable
            claims={assignedClaims}
            title="My Assigned Claims"
            subtitle="Active maritime claims registered to your processing queue"
            viewAllHref="/claims"
          />
        </div>
        <div>
          <OperationalTasks metrics={metrics} />
        </div>
      </div>

      {/* 6. Comprehensive Claim Processor Role Access Control Matrix */}
      <RoleAccessControlMatrix
        roleName="Claim Processor"
        roleCode="CLAIM_PROCESSOR"
        roleScope="Own Assigned Claims Only"
        purpose="Claim preparer responsible for voyage analysis, Statement of Facts entry, laytime engine calculations, OCR timesheet extraction, and drafting negotiation counter-offers. Strictly restricted from approving or settling claims, calculation overrides, viewing minimum acceptable amounts, or administrative system settings."
        grantedPermissions={PROCESSOR_GRANTED_ACCESS}
        removedPermissions={PROCESSOR_REMOVED_ACCESS}
      />
    </div>
  );
}
