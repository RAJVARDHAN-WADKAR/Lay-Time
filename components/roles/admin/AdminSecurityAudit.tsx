"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, Lock, Key, CheckCircle } from "lucide-react";

export function AdminSecurityAudit() {
  return (
    <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl">
      <CardHeader className="p-5 pb-3 border-b border-slate-100">
        <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Security & Access Control Status</span>
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Enforcement state of corporate authentication & authorization policies
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
          <div className="flex items-center space-x-2">
            <Lock className="h-4 w-4 text-slate-600" />
            <span className="font-semibold text-slate-700">Zero-Trust RBAC Middleware</span>
          </div>
          <span className="font-bold text-emerald-600 flex items-center space-x-1">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Active</span>
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
          <div className="flex items-center space-x-2">
            <Key className="h-4 w-4 text-slate-600" />
            <span className="font-semibold text-slate-700">Session JWT & HttpOnly Cookies</span>
          </div>
          <span className="font-bold text-emerald-600 flex items-center space-x-1">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Secured</span>
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-slate-600" />
            <span className="font-semibold text-slate-700">Row-Level Scope Isolation</span>
          </div>
          <span className="font-bold text-emerald-600 flex items-center space-x-1">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Enforced</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
