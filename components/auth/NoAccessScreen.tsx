"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/context/AuthContext";
import { getRoleDashboardPath, normalizeRole } from "@/lib/auth/accessMatrix";

interface NoAccessScreenProps {
  message?: string;
}

export function NoAccessScreen({ message }: NoAccessScreenProps) {
  const router = useRouter();
  const { role, currentUser } = useAuth();
  const isClient = Boolean(currentUser?.clientId || (currentUser as any)?.client_id);
  const normRole = normalizeRole(role, isClient);
  const dashboardHref = getRoleDashboardPath(role, isClient);

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(dashboardHref);
    }
  };

  return (
    <div className="min-h-[65vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl shadow-sm p-8 text-center space-y-5">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
            Access Restricted (403)
          </p>
          <h1 className="text-xl font-extrabold text-slate-900">
            You don&apos;t have access to this page
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            {message ||
              `Your current role (${normRole.replace("_", " ")}) is not authorized to view or perform actions on this screen.`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleGoBack}
            className="w-full sm:w-auto text-xs font-semibold h-9 px-4 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Back to Previous Page
          </Button>
          <Link href={dashboardHref} className="w-full sm:w-auto">
            <Button
              type="button"
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold h-9 px-4 cursor-pointer"
            >
              <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
              My Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
