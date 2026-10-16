import { RoleDefinition, UserContext, DataScope } from "./permissions.types";

function isExternalClient(context?: UserContext): boolean {
  if (!context) return false;
  return Boolean(context.clientId || context.assignedClientId);
}

export const reviewerClientRole: RoleDefinition = {
  name: "REVIEWER_CLIENT",
  purpose: "Strictly read-only role for internal legal/compliance reviewers (company-wide) or external charterer client counterparty portals (own client claims only).",
  scope: (context?: UserContext): DataScope => {
    return isExternalClient(context) ? "own client only" : "company-wide";
  },
  permissions: {
    claims: ["view"],
    sof: ["view"],
    ports: ["view"],
    berths: ["view"],
    documents: ["view", "create"], // External client can upload requested documents; internal reviewer is view-only
    calculations: ["view"],
    rac: ["view"], // Internal reviewer views RAC; external client cannot see RAC (handled in specialRules/hiddenFields)
    ocr: [],
    negotiations: ["view", "approve"], // External client can approve final offer; internal reviewer has oversight
    invoices: ["view"],
    payments: ["view"],
    clients: ["view"], // Internal reviewer views clients; external client cannot (handled in specialRules)
    vessels: ["view"], // Internal reviewer views vessels; external client cannot
    users: [],
    settings: [],
    dashboard: ["view"],
    analytics: ["view"],
    reports: ["view", "export"],
    auditLog: ["view"] // Internal reviewer views audit log; external client cannot
  },
  hiddenFields: (context?: UserContext): string[] => {
    if (isExternalClient(context)) {
      return [
        "racFindings",
        "internalNotes",
        "minimumAcceptableAmount",
        "minAcceptableAmount",
        "clientsList",
        "vesselsList",
        "auditLog",
        "internalContentions",
        "overriddenDemurrage",
        "overrideReason"
      ];
    }
    return [];
  },
  visibleScreens: (context?: UserContext): string[] => {
    if (isExternalClient(context)) {
      return ["/claims", "/claims/[id]"];
    }
    return [
      "/dashboard",
      "/claims",
      "/claims/[id]",
      "/rac",
      "/timebar",
      "/analytics",
      "/reports",
      "/documents"
    ];
  },
  menuItems: (context?: UserContext): string[] => {
    if (isExternalClient(context)) {
      return ["My Claims", "Documents", "Notifications"];
    }
    return [
      "Dashboard",
      "Claims Ledger",
      "RAC Review",
      "Timebar Tracker",
      "Analytics",
      "Reports",
      "Documents"
    ];
  },
  tabs: (context?: UserContext): string[] => {
    if (isExternalClient(context)) {
      return ["overview", "negotiations", "documents"];
    }
    return [
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
    ];
  },
  buttons: (context?: UserContext): string[] => {
    if (isExternalClient(context)) {
      return [
        "Upload Requested Document",
        "Approve Final Offer",
        "Export PDF"
      ];
    }
    return ["Export PDF", "Export CSV"];
  },
  specialRules: [
    "Strictly read-only: Cannot create, edit, delete, calculate, recalculate, override, run analysis, run OCR, assign, approve, submit or settle, and cannot trigger any calculation or write endpoint directly or indirectly.",
    "Internal reviewer (user has no clientId): reads all claims, SoF, documents, stored calculation results, RAC findings, negotiation history (including minimum acceptable amount), invoices, payments, clients, vessels, dashboards, reports and audit log within the company.",
    "External client (user has a clientId): reads only their own client's claims, final SoF, shared documents, calculation summary, own invoices/payments, claim amount, shared negotiation offers, final agreed amount, and own-claim dashboards/reports.",
    "External client exceptions: Can upload documents that were requested, and can approve the final commercial offer.",
    "External client strict boundaries: Cannot see RAC findings, internal notes, minimum acceptable amount, clients or vessels lists, users, settings or the audit log."
  ]
};
