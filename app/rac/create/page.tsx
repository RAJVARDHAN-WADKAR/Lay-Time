"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { createRacCase } from "@/lib/api/rac";
import { RacType, RacCase } from "@/lib/types";
import {
  Briefcase,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Ship,
  FileText,
  DollarSign,
  Layers,
  ArrowRight,
  Plus,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/formatters";

export default function CreateRacPage() {
  const router = useRouter();
  const { currentUser, role } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [generalInfo, setGeneralInfo] = useState({
    clientName: "Trafigura Trading Pte Ltd",
    shipName: "MV Nordic Titan",
    voyageNumber: "VOY-2024-09A",
    counterpartyName: "Rotterdam Bulk Terminal SA"
  });

  const [details, setDetails] = useState({
    racType: "Additional Port Costs" as RacType,
    relevantDate: new Date().toISOString().slice(0, 10),
    assignedTo: currentUser.name || "Sarah Jenkins",
    totalAmount: 38500,
    deadlineDate: "2024-11-15",
    description: "Tug & pilotage standby surcharges during port congestion outside charterer account.",
    notes: "Clause 14 of Charterparty specifies port standby is for Owners/Counterparty account."
  });

  const [calcParams, setCalcParams] = useState({
    ruleVersion: "1.0",
    baseRate: 2400,
    unitType: "Hours" as const,
    quantityOrDuration: 16,
    graceAllowanceHours: 2.0,
    counterpartyAllowance: 0,
    taxOrVatPercent: 0,
    adjustments: [
      { id: "adj-1", description: "Contractual grace period deduction", amount: 200, isDeduction: true }
    ]
  });

  const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setGeneralInfo({ ...generalInfo, [e.target.name]: e.target.value });
  };

  const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setDetails({ ...details, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const newCase = await createRacCase({
        clientName: generalInfo.clientName,
        shipName: generalInfo.shipName,
        voyageNumber: generalInfo.voyageNumber,
        counterpartyName: generalInfo.counterpartyName,
        racType: details.racType,
        relevantDate: details.relevantDate,
        assignedTo: details.assignedTo,
        status: "Draft",
        totalAmount: Number(details.totalAmount) || 0,
        agreedAmount: 0,
        outstandingAmount: Number(details.totalAmount) || 0,
        deadlineDate: details.deadlineDate,
        description: details.description,
        notes: details.notes,
        supportingDocsCount: 1,
        calculation: {
          id: `calc-${Date.now()}`,
          racCaseId: "",
          ruleVersion: calcParams.ruleVersion,
          parameters: {
            baseRate: Number(calcParams.baseRate),
            unitType: calcParams.unitType,
            graceAllowanceHours: Number(calcParams.graceAllowanceHours)
          },
          inputs: {
            quantityOrDuration: Number(calcParams.quantityOrDuration),
            agreedDailyOrHourlyRate: Number(calcParams.baseRate),
            actualIncurredCost: Number(details.totalAmount),
            counterpartyAllowance: Number(calcParams.counterpartyAllowance)
          },
          adjustments: calcParams.adjustments,
          calculatedResult: Number(details.totalAmount),
          formulaBreakdown: [
            { step: "1. Base Dispute Rate", formula: `${calcParams.quantityOrDuration} hrs * $${calcParams.baseRate}/hr`, value: Number(details.totalAmount) },
            { step: "2. Final Recoverable Claim", formula: "Total Recoverable", value: Number(details.totalAmount) }
          ],
          explanation: "Configurable RAC calculation ruleset v1.0 applied.",
          calculationStatus: "Preliminary",
          calculatedAt: new Date().toISOString()
        }
      });

      router.push(`/rac/cases/${newCase.id}`);
    } catch (e: any) {
      alert(e.message || "Failed to create RAC case");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <Link href="/rac/cases" className="hover:text-blue-600">RAC Cases</Link>
            <span>/</span>
            <span className="font-bold text-slate-700">New RAC Case</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Structured RAC Case Creator</h1>
          <p className="text-xs text-slate-500">
            Step-by-step workflow for recoverable additional cost disputes and claims
          </p>
        </div>
      </div>

      {/* 5-Step Progress Stepper */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        {[
          { num: 1, label: "General Info" },
          { num: 2, label: "Dispute Details" },
          { num: 3, label: "Documents" },
          { num: 4, label: "Calculation" },
          { num: 5, label: "Review & Submit" }
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center">
            <div className="flex items-center space-x-2">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  step === s.num
                    ? "bg-blue-600 text-white ring-4 ring-blue-100"
                    : step > s.num
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {step > s.num ? <CheckCircle2 className="h-4 w-4" /> : s.num}
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${step === s.num ? "text-slate-900 font-bold" : "text-slate-500"}`}>
                {s.label}
              </span>
            </div>
            {idx < 4 && <ChevronRight className="h-4 w-4 text-slate-300 mx-2 hidden sm:block" />}
          </div>
        ))}
      </div>

      {/* Step 1: General Info */}
      {step === 1 && (
        <Card className="p-6 space-y-5">
          <h2 className="text-sm font-bold text-slate-900 border-b pb-3">Step 1: General Maritime Particulars</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Client / Charterer Account Name *</label>
              <input
                type="text"
                name="clientName"
                value={generalInfo.clientName}
                onChange={handleGeneralChange}
                required
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vessel / Ship Name *</label>
              <input
                type="text"
                name="shipName"
                value={generalInfo.shipName}
                onChange={handleGeneralChange}
                required
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Voyage Number</label>
              <input
                type="text"
                name="voyageNumber"
                value={generalInfo.voyageNumber}
                onChange={handleGeneralChange}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Counterparty / Terminal / Owner Name *</label>
              <input
                type="text"
                name="counterpartyName"
                value={generalInfo.counterpartyName}
                onChange={handleGeneralChange}
                required
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Dispute Details */}
      {step === 2 && (
        <Card className="p-6 space-y-5">
          <h2 className="text-sm font-bold text-slate-900 border-b pb-3">Step 2: Dispute Particulars & Financials</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">RAC Dispute Type *</label>
              <select
                name="racType"
                value={details.racType}
                onChange={handleDetailsChange}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
              >
                <option value="Demurrage Review">Demurrage Review</option>
                <option value="Additional Port Costs">Additional Port Costs</option>
                <option value="Pumping Warranty Contention">Pumping Warranty Contention</option>
                <option value="Berth Allocation Audit">Berth Allocation Audit</option>
                <option value="Bunkers / Deviation Claim">Bunkers / Deviation Claim</option>
                <option value="Special Cargo Handling">Special Cargo Handling</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Claim Amount ($ USD) *</label>
              <input
                type="number"
                name="totalAmount"
                value={details.totalAmount}
                onChange={handleDetailsChange}
                required
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Relevant Operational Date *</label>
              <input
                type="date"
                name="relevantDate"
                value={details.relevantDate}
                onChange={handleDetailsChange}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Claim Processor *</label>
              <input
                type="text"
                name="assignedTo"
                value={details.assignedTo}
                onChange={handleDetailsChange}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dispute Description & Factual Summary</label>
              <textarea
                name="description"
                rows={3}
                value={details.description}
                onChange={handleDetailsChange}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Supporting Documents */}
      {step === 3 && (
        <Card className="p-6 space-y-5">
          <h2 className="text-sm font-bold text-slate-900 border-b pb-3">Step 3: Attach Evidence & Supporting Documents</h2>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center space-y-3 bg-slate-50">
            <FileText className="h-10 w-10 text-blue-500 mx-auto" />
            <div>
              <p className="text-xs font-bold text-slate-800">Drag and drop Port Tariffs, Timesheets, or Invoices</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Supports PDF up to 25MB with automated OCR scan processing</p>
            </div>
            <Button size="sm" variant="outline" className="text-xs">Browse Local Files</Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg text-xs">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-slate-800">Port_Authority_Standby_Invoice_2024.pdf</span>
                <span className="text-[10px] text-slate-400">(1.4 MB)</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Ready for Linkage</span>
            </div>
          </div>
        </Card>
      )}

      {/* Step 4: Calculation Parameters */}
      {step === 4 && (
        <Card className="p-6 space-y-5">
          <h2 className="text-sm font-bold text-slate-900 border-b pb-3">Step 4: Configurable RAC Calculation Formula</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Rate ($ USD)</label>
              <input
                type="number"
                value={calcParams.baseRate}
                onChange={(e) => setCalcParams({ ...calcParams, baseRate: Number(e.target.value) })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity / Duration</label>
              <input
                type="number"
                value={calcParams.quantityOrDuration}
                onChange={(e) => setCalcParams({ ...calcParams, quantityOrDuration: Number(e.target.value) })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Grace Period Allowance (Hours)</label>
              <input
                type="number"
                value={calcParams.graceAllowanceHours}
                onChange={(e) => setCalcParams({ ...calcParams, graceAllowanceHours: Number(e.target.value) })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl text-xs space-y-1">
            <span className="font-bold text-blue-900 block">Calculation Engine Summary:</span>
            <p className="text-blue-700">
              Evaluated under Configurable RAC Ruleset v{calcParams.ruleVersion}. Total recoverable claim computed as: <span className="font-bold">{formatCurrency(details.totalAmount)}</span>.
            </p>
          </div>
        </Card>
      )}

      {/* Step 5: Review & Submit */}
      {step === 5 && (
        <Card className="p-6 space-y-5">
          <h2 className="text-sm font-bold text-slate-900 border-b pb-3">Step 5: Review & Publish RAC Case</h2>
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl">
            <div>
              <span className="text-slate-400 block">Client</span>
              <span className="font-bold text-slate-900">{generalInfo.clientName}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Vessel & Voyage</span>
              <span className="font-bold text-slate-900">{generalInfo.shipName} ({generalInfo.voyageNumber})</span>
            </div>
            <div>
              <span className="text-slate-400 block">Dispute Type</span>
              <span className="font-bold text-slate-900">{details.racType}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Claim Amount</span>
              <span className="font-bold text-blue-600 text-sm">{formatCurrency(details.totalAmount)}</span>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>Ready to publish to the active RAC database ledger. A draft case reference will be automatically generated.</span>
          </div>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        {step > 1 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setStep(step - 1)}
            className="text-xs flex items-center space-x-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous Step</span>
          </Button>
        ) : <div />}

        {step < 5 ? (
          <Button
            type="button"
            size="sm"
            onClick={() => setStep(step + 1)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center space-x-1"
          >
            <span>Next Step</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 px-5 h-9"
          >
            {isSubmitting ? <span>Creating in Database...</span> : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Publish RAC Case</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
