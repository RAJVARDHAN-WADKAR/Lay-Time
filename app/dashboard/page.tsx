"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { AdminDashboard } from "@/components/dashboard/admin/AdminDashboard";
import { SupervisorDashboard } from "@/components/dashboard/supervisor/SupervisorDashboard";
import { ClaimProcessorDashboard } from "@/components/dashboard/claim-processor/ClaimProcessorDashboard";
import { ReviewerClientDashboard } from "@/components/dashboard/reviewer-client/ReviewerClientDashboard";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { role, currentUser, isLoading } = useAuth();

  const roleUpper = (role || "").toUpperCase().replace(/[\s-]+/g, "_");

  useEffect(() => {
    if (!isLoading) {
      let targetRoute = "/dashboard/supervisor";
      if (roleUpper === "ADMIN") targetRoute = "/dashboard/admin";
      else if (roleUpper === "SUPERVISOR") targetRoute = "/dashboard/supervisor";
      else if (roleUpper === "CLAIM_PROCESSOR" || roleUpper === "PROCESSOR") targetRoute = "/dashboard/claim-processor";
      else if (roleUpper === "REVIEWER_CLIENT" || roleUpper === "CLIENT" || roleUpper === "REVIEWER") {
        targetRoute = "/dashboard/reviewer-client";
      }
      router.replace(targetRoute);
    }
  }, [isLoading, roleUpper, router]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
          Directing to your dedicated role dashboard...
        </p>
      </div>
    );
  }

  // Render respective dashboard immediately while router navigates to role URL
  if (roleUpper === "ADMIN") {
    return <AdminDashboard />;
  }

  if (roleUpper === "SUPERVISOR") {
    return <SupervisorDashboard />;
  }

  if (roleUpper === "CLAIM_PROCESSOR" || roleUpper === "PROCESSOR") {
    return <ClaimProcessorDashboard />;
  }

  if (roleUpper === "REVIEWER_CLIENT" || roleUpper === "CLIENT" || roleUpper === "REVIEWER") {
    return <ReviewerClientDashboard />;
  }

  return <SupervisorDashboard />;
}
