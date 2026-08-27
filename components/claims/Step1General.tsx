"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { CPType, ClaimStatus, ClaimType, CounterpartyType } from "@/lib/types";
import { Input, Select, Textarea } from "@/components/ui/inputs";
import { Ship, DollarSign, Calendar, FileText, UserCheck, Shield } from "lucide-react";

export interface ClaimFormData {
  claimName: string;
  accountName: string;
  brokerName: string;
  shipName: string;
  claimType: ClaimType;
  cpType: CPType;
  demurrageRatePerDay: number | string;
  claimFiledAmount: number | string;
  layday: string;
  cancellingDate: string;
  voyageEndDate: string;
  instructionReceivedDate: string;
  noticeReceivedDate: string;
  claimReceivedDate: string;
  claimNotes: string;
  voyageNumber?: string;
  claimStatus: ClaimStatus;
  counterpartyName?: string;
  counterpartyType?: CounterpartyType;
  noticeTimebarDays?: number | string;
  claimTimebarDays?: number | string;
  charterpartyDate?: string;
  assignedTo?: string;
  contentions?: string;
}

interface Step1GeneralProps {
  form: UseFormReturn<ClaimFormData>;
}

export function Step1General({ form }: Step1GeneralProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-6 text-xs text-left">
      {/* 1. General Identification */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2 mb-4">
          <Ship className="h-4 w-4 text-blue-600" />
          <span>Vessel & Commercial Identification</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Claim Name */}
          <div className="space-y-1 sm:col-span-2">
            <label className="font-bold text-slate-700 block">
              Claim Name <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. MV Pacific Voyager - Discharge Demurrage"
              {...register("claimName", { required: "Claim Name is required" })}
              error={errors.claimName?.message}
            />
          </div>

          {/* Ship Name */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">
              Ship Name <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. MV Pacific Voyager"
              {...register("shipName", { required: "Ship Name is required" })}
              error={errors.shipName?.message}
            />
          </div>

          {/* Account / Client Name */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">
              Account / Client Name <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. Trafigura Trading Pte Ltd"
              {...register("accountName", { required: "Client Name is required" })}
              error={errors.accountName?.message}
            />
          </div>

          {/* Broker Name */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Broker Name</label>
            <Input placeholder="e.g. Braemar ACM Shipbroking" {...register("brokerName")} />
          </div>

          {/* Voyage Number */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Voyage Number</label>
            <Input placeholder="e.g. VOY-2026-01" {...register("voyageNumber")} />
          </div>
        </div>
      </div>

      {/* 2. Contractual Terms & Rates */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2 mb-4">
          <DollarSign className="h-4 w-4 text-emerald-600" />
          <span>Charterparty & Financial Terms</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Claim Type */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">
              Claim Type <span className="text-rose-500">*</span>
            </label>
            <Select {...register("claimType", { required: "Claim Type is required" })}>
              <option value="Load Port Demurrage">Load Port Demurrage</option>
              <option value="Discharge Port Demurrage">Discharge Port Demurrage</option>
              <option value="Combined Demurrage">Combined Demurrage</option>
              <option value="Despatch">Despatch</option>
              <option value="Detention">Detention</option>
            </Select>
          </div>

          {/* CP Type */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">
              CP Type <span className="text-rose-500">*</span>
            </label>
            <Select {...register("cpType", { required: "CP Type is required" })}>
              <option value="GENCON">GENCON</option>
              <option value="ASBATANKVOY">ASBATANKVOY</option>
              <option value="BPVOY4">BPVOY4</option>
              <option value="SHELLVOY6">SHELLVOY6</option>
              <option value="NYPE">NYPE</option>
              <option value="BIMCO">BIMCO</option>
              <option value="Other">Other</option>
            </Select>
          </div>

          {/* Demurrage Rate (USD) */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">
              Demurrage Rate (USD/day) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="number"
              placeholder="e.g. 28000"
              {...register("demurrageRatePerDay", {
                required: "Demurrage rate is required",
                min: { value: 0, message: "Must be positive" },
              })}
              error={errors.demurrageRatePerDay?.message}
            />
          </div>

          {/* Claim Filed Amount (USD) */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">
              Claim Filed Amount (USD) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="number"
              placeholder="e.g. 85000"
              {...register("claimFiledAmount", {
                required: "Claim filed amount is required",
                min: { value: 0, message: "Must be positive" },
              })}
              error={errors.claimFiledAmount?.message}
            />
          </div>
        </div>
      </div>

      {/* 3. Operational & Timebar Dates */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2 mb-4">
          <Calendar className="h-4 w-4 text-purple-600" />
          <span>Operational & Notice Dates</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Layday */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Layday</label>
            <Input type="date" {...register("layday")} />
          </div>

          {/* Cancelling Date */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Cancelling Date</label>
            <Input type="date" {...register("cancellingDate")} />
          </div>

          {/* Voyage End Date */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Voyage End Date</label>
            <Input type="date" {...register("voyageEndDate")} />
          </div>

          {/* Instruction Received Date */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Instruction Received Date</label>
            <Input type="date" {...register("instructionReceivedDate")} />
          </div>

          {/* Notice Received Date */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Notice Received Date</label>
            <Input type="date" {...register("noticeReceivedDate")} />
          </div>

          {/* Claim Received Date */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Claim Received Date</label>
            <Input type="date" {...register("claimReceivedDate")} />
          </div>
        </div>
      </div>

      {/* 4. Notes & Operational Contentions */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2 mb-4">
          <FileText className="h-4 w-4 text-slate-600" />
          <span>Claim Notes & Remarks</span>
        </h3>

        <div className="space-y-1">
          <label className="font-bold text-slate-700 block">Claim Notes</label>
          <Textarea
            rows={3}
            placeholder="Enter any relevant charter terms, weather exceptions, or operational remarks..."
            {...register("claimNotes")}
          />
        </div>
      </div>
    </div>
  );
}
