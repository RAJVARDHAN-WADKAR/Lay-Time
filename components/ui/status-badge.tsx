import React from "react";
import { cn } from "@/lib/utils/cn";
import { ClaimStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: ClaimStatus | string;
  className?: string;
  withDot?: boolean;
}

export function StatusBadge({ status, className, withDot = true }: StatusBadgeProps) {
  let style = "bg-slate-100 text-slate-700 border-slate-200";
  let dotColor = "bg-slate-500";

  switch (status) {
    case "2. Nil Demurrage (No Claim)":
      style = "bg-slate-100 text-slate-700 border-slate-300";
      dotColor = "bg-slate-400";
      break;
    case "3. Pending Info from Owners":
      style = "bg-amber-50 text-amber-700 border-amber-200";
      dotColor = "bg-amber-500 animate-pulse";
      break;
    case "4. Calculation Sent to Owners":
      style = "bg-indigo-50 text-indigo-700 border-indigo-200 font-medium";
      dotColor = "bg-indigo-500";
      break;
    case "5. Claim Filed":
      style = "bg-blue-50 text-blue-700 border-blue-200 font-semibold";
      dotColor = "bg-blue-600";
      break;
    case "6. Waiting Charterers Response":
      style = "bg-purple-50 text-purple-700 border-purple-200";
      dotColor = "bg-purple-500";
      break;
    case "7. Agreed":
      style = "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold";
      dotColor = "bg-emerald-600";
      break;
    case "8. Disputed":
      style = "bg-rose-50 text-rose-700 border-rose-200 font-semibold";
      dotColor = "bg-rose-600 animate-pulse";
      break;
    case "9. Legal":
      style = "bg-red-100 text-red-800 border-red-300 font-bold";
      dotColor = "bg-red-700 animate-pulse";
      break;
    case "10. Claim Closed":
      style = "bg-zinc-100 text-zinc-700 border-zinc-300";
      dotColor = "bg-zinc-400";
      break;
    case "11. Commercial Write Off":
      style = "bg-neutral-100 text-neutral-500 border-neutral-300";
      dotColor = "bg-neutral-400";
      break;
    case "Submitted":
      style = "bg-blue-50 text-blue-700 border-blue-200";
      dotColor = "bg-blue-600";
      break;
    case "Review":
      style = "bg-amber-50 text-amber-700 border-amber-200";
      dotColor = "bg-amber-500";
      break;
    case "Settled":
      style = "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold";
      dotColor = "bg-emerald-600";
      break;
    case "Disputed":
      style = "bg-rose-50 text-rose-700 border-rose-200 font-semibold";
      dotColor = "bg-rose-600 animate-pulse";
      break;
    case "Timebarred":
      style = "bg-purple-50 text-purple-700 border-purple-200";
      dotColor = "bg-purple-600";
      break;
    case "Incomplete":
      style = "bg-slate-100 text-slate-700 border-slate-300";
      dotColor = "bg-slate-500";
      break;
    case "Active":
      style = "bg-emerald-50 text-emerald-700 border-emerald-200 font-medium";
      dotColor = "bg-emerald-500";
      break;
    case "Inactive":
      style = "bg-slate-100 text-slate-500 border-slate-200";
      dotColor = "bg-slate-400";
      break;
    case "Uploaded":
      style = "bg-blue-50 text-blue-700 border-blue-200";
      dotColor = "bg-blue-500";
      break;
    case "OCR Completed":
      style = "bg-emerald-50 text-emerald-700 border-emerald-200";
      dotColor = "bg-emerald-500";
      break;
    case "OCR Failed":
      style = "bg-rose-50 text-rose-700 border-rose-200";
      dotColor = "bg-rose-500";
      break;
    default:
      style = "bg-slate-100 text-slate-700 border-slate-200";
      dotColor = "bg-slate-400";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border tracking-wide select-none",
        style,
        className
      )}
    >
      {withDot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />}
      <span>{status}</span>
    </span>
  );
}
