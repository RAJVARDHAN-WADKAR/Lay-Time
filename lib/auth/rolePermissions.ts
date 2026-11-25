/**
 * SINGLE SOURCE OF TRUTH: Role & Permissions Matrix for Lay-Time Platform
 * Enforces role definitions and permissions across UI, Middleware, and API routes.
 */

export type Role = "ADMIN" | "SUPERVISOR" | "CLAIM_PROCESSOR" | "REVIEWER" | "CLIENT";

export type Permission =
  // Claims
  | "claims:view"
  | "claims:view_all"
  | "claims:create"
  | "claims:edit"
  | "claims:delete"
  | "claims:assign"
  | "claims:reassign"
  | "claims:approve"
  | "claims:settle"
  // SoF, Ports, Berths
  | "sof:view"
  | "sof:edit"
  // Documents
  | "documents:view"
  | "documents:upload"
  | "documents:delete"
  // Laytime Calculator
  | "calculator:view"
  | "calculator:use"
  | "calculator:override"
  // OCR
  | "ocr:use"
  // RAC (Recovery Against Cargo/Charters)
  | "rac:view"
  | "rac:create"
  | "rac:edit"
  | "rac:submit"
  | "rac:authorize"
  | "rac:close"
  // Timebar
  | "timebar:view"
  | "timebar:monitor"
  // Analytics & Reports
  | "analytics:view"
  | "reports:view"
  | "reports:export"
  // Governance & Administration
  | "users:manage"
  | "users:view"
  | "settings:manage"
  | "audit:view"
  // Negotiations
  | "negotiations:view"
  | "negotiations:initiate"
  | "negotiations:offer"
  | "negotiations:approve"
  | "negotiations:close"
  | "negotiations:client_approve"
  // Invoices & Payments
  | "invoices:view"
  | "invoices:manage"
  | "payments:view"
  | "payments:manage";

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  /**
   * ADMIN (Full Control):
   * Create/edit/delete any claim, assign/reassign claims, upload/delete documents,
   * manual calculation override, RAC full workflow, User Management, Company Settings,
   * audit logs, all reports and analytics.
   */
  ADMIN: [
    "claims:view",
    "claims:view_all",
    "claims:create",
    "claims:edit",
    "claims:delete",
    "claims:assign",
    "claims:reassign",
    "claims:approve",
    "claims:settle",
    "sof:view",
    "sof:edit",
    "documents:view",
    "documents:upload",
    "documents:delete",
    "calculator:view",
    "calculator:use",
    "calculator:override",
    "ocr:use",
    "rac:view",
    "rac:create",
    "rac:edit",
    "rac:submit",
    "rac:authorize",
    "rac:close",
    "timebar:view",
    "timebar:monitor",
    "analytics:view",
    "reports:view",
    "reports:export",
    "users:manage",
    "users:view",
    "settings:manage",
    "audit:view",
    "negotiations:view",
    "negotiations:initiate",
    "negotiations:offer",
    "negotiations:approve",
    "negotiations:close",
    "invoices:view",
    "invoices:manage",
    "payments:view",
    "payments:manage"
  ],

  /**
   * SUPERVISOR:
   * View all claims; create, edit and assign claims; upload documents; approve/override
   * calculations; reconcile discrepancies; RAC authorise/close; timebar monitor;
   * analytics and reports.
   * NOT: User Management (create/edit/delete), Company Settings, hard delete of users/claims.
   */
  SUPERVISOR: [
    "claims:view",
    "claims:view_all",
    "claims:create",
    "claims:edit",
    "claims:assign",
    "claims:reassign",
    "claims:approve",
    "claims:settle",
    "sof:view",
    "sof:edit",
    "documents:view",
    "documents:upload",
    "documents:delete",
    "calculator:view",
    "calculator:use",
    "calculator:override",
    "ocr:use",
    "rac:view",
    "rac:create",
    "rac:edit",
    "rac:submit",
    "rac:authorize",
    "rac:close",
    "timebar:view",
    "timebar:monitor",
    "analytics:view",
    "reports:view",
    "reports:export",
    "users:view",
    "negotiations:view",
    "negotiations:initiate",
    "negotiations:offer",
    "negotiations:approve",
    "negotiations:close",
    "invoices:view",
    "invoices:manage",
    "payments:view",
    "payments:manage"
  ],

  /**
   * CLAIM_PROCESSOR:
   * Sees ONLY claims assigned to them; may create a claim (auto-assigned to self);
   * edit SoF/ports/berths on assigned claims; upload documents to assigned claims;
   * use Laytime Calculator and OCR on assigned claims; submit RAC for review;
   * timebar for assigned claims.
   * NOT: delete, override, reassign, analytics, reports, users, settings.
   */
  CLAIM_PROCESSOR: [
    "claims:view",
    "claims:create",
    "claims:edit",
    "sof:view",
    "sof:edit",
    "documents:view",
    "documents:upload",
    "calculator:view",
    "calculator:use",
    "ocr:use",
    "rac:view",
    "rac:create",
    "rac:edit",
    "rac:submit",
    "timebar:view",
    "timebar:monitor",
    "negotiations:view",
    "negotiations:offer",
    "invoices:view",
    "payments:view"
  ],

  /**
   * REVIEWER:
   * Read-only. May view claims ledger, claim details, calculations, timebar, RAC,
   * and read/download reports.
   * NOT: create claim, edit anything, upload, run OCR, override, delete, users, settings.
   */
  REVIEWER: [
    "claims:view",
    "claims:view_all",
    "sof:view",
    "documents:view",
    "calculator:view",
    "rac:view",
    "timebar:view",
    "timebar:monitor",
    "reports:view",
    "reports:export",
    "negotiations:view"
  ],

  /**
   * CLIENT:
   * Read-only and scoped to its own claims (view own claims, final SoF, documents, reports, approve final offer).
   */
  CLIENT: [
    "claims:view",
    "sof:view",
    "documents:view",
    "documents:upload", // for client requested documents
    "timebar:view",
    "negotiations:view",
    "negotiations:client_approve"
  ]
};

