import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { ClaimStatus } from "@/lib/types";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "destructive" | "success" | "warning" | "purple" | "ocr" | "corrected";
  status?: ClaimStatus;
  withDot?: boolean;
}

export function Badge({ className, variant = "default", status, withDot = true, children, ...props }: BadgeProps) {
  let computedVariant = variant;
  let dotColor = "bg-blue-500";

  if (status) {
    switch (status) {
      case "Submitted":
        computedVariant = "default";
        dotColor = "bg-blue-500 animate-pulse-subtle";
        break;
      case "Incomplete":
        computedVariant = "warning";
        dotColor = "bg-amber-500 animate-pulse-subtle";
        break;
      case "Review":
        computedVariant = "purple";
        dotColor = "bg-purple-500 animate-pulse-subtle";
        break;
      case "Settled":
        computedVariant = "success";
        dotColor = "bg-emerald-500";
        break;
      case "Disputed":
        computedVariant = "destructive";
        dotColor = "bg-rose-500 animate-pulse";
        break;
      case "Timebarred":
        computedVariant = "secondary";
        dotColor = "bg-slate-500";
        break;
    }
  }

  const variants = {
    default: "bg-blue-50/90 text-blue-700 border-blue-200 shadow-2xs",
    secondary: "bg-slate-100 text-slate-700 border-slate-200 shadow-2xs",
    outline: "border-slate-300 text-slate-700 bg-white shadow-2xs",
    destructive: "bg-rose-50 text-rose-700 border-rose-200 shadow-2xs",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs font-semibold",
    warning: "bg-amber-50 text-amber-800 border-amber-200 shadow-2xs",
    purple: "bg-purple-50 text-purple-700 border-purple-200 shadow-2xs",
    ocr: "bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold tracking-wider uppercase",
    corrected: "bg-teal-50 text-teal-700 border-teal-200 text-[10px] font-bold tracking-wider uppercase",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all select-none",
        variants[computedVariant],
        className
      )}
      {...props}
    >
      {status && withDot && (
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
      )}
      <span>{children || status}</span>
    </div>
  );
}
