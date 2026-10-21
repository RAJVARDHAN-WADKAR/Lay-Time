import React from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { ReviewerClientDashboard } from "@/components/dashboard/reviewer-client/ReviewerClientDashboard";

export default function ReviewerClientDashboardPage() {
  return (
    <RequireRole allowedRoles={["Reviewer", "Client", "REVIEWER_CLIENT"]}>
      <ReviewerClientDashboard />
    </RequireRole>
  );
}
