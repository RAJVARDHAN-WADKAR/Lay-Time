"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/hooks/useToast";
import {
  X,
  CheckCircle2,
  Circle,
  ExternalLink,
  ShieldCheck,
  FileSpreadsheet,
  Calculator,
  AlertTriangle,
  Clock,
  Bot,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Sparkles,
  Zap,
  GraduationCap,
  Users,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DemoGuideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DemoStep {
  id: number;
  title: string;
  badge: string;
  summary: string;
  talkingPoints: string[];
  links: Array<{ label: string; href: string }>;
  suggestedRole?: string;
  copyPrompts?: Array<{ label: string; text: string }>;
}

const DEMO_STEPS: DemoStep[] = [
  {
    id: 1,
    title: "RBAC Governance & Multi-Tenant Security",
    badge: "Security & Permissions",
    summary:
      "Demonstrate Role-Based Access Control enforcing least privilege across 6 enterprise maritime roles.",
    talkingPoints: [
      "Admin Console (/users): Full control over user lifecycle, role provisioning, and account activation status.",
      "Privilege Boundaries: Reviewer and Client users operate in strict read-only compliance inspection mode.",
      "Root Defense: All non-GET state mutations (PUT/POST/DELETE) return HTTP 403 Forbidden for unauthorized roles.",
      "Client Isolation: External counterparties are strictly scoped to their assigned client_id portfolio."
    ],
    links: [
      { label: "Open User Directory (/users)", href: "/users" },
      { label: "View Login Workspace (/login)", href: "/login" }
    ],
    suggestedRole: "Admin"
  },
  {
    id: 2,
    title: "Master Maritime Claims Ledger",
    badge: "Operations Ledger",
    summary:
      "Showcase the high-throughput claims ledger supporting 32+ operational, financial, and compliance fields.",
    talkingPoints: [
      "Enterprise View Presets: Instant toggling between Operational, Financial, and Legal Timebar column presets.",
      "Multi-Column Sorting & Filtering: Filter by status, counterparty, vessel, or CP type with parameterized safety.",
      "Inline Cell Editing: Live financial recalculation and optimism concurrency protection across ledger records.",
      "Universal CSV Export: Instant high-fidelity CSV ledger report export for external audit and counterparties."
    ],
    links: [
      { label: "Open Claims Ledger (/claims)", href: "/claims" },
      { label: "Create New Claim (/claims/create)", href: "/claims/create" }
    ],
    suggestedRole: "Claim Processor"
  },
  {
    id: 3,
    title: "Deterministic Laytime Engine (Benchmark CLM-0001)",
    badge: "Core Engine",
    summary:
      "Walk the examiner through the mathematical laytime proof: 96h gross - 12h deductions = 84h net vs 72h allowed = 12h excess @ $20k/day = $10,000 demurrage.",
    talkingPoints: [
      "Total Gross Elapsed Time: Exactly 96h 00m (5,760 minutes) across vessel arrival, NOR, and cargo pumping.",
      "Deductions Reconciliation: 6h shifting (0% counted) + 6h heavy rain storm (0% counted) = 12h 00m deductions (720 min).",
      "Net Laytime Used: 96h gross − 12h deductions = 84h 00m (5,040 minutes).",
      "Allowed Laytime: 30,000 MT cargo @ 10,000 MT/day = 3.0 days = 72h 00m (4,320 minutes).",
      "Final Demurrage Payable: 12h excess (0.50 days) × $20,000/day = exactly $10,000.00 saved in laytime_calculations."
    ],
    links: [
      { label: "Inspect Benchmark CLM-0001", href: "/claims/CLM-0001" },
      { label: "Inspect Statement of Facts Tab", href: "/claims/CLM-0001?tab=sof" },
      { label: "Interactive Laytime Calculator", href: "/calculator" }
    ],
    suggestedRole: "Claim Processor"
  },
  {
    id: 4,
    title: "Statement of Facts OCR & Discrepancy Detection (CLM-0006)",
    badge: "Document AI & OCR",
    summary:
      "Showcase automated Statement of Facts inspection flagging low-confidence OCR text and overlapping timestamps.",
    talkingPoints: [
      "Low-Confidence OCR Extraction: Activity 'Discharge crude oil cargo' flagged with prominent 72% confidence badge due to scanned ink degradation.",
      "Overlapping Timestamps Detected: Discharge (08:00–14:00) overlaps with bunkering (12:00–16:00) on Antwerp Liquid Terminal 4.",
      "Discrepancy Resolution Engine: One-click discrepancy correction interface allowing analysts to anchor timestamps or verify against original PDF scan.",
      "Audit Trail Recording: Discrepancy resolutions automatically generate tamper-evident audit log entries."
    ],
    links: [
      { label: "Inspect CLM-0006 Statement of Facts", href: "/claims/CLM-0006?tab=sof" },
      { label: "View Discrepancies Queue", href: "/claims/CLM-0006?tab=discrepancies" },
      { label: "OCR Document Extraction Workbench", href: "/ocr" }
    ],
    suggestedRole: "Claim Processor"
  },
  {
    id: 5,
    title: "Timebar Compliance & Automated Chaser Engine",
    badge: "Compliance & Chasers",
    summary:
      "Demonstrate charterparty limitation tracking highlighting CLM-0005 notice alert and CLM-0008 legal escalation.",
    talkingPoints: [
      "CLM-0005 Critical Notice Alert: 28 days elapsed post-discharge against strict 30-day notice limitation (2 days remaining).",
      "CLM-0008 Timebar Escalation: 125 days elapsed against 90-day BPVOY4 Clause 20 limitation; claim flagged '9. Legal' with timebar forfeiture warning.",
      "Automated Chaser Queue: Scheduled reminder dispatch engine preventing demurrage expiration via automated 30/60/90-day chaser templates."
    ],
    links: [
      { label: "Open Timebar Compliance Monitor (/timebar)", href: "/timebar" },
      { label: "Inspect CLM-0005 File", href: "/claims/CLM-0005" },
      { label: "Inspect CLM-0008 Legal File", href: "/claims/CLM-0008" }
    ],
    suggestedRole: "Supervisor"
  },
  {
    id: 6,
    title: "RAC Module, PDF Dossier & Grounded Maritime AI",
    badge: "RAC & Grounded AI",
    summary:
      "Showcase the 6-state RAC module, download live PDF report, and verify grounded Maritime RAG AI assistant responses.",
    talkingPoints: [
      "6-State RAC Lifecycle: Draft → Submitted → Under Review → Correction Required → Reviewed → Closed with audit history.",
      "Dossier PDF Export: Generate comprehensive, mathematically certified demurrage and RAC settlement dossiers.",
      "Grounded RAG Assistant: Ask 'What is the demurrage payable for CLM-0001?' — cited directly from stored DB calculations ($10,000 payable).",
      "Hallucination Prevention: Test out-of-scope prompt — assistant strictly returns 'Insufficient information available in the provided claim documents.'"
    ],
    links: [
      { label: "Open RAC Case Portfolio (/rac)", href: "/rac" },
      { label: "Export PDF Reports (/reports)", href: "/reports" },
      { label: "Launch AI Maritime Assistant (/ai-assistant)", href: "/ai-assistant" }
    ],
    suggestedRole: "Supervisor",
    copyPrompts: [
      {
        label: "Copy Benchmark Query",
        text: "What is the demurrage payable for CLM-0001?"
      },
      {
        label: "Copy Out-of-Scope Query",
        text: "What is the fuel consumption of an Airbus A380?"
      }
    ]
  }
];

const SWITCHER_ROLES = [
  {
    role: "Admin",
    email: "admin@laytime.io",
    pass: "Admin@123",
    color: "bg-purple-600 hover:bg-purple-500 text-white"
  },
  {
    role: "Supervisor",
    email: "supervisor@laytime.io",
    pass: "Super@123",
    color: "bg-amber-600 hover:bg-amber-500 text-white"
  },
  {
    role: "Claim Processor",
    email: "processor@laytime.io",
    pass: "Proc@123",
    color: "bg-blue-600 hover:bg-blue-500 text-white"
  },
  {
    role: "Reviewer",
    email: "reviewer@laytime.io",
    pass: "Review@123",
    color: "bg-emerald-600 hover:bg-emerald-500 text-white"
  }
];

export function DemoGuideDrawer({ isOpen, onClose }: DemoGuideDrawerProps) {
  const router = useRouter();
  const { role, currentUser, login } = useAuth();
  const { success, info } = useToast();

  const [activeStepId, setActiveStepId] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  if (!isOpen) return null;

  const currentStep = DEMO_STEPS.find((s) => s.id === activeStepId) || DEMO_STEPS[0];
  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / DEMO_STEPS.length) * 100);

  const toggleStepCompleted = (stepId: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const handleCopyPrompt = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    info("Prompt Copied", "Pasted query copied to clipboard. Ready to test in AI Assistant.");
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const handleSwitchRole = async (targetRole: string, email: string, pass: string) => {
    setIsSwitchingRole(true);
    try {
      const res = await login(email, pass);
      if (res.success) {
        success("Role Switched", `Active session changed to ${targetRole} (${email}).`);
        router.refresh();
      }
    } finally {
      setIsSwitchingRole(false);
    }
  };

  const handleResetChecklist = () => {
    setCompletedSteps({});
    setActiveStepId(1);
    info("Checklist Reset", "All 6 walkthrough steps reset to initial state.");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Dimmed backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Slide-over drawer container */}
      <div className="relative w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full z-10 text-white animate-in slide-in-from-right duration-200">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                  Academic Live Demo Guide
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-900/60 text-blue-300 border border-blue-700/50">
                  External Examiner
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Interactive 6-Step Project Walkthrough &amp; Demonstration
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close Demo Guide"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Instant Role Switcher Bar */}
        <div className="px-4 sm:px-5 py-3 bg-slate-950/40 border-b border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>Instant Role Switcher</span>
            </span>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <span>Active:</span>
              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                {role} ({currentUser?.name || "User"})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {SWITCHER_ROLES.map((sr) => {
              const isCurrent = role.toLowerCase().includes(sr.role.toLowerCase());
              return (
                <button
                  key={sr.role}
                  disabled={isSwitchingRole}
                  onClick={() => handleSwitchRole(sr.role, sr.email, sr.pass)}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50 ${
                    isCurrent
                      ? `${sr.color} ring-2 ring-white/40 shadow-sm`
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  }`}
                  title={`Switch to ${sr.role} (${sr.email})`}
                >
                  <span className="truncate">{sr.role}</span>
                  {isCurrent && <Check className="h-3 w-3 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Walkthrough Progress:</span>
            <span className="font-extrabold text-blue-400">
              {completedCount} of {DEMO_STEPS.length} Completed ({progressPercent}%)
            </span>
          </div>
          <div className="w-24 sm:w-32 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Steps Tab Bar */}
        <div className="px-4 sm:px-5 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center space-x-1 overflow-x-auto scrollbar-none">
          {DEMO_STEPS.map((s) => {
            const isSelected = s.id === activeStepId;
            const isDone = completedSteps[s.id];
            return (
              <button
                key={s.id}
                onClick={() => setActiveStepId(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition flex items-center space-x-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                    : isDone
                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-900/60"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Circle className="h-3.5 w-3.5 opacity-60" />
                )}
                <span>Step {s.id}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Step Header */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-950 border border-blue-800 text-blue-300 uppercase tracking-wider">
                {currentStep.badge}
              </span>
              <button
                onClick={() => toggleStepCompleted(currentStep.id)}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition flex items-center space-x-1.5 cursor-pointer ${
                  completedSteps[currentStep.id]
                    ? "bg-emerald-950/80 border-emerald-600 text-emerald-300 hover:bg-emerald-900"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {completedSteps[currentStep.id] ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Verified / Completed</span>
                  </>
                ) : (
                  <>
                    <Circle className="h-3.5 w-3.5" />
                    <span>Mark as Verified</span>
                  </>
                )}
              </button>
            </div>

            <h4 className="text-lg font-black text-white tracking-tight">
              {currentStep.id}. {currentStep.title}
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {currentStep.summary}
            </p>
          </div>

          {/* Key Talking Points */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span>What to Showcase to the Guide / Examiner:</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              {currentStep.talkingPoints.map((point, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-blue-500 font-bold shrink-0 mt-0.5">•</span>
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Prompt Copy Section for Step 6 */}
          {currentStep.copyPrompts && currentStep.copyPrompts.length > 0 && (
            <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/40 space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5" />
                <span>Test Queries for Maritime AI Assistant:</span>
              </div>
              <div className="space-y-2">
                {currentStep.copyPrompts.map((cp, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-900 border border-indigo-900/60 flex items-center justify-between text-xs"
                  >
                    <div className="truncate pr-2">
                      <div className="text-[10px] text-indigo-300 font-bold">{cp.label}</div>
                      <div className="font-mono text-white text-[11px] truncate mt-0.5">{cp.text}</div>
                    </div>
                    <button
                      onClick={() => handleCopyPrompt(cp.text, idx)}
                      className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shrink-0 flex items-center space-x-1 cursor-pointer transition"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-300" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Direct Navigation Action Links */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              One-Click Direct Screen Links:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentStep.links.map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href}
                  onClick={onClose}
                  className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-blue-600 hover:border-blue-500 text-white font-semibold text-xs flex items-center justify-between transition group shadow-xs cursor-pointer"
                >
                  <span className="truncate">{link.label}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-white shrink-0 ml-1.5" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            disabled={activeStepId === 1}
            onClick={() => setActiveStepId((prev) => Math.max(prev - 1, 1))}
            className="text-xs text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 flex items-center space-x-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous Step</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetChecklist}
            className="text-[11px] text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 flex items-center space-x-1"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </Button>

          <Button
            size="sm"
            disabled={activeStepId === DEMO_STEPS.length}
            onClick={() => setActiveStepId((prev) => Math.min(prev + 1, DEMO_STEPS.length))}
            className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-40 flex items-center space-x-1"
          >
            <span>Next Step</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
