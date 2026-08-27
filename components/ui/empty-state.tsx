import React from "react";
import { Button } from "./button";
import { LucideIcon, Inbox } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryText?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionText,
  actionHref,
  onAction,
  secondaryText,
  onSecondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50",
        className
      )}
    >
      <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-inner">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6 leading-relaxed">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {actionText && actionHref && (
          <Link href={actionHref}>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 shadow-sm">
              {actionText}
            </Button>
          </Link>
        )}

        {actionText && onAction && !actionHref && (
          <Button
            size="sm"
            onClick={onAction}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 shadow-sm"
          >
            {actionText}
          </Button>
        )}

        {secondaryText && onSecondaryAction && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSecondaryAction}
            className="text-xs h-9 px-4 bg-white"
          >
            {secondaryText}
          </Button>
        )}
      </div>
    </div>
  );
}
