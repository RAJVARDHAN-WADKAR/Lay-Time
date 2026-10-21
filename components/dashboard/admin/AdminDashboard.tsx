"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getClaims, getNotifications, getDocuments } from "@/lib/api";
import { getUsers } from "@/lib/api/users";
import { Claim, NotificationRecord, DocumentRecord, User } from "@/lib/types";
import { calculateDashboardMetrics } from "@/lib/mock/aggregate";
import { formatCurrency } from "@/lib/utils/formatters";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RecentClaimsTable } from "@/components/dashboard/shared/RecentClaimsTable";
import { OperationalTasks } from "@/components/dashboard/shared/OperationalTasks";
import { AdminSecurityAudit } from "@/components/roles/admin/AdminSecurityAudit";
import { AdminUserSummary } from "@/components/roles/admin/AdminUserSummary";
import { RoleAccessControlMatrix, AccessItem } from "@/components/dashboard/shared/RoleAccessControlMatrix";
import { useAuth } from "@/lib/context/AuthContext";
import {
  Users,
  Shield,
  Settings,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Bell,
  ArrowRight,
  ShieldCheck,
  Activity,
  Layers,
  Database,
  CheckCircle2,
  XCircle,
  KeyRound,
  ShieldAlert
} from "lucide-react";

const ADMIN_GRANTED_ACCESS: AccessItem[] = [
  {
    id: "adm-g1",
    name: "User Account Administration",
    category: "Admin",
    description: "Full authority to create, edit, deactivate user accounts, reset passwords, and manage RBAC roles.",
    status: "granted",
    badge: "Full CRUD"
  },
  {
    id: "adm-g2",
    name: "Company Settings & Global Configuration",
    category: "Admin",
    description: "Configure charterparty defaults, laytime rules (OOD/AOD, SHEX/SHINC), grace periods, and system parameters.",
    status: "granted",
    badge: "System Owner"
  },
  {
    id: "adm-g3",
    name: "Client & Vessel Master Records",
    category: "Admin",
    description: "Full CRUD control over corporate clients, charterer counterparty entities, and vessel fleet particulars.",
    status: "granted",
    badge: "Master Data"
  },
  {
    id: "adm-g4",
    name: "Global Claims Ledger Oversight",
    category: "Claims",
    description: "Unrestricted company-wide view of all voyage files, port records, and historical demurrage claims.",
    status: "granted",
    badge: "Read All"
  },
  {
    id: "adm-g5",
    name: "Claim Reassignment & Administrative Cleanup",
    category: "Claims",
    description: "Reassign orphaned claims between analysts and perform administrative soft-deletion of test or duplicate entries.",
    status: "granted",
    badge: "Maintenance"
  },
  {
    id: "adm-g6",
    name: "Document Repository & Evidence Archive",
    category: "Documents",
    description: "Inspect uploaded contracts, Statement of Facts, pumping logs, and compliance evidence documents.",
    status: "granted",
    badge: "Archival"
  },
  {
    id: "adm-g7",
    name: "RAC Portfolio Inspection",
    category: "RAC",
    description: "View all Recoverable Additional Cost cases, deductions, port expenditure breakdowns, and recovery statuses.",
    status: "granted",
    badge: "Oversight"
  },
  {
    id: "adm-g8",
    name: "System Analytics & Executive PDF Reports",
    category: "Commercial",
    description: "Access high-level financial metrics, demurrage recovery rate charts, and export compliance audit reports.",
    status: "granted",
    badge: "Reporting"
  },
  {
    id: "adm-g9",
    name: "Immutable Security & Audit Trail",
    category: "Admin",
    description: "Inspect time-stamped system event logs, authentication history, token revocations, and operational modifications.",
    status: "granted",
    badge: "Audit Log"
  }
];

