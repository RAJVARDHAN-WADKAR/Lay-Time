"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { createClaim } from "@/lib/api";
import { Claim, Port, SoFActivity, DeductionItem } from "@/lib/types";
import { Step1General, ClaimFormData } from "@/components/claims/Step1General";
import { Step2PortsBerths } from "@/components/claims/Step2PortsBerths";
import { Step3SoF } from "@/components/claims/Step3SoF";
import { Step4Review } from "@/components/claims/Step4Review";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/hooks/useToast";
import { Check, ChevronLeft, ChevronRight, Save, ArrowLeft, PlusCircle } from "lucide-react";
import Link from "next/link";

export default function CreateClaimPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Strictly ZERO DATA by default
  const form = useForm<ClaimFormData>({
    defaultValues: {
      claimName: "",
      shipName: "",
      voyageNumber: "",
      accountName: "",
      brokerName: "",
      counterpartyName: "",
      counterpartyType: "Charterer",
      claimType: "Discharge Port Demurrage",
      claimStatus: "Submitted",
      cpType: "BPVOY4",
      demurrageRatePerDay: "",
      charterpartyDate: "",
      layday: "",
      cancellingDate: "",
      voyageEndDate: "",
      instructionReceivedDate: "",
      noticeReceivedDate: "",
      claimReceivedDate: "",
      noticeTimebarDays: 30,
      claimTimebarDays: 90,
      claimFiledAmount: "",
      assignedTo: "Claim Processor",
      claimNotes: "",
      contentions: "",
    },
  });

  // Dynamic ports and activities starting at empty
  const [ports, setPorts] = useState<Port[]>([]);
  const [activities, setActivities] = useState<SoFActivity[]>([]);
  const [deductions, setDeductions] = useState<DeductionItem[]>([]);

  const steps = [
    { num: 1, label: "General Info", desc: "Vessel & Commercial Terms" },
    { num: 2, label: "Ports & Berths", desc: "Multi-Berth Allocations" },
    { num: 3, label: "Statement of Facts", desc: "Operations & Deductions" },
    { num: 4, label: "Review & Publish", desc: "Verification & Calculations" },
  ];

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

    try {
      const newClaimPayload: Omit<Claim, "id" | "createdAt" | "updatedAt"> = {
        claimName: formVals.claimName || `${formVals.shipName} Claim`,
        accountName: formVals.accountName,
        brokerName: formVals.brokerName || "Direct",
        claimStatus: formVals.claimStatus || "Submitted",
        claimType: formVals.claimType,
        shipName: formVals.shipName,
        cpType: formVals.cpType,
        voyageNumber: formVals.voyageNumber || "",
        assignedTo: formVals.assignedTo || "Claim Processor",
        daysOpen: 0,
        claimClosed: false,
        contentions: formVals.contentions || "",
        claimNotes: formVals.claimNotes || "",
        documentLinks: [],
        demurrageRatePerDay: Number(formVals.demurrageRatePerDay) || 0,
        counterpartyName: formVals.counterpartyName || formVals.accountName,
        counterpartyType: formVals.counterpartyType || "Charterer",
        claimFiledAmount: Number(formVals.claimFiledAmount) || 0,
        receivedClaimAmount: 0,
        agreedAmount: 0,
        billableAmount: Number(formVals.claimFiledAmount) || 0,
        paymentReceived: 0,
        paymentConcluded: false,
        layday: formVals.layday || "",
        cancellingDate: formVals.cancellingDate || "",
        voyageEndDate: formVals.voyageEndDate || "",
        instructionReceivedDate: formVals.instructionReceivedDate || "",
        noticeReceivedDate: formVals.noticeReceivedDate || "",
        claimReceivedDate: formVals.claimReceivedDate || "",
        noticeTimebarDays: Number(formVals.noticeTimebarDays) || 30,
        claimTimebarDays: Number(formVals.claimTimebarDays) || 90,
        timebarred: false,
        charterpartyDate: formVals.charterpartyDate || "",
        daysAwaitingPayment: 0,
        ports,
        activities,
        deductions,
      };

      const created = await createClaim(newClaimPayload);
      setIsSubmitting(false);
      success("Claim Published", `Claim ${created.id} (${created.shipName}) created successfully`);
      router.push(`/claims/${created.id}`);
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
      error("Submission Failed", "Could not create claim. Please check form fields.");
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link href="/claims">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl bg-white">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              New Demurrage Claim
            </h1>
            <p className="text-xs text-slate-500">
              4-Step guided workflow for commercial filing, port allocations, and Statement of Facts
            </p>
          </div>
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
              className={`flex items-center space-x-3 p-3 rounded-xl transition-all ${
                isCurrent
                  ? "bg-blue-50/90 border border-blue-200 text-blue-950 shadow-2xs font-semibold"
                  : isDone
                  ? "bg-slate-50 text-slate-700 cursor-pointer hover:bg-slate-100"
                  : "text-slate-400 opacity-60"
              }`}
            >
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isCurrent
                    ? "bg-blue-600 text-white shadow-xs"
                    : isDone
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
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
            <Step4Review
              formData={form.getValues()}
              ports={ports}
              activities={activities}
              deductions={deductions}
              setDeductions={setDeductions}
            />
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
            {currentStep > 1 ? (
              <Button
                variant="outline"
                onClick={handlePrevStep}
                className="flex items-center space-x-1.5 text-xs h-9 bg-white rounded-xl"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
            ) : (
              <Link href="/claims">
                <Button variant="outline" className="text-xs h-9 bg-white rounded-xl">
                  Cancel
                </Button>
              </Link>
            )}

            {currentStep < 4 ? (
              <Button
                onClick={handleNextStep}
                className="flex items-center space-x-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white h-9 px-5 rounded-xl font-semibold shadow-xs"
              >
                <span>Save &amp; Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleFinalSubmit}
                isLoading={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-2 text-xs h-9 px-6 font-bold shadow-md rounded-xl"
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