/**
 * Normalises legacy role strings once in one place.
 * Strips "Finance" as a hidden alias of Supervisor; normalizes to REVIEWER.
 */
export function normalizeRole(role?: string | null, isClient?: boolean): Role {
  if (!role) return isClient ? "CLIENT" : "REVIEWER";
  const r = role.trim().toUpperCase().replace(/[\s-]+/g, "_");

  if (r === "ADMIN") return "ADMIN";
  if (r === "SUPERVISOR") return "SUPERVISOR";
  if (r === "CLAIM_PROCESSOR" || r === "PROCESSOR") return "CLAIM_PROCESSOR";
  if (r === "REVIEWER") return "REVIEWER";
  if (r === "CLIENT" || isClient) return "CLIENT";
  if (r === "REVIEWER_CLIENT") return isClient ? "CLIENT" : "REVIEWER";
  // Remove "Finance" as a hidden alias of Supervisor
  if (r === "FINANCE") return "REVIEWER";

  return isClient ? "CLIENT" : "REVIEWER";
}

/**
 * Checks if a given role has a specific permission.
 */
export function can(
  role: string | null | undefined,
  permission: Permission,
  isClient?: boolean
): boolean {
  const norm = normalizeRole(role, isClient);
  const perms = ROLE_PERMISSIONS[norm];
  if (!perms) return false;
  return perms.includes(permission);
}

/**
 * Validates route access for Edge Middleware and UI guards.
 */
export function canAccessRoute(
  role: string | null | undefined,
  pathname: string,
  isClient?: boolean
): boolean {
  const norm = normalizeRole(role, isClient);

  // Exact role dashboards
  if (pathname === "/dashboard/admin") return norm === "ADMIN";
  if (pathname === "/dashboard/supervisor") return norm === "SUPERVISOR";
  if (pathname === "/dashboard/claim-processor") return norm === "CLAIM_PROCESSOR";
  if (pathname === "/dashboard/reviewer" || pathname === "/dashboard/reviewer-client") {
    return norm === "REVIEWER" || norm === "CLIENT";
  }
  if (pathname === "/dashboard") return true; // redirects to specific dashboard

  // Feature routes
  if (pathname.startsWith("/settings")) {
    return can(norm, "settings:manage");
  }
  if (pathname.startsWith("/users")) {
    return can(norm, "users:view");
  }
  if (pathname.startsWith("/claims/create")) {
    return can(norm, "claims:create");
  }
  if (pathname.startsWith("/claims")) {
    return can(norm, "claims:view");
  }
  if (pathname.startsWith("/calculator") || pathname.startsWith("/calculations")) {
    return can(norm, "calculator:use") || can(norm, "calculator:view");
  }
  if (pathname.startsWith("/ocr")) {
    return can(norm, "ocr:use");
  }
  if (pathname.startsWith("/ai-assistant")) {
    return norm === "ADMIN" || norm === "SUPERVISOR" || norm === "CLAIM_PROCESSOR";
  }
  if (pathname.startsWith("/rac")) {
    return can(norm, "rac:view");
  }
  if (pathname.startsWith("/timebar")) {
    return can(norm, "timebar:view");
  }
  if (pathname.startsWith("/analytics")) {
    return can(norm, "analytics:view");
  }
  if (pathname.startsWith("/reports")) {
    return can(norm, "reports:view");
  }
  if (pathname.startsWith("/documents")) {
    return can(norm, "documents:view");
  }
  if (pathname.startsWith("/sof")) {
    return can(norm, "sof:view");
  }
  if (pathname.startsWith("/notifications")) {
    return true;
  }

  return true;
}

/**
 * Returns role dashboard URL
 */
export function getRoleDashboardPath(role?: string | null, isClient?: boolean): string {
  const norm = normalizeRole(role, isClient);
  if (norm === "ADMIN") return "/dashboard/admin";
  if (norm === "SUPERVISOR") return "/dashboard/supervisor";
  if (norm === "CLAIM_PROCESSOR") return "/dashboard/claim-processor";
  if (norm === "CLIENT") return "/dashboard/reviewer-client";
  return "/dashboard/reviewer";
}