const ADMIN_REMOVED_ACCESS: AccessItem[] = [
  {
    id: "adm-r1",
    name: "Claim Creation & Operational Editing",
    category: "Claims",
    description: "Cannot register new claims or modify voyage parameters, cargo quantities, or port logs.",
    status: "removed",
    reason: "Separation of Duties: IT administrators must not initiate or alter commercial claims data."
  },
  {
    id: "adm-r2",
    name: "Laytime Calculations Execution",
    category: "Calculations",
    description: "Cannot execute laytime calculation math, modify time sheets, or recalculate demurrage/despatch.",
    status: "removed",
    reason: "Math and timeline entries are restricted to qualified Claim Processors and Supervisors."
  },
  {
    id: "adm-r3",
    name: "Calculation Overrides",
    category: "Calculations",
    description: "Cannot override calculated demurrage amounts or bypass mathematical deductions.",
    status: "removed",
    reason: "Overriding calculated laytime is strictly restricted to the Operations Supervisor with written justification."
  },
  {
    id: "adm-r4",
    name: "Claim Approval & Settlement",
    category: "Commercial",
    description: "Cannot approve claims for issuance or finalize commercial settlement agreements.",
    status: "removed",
    reason: "Zero-Trust policy: Financial approvals require operational supervisor credentials."
  },
  {
    id: "adm-r5",
    name: "Commercial Negotiation Proposals",
    category: "Commercial",
    description: "Cannot submit settlement offers, draft counter-proposals, or accept counterparty deals.",
    status: "removed",
    reason: "Commercial negotiations are handled exclusively by operational negotiators and charterer counterparties."
  },
  {
    id: "adm-r6",
    name: "Invoicing & Payment Processing",
    category: "Commercial",
    description: "Cannot issue financial demurrage invoices, record payments, or post adjustments.",
    status: "removed",
    reason: "Financial transactions require operational supervisory review."
  },
  {
    id: "adm-r7",
    name: "OCR Timesheet Upload & SoF Entry",
    category: "Documents",
    description: "Cannot upload timesheet scans to OCR or transcribe Statement of Facts events.",
    status: "removed",
    reason: "Document transcription is reserved for analyst processing queues."
  },
  {
    id: "adm-r8",
    name: "RAC Finding Authorization & Closure",
    category: "RAC",
    description: "Cannot authorize ancillary port claims, reject surveyor findings, or close RAC cases.",
    status: "removed",
    reason: "RAC determinations require maritime operational authority."
  }
];

