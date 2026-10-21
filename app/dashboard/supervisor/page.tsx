import React from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { SupervisorDashboard } from "@/components/dashboard/supervisor/SupervisorDashboard";

export default function SupervisorDashboardPage() {
  return (
    <RequireRole allowedRoles={["Supervisor", "SUPERVISOR"]}>
      <SupervisorDashboard />
    </RequireRole>
  );
}
