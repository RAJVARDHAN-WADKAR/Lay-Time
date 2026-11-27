"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { getRoleDashboardPath } from "@/lib/auth/accessMatrix";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { role, currentUser, isLoading } = useAuth();
  const isClient = Boolean(currentUser?.clientId || (currentUser as any)?.client_id);

  useEffect(() => {
    if (!isLoading) {
      const targetRoute = getRoleDashboardPath(role, isClient);
      router.replace(targetRoute);
    }
  }, [isLoading, role, isClient, router]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
        Directing to your dedicated role dashboard...
      </p>
    </div>
  );
}
