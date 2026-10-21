"use client";

import React from "react";
import Link from "next/link";
import { Home, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-blue-50 border border-blue-200 text-blue-600 shadow-sm">
          <span className="text-3xl font-black">404</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            The page or maritime record you are looking for does not exist, has been archived, or you may have followed an outdated link.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 px-5 rounded-xl flex items-center justify-center space-x-2">
              <Home className="h-4 w-4" />
              <span>Go to Dashboard</span>
            </Button>
          </Link>
          <Link href="/claims" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto font-bold text-xs h-10 px-5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center space-x-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>View Claims</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
