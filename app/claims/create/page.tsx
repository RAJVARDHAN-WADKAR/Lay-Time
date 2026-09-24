"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClaim } from "@/lib/api";
import { Claim } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/inputs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/lib/hooks/useToast";
import { formatCurrency } from "@/lib/utils/formatters";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  Ship,
  ShieldCheck,
  Clock
} from "lucide-react";

interface PortState {
  id: string;
  name: string;
  portType: "Load Port" | "Discharge Port";
  loadRate: number;
}

interface BerthState {
  id: string;
  portId: string;
  name: string;
  quantity: number;
  loadRate: number;
  prorataShare: number;
  cargoType: string;
}

interface ActivityState {
  id: string;
  activityName: string;
  berthId: string;
  startTime: string;
  stopTime: string;
  durationMinutes: number;
  durationFormatted: string;
  percentageCounted: number;
  prorata: number;
  deductionCategory: string;
  remarks: string;
  isOcrExtracted: boolean;
  ocrConfidence: number;
}

interface DeductionState {
  id: string;
  type: string;
  startTime: string;
  stopTime: string;
  percentageTime: number;
  prorata: number;
  deductionHours: number;
  remarks: string;
}

export default function CreateClaimWizardPage() {
  const router = useRouter();
  const { success, error, info } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);

  // Step 1: General Info
  const [claimName, setClaimName] = useState("MV Pacific Dawn - Singapore Discharge Demurrage");
  const [client, setClient] = useState("Trafigura Trading Pte Ltd");
  const [broker, setBroker] = useState("Braemar ACM");
  const [claimType, setClaimType] = useState<any>("Discharge Port Demurrage");
  const [shipName, setShipName] = useState("MV Pacific Dawn");
  const [cpType, setCpType] = useState<any>("BPVOY4");
  const [counterparty, setCounterparty] = useState("Trafigura Trading SA");
  const [counterpartyType, setCounterpartyType] = useState<any>("Charterer");
  const [demurrageRate, setDemurrageRate] = useState(32000);
  const [despatchRate, setDespatchRate] = useState(16000);
  const [notes, setNotes] = useState("Pumping dispute at Jurong Island and heavy monsoon rain operational deduction.");

  // Step 2: Voyage Dates & Timebars
  const [layday, setLayday] = useState("2024-07-01");
  const [cancellingDate, setCancellingDate] = useState("2024-07-08");
  const [voyageEndDate, setVoyageEndDate] = useState("2024-07-15");
  const [instructionReceivedDate, setInstructionReceivedDate] = useState("2024-07-16");
  const [noticeReceivedDate, setNoticeReceivedDate] = useState("2024-07-17");
  const [claimReceivedDate, setClaimReceivedDate] = useState("2024-07-25");
  const [charterpartyDate, setCharterpartyDate] = useState("2024-06-20");
  const [claimTimebarDays, setClaimTimebarDays] = useState(90);
  const [noticeTimebarDays, setNoticeTimebarDays] = useState(30);

  // Step 3: Ports
  const [ports, setPorts] = useState<PortState[]>([
    { id: "p-1", name: "Port of Singapore", portType: "Discharge Port", loadRate: 35000 }
  ]);

  // Step 4: Berths
  const [berths, setBerths] = useState<BerthState[]>([
    { id: "b-1", portId: "p-1", name: "Jurong Island Berth 1", quantity: 45000, loadRate: 35000, prorataShare: 60, cargoType: "Crude Oil" },
    { id: "b-2", portId: "p-1", name: "Jurong Island Berth 2", quantity: 30000, loadRate: 35000, prorataShare: 40, cargoType: "Fuel Oil" }
  ]);

  // Step 5: Statement of Facts Activities
  const [activities, setActivities] = useState<ActivityState[]>([
    { id: "act-1", activityName: "Vessel Arrived", berthId: "b-1", startTime: "2024-07-10T04:00", stopTime: "2024-07-10T04:30", durationMinutes: 30, durationFormatted: "00h 30m", percentageCounted: 0, prorata: 100, deductionCategory: "Waiting for berth", remarks: "End of sea passage EOSP", isOcrExtracted: true, ocrConfidence: 0.98 },
    { id: "act-2", activityName: "Notice of Readiness Tendered", berthId: "b-1", startTime: "2024-07-10T04:30", stopTime: "2024-07-10T10:30", durationMinutes: 360, durationFormatted: "06h 00m", percentageCounted: 0, prorata: 100, deductionCategory: "Waiting for berth", remarks: "6 hours NOR turnaround clause", isOcrExtracted: true, ocrConfidence: 0.96 },
    { id: "act-3", activityName: "Waiting for Berth", berthId: "b-1", startTime: "2024-07-10T10:30", stopTime: "2024-07-11T14:00", durationMinutes: 1650, durationFormatted: "1d 03h 30m", percentageCounted: 100, prorata: 100, deductionCategory: "Waiting for berth", remarks: "Laytime running while anchored", isOcrExtracted: true, ocrConfidence: 0.94 },
    { id: "act-4", activityName: "Berth All Fast", berthId: "b-1", startTime: "2024-07-11T14:00", stopTime: "2024-07-11T16:00", durationMinutes: 120, durationFormatted: "02h 00m", percentageCounted: 100, prorata: 100, deductionCategory: "Shifting", remarks: "Moored alongside Jurong 1", isOcrExtracted: true, ocrConfidence: 0.95 },
    { id: "act-5", activityName: "Commenced Discharge", berthId: "b-1", startTime: "2024-07-11T16:00", stopTime: "2024-07-14T20:00", durationMinutes: 4560, durationFormatted: "3d 04h 00m", percentageCounted: 100, prorata: 100, deductionCategory: "Other", remarks: "Cargo operations ongoing", isOcrExtracted: true, ocrConfidence: 0.97 },
    { id: "act-6", activityName: "Completed Discharge", berthId: "b-1", startTime: "2024-07-14T20:00", stopTime: "2024-07-14T22:30", durationMinutes: 150, durationFormatted: "02h 30m", percentageCounted: 100, prorata: 100, deductionCategory: "Other", remarks: "Manifold disconnected & dry cert", isOcrExtracted: true, ocrConfidence: 0.99 }
  ]);

  // Step 6: Deductions
  const [deductions, setDeductions] = useState<DeductionState[]>([
    { id: "d-1", type: "Rain Delay", startTime: "2024-07-12T14:00", stopTime: "2024-07-12T22:00", percentageTime: 50, prorata: 60, deductionHours: 4.0, remarks: "Torrential squall - Cl. 15(a) 50% laytime exclusion" },
    { id: "d-2", type: "Pumping Pressure Limitation", startTime: "2024-07-13T06:00", stopTime: "2024-07-13T18:00", percentageTime: 100, prorata: 60, deductionHours: 12.0, remarks: "Shore line backpressure exceeded 8 bar - Cl. 18 warranty" }
  ]);

  const steps = [
    { num: 1, label: "General Info", desc: "Commercial & Vessel" },
    { num: 2, label: "Voyage", desc: "Key Dates & Timebars" },
    { num: 3, label: "Ports", desc: "Port Terminals" },
    { num: 4, label: "Berths", desc: "Prorata & Volumes" },
    { num: 5, label: "Statement of Facts", desc: "Operations & OCR" },
    { num: 6, label: "Deductions", desc: "Weather & Operational" },
    { num: 7, label: "Calculation", desc: "Demurrage & Despatch" },
    { num: 8, label: "Review", desc: "Audit & Finalize" }
  ];

  // Auto-calculated fields
  const totalCargoQuantity = useMemo(() => {
    return berths.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
  }, [berths]);

  // Allowed laytime calculation: Total Quantity / Average Load Rate in days -> hours
  const allowedHours = useMemo(() => {
    if (ports.length === 0 || totalCargoQuantity === 0) return 72;
    const primaryPort = ports[0];
    const rate = Number(primaryPort.loadRate) || 35000;
    const daysAllowed = totalCargoQuantity / rate;
    return Number((daysAllowed * 24).toFixed(2));
  }, [totalCargoQuantity, ports]);

  // Total time used calculation from activities
  const totalUsedHours = useMemo(() => {
    let minutes = 0;
    activities.forEach(act => {
      const countedFrac = (Number(act.percentageCounted) || 0) / 100;
      const prorataFrac = (Number(act.prorata) || 100) / 100;
      minutes += (act.durationMinutes || 0) * countedFrac * prorataFrac;
    });
    return Number((minutes / 60).toFixed(2));
  }, [activities]);

  // Total deductions hours
  const totalDeductionsHours = useMemo(() => {
    return deductions.reduce((sum, d) => sum + (Number(d.deductionHours) || 0), 0);
  }, [deductions]);

  // Net laytime used
  const netLaytimeUsedHours = useMemo(() => {
    const net = totalUsedHours - totalDeductionsHours;
    return net > 0 ? Number(net.toFixed(2)) : 0;
  }, [totalUsedHours, totalDeductionsHours]);

  // Demurrage hours & total claim amount
  const demurrageHours = useMemo(() => {
    const diff = netLaytimeUsedHours - allowedHours;
    return diff > 0 ? Number(diff.toFixed(2)) : 0;
  }, [netLaytimeUsedHours, allowedHours]);

  const despatchHours = useMemo(() => {
    const diff = allowedHours - netLaytimeUsedHours;
    return diff > 0 ? Number(diff.toFixed(2)) : 0;
  }, [netLaytimeUsedHours, allowedHours]);

  const calculatedClaimAmount = useMemo(() => {
    if (demurrageHours > 0) {
      const days = demurrageHours / 24;
      return Math.round(days * (Number(demurrageRate) || 0));
    }
    if (despatchHours > 0) {
      const days = despatchHours / 24;
      return -Math.round(days * (Number(despatchRate) || 0));
    }
    return 0;
  }, [demurrageHours, despatchHours, demurrageRate, despatchRate]);

  // Time-bar calculation
  const timebarCalculation = useMemo(() => {
    if (!voyageEndDate) return { deadline: "N/A", daysRemaining: 90, status: "Safe" as const };
    const end = new Date(voyageEndDate);
    const deadline = new Date(end);
    deadline.setDate(end.getDate() + Number(claimTimebarDays || 90));
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let status: "Safe" | "Approaching" | "Urgent" | "Timebarred" = "Safe";
    if (daysRemaining < 0) status = "Timebarred";
    else if (daysRemaining <= 7) status = "Urgent";
    else if (daysRemaining <= 30) status = "Approaching";

    return {
      deadline: deadline.toISOString().split("T")[0],
      daysRemaining,
      status
    };
  }, [voyageEndDate, claimTimebarDays]);

  // OCR Auto-fill Simulation
  const handleSimulateOcr = () => {
    setIsOcrProcessing(true);
    info("Simulating OCR document ingestion for Statement of Facts...");
    setTimeout(() => {
      setActivities([
        { id: "act-1", activityName: "Vessel Arrived", berthId: berths[0]?.id || "b-1", startTime: "2024-07-10T04:00", stopTime: "2024-07-10T04:30", durationMinutes: 30, durationFormatted: "00h 30m", percentageCounted: 0, prorata: 100, deductionCategory: "Waiting for berth", remarks: "EOSP logged by Master & Pilot", isOcrExtracted: true, ocrConfidence: 0.99 },
        { id: "act-2", activityName: "Notice of Readiness Tendered", berthId: berths[0]?.id || "b-1", startTime: "2024-07-10T04:30", stopTime: "2024-07-10T10:30", durationMinutes: 360, durationFormatted: "06h 00m", percentageCounted: 0, prorata: 100, deductionCategory: "Waiting for berth", remarks: "NOR tendered electronically; 6h turn time", isOcrExtracted: true, ocrConfidence: 0.98 },
        { id: "act-3", activityName: "Waiting for Berth", berthId: berths[0]?.id || "b-1", startTime: "2024-07-10T10:30", stopTime: "2024-07-11T14:00", durationMinutes: 1650, durationFormatted: "1d 03h 30m", percentageCounted: 100, prorata: 100, deductionCategory: "Waiting for berth", remarks: "Congestion at Jurong offshore anchorage", isOcrExtracted: true, ocrConfidence: 0.96 },
        { id: "act-4", activityName: "Berth All Fast", berthId: berths[0]?.id || "b-1", startTime: "2024-07-11T14:00", stopTime: "2024-07-11T16:00", durationMinutes: 120, durationFormatted: "02h 00m", percentageCounted: 100, prorata: 100, deductionCategory: "Shifting", remarks: "All lines secured; gangway down", isOcrExtracted: true, ocrConfidence: 0.95 },
        { id: "act-5", activityName: "Commenced Discharge", berthId: berths[0]?.id || "b-1", startTime: "2024-07-11T16:00", stopTime: "2024-07-14T20:00", durationMinutes: 4560, durationFormatted: "3d 04h 00m", percentageCounted: 100, prorata: 100, deductionCategory: "Other", remarks: "Cargo transfer commenced", isOcrExtracted: true, ocrConfidence: 0.97 },
        { id: "act-6", activityName: "Completed Discharge", berthId: berths[0]?.id || "b-1", startTime: "2024-07-14T20:00", stopTime: "2024-07-14T22:30", durationMinutes: 150, durationFormatted: "02h 30m", percentageCounted: 100, prorata: 100, deductionCategory: "Other", remarks: "Hoses disconnected. Dry certificate signed", isOcrExtracted: true, ocrConfidence: 0.99 }
      ]);
      setIsOcrProcessing(false);
      success("OCR Extraction complete! 6 operational milestones extracted with high confidence.");
    }, 900);
  };

  // Submission handler
  const handleSaveClaim = async (asDraft = false) => {
    setIsSubmitting(true);
    try {
      const generatedClaimId = `CLM-2024-${Math.floor(1000 + Math.random() * 9000)}`;
      const payload: Partial<Claim> = {
        id: generatedClaimId,
        claimName,
        accountName: client,
        brokerName: broker,
        claimStatus: asDraft ? "Incomplete" : "Submitted",
        claimType,
        shipName,
        cpType,
        counterpartyName: counterparty,
        counterpartyType,
        demurrageRatePerDay: Number(demurrageRate),
        claimFiledAmount: calculatedClaimAmount > 0 ? calculatedClaimAmount : 0,
        receivedClaimAmount: calculatedClaimAmount > 0 ? calculatedClaimAmount : 0,
        billableAmount: calculatedClaimAmount > 0 ? calculatedClaimAmount : 0,
        claimNotes: notes,
        layday,
        cancellingDate,
        voyageEndDate,
        instructionReceivedDate,
        noticeReceivedDate,
        claimReceivedDate,
        charterpartyDate,
        noticeTimebarDays: Number(noticeTimebarDays),
        claimTimebarDays: Number(claimTimebarDays),
        timebarred: timebarCalculation.status === "Timebarred",
        assignedTo: "Current User",
        daysOpen: 1,
        claimClosed: false,
        ports: ports.map(p => ({
          id: p.id,
          claimId: generatedClaimId,
          name: p.name,
          portType: p.portType,
          loadRate: p.loadRate,
          berths: berths.filter(b => b.portId === p.id).map(b => ({
            id: b.id,
            portId: p.id,
            name: b.name,
            quantity: b.quantity,
            prorataShare: b.prorataShare,
            loadRate: b.loadRate,
            cargoType: b.cargoType
          }))
        })),
        activities: activities.map(a => ({
          id: a.id,
          claimId: generatedClaimId,
          berthId: a.berthId,
          activityName: a.activityName,
          startTime: a.startTime,
          stopTime: a.stopTime,
          durationMinutes: a.durationMinutes,
          durationFormatted: a.durationFormatted,
          percentageCounted: a.percentageCounted,
          prorata: a.prorata,
          deductionCategory: a.deductionCategory as any,
          remarks: a.remarks,
          isOcrExtracted: a.isOcrExtracted,
          ocrConfidence: a.ocrConfidence
        })),
        deductions: deductions.map(d => ({
          id: d.id,
          claimId: generatedClaimId,
          type: d.type,
          startTime: d.startTime,
          stopTime: d.stopTime,
          percentageTime: d.percentageTime,
          prorata: d.prorata,
          deductionHours: d.deductionHours,
          remarks: d.remarks
        })),
        documentLinks: [
          "Statement of Facts (SoF) - Verified",
          "Notice of Readiness (NOR)",
          "Charterparty Agreement (BPVOY4)",
          "Pumping Logs & Manifold Pressure Record"
        ]
      };

      const result = await createClaim(payload);
      success(asDraft ? "Draft claim saved successfully!" : "Claim submitted and registered successfully!");
      router.push(`/claims/${result.id}`);
    } catch (err: any) {
      error(err.message || "Failed to create claim");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <Link
            href="/claims"
            className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors mb-1"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Claims Ledger
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Ship className="w-6 h-6 text-blue-600" />
            New Laytime & Demurrage Claim Wizard
          </h1>
          <p className="text-sm text-slate-500">
            Step {currentStep} of 8: {steps[currentStep - 1].label} — {steps[currentStep - 1].desc}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSaveClaim(true)}
            disabled={isSubmitting}
            className="text-slate-700 hover:bg-slate-100"
          >
            <Save className="w-4 h-4 mr-1" />
            Save as Draft
          </Button>
          {currentStep === 8 ? (
            <Button
              size="sm"
              onClick={() => handleSaveClaim(false)}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Check className="w-4 h-4 mr-1" />
              {isSubmitting ? "Finalizing..." : "Submit Claim"}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setCurrentStep(prev => Math.min(8, prev + 1))}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Next Step
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Stepper Wizard Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between min-w-[760px]">
          {steps.map((step, idx) => {
            const isDone = currentStep > step.num;
            const isCurrent = currentStep === step.num;
            return (
              <React.Fragment key={step.num}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(step.num)}
                  className="flex flex-col items-center text-center group cursor-pointer focus:outline-none"
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-200 ${
                      isDone
                        ? "bg-emerald-600 text-white shadow-sm"
                        : isCurrent
                        ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-md scale-105"
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : step.num}
                  </div>
                  <span
                    className={`mt-2 text-xs font-semibold whitespace-nowrap ${
                      isCurrent ? "text-blue-600" : isDone ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-colors ${
                      currentStep > step.num ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STEP 1: GENERAL INFO */}
      {currentStep === 1 && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Step 1: Commercial & Vessel Overview</h2>
                <p className="text-sm text-slate-500">Provide high-level claim identifiers, vessel details, and contract parties.</p>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                General Contract Terms
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Claim Name *
                </label>
                <Input
                  value={claimName}
                  onChange={e => setClaimName(e.target.value)}
                  placeholder="e.g. MV Pacific Dawn - Singapore Bunker Demurrage"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Vessel / Ship Name *
                </label>
                <Input
                  value={shipName}
                  onChange={e => setShipName(e.target.value)}
                  placeholder="e.g. MV Pacific Dawn"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Account / Client Name *
                </label>
                <Select
                  value={client}
                  onChange={e => setClient(e.target.value)}
                  options={[
                    { value: "Trafigura Trading Pte Ltd", label: "Trafigura Trading Pte Ltd" },
                    { value: "Vitol Asia Pte Ltd", label: "Vitol Asia Pte Ltd" },
                    { value: "Glencore Singapore", label: "Glencore Singapore" },
                    { value: "Shell International Eastern", label: "Shell International Eastern" },
                    { value: "BP Marine Singapore", label: "BP Marine Singapore" },
                    { value: "TotalEnergies Trading", label: "TotalEnergies Trading" },
                    { value: "Chevron Products", label: "Chevron Products" }
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Broker Name
                </label>
                <Select
                  value={broker}
                  onChange={e => setBroker(e.target.value)}
                  options={[
                    { value: "Braemar ACM", label: "Braemar ACM" },
                    { value: "Clarksons Platou", label: "Clarksons Platou" },
                    { value: "Simpson Spence Young (SSY)", label: "Simpson Spence Young (SSY)" },
                    { value: "Gibson Shipbrokers", label: "Gibson Shipbrokers" },
                    { value: "Direct / No Broker", label: "Direct / No Broker" }
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Claim Type *
                </label>
                <Select
                  value={claimType}
                  onChange={e => setClaimType(e.target.value)}
                  options={[
                    { value: "Discharge Port Demurrage", label: "Discharge Port Demurrage" },
                    { value: "Load Port Demurrage", label: "Load Port Demurrage" },
                    { value: "Combined Demurrage", label: "Combined Demurrage" },
                    { value: "Despatch", label: "Despatch Claim" },
                    { value: "Detention", label: "Detention Claim" }
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Charterparty Form (CP Type) *
                </label>
                <Select
                  value={cpType}
                  onChange={e => setCpType(e.target.value)}
                  options={[
                    { value: "BPVOY4", label: "BPVOY4" },
                    { value: "SHELLVOY6", label: "SHELLVOY6" },
                    { value: "ASBATANKVOY", label: "ASBATANKVOY" },
                    { value: "GENCON", label: "GENCON 94" },
                    { value: "NYPE", label: "NYPE 93" },
                    { value: "BIMCO", label: "BIMCO Standard" },
                    { value: "Other", label: "Custom / Other" }
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Counterparty Name
                </label>
                <Input
                  value={counterparty}
                  onChange={e => setCounterparty(e.target.value)}
                  placeholder="e.g. Trafigura Trading SA"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Counterparty Type
                </label>
                <Select
                  value={counterpartyType}
                  onChange={e => setCounterpartyType(e.target.value)}
                  options={[
                    { value: "Charterer", label: "Charterer" },
                    { value: "Owner", label: "Owner" },
                    { value: "Trader", label: "Trader" },
                    { value: "Receiver", label: "Receiver" },
                    { value: "Shipper", label: "Shipper" }
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Demurrage Rate ($/day) *
                </label>
                <Input
                  type="number"
                  value={demurrageRate}
                  onChange={e => {
                    const rate = Number(e.target.value);
                    setDemurrageRate(rate);
                    setDespatchRate(rate / 2);
                  }}
                  placeholder="30000"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Despatch Rate ($/day)
                </label>
                <Input
                  type="number"
                  value={despatchRate}
                  onChange={e => setDespatchRate(Number(e.target.value))}
                  placeholder="15000"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Commercial Notes & Dispute Background
              </label>
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Include initial disputes, weather exceptions or cargo notes..."
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: VOYAGE DATES & TIMEBARS */}
      {currentStep === 2 && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Step 2: Key Operational Dates & Time-Bar Parameters</h2>
                <p className="text-sm text-slate-500">Record voyage milestones and configure automated time-bar deadline tracking.</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    timebarCalculation.status === "Safe"
                      ? "bg-emerald-100 text-emerald-800"
                      : timebarCalculation.status === "Approaching"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
                  }
                >
                  {timebarCalculation.status}: {timebarCalculation.daysRemaining} days remaining
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Laydays Commencement (Laycan From)
                </label>
                <Input
                  type="date"
                  value={layday}
                  onChange={e => setLayday(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cancelling Date (Laycan To)
                </label>
                <Input
                  type="date"
                  value={cancellingDate}
                  onChange={e => setCancellingDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Charterparty Date
                </label>
                <Input
                  type="date"
                  value={charterpartyDate}
                  onChange={e => setCharterpartyDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Voyage End Date (Discharge Complete) *
                </label>
                <Input
                  type="date"
                  value={voyageEndDate}
                  onChange={e => setVoyageEndDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notice Received Date
                </label>
                <Input
                  type="date"
                  value={noticeReceivedDate}
                  onChange={e => setNoticeReceivedDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Claim Received Date
                </label>
                <Input
                  type="date"
                  value={claimReceivedDate}
                  onChange={e => setClaimReceivedDate(e.target.value)}
                />
              </div>
            </div>

            {/* Timebar Settings Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Charterparty Time-Bar Configuration
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Claim Timebar (Days)</label>
                  <Input
                    type="number"
                    value={claimTimebarDays}
                    onChange={e => setClaimTimebarDays(Number(e.target.value))}
                  />
                  <p className="text-xs text-slate-400 mt-1">Standard: 90 days from discharge</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Notice Timebar (Days)</label>
                  <Input
                    type="number"
                    value={noticeTimebarDays}
                    onChange={e => setNoticeTimebarDays(Number(e.target.value))}
                  />
                  <p className="text-xs text-slate-400 mt-1">Standard: 30 days</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Calculated Filing Deadline</label>
                  <div className="h-9 px-3 flex items-center bg-white border border-slate-300 rounded-md font-mono text-sm font-semibold text-slate-800">
                    {timebarCalculation.deadline}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Timebar Risk Assessment</label>
                  <div className="h-9 px-3 flex items-center bg-white border border-slate-300 rounded-md text-sm font-bold">
                    <span className={timebarCalculation.status === "Safe" ? "text-emerald-600" : "text-amber-600"}>
                      {timebarCalculation.daysRemaining} days left ({timebarCalculation.status})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: PORTS */}
      {currentStep === 3 && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Step 3: Port Terminals Configuration</h2>
                <p className="text-sm text-slate-500">Define all loading, discharge, and lightering ports for this claim.</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const newPort: PortState = {
                    id: `p-${Date.now()}`,
                    name: "Port of Fujairah",
                    portType: "Load Port",
                    loadRate: 30000
                  };
                  setPorts([...ports, newPort]);
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Another Port
              </Button>
            </div>

            <div className="space-y-4">
              {ports.map((port, idx) => (
                <div key={port.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Port #{idx + 1}
                    </span>
                    {ports.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPorts(ports.filter(p => p.id !== port.id))}
                        className="text-rose-500 hover:text-rose-700 text-xs font-medium flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Port
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Port Name *</label>
                      <Input
                        value={port.name}
                        onChange={e => {
                          const updated = [...ports];
                          updated[idx].name = e.target.value;
                          setPorts(updated);
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Port Role *</label>
                      <Select
                        value={port.portType}
                        onChange={e => {
                          const updated = [...ports];
                          updated[idx].portType = e.target.value as any;
                          setPorts(updated);
                        }}
                        options={[
                          { value: "Discharge Port", label: "Discharge Port" },
                          { value: "Load Port", label: "Load Port" }
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Pumping / Loading Rate (MT/day)</label>
                      <Input
                        type="number"
                        value={port.loadRate}
                        onChange={e => {
                          const updated = [...ports];
                          updated[idx].loadRate = Number(e.target.value);
                          setPorts(updated);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: BERTHS & CARGO ALLOCATION */}
      {currentStep === 4 && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Step 4: Berths & Prorata Cargo Allocation</h2>
                <p className="text-sm text-slate-500">
                  Assign parcels across multi-berths with automatic prorata % and allowed laytime.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const newBerth: BerthState = {
                    id: `b-${Date.now()}`,
                    portId: ports[0]?.id || "p-1",
                    name: `Berth ${berths.length + 1}`,
                    quantity: 20000,
                    loadRate: 35000,
                    prorataShare: 0,
                    cargoType: "Gas Oil"
                  };
                  setBerths([...berths, newBerth]);
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Berth
              </Button>
            </div>

            <div className="space-y-4">
              {berths.map((berth, idx) => (
                <div key={berth.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Berth #{idx + 1}
                    </span>
                    {berths.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setBerths(berths.filter(b => b.id !== berth.id))}
                        className="text-rose-500 hover:text-rose-700 text-xs font-medium flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Berth
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Terminal / Berth Name</label>
                      <Input
                        value={berth.name}
                        onChange={e => {
                          const updated = [...berths];
                          updated[idx].name = e.target.value;
                          setBerths(updated);
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Cargo Grade</label>
                      <Input
                        value={berth.cargoType}
                        onChange={e => {
                          const updated = [...berths];
                          updated[idx].cargoType = e.target.value;
                          setBerths(updated);
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity (MT)</label>
                      <Input
                        type="number"
                        value={berth.quantity}
                        onChange={e => {
                          const updated = [...berths];
                          updated[idx].quantity = Number(e.target.value);
                          setBerths(updated);
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Prorata Share (%)</label>
                      <Input
                        type="number"
                        value={berth.prorataShare}
                        onChange={e => {
                          const updated = [...berths];
                          updated[idx].prorataShare = Number(e.target.value);
                          setBerths(updated);
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Allowed Laytime</label>
                      <div className="h-9 px-3 flex items-center bg-white border border-slate-200 rounded-md text-xs font-mono font-medium text-slate-700">
                        {((berth.quantity / (berth.loadRate || 35000)) * 24).toFixed(1)} hrs
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Cargo Summary */}
            <div className="flex flex-wrap items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <span className="font-semibold text-blue-900">
                Total Cargo Volume: {totalCargoQuantity.toLocaleString()} MT across {berths.length} berths
              </span>
              <span className="font-semibold text-blue-900">
                Contract Laytime Allowed: {allowedHours} hours ({(allowedHours / 24).toFixed(2)} days)
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 5: STATEMENT OF FACTS ACTIVITIES & OCR */}
      {currentStep === 5 && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Step 5: Statement of Facts (SoF) & Operations Log</h2>
                <p className="text-sm text-slate-500">Record port activities, turnaround allowances, and OCR extractions.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSimulateOcr}
                  disabled={isOcrProcessing}
                  className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                >
                  <Sparkles className="w-4 h-4 mr-1.5 text-indigo-600" />
                  {isOcrProcessing ? "Extracting..." : "Simulate OCR Ingestion"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const newAct: ActivityState = {
                      id: `act-${Date.now()}`,
                      activityName: "Operations Delay",
                      berthId: berths[0]?.id || "b-1",
                      startTime: "2024-07-12T10:00",
                      stopTime: "2024-07-12T14:00",
                      durationMinutes: 240,
                      durationFormatted: "04h 00m",
                      percentageCounted: 100,
                      prorata: 100,
                      deductionCategory: "Waiting for berth",
                      remarks: "Operational stoppage",
                      isOcrExtracted: false,
                      ocrConfidence: 1.0
                    };
                    setActivities([...activities, newAct]);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Activity
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Milestone / Activity</th>
                    <th className="p-2.5">Start Time</th>
                    <th className="p-2.5">Stop Time</th>
                    <th className="p-2.5">Duration</th>
                    <th className="p-2.5">Counted %</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Source / Confidence</th>
                    <th className="p-2.5">Remarks</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activities.map((act, idx) => (
                    <tr key={act.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2">
                        <Input
                          value={act.activityName}
                          onChange={e => {
                            const updated = [...activities];
                            updated[idx].activityName = e.target.value;
                            setActivities(updated);
                          }}
                          className="h-8 text-xs font-semibold"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="datetime-local"
                          value={act.startTime}
                          onChange={e => {
                            const updated = [...activities];
                            updated[idx].startTime = e.target.value;
                            setActivities(updated);
                          }}
                          className="h-8 text-xs font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="datetime-local"
                          value={act.stopTime}
                          onChange={e => {
                            const updated = [...activities];
                            updated[idx].stopTime = e.target.value;
                            setActivities(updated);
                          }}
                          className="h-8 text-xs font-mono"
                        />
                      </td>
                      <td className="p-2 font-mono font-medium text-slate-700 whitespace-nowrap">
                        {act.durationFormatted}
                      </td>
                      <td className="p-2 w-20">
                        <Input
                          type="number"
                          value={act.percentageCounted}
                          onChange={e => {
                            const updated = [...activities];
                            updated[idx].percentageCounted = Number(e.target.value);
                            setActivities(updated);
                          }}
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {act.deductionCategory}
                        </span>
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {act.isOcrExtracted ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            OCR ({(act.ocrConfidence * 100).toFixed(0)}%)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-50 text-slate-600 text-[10px]">
                            Manual
                          </Badge>
                        )}
                      </td>
                      <td className="p-2">
                        <Input
                          value={act.remarks}
                          onChange={e => {
                            const updated = [...activities];
                            updated[idx].remarks = e.target.value;
                            setActivities(updated);
                          }}
                          className="h-8 text-xs text-slate-500"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <button
                          type="button"
                          onClick={() => setActivities(activities.filter(a => a.id !== act.id))}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg">
              <span>Total Elapsed Laytime Activities: {activities.length} milestones</span>
              <span className="font-semibold text-slate-800">Total Counted Time: {totalUsedHours} hours</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 6: DEDUCTIONS & EXCEPTIONS */}
      {currentStep === 6 && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Step 6: Laytime Deductions & Exceptions</h2>
                <p className="text-sm text-slate-500">Configure rain delays, equipment breakdowns, and contractual laytime pauses.</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const newDeduction: DeductionState = {
                    id: `d-${Date.now()}`,
                    type: "Rain Delay",
                    startTime: "2024-07-13T10:00",
                    stopTime: "2024-07-13T14:00",
                    percentageTime: 50,
                    prorata: 100,
                    deductionHours: 2.0,
                    remarks: "Weather interruption"
                  };
                  setDeductions([...deductions, newDeduction]);
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Deduction
              </Button>
            </div>

            <div className="space-y-4">
              {deductions.map((ded, idx) => (
                <div key={ded.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Deduction #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDeductions(deductions.filter(d => d.id !== ded.id))}
                      className="text-rose-500 hover:text-rose-700 text-xs font-medium flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Deduction Type / Clause</label>
                      <Select
                        value={ded.type}
                        onChange={e => {
                          const updated = [...deductions];
                          updated[idx].type = e.target.value;
                          setDeductions(updated);
                        }}
                        options={[
                          { value: "Rain Delay", label: "Rain Delay / Weather" },
                          { value: "Pumping Pressure Limitation", label: "Pumping / Pressure Limit" },
                          { value: "Shore Breakdown", label: "Shore Breakdown" },
                          { value: "Tug / Pilot Strike", label: "Tug / Pilot Strike" },
                          { value: "Shifting", label: "Shifting between berths" },
                          { value: "Waiting for berth", label: "Waiting for berth (Charterer's risk)" },
                          { value: "Custom Exception", label: "Custom Exception" }
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
                      <Input
                        type="datetime-local"
                        value={ded.startTime}
                        onChange={e => {
                          const updated = [...deductions];
                          updated[idx].startTime = e.target.value;
                          setDeductions(updated);
                        }}
                        className="h-9 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Stop Time</label>
                      <Input
                        type="datetime-local"
                        value={ded.stopTime}
                        onChange={e => {
                          const updated = [...deductions];
                          updated[idx].stopTime = e.target.value;
                          setDeductions(updated);
                        }}
                        className="h-9 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Net Deducted (Hours)</label>
                      <Input
                        type="number"
                        value={ded.deductionHours}
                        onChange={e => {
                          const updated = [...deductions];
                          updated[idx].deductionHours = Number(e.target.value);
                          setDeductions(updated);
                        }}
                        className="h-9 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Contractual Rationale & Reference</label>
                    <Input
                      value={ded.remarks}
                      onChange={e => {
                        const updated = [...deductions];
                        updated[idx].remarks = e.target.value;
                        setDeductions(updated);
                      }}
                      placeholder="e.g. Cl. 15(a) 50% weather exclusion..."
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-sm">
              <span className="font-semibold text-amber-900">
                Total Excluded Deductions: {deductions.length} items
              </span>
              <span className="font-bold text-amber-900">
                Total Deduction Hours: {totalDeductionsHours} hrs
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 7: CALCULATION ENGINE */}
      {currentStep === 7 && (
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-lg font-bold text-slate-900">Step 7: Laytime & Demurrage Calculation Engine</h2>
                <p className="text-sm text-slate-500">Live computation of allowed laytime, net time consumed, and monetary settlement.</p>
              </div>

              {/* Settlement Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-medium text-slate-500">Allowed Laytime</span>
                  <p className="text-xl font-bold text-slate-900 mt-1">{allowedHours} hrs</p>
                  <p className="text-xs text-slate-400 mt-0.5">{(allowedHours / 24).toFixed(2)} days</p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-medium text-slate-500">Net Laytime Consumed</span>
                  <p className="text-xl font-bold text-slate-900 mt-1">{netLaytimeUsedHours} hrs</p>
                  <p className="text-xs text-slate-400 mt-0.5">{totalUsedHours}h gross - {totalDeductionsHours}h ded.</p>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-xs font-medium text-amber-700">Demurrage Hours</span>
                  <p className="text-xl font-bold text-amber-900 mt-1">
                    {demurrageHours > 0 ? `${demurrageHours} hrs` : "0.00 hrs"}
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    {demurrageHours > 0 ? `${(demurrageHours / 24).toFixed(3)} days on demurrage` : "Within laytime"}
                  </p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-xs font-medium text-blue-700">Calculated Claim (USD)</span>
                  <p className="text-2xl font-black text-blue-900 mt-1">
                    {formatCurrency(calculatedClaimAmount)}
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">Rate: {formatCurrency(demurrageRate)}/day</p>
                </div>
              </div>

              {/* Prorata Allocation Table */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3">Multi-Berth Prorata Allocation Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="p-3">Berth Terminal</th>
                        <th className="p-3">Cargo Grade</th>
                        <th className="p-3">Volume (MT)</th>
                        <th className="p-3">Prorata %</th>
                        <th className="p-3">Share of Demurrage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {berths.map((b, i) => {
                        const berthShare = (calculatedClaimAmount * (b.prorataShare || 0)) / 100;
                        return (
                          <tr key={b.id} className="hover:bg-slate-50">
                            <td className="p-3 font-semibold text-slate-800">{b.name}</td>
                            <td className="p-3 text-slate-600">{b.cargoType}</td>
                            <td className="p-3 font-mono">{b.quantity.toLocaleString()} MT</td>
                            <td className="p-3 font-semibold text-blue-600">{b.prorataShare}%</td>
                            <td className="p-3 font-mono font-bold text-slate-900">{formatCurrency(berthShare)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 8: AUDIT REVIEW & SUBMISSION */}
      {currentStep === 8 && (
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Step 8: Final Review & Submission Audit</h2>
                  <p className="text-sm text-slate-500">Verify commercial accuracy, compliance checks, and initiate claim filing.</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                  Ready for Submission
                </Badge>
              </div>

              {/* Pre-submission Checklist */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Pre-Submission Audit Checklist
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Valid Notice of Readiness (NOR) tendered within Laycan</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Statement of Facts activities chronologically consistent</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Deduction clauses backed by Charterparty stipulations</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Filing deadline is safe ({timebarCalculation.daysRemaining} days remaining)</span>
                  </div>
                </div>
              </div>

              {/* Final Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                <div className="border border-slate-200 rounded-xl p-4 space-y-2.5">
                  <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-1.5">Commercial Details</h4>
                  <div className="flex justify-between py-1 border-b border-slate-50 text-xs">
                    <span className="text-slate-500">Claim Title:</span>
                    <span className="font-semibold text-slate-800">{claimName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50 text-xs">
                    <span className="text-slate-500">Vessel:</span>
                    <span className="font-semibold text-slate-800">{shipName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50 text-xs">
                    <span className="text-slate-500">Charterer / Counterparty:</span>
                    <span className="font-semibold text-slate-800">{counterparty} ({counterpartyType})</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50 text-xs">
                    <span className="text-slate-500">CP Form:</span>
                    <span className="font-semibold text-slate-800">{cpType}</span>
                  </div>
                  <div className="flex justify-between py-1 text-xs">
                    <span className="text-slate-500">Demurrage Daily Rate:</span>
                    <span className="font-mono font-bold text-slate-800">{formatCurrency(demurrageRate)}/day</span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 space-y-2.5">
                  <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-1.5">Laytime & Settlement</h4>
                  <div className="flex justify-between py-1 border-b border-slate-50 text-xs">
                    <span className="text-slate-500">Allowed Laytime:</span>
                    <span className="font-semibold text-slate-800">{allowedHours} hrs</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50 text-xs">
                    <span className="text-slate-500">Net Laytime Used:</span>
                    <span className="font-semibold text-slate-800">{netLaytimeUsedHours} hrs</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50 text-xs">
                    <span className="text-slate-500">Excess Time (Demurrage):</span>
                    <span className="font-bold text-amber-600">{demurrageHours} hrs</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm bg-blue-50 p-2 rounded-lg mt-2">
                    <span className="font-bold text-blue-900">Total Claim Filed Amount:</span>
                    <span className="font-black text-blue-900 font-mono text-base">{formatCurrency(calculatedClaimAmount)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bottom Navigation Buttons */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-5">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
          className="text-slate-600"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous Step
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleSaveClaim(true)}
            disabled={isSubmitting}
          >
            <Save className="w-4 h-4 mr-1.5" />
            Save as Draft
          </Button>

          {currentStep < 8 ? (
            <Button
              onClick={() => setCurrentStep(prev => Math.min(8, prev + 1))}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Continue to Step {currentStep + 1}
              <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          ) : (
            <Button
              onClick={() => handleSaveClaim(false)}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Check className="w-4 h-4 mr-1.5" />
              {isSubmitting ? "Submitting Claim..." : "Submit Final Claim"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}