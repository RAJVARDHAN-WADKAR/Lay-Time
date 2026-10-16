import { RoleDefinition } from "./permissions.types";

export const adminRole: RoleDefinition = {
  name: "ADMIN",
  purpose: "System owner within the company with full administrative control over users, settings, clients and vessels, and company-wide read and cleanup oversight.",
  scope: "company-wide",
  permissions: {
    claims: ["view", "assign", "delete"],
    sof: ["view"],
    ports: ["view"],
    berths: ["view"],
    documents: ["view", "delete"],
    calculations: ["view"],
    rac: ["view"],
    ocr: ["view"],
    negotiations: ["view"],
    invoices: ["view"],
    payments: ["view"],
    clients: ["view", "create", "edit", "delete"],
    vessels: ["view", "create", "edit", "delete"],
    users: ["view", "create", "edit", "delete"],
    settings: ["view", "create", "edit", "delete"],
    dashboard: ["view"],
    analytics: ["view"],
    reports: ["view", "export"],
    auditLog: ["view"]
  },
  hiddenFields: [],
  visibleScreens: [
    "/dashboard",
    "/users",
    "/settings",
    "/claims",
    "/rac",
    "/analytics",
    "/reports",
    "/documents"
  ],
  menuItems: [
    "Dashboard",
    "Claims Ledger",
    "User Management",
    "System Settings",
    "RAC Review",
    "Analytics",
    "Reports",
    "Audit Trail"
  ],
  tabs: [
    "overview",
    "claimInfo",
    "voyage",
    "ports",
    "sof",
    "documents",
    "calculations",
    "negotiations",
    "rac",
    "ownerComparison",
    "timebar",
    "payments",
    "activity",
    "reports"
  ],
  buttons: [
    "Create User",
    "Edit User",
    "Deactivate User",
    "Reset Password",
    "Update Settings",
    "Create Client",
    "Edit Client",
    "Delete Client",
    "Create Vessel",
    "Edit Vessel",
    "Delete Vessel",
    "Reassign Claim",
    "Admin Delete Claim",
    "Export Report"
  ],
  specialRules: [
    "Full control of users, roles, company settings, clients and vessels.",
    "Can reassign claims and delete or restore records for administrative cleanup.",
    "Separation of duties: Cannot review, settle, override a calculation or accept a negotiation (these belong to the Supervisor)."
  ]
};
