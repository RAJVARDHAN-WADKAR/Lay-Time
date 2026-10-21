"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getClaims, getNotifications, getDocuments } from "@/lib/api";
import { getRacCases } from "@/lib/api/rac";
import { Claim, NotificationRecord, DocumentRecord, RacCase } from "@/lib/types";
import { calculateDashboardMetrics } from "@/lib/mock/aggregate";
import { formatCurrency } from "@/lib/utils/formatters";
import { KPIGrid } from "@/components/dashboard/shared/KPIGrid";
import { ClaimOverviewChart } from "@/components/dashboard/shared/ClaimOverviewChart";
import { RecentClaimsTable } from "@/components/dashboard/shared/RecentClaimsTable";
import { OperationalTasks } from "@/components/dashboard/shared/OperationalTasks";
import { SupervisorApprovalQueue } from "@/components/roles/supervisor/SupervisorApprovalQueue";
import { SupervisorExposureSummary } from "@/components/roles/supervisor/SupervisorExposureSummary";
import { RoleAccessControlMatrix, AccessItem } from "@/components/dashboard/shared/RoleAccessControlMatrix";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/context/AuthContext";
import {
  PlusCircle,
  Briefcase,
  Users,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
  CheckCircle2,
  XCircle,
  Calculator,
  Scale
} from "lucide-react";

const SUPERVISOR_GRANTED_ACCESS: AccessItem[] = [
  {
    id: "sup-g1",
    name: "Full Claim Operational Lifecycle",
    category: "Claims",
    description: "Authority to create, edit, assign, reassign, approve, delete, and settle all voyage demurrage claims.",
    status: "granted",
    badge: "Full Authority"
  },
  {
    id: "sup-g2",
    name: "Laytime Calculation Override",
    category: "Calculations",
    description: "Sole authority to override calculated demurrage amounts with mandatory commercial or operational justification.",
    status: "granted",
    badge: "Exclusive"
  },
  {
    id: "sup-g3",
    name: "Laytime Calculation Execution & Approval",
    category: "Calculations",
    description: "Execute, recalculate, adjust weather deductions, and formally approve complex laytime calculations.",
    status: "granted",
    badge: "Approve Math"
  },
  {
    id: "sup-g4",
    name: "Statement of Facts & Ports Approval",
    category: "Claims",
    description: "Create, edit, and approve Statement of Facts timelines, port logs, berth tonnages, and deduction rules.",
    status: "granted",
    badge: "SoF Sign-off"
  },
  {
    id: "sup-g5",
    name: "RAC Portfolio Authorization & Closure",
    category: "RAC",
    description: "Review, authorize, contest deductions, and formally close Recoverable Additional Cost cases.",
    status: "granted",
    badge: "RAC Lead"
  },
  {
    id: "sup-g6",
    name: "Commercial Negotiation Authority",
    category: "Commercial",
    description: "Initiate negotiations, set confidential minimum acceptable amounts, approve our offers, and confirm settlements.",
    status: "granted",
    badge: "Settlement Lead"
  },
  {
    id: "sup-g7",
    name: "Invoicing & Payment Approval",
    category: "Commercial",
    description: "Create, edit, approve demurrage billing invoices, and record/approve received counterparty payments.",
    status: "granted",
    badge: "Financial Ops"
  },
  {
    id: "sup-g8",
    name: "OCR Verification & Approval",
    category: "Documents",
    description: "Upload timesheets to OCR, verify parsed timestamps, correct discrepancies, and approve imported events.",
    status: "granted",
    badge: "OCR Lead"
  },
  {
    id: "sup-g9",
    name: "Evidence Document Management",
    category: "Documents",
    description: "Upload, categorize, delete, and approve contractual evidence documents across all claims.",
    status: "granted",
    badge: "Full Archive"
  },
  {
    id: "sup-g10",
    name: "Operational Team Directory",
    category: "Admin",
    description: "Inspect operational team accounts, assigned active workloads, and user roles (read-only access to /users).",
    status: "granted",
    badge: "Directory View"
  },
  {
    id: "sup-g11",
    name: "Executive Analytics & Reports Export",
    category: "Commercial",
    description: "Access exposure analytics, loss prevention trends, and generate official signed PDF/CSV statements.",
    status: "granted",
    badge: "Export Reports"
  }
];

