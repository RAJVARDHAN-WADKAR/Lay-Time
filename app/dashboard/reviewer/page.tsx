import React from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { ReviewerClientDashboard } from "@/components/dashboard/reviewer-client/ReviewerClientDashboard";

export default function ReviewerDashboardPage() {
  return (
    <RequireRole allowedRoles={["Reviewer", "REVIEWER_CLIENT"]}>
      <ReviewerClientDashboard />
    </RequireRole>
  );
}
