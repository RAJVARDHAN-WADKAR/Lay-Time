const fs = require('fs');
const path = require('path');

const landingCode = `"use client";

import React from "react";
import Link from "next/link";
import {
  Anchor,
  Ship,
  Calculator,
  ScanText,
  AlertTriangle,
  FileCheck,
  FileSpreadsheet,
  Bot,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Clock,
  Layers,
  Sparkles,
  Zap,
  Lock,
  ChevronRight,
  FileText,
  Play,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* 1. Floating Glass Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-700 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Anchor className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-white flex items-center">
                Demurrage<span className="text-blue-400">Ops</span>
              </span>
              <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase">
                Maritime FinTech
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#laytime-engine" className="hover:text-white transition">Laytime Engine</a>
            <a href="#ocr-pipeline" className="hover:text-white transition">OCR & Discrepancies</a>
            <a href="#workflow" className="hover:text-white transition">Workflow</a>
            <a href="#compliance" className="hover:text-white transition">Timebar Protection</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center space-x-3">
            <Link href="/claims/create">
              <Button variant="ghost" size="sm" className="text-xs text-slate-300 hover:text-white hidden sm:flex">
                Create Claim
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center space-x-1.5 h-9 px-4">
                <span>Launch Console</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          {/* Top Pill */}
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-300 text-xs font-semibold backdrop-blur-md shadow-inner">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span>Next-Gen Maritime Laytime & Claim Intelligence</span>
            <ChevronRight className="h-3 w-3 opacity-60" />
          </div>

          {/* Main Title */}
          <div className="max-w-4xl mx-auto space-y-4">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.15]">
              Eliminate Disputed Demurrage.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-teal-300">
                Automate Laytime with Pure Mathematical Precision.
              </span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              The unified operating system for charterers, trading desks, and vessel operators to parse Statements of Facts, audit contentious weather deductions, enforce timebar deadlines, and generate executive PDF settlement files.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/dashboard">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm h-11 px-7 shadow-xl shadow-blue-600/25 flex items-center space-x-2">
                <span>Open Operations Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/claims">
              <Button size="lg" variant="outline" className="bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700 font-semibold text-sm h-11 px-6 flex items-center space-x-2">
                <FileSpreadsheet className="h-4 w-4 text-blue-400" />
                <span>Explore 32-Column Ledger</span>
              </Button>
            </Link>
            <Link href="/ocr">
              <Button size="lg" variant="outline" className="bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700 font-semibold text-sm h-11 px-6 flex items-center space-x-2">
                <ScanText className="h-4 w-4 text-emerald-400" />
                <span>Try OCR Discrepancy Hub</span>
              </Button>
            </Link>
          </div>

          {/* Trust Metric Chips */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur">
              <div className="text-lg sm:text-xl font-black text-blue-400">100% Deterministic</div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">Pure TS Laytime Math</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur">
              <div className="text-lg sm:text-xl font-black text-emerald-400">32+ Data Fields</div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">TanStack Table Ledger</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur">
              <div className="text-lg sm:text-xl font-black text-purple-400">0 Timebar Forfeits</div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">Notice & Claim Deadlines</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur">
              <div className="text-lg sm:text-xl font-black text-amber-400">Grounded RAG</div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">Source-Cited AI Assistant</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Interactive Hero UI Showcase Preview */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-24">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-6 shadow-2xl backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-rose-500/80" />
              <div className="h-3 w-3 rounded-full bg-amber-500/80" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs font-mono text-slate-400 pl-2">DemurrageOps v2.4 — Live Voyage Sandbox Console</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 text-[10px] font-bold uppercase">
                System Online
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
            {/* Quick Card 1 */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-bold uppercase tracking-wider text-[10px]">Active Voyage</span>
                <Ship className="h-4 w-4 text-blue-400" />
              </div>
              <div className="text-base font-bold text-white">MV Nordic Voyager</div>
              <div className="text-slate-400 text-[11px]">BPVOY4 Terms • Singapore STS Berth 1 & 2</div>
              <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Demurrage Rate:</span>
                <span className="font-bold text-white">$28,500 / day</span>
              </div>
            </div>

            {/* Quick Card 2 */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-bold uppercase tracking-wider text-[10px]">Calculated Settlement</span>
                <Calculator className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-base font-bold text-emerald-400">$64,125.00 USD</div>
              <div className="text-slate-400 text-[11px]">Gross Elapsed: 4d 06h • Deductions: 18h</div>
              <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Laytime Rule:</span>
                <span className="font-bold text-sky-300">OOD-AOD / SHEX</span>
              </div>
            </div>

            {/* Quick Card 3 */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-bold uppercase tracking-wider text-[10px]">Timebar Status</span>
                <ShieldCheck className="h-4 w-4 text-teal-400" />
              </div>
              <div className="text-base font-bold text-teal-300">Compliant (24 Days Remaining)</div>
              <div className="text-slate-400 text-[11px]">Notice: 30d • Final Claim: 90d</div>
              <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Discrepancies:</span>
                <span className="font-bold text-emerald-400">0 Flagged</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Features Grid */}
      <section id="features" className="py-20 border-t border-slate-800/80 bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400">Comprehensive Product Architecture</h2>
            <h3 className="text-2xl sm:text-4xl font-extrabold text-white">Built for High-Stakes Maritime Settlement Operations</h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Every tool required by demurrage analysts, post-fixture operators, and legal counsel in a unified interface.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/50 transition-all space-y-3 group">
              <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-white">32-Column Master Claims Ledger</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Powered by TanStack Table v8. Global search, multi-column sort, quick inline editing, column visibility presets, and 1-click CSV exports.
              </p>
              <Link href="/claims" className="inline-flex items-center space-x-1 text-xs text-blue-400 hover:underline pt-2 font-semibold">
                <span>Explore Ledger</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 transition-all space-y-3 group">
              <div className="h-10 w-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition">
                <Calculator className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-white">Deterministic Laytime Math</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pure TypeScript laytime calculations. Reconciles gross hours, rain/weather deductions, shifting time, and allowed hours with multi-berth prorata splits.
              </p>
              <Link href="/calculations" className="inline-flex items-center space-x-1 text-xs text-emerald-400 hover:underline pt-2 font-semibold">
                <span>View Engine</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-purple-500/50 transition-all space-y-3 group">
              <div className="h-10 w-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition">
                <ScanText className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-white">OCR & Statement of Facts Pipeline</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload scanned PDF Statement of Facts. Simulates async OCR pipelines, extracts chronological events, and displays original vs corrected comparisons.
              </p>
              <Link href="/documents" className="inline-flex items-center space-x-1 text-xs text-purple-400 hover:underline pt-2 font-semibold">
                <span>Upload Documents</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-rose-500/50 transition-all space-y-3 group">
              <div className="h-10 w-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-white">Discrepancy Detection Hub</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Real-time validation engine flags inverted start/stop timestamps, missing berth links, and sequence conflicts with 1-click auto-resolve controls.
              </p>
              <Link href="/ocr" className="inline-flex items-center space-x-1 text-xs text-rose-400 hover:underline pt-2 font-semibold">
                <span>Audit Discrepancies</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/50 transition-all space-y-3 group">
              <div className="h-10 w-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition">
                <FileText className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-white">Client-Side PDF Reports</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Generate and download formal Demurrage Claim Reports, Port Operations Summaries, and Berth Audit files generated directly via jsPDF.
              </p>
              <Link href="/reports" className="inline-flex items-center space-x-1 text-xs text-amber-400 hover:underline pt-2 font-semibold">
                <span>Generate Reports</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-teal-500/50 transition-all space-y-3 group">
              <div className="h-10 w-10 rounded-xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:bg-teal-600 group-hover:text-white transition">
                <Bot className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-white">Grounded AI Claim Copilot</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Conversational assistant grounded in your active claims dataset. Returns cited answers referencing specific vessels, clauses, and deadlines.
              </p>
              <Link href="/ai-assistant" className="inline-flex items-center space-x-1 text-xs text-teal-400 hover:underline pt-2 font-semibold">
                <span>Consult Copilot</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. How It Works Workflow */}
      <section id="workflow" className="py-20 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400">4-Step Workflow</h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-white">From Scanned SoF to Final Settlement</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
            <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
              <div className="h-7 w-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                1
              </div>
              <h4 className="font-bold text-white text-sm">Create Claim & Log Voyage</h4>
              <p className="text-slate-400 leading-relaxed">
                Enter charterparty terms, demurrage daily rates, NOR timestamps, and timebar clauses.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
              <div className="h-7 w-7 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-xs">
                2
              </div>
              <h4 className="font-bold text-white text-sm">Ingest Statement of Facts</h4>
              <p className="text-slate-400 leading-relaxed">
                Upload port SoF PDFs or log activities with automatic duration and counted percentage tags.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
              <div className="h-7 w-7 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs">
                3
              </div>
              <h4 className="font-bold text-white text-sm">Audit Discrepancies</h4>
              <p className="text-slate-400 leading-relaxed">
                Deterministic validator checks for chronological errors, low confidence values, and unlinked berths.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
              <div className="h-7 w-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                4
              </div>
              <h4 className="font-bold text-white text-sm">Export & Settle Claim</h4>
              <p className="text-slate-400 leading-relaxed">
                Run laytime engine, apply manual overrides if negotiated, and export official PDF settlement reports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Bottom Call to Action Banner */}
      <section className="py-16 border-t border-slate-800 bg-gradient-to-b from-slate-950 to-blue-950/60 text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to Take Control of Your Laytime & Demurrage Claims?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Test the full interactive frontend sandbox, customize assumptions, create test claims, and download real PDF reports.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link href="/dashboard">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm h-11 px-8 shadow-xl shadow-blue-600/30">
                Launch Operations Dashboard
              </Button>
            </Link>
            <Link href="/claims/create">
              <Button size="lg" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-sm h-11 px-6">
                Create First Claim
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Anchor className="h-4 w-4 text-blue-500" />
            <span className="font-bold text-slate-300">DemurrageOps</span>
            <span>• Enterprise Maritime Laytime System</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Frontend Architecture Sandbox with <code>@/lib/api/*</code> Backend Seam Layer.
          </div>
        </div>
      </footer>
    </div>
  );
}
`;

fs.writeFileSync(path.join(process.cwd(), 'app/page.tsx'), landingCode, 'utf8');
console.log('Successfully wrote high-converting landing page in app/page.tsx');
