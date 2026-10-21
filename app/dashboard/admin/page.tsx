import React from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { AdminDashboard } from "@/components/dashboard/admin/AdminDashboard";

export default function AdminDashboardPage() {
  return (
    <RequireRole allowedRoles={["Admin", "ADMIN"]}>
      <AdminDashboard />
    </RequireRole>
  );
}
