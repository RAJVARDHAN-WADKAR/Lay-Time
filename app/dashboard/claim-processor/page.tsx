import React from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { ClaimProcessorDashboard } from "@/components/dashboard/claim-processor/ClaimProcessorDashboard";

export default function ClaimProcessorDashboardPage() {
  return (
    <RequireRole allowedRoles={["Claim Processor", "CLAIM_PROCESSOR", "Processor"]}>
      <ClaimProcessorDashboard />
    </RequireRole>
  );
}
