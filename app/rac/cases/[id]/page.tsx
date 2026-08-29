"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { getRacCaseById, updateRacCase } from "@/lib/api/rac";
import { RacCase, RacStatus } from "@/lib/types";
import {
  Briefcase,
  ChevronLeft,
  Calendar,
  DollarSign,
  Ship,
  User,
  Clock,
  Layers,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Send,
  Check,
  RotateCcw,
  ShieldCheck,
  Download
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/formatters";

const WORKFLOW_STEPS: RacStatus[] = [
  "Draft",
  "Submitted",
  "Under Review",
  "Correction Required",
  "Reviewed",
  "Closed"
];

export default function RacCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser, role, canEditRac } = useAuth();
  const caseId = params.id as string;

  const [racCase, setRacCase] = useState<RacCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "calculation" | "documents" | "history">("overview");
  const [statusRemarks, setStatusRemarks] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const loadCase = async () => {
    setLoading(true);
    try {
      const data = await getRacCaseById(caseId);
      setRacCase(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCase();
  }, [caseId]);

  const handleStatusTransition = async (newStatus: RacStatus) => {
    if (!racCase) return;
    setIsUpdating(true);
    try {
      await updateRacCase(caseId, {
        status: newStatus,
        notes: statusRemarks ? `${racCase.notes ? racCase.notes + "\n" : ""}[${new Date().toISOString().slice(0, 10)} - ${currentUser.name}]: ${statusRemarks}` : racCase.notes
      });
      setStatusRemarks("");
      await loadCase();
    } catch (e) {
      alert("Failed to transition status");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        Loading RAC Case details from database...
      </div>
    );
  }

  if (!racCase) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-sm font-semibold text-slate-700">RAC Case not found</p>
        <Link href="/rac/cases">
          <Button variant="outline" size="sm">Back to RAC Ledger</Button>
        </Link>
      </div>
    );
  }

  const canEdit = canEditRac(racCase.assignedTo);

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <Link href="/rac/cases" className="hover:text-blue-600 flex items-center">
              <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
              <span>RAC Cases</span>
            </Link>
            <span>/</span>
            <span className="font-bold text-slate-700">{racCase.racReference}</span>
          </div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-slate-900">{racCase.shipName}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
              {racCase.racType}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Client: <span className="font-semibold text-slate-800">{racCase.clientName}</span> • Counterparty: <span className="font-semibold text-slate-800">{racCase.counterpartyName}</span>
            {racCase.claimId && (
              <>
                {" • "}
                <Link
                  href={`/claims/${racCase.claimId}`}
                  className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center"
                >
                  <span>Linked Claim: {racCase.claimId}</span>
                </Link>
              </>
            )}
          </p>
        </div>

        {/* Workflow Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && racCase.status === "Draft" && (
            <Button
              size="sm"
              onClick={() => handleStatusTransition("Submitted")}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              <span>Submit for Review</span>
            </Button>
          )}

          {(role === "Admin" || role === "Supervisor") && (racCase.status === "Submitted" || racCase.status === "Under Review") && (
            <>
              <Button
                size="sm"
                onClick={() => handleStatusTransition("Reviewed")}
                disabled={isUpdating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
              >
                <Check className="h-3.5 w-3.5 mr-1.5" />
                <span>Authorize & Approve</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusTransition("Correction Required")}
                disabled={isUpdating}
                className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs h-9"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                <span>Require Correction</span>
              </Button>
            </>
          )}

          {(role === "Admin" || role === "Supervisor") && racCase.status === "Reviewed" && (
            <Button
              size="sm"
              onClick={() => handleStatusTransition("Closed")}
              disabled={isUpdating}
              className="bg-slate-800 hover:bg-slate-900 text-white text-xs h-9"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              <span>Close Case</span>
            </Button>
          )}

          <Link href="/rac/reports">
            <Button variant="outline" size="sm" className="text-xs h-9">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              <span>Export PDF</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Visual Workflow Progress Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="text-xs font-bold text-slate-700 mb-3 flex items-center justify-between">
          <span>RAC Workflow Lifecycle</span>
          <span className="text-[11px] font-semibold text-blue-600">Current Status: {racCase.status}</span>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {WORKFLOW_STEPS.map((st, idx) => {
            const currentIdx = WORKFLOW_STEPS.indexOf(racCase.status);
            const isCompleted = idx < currentIdx || racCase.status === "Closed";
            const isCurrent = racCase.status === st;

            return (
              <div
                key={st}
                className={`text-center p-2 rounded-lg border text-xs font-semibold transition ${
                  isCurrent
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : isCompleted
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-50 text-slate-400 border-slate-200"
                }`}
              >
                <div className="text-[10px] font-medium opacity-80">Step {idx + 1}</div>
                <div className="truncate">{st}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-slate-200 space-x-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "overview" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          General Particulars
        </button>
        <button
          onClick={() => setActiveTab("calculation")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "calculation" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          RAC Calculation Breakdown
        </button>
        <button
          onClick={() => setActiveTab("documents")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "documents" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Supporting Documents ({racCase.documents?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "history" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Audit History ({racCase.statusHistory?.length || 0})
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-5 lg:col-span-2 space-y-5">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Commercial & Operational Particulars</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Vessel Name</span>
                <span className="font-semibold text-slate-900 text-sm">{racCase.shipName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Voyage Number</span>
                <span className="font-semibold text-slate-900 text-sm">{racCase.voyageNumber || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Relevant Event Date</span>
                <span className="font-semibold text-slate-900 text-sm">{racCase.relevantDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Client / Account</span>
                <span className="font-semibold text-slate-900">{racCase.clientName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Counterparty</span>
                <span className="font-semibold text-slate-900">{racCase.counterpartyName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Assigned Processor</span>
                <span className="font-semibold text-slate-900">{racCase.assignedTo}</span>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-800">Dispute Description</h4>
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg leading-relaxed">
                {racCase.description || "No detailed description provided."}
              </p>
            </div>

            {racCase.notes && (
              <div className="border-t pt-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-800">Operational & Legal Notes</h4>
                <pre className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg whitespace-pre-wrap font-sans">
                  {racCase.notes}
                </pre>
              </div>
            )}
          </Card>

          {/* Financial Exposure Card */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Financial Recovery Position</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Total Claim Filed:</span>
                <span className="font-bold text-sm text-slate-900">{formatCurrency(racCase.totalAmount)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Agreed Settlement:</span>
                <span className="font-bold text-sm text-emerald-600">{formatCurrency(racCase.agreedAmount)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Active Exposure:</span>
                <span className="font-bold text-sm text-amber-600">{formatCurrency(racCase.outstandingAmount)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Target Resolution:</span>
                <span className="font-semibold text-slate-700">{racCase.deadlineDate || "None"}</span>
              </div>
            </div>

            {canEdit && (
              <div className="pt-3 border-t">
                <Link href="/rac/calculations">
                  <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs">
                    <Layers className="h-3.5 w-3.5 mr-1.5" />
                    <span>Open Configurable Calculator</span>
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 2: Calculation */}
      {activeTab === "calculation" && (
        <Card className="p-5 space-y-5">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Configurable RAC Calculation Model</h3>
              <p className="text-xs text-slate-500">Rule Version {racCase.calculation?.ruleVersion || "1.0"} • Reviewed by {racCase.calculation?.reviewedBy || "Analyst"}</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
              {racCase.calculation?.calculationStatus || "Verified"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-xl">
            <div>
              <span className="text-slate-400 block">Calculated Result</span>
              <span className="text-lg font-bold text-slate-900">{formatCurrency(racCase.calculation?.calculatedResult || racCase.totalAmount)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Calculation Timestamp</span>
              <span className="font-semibold text-slate-700">{racCase.calculation?.calculatedAt ? new Date(racCase.calculation.calculatedAt).toLocaleString() : "N/A"}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Rule Explanation</span>
              <span className="font-medium text-slate-600">{racCase.calculation?.explanation || "Standard tariff breakdown applied."}</span>
            </div>
          </div>

          {/* Formula Breakdown Steps */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800">Formula Step Breakdown</h4>
            <div className="space-y-2">
              {(racCase.calculation?.formulaBreakdown || [
                { step: "1. Gross Tariff Hours", formula: "28 hours * $2,500/day equivalent", value: racCase.totalAmount },
                { step: "2. Final Calculated Claim", formula: "Net Claim Amount", value: racCase.totalAmount }
              ]).map((step, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{step.step}</span>
                    <span className="text-slate-500 font-mono text-[11px]">{step.formula}</span>
                  </div>
                  <span className="font-bold text-slate-800 text-sm">{formatCurrency(step.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Tab 3: Documents */}
      {activeTab === "documents" && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-sm font-bold text-slate-900">RAC Evidence & Supporting Invoices</h3>
            <Link href="/documents">
              <Button size="sm" variant="outline" className="text-xs">
                Upload New Document
              </Button>
            </Link>
          </div>

          <div className="space-y-2">
            {(racCase.documents || []).length > 0 ? (
              racCase.documents?.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-bold text-slate-900">{d.fileName}</div>
                      <div className="text-[10px] text-slate-500">v{d.version} • {d.category} • Uploaded by {d.uploadedBy}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                    {d.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No supporting documents linked to this case yet.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Tab 4: Audit History */}
      {activeTab === "history" && (
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b pb-3">Workflow State Transition Audit Trail</h3>
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {(racCase.statusHistory || []).map((h, i) => (
              <div key={h.id || i} className="relative">
                <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full bg-blue-600 ring-4 ring-white" />
                <div className="text-xs font-bold text-slate-900">
                  {h.previousStatus} → <span className="text-blue-600">{h.newStatus}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Action by <span className="font-semibold text-slate-700">{h.changedBy}</span> on {new Date(h.changedAt).toLocaleString()}
                </div>
                {h.remarks && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg mt-1.5 border border-slate-100">
                    {h.remarks}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
