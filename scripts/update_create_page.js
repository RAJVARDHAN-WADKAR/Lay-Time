const fs = require('fs');
const path = require('path');

const createCode = `"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { createClaim } from "@/lib/api";
import { Claim, Port, SoFActivity } from "@/lib/types";
import { Step1General, ClaimFormData } from "@/components/claims/Step1General";
import { Step2PortsBerths } from "@/components/claims/Step2PortsBerths";
import { Step3SoF } from "@/components/claims/Step3SoF";
import { Step4Review } from "@/components/claims/Step4Review";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/hooks/useToast";
import { Check, ChevronLeft, ChevronRight, Save, ArrowLeft, Wand2, Sparkles } from "lucide-react";
import Link from "next/link";

export default function CreateClaimPage() {
  const router = useRouter();
  const { success } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ClaimFormData>({
    defaultValues: {
      claimName: "MV Pacific Voyager - Rotterdam Crude Discharge",
      shipName: "MV Pacific Voyager",
      voyageNumber: "VOY-2024-10A",
      accountName: "Trafigura Trading Pte Ltd",
      brokerName: "Braemar ACM Shipbroking",
      counterpartyName: "Trafigura Maritime AG",
      counterpartyType: "Charterer",
      claimType: "Discharge Port Demurrage",
      claimStatus: "Submitted",
      cpType: "BPVOY4",
      demurrageRatePerDay: 32000,
      charterpartyDate: "2024-07-01",
      layday: "2024-07-10",
      cancellingDate: "2024-07-18",
      voyageEndDate: "2024-07-24",
      instructionReceivedDate: "2024-07-25",
      noticeReceivedDate: "2024-07-26",
      claimReceivedDate: "2024-08-01",
      noticeTimebarDays: 30,
      claimTimebarDays: 90,
      claimFiledAmount: 115000,
      assignedTo: "Sarah Jenkins",
      claimNotes: "Vessel tendered NOR on arrival; 8h weather stoppage deducted at 50%.",
      contentions: "Charterers dispute weather duration based on port log.",
    },
  });

  const [ports, setPorts] = useState<Port[]>([
    {
      id: "port-create-1",
      claimId: "",
      name: "Port of Rotterdam",
      portType: "Discharge Port",
      loadRate: 45000,
      berths: [
        {
          id: "berth-create-1",
          portId: "port-create-1",
          name: "Vopak Terminal EuroTank Jetty 4",
          quantity: 65000,
          prorataShare: 100,
          isProrataOverridden: false,
          loadRate: 45000,
          cargoType: "Urals Crude",
        },
      ],
    },
  ]);

  const [activities, setActivities] = useState<SoFActivity[]>([
    {
      id: "act-create-1",
      claimId: "",
      portId: "port-create-1",
      berthId: "berth-create-1",
      activityName: "Vessel arrived",
      startTime: "2024-07-20T06:00",
      stopTime: "2024-07-20T06:30",
      durationMinutes: 30,
      durationFormatted: "00h 30m",
      percentageCounted: 100,
      prorata: 100,
      deductionCategory: "Other",
      isOcrExtracted: false,
    },
    {
      id: "act-create-2",
      claimId: "",
      portId: "port-create-1",
      berthId: "berth-create-1",
      activityName: "NOR tendered",
      startTime: "2024-07-20T06:30",
      stopTime: "2024-07-20T12:30",
      durationMinutes: 360,
      durationFormatted: "06h 00m",
      percentageCounted: 0,
      prorata: 100,
      deductionCategory: "Waiting for berth",
      remarks: "6 hours Notice time allowance under Clause 6",
      isOcrExtracted: false,
    },
    {
      id: "act-create-3",
      claimId: "",
      portId: "port-create-1",
      berthId: "berth-create-1",
      activityName: "Discharging commenced",
      startTime: "2024-07-20T14:00",
      stopTime: "2024-07-22T18:00",
      durationMinutes: 3120,
      durationFormatted: "2d 04h 00m",
      percentageCounted: 100,
      prorata: 100,
      deductionCategory: "Other",
      isOcrExtracted: false,
    },
    {
      id: "act-create-4",
      claimId: "",
      portId: "port-create-1",
      berthId: "berth-create-1",
      activityName: "Rain",
      startTime: "2024-07-21T02:00",
      stopTime: "2024-07-21T10:00",
      durationMinutes: 480,
      durationFormatted: "08h 00m",
      percentageCounted: 50,
      prorata: 100,
      deductionCategory: "Rain",
      remarks: "Heavy rainfall in port area",
      isOcrExtracted: false,
    },
  ]);

  const steps = [
    { num: 1, label: "General Info", desc: "Vessel & Commercial Terms" },
    { num: 2, label: "Ports & Berths", desc: "Multi-Berth Allocations" },
    { num: 3, label: "Statement of Facts", desc: "Operations & Deductions" },
    { num: 4, label: "Review & Publish", desc: "Verification & Calculations" },
  ];

  // Quick Preset Templates for Easy Demo Testing
  const applyTemplate = (template: "tanker" | "drybulk" | "multiberth") => {
    if (template === "tanker") {
      form.reset({
        claimName: "MT Nordic Pride - Houston Ship Channel Loading",
        shipName: "MT Nordic Pride",
        voyageNumber: "VOY-2024-12C",
        accountName: "Shell Global Eastern",
        brokerName: "Simpson Spence Young",
        counterpartyName: "Shell Western Supply",
        counterpartyType: "Charterer",
        claimType: "Load Port Demurrage",
        claimStatus: "Submitted",
        cpType: "SHELLVOY6",
        demurrageRatePerDay: 28000,
        charterpartyDate: "2024-07-15",
        layday: "2024-07-25",
        cancellingDate: "2024-08-01",
        voyageEndDate: "2024-08-08",
        instructionReceivedDate: "2024-08-09",
        noticeReceivedDate: "2024-08-10",
        claimReceivedDate: "2024-08-15",
        noticeTimebarDays: 30,
        claimTimebarDays: 60,
        claimFiledAmount: 89600,
        assignedTo: "Sarah Jenkins",
        claimNotes: "Dense fog closed Galveston channel for 18h.",
        contentions: "Dispute over weather clause half-rate allowance.",
      });
    } else if (template === "drybulk") {
      form.reset({
        claimName: "MV Baltic Osprey - Antwerp Grain Discharging",
        shipName: "MV Baltic Osprey",
        voyageNumber: "VOY-2024-09B",
        accountName: "Cargill International SA",
        brokerName: "Clarksons Platou",
        counterpartyName: "Cargill Ocean Transportation",
        counterpartyType: "Charterer",
        claimType: "Discharge Port Demurrage",
        claimStatus: "Incomplete",
        cpType: "GENCON",
        demurrageRatePerDay: 19500,
        charterpartyDate: "2024-06-20",
        layday: "2024-07-01",
        cancellingDate: "2024-07-10",
        voyageEndDate: "2024-07-18",
        instructionReceivedDate: "2024-07-19",
        noticeReceivedDate: "2024-07-20",
        claimReceivedDate: "2024-07-26",
        noticeTimebarDays: 30,
        claimTimebarDays: 90,
        claimFiledAmount: 58500,
        assignedTo: "Sarah Jenkins",
        claimNotes: "Shore crane breakdown during hatch opening.",
        contentions: "Equipment breakdown deduction contentious.",
      });
    }
  };

  const handleNextStep = async () => {
    if (currentStep === 1) {
      const isValid = await form.trigger();
      if (!isValid) return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    const formVals = form.getValues();

    const newClaimPayload: Omit<Claim, "id" | "createdAt" | "updatedAt"> = {
      claimName: formVals.claimName || \`\${formVals.shipName} Claim\`,
      accountName: formVals.accountName,
      brokerName: formVals.brokerName || "Direct",
      claimStatus: formVals.claimStatus,
      claimType: formVals.claimType,
      shipName: formVals.shipName,
      cpType: formVals.cpType,
      voyageNumber: formVals.voyageNumber,
      assignedTo: formVals.assignedTo || "Sarah Jenkins",
      daysOpen: 0,
      claimClosed: false,
      contentions: formVals.contentions || "",
      claimNotes: formVals.claimNotes || "",
      documentLinks: [],
      demurrageRatePerDay: Number(formVals.demurrageRatePerDay) || 25000,
      counterpartyName: formVals.counterpartyName,
      counterpartyType: formVals.counterpartyType,
      claimFiledAmount: Number(formVals.claimFiledAmount) || 0,
      receivedClaimAmount: 0,
      agreedAmount: 0,
      billableAmount: Number(formVals.claimFiledAmount) || 0,
      paymentReceived: 0,
      paymentConcluded: false,
      layday: formVals.layday,
      cancellingDate: formVals.cancellingDate,
      voyageEndDate: formVals.voyageEndDate,
      instructionReceivedDate: formVals.instructionReceivedDate,
      noticeReceivedDate: formVals.noticeReceivedDate,
      claimReceivedDate: formVals.claimReceivedDate,
      noticeTimebarDays: Number(formVals.noticeTimebarDays) || 30,
      claimTimebarDays: Number(formVals.claimTimebarDays) || 90,
      timebarred: false,
      charterpartyDate: formVals.charterpartyDate,
      daysAwaitingPayment: 0,
      ports,
      activities,
    };

    const created = await createClaim(newClaimPayload);
    setIsSubmitting(false);
    success("Claim Published", \`Claim \${created.id} (\${created.shipName}) created successfully\`);
    router.push(\`/claims/\${created.id}\`);
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link href="/claims">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Demurrage Claim</h1>
            <p className="text-xs text-slate-500">
              4-Step guided workflow for commercial filing, port allocations, and Statement of Facts logs
            </p>
          </div>
        </div>

        {/* Demo Fast Templates */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase hidden md:inline flex items-center">
            <Wand2 className="h-3 w-3 mr-1 text-purple-600" /> Templates:
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyTemplate("tanker")}
            className="text-[11px] h-8 text-slate-700 bg-white"
          >
            Tanker Voyage
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyTemplate("drybulk")}
            className="text-[11px] h-8 text-slate-700 bg-white"
          >
            Dry Bulk Grain
          </Button>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        {steps.map((step) => {
          const isDone = currentStep > step.num;
          const isCurrent = currentStep === step.num;

          return (
            <div
              key={step.num}
              onClick={() => {
                if (step.num < currentStep) setCurrentStep(step.num);
              }}
              className={\`flex items-center space-x-3 p-3 rounded-xl transition-all \${
                isCurrent
                  ? "bg-blue-50/90 border border-blue-200 text-blue-950 shadow-2xs font-semibold"
                  : isDone
                  ? "bg-slate-50 text-slate-700 cursor-pointer hover:bg-slate-100"
                  : "text-slate-400 opacity-60"
              }\`}
            >
              <div
                className={\`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 \${
                  isCurrent
                    ? "bg-blue-600 text-white shadow-xs"
                    : isDone
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-600"
                }\`}
              >
                {isDone ? <Check className="h-4 w-4" /> : step.num}
              </div>
              <div className="text-left overflow-hidden">
                <div className="text-xs font-bold leading-tight truncate">{step.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 hidden sm:block truncate">
                  {step.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step Container Card */}
      <Card className="border-slate-200 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          {currentStep === 1 && <Step1General form={form} />}
          {currentStep === 2 && <Step2PortsBerths ports={ports} setPorts={setPorts} />}
          {currentStep === 3 && (
            <Step3SoF ports={ports} activities={activities} setActivities={setActivities} />
          )}
          {currentStep === 4 && (
            <Step4Review formData={form.getValues()} ports={ports} activities={activities} />
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
            {currentStep > 1 ? (
              <Button variant="outline" onClick={handlePrevStep} className="flex items-center space-x-1.5 text-xs h-9">
                <ChevronLeft className="h-4 w-4" />
                <span>Previous Step</span>
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <Button onClick={handleNextStep} className="flex items-center space-x-1.5 text-xs bg-blue-600 hover:bg-blue-700 h-9">
                <span>Continue to Step {currentStep + 1}</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleFinalSubmit}
                isLoading={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-2 text-xs h-9 px-6 font-bold shadow-md"
              >
                <Save className="h-4 w-4" />
                <span>Publish Claim to Ledger</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
`;

fs.writeFileSync(path.join(process.cwd(), 'app/claims/create/page.tsx'), createCode, 'utf8');
console.log('Updated app/claims/create/page.tsx with attractive templates');
