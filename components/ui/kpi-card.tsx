import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  variant?: "blue" | "green" | "amber" | "rose" | "purple" | "slate";
  trend?: string;
  className?: string;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "blue",
  trend,
  className,
}: KPICardProps) {
  const colorMap = {
    blue: {
      bg: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
      valueColor: "text-slate-900",
      subColor: "text-blue-600",
      hoverBorder: "hover:border-blue-300",
    },
    green: {
      bg: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
      valueColor: "text-slate-900",
      subColor: "text-emerald-600",
      hoverBorder: "hover:border-emerald-300",
    },
    amber: {
      bg: "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white",
      valueColor: "text-slate-900",
      subColor: "text-amber-600",
      hoverBorder: "hover:border-amber-300",
    },
    rose: {
      bg: "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white",
      valueColor: "text-slate-900",
      subColor: "text-rose-600",
      hoverBorder: "hover:border-rose-300",
    },
    purple: {
      bg: "bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white",
      valueColor: "text-slate-900",
      subColor: "text-purple-600",
      hoverBorder: "hover:border-purple-300",
    },
    slate: {
      bg: "bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white",
      valueColor: "text-slate-900",
      subColor: "text-slate-500",
      hoverBorder: "hover:border-slate-300",
    },
  };

  const currentTheme = colorMap[variant] || colorMap.blue;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs transition-all duration-200 hover:shadow-xs",
        currentTheme.hoverBorder,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <div
          className={cn(
            "p-2 rounded-xl transition-colors duration-200",
            currentTheme.bg
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <div className={cn("text-2xl font-black tracking-tight", currentTheme.valueColor)}>
          {value}
        </div>
        <div className="flex items-center justify-between text-xs font-medium text-slate-500 pt-0.5">
          <span>{subtitle}</span>
          {trend && <span className={cn("font-semibold", currentTheme.subColor)}>{trend}</span>}
        </div>
      </div>
    </div>
  );
}