export function AdminDashboard() {
  const { currentUser } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [cls, usrs, notifs, docs] = await Promise.all([
          getClaims().catch(() => []),
          getUsers().catch(() => []),
          getNotifications().catch(() => []),
          getDocuments().catch(() => [])
        ]);
        setClaims(cls);
        setUsers(usrs);
        setNotifications(notifs);
        setDocuments(docs);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const metrics = useMemo(() => {
    return calculateDashboardMetrics(claims, unreadCount);
  }, [claims, unreadCount]);

  const activeUsersCount = users.filter((u) => u.status === "Active").length;
  const adminCount = users.filter((u) => u.role === "Admin" || u.role === "ADMIN").length;
  const supervisorCount = users.filter((u) => u.role === "Supervisor" || u.role === "SUPERVISOR").length;
  const processorCount = users.filter((u) => u.role === "Claim Processor" || u.role === "CLAIM_PROCESSOR" || u.role === "Processor").length;
  const clientCount = users.filter((u) => u.role === "Client" || u.role === "Reviewer" || u.role === "REVIEWER_CLIENT").length;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-purple-900 text-white uppercase flex items-center space-x-1">
              <Shield className="h-3 w-3" />
              <span>Dedicated Admin Dashboard</span>
            </span>
            <span className="text-xs text-slate-500">
              Logged in as <strong className="text-slate-800">{currentUser?.name || "Administrator"}</strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            System Administration & Governance
          </h1>
          <p className="text-xs text-slate-500">
            Dedicated administrative console for user provisioning, security policies, and company-wide compliance.
          </p>
        </div>

        {/* Quick Admin Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/users">
            <Button size="sm" className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold h-9 px-4 shadow-sm flex items-center space-x-1.5 rounded-xl cursor-pointer">
              <Users className="h-4 w-4" />
              <span>Manage Users</span>
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline" size="sm" className="text-xs font-semibold h-9 px-3.5 bg-white rounded-xl flex items-center space-x-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
              <Settings className="h-4 w-4 text-slate-600" />
              <span>Company Settings</span>
            </Button>
          </Link>
          <Link href="/reports">
            <Button variant="outline" size="sm" className="text-xs font-semibold h-9 px-3.5 bg-white rounded-xl flex items-center space-x-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
              <FileBarChart className="h-4 w-4 text-indigo-600" />
              <span>Audit Reports</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Admin System KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Active Users"
          value={String(activeUsersCount)}
          subtitle={`${users.length} Total Accounts`}
          icon={Users}
          variant="blue"
          trend="Platform Access"
        />
        <KPICard
          title="Total Claims Tracked"
          value={String(claims.length)}
          subtitle={`${metrics.openClaimsCount} Active Disputes`}
          icon={FileSpreadsheet}
          variant="green"
          trend={formatCurrency(metrics.totalDemurrageOwed)}
        />
        <KPICard
          title="Document Archive"
          value={String(documents.length)}
          subtitle="Contract & SoF Files"
          icon={Database}
          variant="amber"
          trend="Encrypted"
        />
        <KPICard
          title="Security & RBAC"
          value="Enforced"
          subtitle="Zero-Trust Strict Matrix"
          icon={ShieldCheck}
          variant="rose"
          trend="100% Passing"
        />
      </div>

      {/* 3. Role Governance & Security Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl p-5 h-full flex flex-col justify-between">
            <div>
              <CardHeader className="p-0 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <Users className="h-4 w-4 text-purple-600" />
                    <span>Role Distribution</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Active users categorized by RBAC privileges
                  </CardDescription>
                </div>
                <Link href="/users" className="text-xs font-bold text-purple-600 hover:underline">
                  Manage
                </Link>
              </CardHeader>

              <CardContent className="p-0 pt-4 space-y-2.5">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/80 border border-purple-100">
                  <div className="flex items-center space-x-2.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-purple-900" />
                    <span className="text-xs font-bold text-purple-950">Administrators</span>
                  </div>
                  <span className="text-xs font-extrabold text-purple-900 px-2 py-0.5 rounded bg-white border border-purple-200">{adminCount}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/80 border border-amber-100">
                  <div className="flex items-center space-x-2.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-600" />
                    <span className="text-xs font-bold text-amber-950">Supervisors</span>
                  </div>
                  <span className="text-xs font-extrabold text-amber-900 px-2 py-0.5 rounded bg-white border border-amber-200">{supervisorCount}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/80 border border-blue-100">
                  <div className="flex items-center space-x-2.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <span className="text-xs font-bold text-blue-950">Claim Processors</span>
                  </div>
                  <span className="text-xs font-extrabold text-blue-900 px-2 py-0.5 rounded bg-white border border-blue-200">{processorCount}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-100">
                  <div className="flex items-center space-x-2.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                    <span className="text-xs font-bold text-emerald-950">Reviewers / Clients</span>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-900 px-2 py-0.5 rounded bg-white border border-emerald-200">{clientCount}</span>
                </div>
              </CardContent>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 text-[11px] text-slate-500">
              Security policy: Subtree isolation active. Only Administrators can provision user accounts.
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <AdminUserSummary users={users} />
          <AdminSecurityAudit />
        </div>
      </div>

      {/* 4. Recent Claims Table */}
      <RecentClaimsTable
        claims={claims}
        title="Company-Wide Claims Activity"
        subtitle="Oversight of voyage files across all operational teams"
        viewAllHref="/claims"
      />

      {/* 5. Comprehensive Admin Role Access Control & Security Matrix */}
      <RoleAccessControlMatrix
        roleName="Administrator"
        roleCode="ADMIN"
        roleScope="Company-Wide Master Access"
        purpose="System owner within the company with complete administrative governance over user accounts, company configuration, clients & vessels, with read-only oversight across claims and audit logs. Strictly restricted from operational claim modifications, laytime calculation execution, and financial settlements."
        grantedPermissions={ADMIN_GRANTED_ACCESS}
        removedPermissions={ADMIN_REMOVED_ACCESS}
      />
    </div>
  );
}
