import { RoleDefinition } from "./permissions.types";

export const financeRole: RoleDefinition = {
  name: "FINANCE",
  purpose: "Financial operations, invoicing, payment tracking, and financial reconciliation.",
  scope: "company-wide",
  permissions: {
    claims: ["view"],
    sof: ["view"],
    ports: ["view"],
    berths: ["view"],
    documents: ["view"],
    calculations: ["view"],
    rac: ["view"],
    ocr: ["view"],
    negotiations: ["view"],
    invoices: ["view", "create", "edit", "approve"],
    payments: ["view", "create", "edit", "approve"],
    clients: ["view"],
    vessels: ["view"],
    users: [],
    settings: [],
    dashboard: ["view"],
    analytics: ["view"],
    reports: ["view", "export"],
    auditLog: []
  },
  hiddenFields: [],
  visibleScreens: [
    "/dashboard",
    "/claims",
    "/reports",
    "/reports/financial"
  ],
  menuItems: [
    "Dashboard",
    "Claims Ledger",
    "Financial Reports",
    "Reports"
  ],
  tabs: [
    "overview",
    "claimInfo",
    "voyage",
    "ports",
    "sof",
    "documents",
    "calculations",
    "payments",
    "reports"
  ],
  buttons: [
    "Create Invoice",
    "Edit Invoice",
    "Record Payment",
    "Edit Payment",
    "Export PDF",
    "Export CSV"
  ],
  specialRules: [
    "Finance role may read all claims across the company.",
    "Finance role may create and update invoices and payment records.",
    "Finance role may update payment fields on claims: payment_received, payment_concluded, invoice_number.",
    "Finance role may NOT delete claims or documents, override calculations, create/close/edit RAC cases, create clients, edit SoF, edit settings, or create users."
  ]
};
