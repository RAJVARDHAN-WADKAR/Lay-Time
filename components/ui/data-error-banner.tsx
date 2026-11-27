"use client";

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function DataErrorBanner({
  title = "Failed to load data",
  message,
  onRetry,
  isRetrying = false
}: DataErrorBannerProps) {
  return (
    <div
      role="alert"
      className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="flex items-start space-x-3">
        <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-rose-900">{title}</h3>
          <p className="text-xs text-rose-700 mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
          className="bg-white border-rose-300 text-rose-700 hover:bg-rose-100 text-xs font-semibold h-9 px-4 shrink-0 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRetrying ? "animate-spin" : ""}`} />
          Retry
        </Button>
      )}
    </div>
  );
}
