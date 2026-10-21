"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, ScanText, PlusCircle, ArrowRight } from "lucide-react";

export function ProcessorWorkbench() {
  return (
    <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl">
      <CardHeader className="p-5 pb-3 border-b border-slate-100">
        <CardTitle className="text-sm font-bold text-slate-900">
          Analyst Tools & Calculations
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Core calculation engines and document analysis shortcuts
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/claims/create" className="group">
          <div className="p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-xs transition bg-slate-50/50 flex flex-col justify-between h-full">
            <div className="flex items-center space-x-2 text-blue-600 mb-2">
              <PlusCircle className="h-5 w-5" />
              <span className="font-bold text-xs text-slate-900 group-hover:text-blue-600">New Claim</span>
            </div>
            <p className="text-[11px] text-slate-500">Step-by-step wizard to register voyage claims and SoF events.</p>
          </div>
        </Link>

        <Link href="/calculator" className="group">
          <div className="p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-xs transition bg-slate-50/50 flex flex-col justify-between h-full">
            <div className="flex items-center space-x-2 text-blue-600 mb-2">
              <Calculator className="h-5 w-5" />
              <span className="font-bold text-xs text-slate-900 group-hover:text-blue-600">Laytime Engine</span>
            </div>
            <p className="text-[11px] text-slate-500">Compute allowed vs used time, reversible laytime, and demurrage.</p>
          </div>
        </Link>

        <Link href="/ocr" className="group">
          <div className="p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-xs transition bg-slate-50/50 flex flex-col justify-between h-full">
            <div className="flex items-center space-x-2 text-emerald-600 mb-2">
              <ScanText className="h-5 w-5" />
              <span className="font-bold text-xs text-slate-900 group-hover:text-emerald-600">OCR & SoF Parser</span>
            </div>
            <p className="text-[11px] text-slate-500">Extract Statement of Facts port logs automatically from PDF/image.</p>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