const SUPERVISOR_REMOVED_ACCESS: AccessItem[] = [
  {
    id: "sup-r1",
    name: "User Provisioning & Role Modification",
    category: "Admin",
    description: "Cannot create new user accounts, assign roles, or modify employee privilege tiers.",
    status: "removed",
    reason: "Zero-Trust RBAC: User provisioning and security assignments are restricted strictly to IT Administration."
  },
  {
    id: "sup-r2",
    name: "Account Deactivation & Password Resets",
    category: "Admin",
    description: "Cannot deactivate user accounts or initiate password resets for employees.",
    status: "removed",
    reason: "Identity management security policies require Administrator authorization."
  },
  {
    id: "sup-r3",
    name: "Company Global Settings & Defaults",
    category: "Admin",
    description: "Cannot alter global laytime calculation engine rules, currency conversions, or system configurations.",
    status: "removed",
    reason: "Global charterparty engine assumptions are centrally managed by IT and Legal Administration."
  },
  {
    id: "sup-r4",
    name: "Master Client & Vessel Entity Deletion",
    category: "Admin",
    description: "Cannot delete registered corporate client entities or vessel fleet master records.",
    status: "removed",
    reason: "Master entity integrity protection prevents operational deletion of counterparty databases."
  }
];

export function SupervisorDashboard() {
  const { currentUser } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [racCases, setRacCases] = useState<RacCase[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
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

  const metrics = useMemo(() => {
    return calculateDashboardMetrics(claims, unreadCount);
  }, [claims, unreadCount]);

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
              <span>Dedicated Supervisor Dashboard</span>
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
          <Link href="/rac">
            <Button variant="outline" size="sm" className="text-xs font-semibold h-9 px-3.5 bg-white rounded-xl flex items-center space-x-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
              <Briefcase className="h-4 w-4 text-indigo-600" />
              <span>RAC Dashboard</span>
            </Button>
          </Link>
          <Link href="/users">
            <Button variant="outline" size="sm" className="text-xs font-semibold h-9 px-3.5 bg-white rounded-xl flex items-center space-x-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
              <Users className="h-4 w-4 text-slate-600" />
              <span>Team Directory</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Four Summary KPI Cards */}
      <KPIGrid metrics={metrics} claims={claims} />

      {/* 3. Integrated RAC Banner */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/60 rounded-2xl p-4 sm:p-5 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600/30 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white">Recoverable Additional Costs (RAC) Exposure</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded-full">
                  {racCases.length} Active RAC Cases
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Total Combined Maritime Exposure: <strong className="text-white">{formatCurrency(totalCombinedExposure)}</strong> (Demurrage + Port Costs)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            <Link
              href="/rac"
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-sm"
            >
              <span>RAC Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/rac/cases"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <span>View RAC Cases</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Supervisor Approval Queue & Exposure Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SupervisorApprovalQueue claims={claims} />
        <SupervisorExposureSummary claims={claims} racCases={racCases} />
      </div>

      {/* 5. Claims Overview Chart */}
      <ClaimOverviewChart claims={claims} metrics={metrics} isMounted={isMounted} />

      {/* 6. Recent Claims & Operational Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentClaimsTable
            claims={claims}
            title="Operational Claims Ledger"
            subtitle="Master queue of ongoing and settled maritime demurrage files"
            viewAllHref="/claims"
          />
        </div>
        <div>
          <OperationalTasks metrics={metrics} />
        </div>
      </div>

      {/* 7. Comprehensive Supervisor Role Access Control Matrix */}
      <RoleAccessControlMatrix
        roleName="Operations Supervisor"
        roleCode="SUPERVISOR"
        roleScope="Company-Wide Operational Authority"
        purpose="Claims manager and chief approver with comprehensive operational authority over claims, Statement of Facts, laytime calculations, calculation overrides, RAC portfolios, negotiations, and settlements. Excluded from administrative user provisioning and global system settings."
        grantedPermissions={SUPERVISOR_GRANTED_ACCESS}
        removedPermissions={SUPERVISOR_REMOVED_ACCESS}
      />
    </div>
  );
}
