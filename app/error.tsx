"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application runtime error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 shadow-sm">
          <AlertTriangle className="h-10 w-10 text-rose-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            An unexpected error occurred while processing this request. Our operations monitoring team has been notified.
          </p>
          {error?.message && (
            <div className="mt-3 p-3 rounded-xl bg-slate-100 text-slate-600 font-mono text-xs break-all text-left border border-slate-200">
              {error.message}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 px-5 rounded-xl flex items-center justify-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </Button>
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto font-bold text-xs h-10 px-5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center space-x-2"
            >
              <Home className="h-4 w-4" />
              <span>Go to Dashboard</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
