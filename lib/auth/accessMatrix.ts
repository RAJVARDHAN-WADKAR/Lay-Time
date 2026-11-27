/**
 * SINGLE SOURCE OF TRUTH FOR ROLE-BASED ACCESS CONTROL (RBAC)
 *
 * Every route check (middleware.ts), navigation item (Sidebar.tsx),
 * UI guard (AuthContext, RequireRole, Can), and API permission check
 * (withApi, route handlers) derives exclusively from ACCESS_MATRIX.
 */

export type AppRole =
  | "ADMIN"
  | "SUPERVISOR"
  | "CLAIM_PROCESSOR"
  | "REVIEWER"
  | "CLIENT";

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
  // Laytime Calculator & Calculations
  | "calculator:view"
  | "calculator:use"
  | "calculator:override"
  // OCR
  | "ocr:use"
  | "ocr:run"
  // RAC (Recoverable Additional Costs)
  | "rac:view"
  | "rac:create"
  | "rac:edit"
  | "rac:submit"
  | "rac:authorize"
  | "rac:close"
  | "rac:delete"
  // Timebar
  | "timebar:view"
  | "timebar:monitor"
  // Analytics & Reports
  | "analytics:view"
  | "reports:view"
  | "reports:export"
  // Governance & Administration
  | "users:view"
  | "users:manage"
  | "settings:manage"
  | "audit:view"
  | "tracker:sync"
  // Clients, Invoices, Payments & Negotiations
  | "clients:view"
  | "clients:manage"
  | "negotiations:view"
  | "negotiations:initiate"
  | "negotiations:offer"
  | "negotiations:approve"
  | "negotiations:close"
  | "invoices:view"
  | "invoices:manage"
  | "payments:view"
  | "payments:manage";

export interface RoleAccessConfig {
  dashboard: string;
  routes: readonly string[];
  permissions: readonly Permission[];
}

export const ALL_ROLES: readonly AppRole[] = [
  "ADMIN",
  "SUPERVISOR",
  "CLAIM_PROCESSOR",
  "REVIEWER",
  "CLIENT"
] as const;

/**
 * Single typed access matrix: role -> { routes, permissions, dashboard }.
 * Note: "/claims/[id]" represents dynamic claim detail pages under "/claims/*".
 * Exact "/claims" is All Claims Ledger; "/claims/assigned" is Processor's Assigned Claims.
 */
export const ACCESS_MATRIX: Record<AppRole, RoleAccessConfig> = {
  ADMIN: {
    dashboard: "/dashboard/admin",
    routes: [
      "/dashboard/admin",
      "/claims",
      "/claims/create",
      "/claims/[id]",
      "/calculator",
      "/calculations",
      "/documents",
      "/ocr",
      "/rac",
      "/timebar",
      "/analytics",
      "/reports",
      "/notifications",
      "/users",
      "/settings",
      "/sof"
    ],
    permissions: [
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
      "ocr:run",
      "rac:view",
      "rac:create",
      "rac:edit",
      "rac:submit",
      "rac:authorize",
      "rac:close",
      "rac:delete",
      "timebar:view",
      "timebar:monitor",
      "analytics:view",
      "reports:view",
      "reports:export",
      "users:view",
      "users:manage",
      "settings:manage",
      "audit:view",
      "tracker:sync",
      "clients:view",
      "clients:manage",
      "negotiations:view",
      "negotiations:initiate",
      "negotiations:offer",
      "negotiations:approve",
      "negotiations:close",
      "invoices:view",
      "invoices:manage",
      "payments:view",
      "payments:manage"
    ]
  },

  SUPERVISOR: {
    dashboard: "/dashboard/supervisor",
    routes: [
      "/dashboard/supervisor",
      "/claims",
      "/claims/create",
      "/claims/[id]",
      "/calculator",
      "/calculations",
      "/documents",
      "/ocr",
      "/rac",
      "/timebar",
      "/analytics",
      "/reports",
      "/notifications",
      "/sof"
    ],
    permissions: [
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
      "calculator:view",
      "calculator:use",
      "calculator:override",
      "ocr:use",
      "ocr:run",
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
      "clients:view",
      "negotiations:view",
      "negotiations:initiate",
      "negotiations:offer",
      "negotiations:approve",
      "negotiations:close",
      "invoices:view",
      "invoices:manage",
      "payments:view",
      "payments:manage"
    ]
  },

  CLAIM_PROCESSOR: {
    dashboard: "/dashboard/claim-processor",
    routes: [
      "/dashboard/claim-processor",
      "/claims/assigned",
      "/claims/create",
      "/claims/[id]",
      "/calculator",
      "/calculations",
      "/documents",
      "/ocr",
      "/rac",
      "/timebar",
      "/notifications",
      "/sof"
    ],
    permissions: [
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
      "ocr:run",
      "rac:view",
      "rac:create",
      "rac:edit",
      "rac:submit",
      "timebar:view",
      "timebar:monitor",
      "clients:view",
      "negotiations:view",
      "negotiations:offer",
      "invoices:view",
      "payments:view"
    ]
  },

  REVIEWER: {
    dashboard: "/dashboard/reviewer",
    routes: [
      "/dashboard/reviewer",
      "/claims",
      "/claims/[id]",
      "/calculations",
      "/documents",
      "/rac",
      "/timebar",
      "/reports",
      "/notifications"
    ],
    permissions: [
      "claims:view",
      "claims:view_all",
      "sof:view",
      "documents:view",
      "calculator:view",
      "rac:view",
      "timebar:view",
      "timebar:monitor",
      "reports:view",
      "clients:view",
      "negotiations:view",
      "invoices:view",
      "payments:view"
    ]
  },

  CLIENT: {
    dashboard: "/dashboard/client",
    routes: [
      "/dashboard/client",
      "/claims",
      "/claims/[id]",
      "/documents",
      "/notifications"
    ],
    permissions: [
      "claims:view",
      "documents:view",
      "negotiations:view"
    ]
  }
};

export interface SidebarNavDefinition {
  id: string;
  href: string;
  label: string;
  iconKey:
    | "dashboard"
    | "claims"
    | "assigned"
    | "create"
    | "calculator"
    | "calculations"
    | "documents"
    | "ocr"
    | "rac"
    | "timebar"
    | "analytics"
    | "reports"
    | "notifications"
    | "users"
    | "settings";
  roleLabels?: Partial<Record<AppRole, string>>;
}

/**
 * Canonical ordered sidebar definitions.
 * Every item is shown if and only if its href is allowed in ACCESS_MATRIX[role].routes.
 */
export const SIDEBAR_NAV_DEFINITIONS: readonly SidebarNavDefinition[] = [
  {
    id: "dashboard-admin",
    href: "/dashboard/admin",
    label: "Admin Console",
    iconKey: "dashboard"
  },
  {
    id: "dashboard-supervisor",
    href: "/dashboard/supervisor",
    label: "Supervisor Dashboard",
    iconKey: "dashboard"
  },
  {
    id: "dashboard-processor",
    href: "/dashboard/claim-processor",
    label: "Analyst Workbench",
    iconKey: "dashboard"
  },
  {
    id: "dashboard-reviewer",
    href: "/dashboard/reviewer",
    label: "Reviewer Dashboard",
    iconKey: "dashboard"
  },
  {
    id: "dashboard-client",
    href: "/dashboard/client",
    label: "Client Portal",
    iconKey: "dashboard"
  },
  {
    id: "claims-all",
    href: "/claims",
    label: "All Claims",
    iconKey: "claims",
    roleLabels: {
      CLIENT: "My Claims",
      REVIEWER: "Claims Ledger"
    }
  },
  {
    id: "claims-assigned",
    href: "/claims/assigned",
    label: "Assigned Claims",
    iconKey: "assigned"
  },
  {
    id: "claims-create",
    href: "/claims/create",
    label: "Create Claim",
    iconKey: "create"
  },
  {
    id: "calculator",
    href: "/calculator",
    label: "Laytime Calculator",
    iconKey: "calculator"
  },
  {
    id: "calculations",
    href: "/calculations",
    label: "Calculations",
    iconKey: "calculations"
  },
  {
    id: "documents",
    href: "/documents",
    label: "Documents",
    iconKey: "documents"
  },
  {
    id: "ocr",
    href: "/ocr",
    label: "OCR & SoF",
    iconKey: "ocr"
  },
  {
    id: "rac",
    href: "/rac",
    label: "RAC Portfolio",
    iconKey: "rac",
    roleLabels: {
      REVIEWER: "RAC Review",
      CLAIM_PROCESSOR: "RAC Cases"
    }
  },
  {
    id: "timebar",
    href: "/timebar",
    label: "Time-Bar Monitor",
    iconKey: "timebar"
  },
  {
    id: "analytics",
    href: "/analytics",
    label: "Analytics",
    iconKey: "analytics"
  },
  {
    id: "reports",
    href: "/reports",
    label: "Reports",
    iconKey: "reports",
    roleLabels: {
      ADMIN: "Audit Reports"
    }
  },
  {
    id: "notifications",
    href: "/notifications",
    label: "Notifications",
    iconKey: "notifications"
  },
  {
    id: "users",
    href: "/users",
    label: "User Management",
    iconKey: "users"
  },
  {
    id: "settings",
    href: "/settings",
    label: "System Settings",
    iconKey: "settings"
  }
];

/**
 * All protected application route prefixes recognized by middleware.
 */
export const PROTECTED_PAGE_PREFIXES: readonly string[] = [
  "/dashboard",
  "/claims",
  "/calculator",
  "/calculations",
  "/documents",
  "/ocr",
  "/rac",
  "/timebar",
  "/analytics",
  "/reports",
  "/notifications",
  "/users",
  "/settings",
  "/sof"
];

/**
 * Normalizes any legacy or display role string into one of the 5 canonical AppRoles.
 */
export function normalizeRole(role?: string | null, isClient?: boolean): AppRole {
  if (!role) return isClient ? "CLIENT" : "REVIEWER";
  const upper = role.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (upper === "ADMIN") return "ADMIN";
  if (upper === "SUPERVISOR") return "SUPERVISOR";
  if (upper === "CLAIM_PROCESSOR" || upper === "PROCESSOR") return "CLAIM_PROCESSOR";
  if (upper === "CLIENT" || isClient) return "CLIENT";
  if (upper === "REVIEWER") return "REVIEWER";
  if (upper === "REVIEWER_CLIENT") return isClient ? "CLIENT" : "REVIEWER";
  if (upper === "FINANCE") return "REVIEWER";
  return isClient ? "CLIENT" : "REVIEWER";
}

export function getRoleDashboardPath(role?: string | null, isClient?: boolean): string {
  const norm = normalizeRole(role, isClient);
  return ACCESS_MATRIX[norm].dashboard;
}

export function can(
  role: string | null | undefined,
  permission: Permission,
  isClient?: boolean
): boolean {
  const norm = normalizeRole(role, isClient);
  return ACCESS_MATRIX[norm].permissions.includes(permission);
}

export function isProtectedAppPath(pathname: string): boolean {
  const pathBase = pathname.split("?")[0];
  return PROTECTED_PAGE_PREFIXES.some(
    (prefix) => pathBase === prefix || pathBase.startsWith(`${prefix}/`)
  );
}

/**
 * Checks whether a role is allowed to access a page pathname.
 * Uses exact route matching for "/claims" vs "/claims/assigned" vs "/claims/create"
 * vs "/claims/[id]", and prefix matching for nested modules like "/rac/*".
 */
export function isRouteAllowed(
  role: string | null | undefined,
  pathname: string,
  isClient?: boolean
): boolean {
  const norm = normalizeRole(role, isClient);
  const pathBase = pathname.split("?")[0];

  // "/dashboard" exact is a dispatcher to the role's dashboard
  if (pathBase === "/dashboard") return true;

  // "/no-access" is always reachable for authenticated users
  if (pathBase === "/no-access") return true;

  const allowedRoutes = ACCESS_MATRIX[norm].routes;

  // Special handling for /claims sub-routes so /claims, /claims/assigned,
  // /claims/create, and /claims/[id] never collide.
  if (pathBase === "/claims") {
    return allowedRoutes.includes("/claims");
  }
  if (pathBase === "/claims/assigned" || pathBase.startsWith("/claims/assigned/")) {
    return allowedRoutes.includes("/claims/assigned");
  }
  if (pathBase === "/claims/create" || pathBase.startsWith("/claims/create/")) {
    return allowedRoutes.includes("/claims/create");
  }
  if (pathBase.startsWith("/claims/")) {
    return allowedRoutes.includes("/claims/[id]");
  }

  for (const route of allowedRoutes) {
    if (route.startsWith("/claims")) continue;
    if (pathBase === route || pathBase.startsWith(`${route}/`)) {
      return true;
    }
  }

  // Only restrict routes inside the protected app namespace
  return !isProtectedAppPath(pathBase);
}

export interface ResolvedSidebarItem {
  id: string;
  href: string;
  label: string;
  iconKey: SidebarNavDefinition["iconKey"];
}

/**
 * Returns the exact ordered sidebar items allowed for a role, derived from ACCESS_MATRIX.
 */
export function getSidebarItemsForRole(
  role: string | null | undefined,
  isClient?: boolean
): ResolvedSidebarItem[] {
  const norm = normalizeRole(role, isClient);
  return SIDEBAR_NAV_DEFINITIONS.filter((item) => isRouteAllowed(norm, item.href, isClient)).map(
    (item) => ({
      id: item.id,
      href: item.href,
      label: item.roleLabels?.[norm] || item.label,
      iconKey: item.iconKey
    })
  );
}

/**
 * Longest-prefix match for sidebar active state (Section 3.1).
 * Returns the single matching item's href so sibling routes like
 * /claims, /claims/assigned, and /claims/create are never active together.
 */
export function getLongestMatchingSidebarHref(
  items: readonly Pick<ResolvedSidebarItem, "href">[],
  pathname: string
): string {
  const pathBase = pathname.split("?")[0];
  let bestHref = "";
  let bestLen = -1;

  for (const item of items) {
    const itemBase = item.href.split("?")[0];
    if (pathBase === itemBase || pathBase.startsWith(`${itemBase}/`)) {
      if (itemBase.length > bestLen) {
        bestLen = itemBase.length;
        bestHref = item.href;
      }
    }
  }

  return bestHref;
}

/**
 * Edge API route permission map derived exclusively from ACCESS_MATRIX permissions.
 */
const API_ROUTE_PERMISSION_RULES: ReadonlyArray<{
  prefix: string;
  exact?: boolean;
  pattern?: RegExp;
  method?: string;
  permission: Permission;
}> = [
  { prefix: "/api/settings", permission: "settings:manage" },
  { prefix: "/api/holidays", method: "GET", permission: "calculator:view" },
  { prefix: "/api/holidays", permission: "settings:manage" },
  { prefix: "/api/users", permission: "users:view" },
  { prefix: "/api/tracker/sync", permission: "tracker:sync" },
  { prefix: "/api/ocr", permission: "ocr:run" },
  { prefix: "/api/timesheet/import", permission: "sof:edit" },
  { prefix: "/api/rac/calculations", method: "POST", permission: "rac:edit" },
  { prefix: "/api/rac", method: "DELETE", permission: "rac:delete" },
  { prefix: "/api/rac", method: "POST", permission: "rac:create" },
  { prefix: "/api/rac", method: "PUT", permission: "rac:edit" },
  { prefix: "/api/rac", permission: "rac:view" },
  { prefix: "/api/calculations", method: "POST", permission: "calculator:use" },
  { prefix: "/api/calculations", permission: "calculator:view" },
  { prefix: "/api/oil-chem", method: "POST", permission: "calculator:use" },
  { prefix: "/api/oil-chem", permission: "calculator:view" },
  { prefix: "/api/reports", method: "POST", permission: "reports:export" },
  { prefix: "/api/reports", permission: "reports:view" },
  { prefix: "/api/documents", method: "DELETE", permission: "documents:delete" },
  { prefix: "/api/documents", method: "POST", permission: "documents:upload" },
  { prefix: "/api/documents", method: "PUT", permission: "documents:upload" },
  { prefix: "/api/documents", permission: "documents:view" },
  { prefix: "/api/claims/next-id", permission: "claims:create" },
  { prefix: "/api/claims", pattern: /^\/api\/claims\/[^/]+\/sof(\/.*)?$/, method: "DELETE", permission: "sof:edit" },
  { prefix: "/api/claims", pattern: /^\/api\/claims\/[^/]+\/sof(\/.*)?$/, method: "PUT", permission: "sof:edit" },
  { prefix: "/api/claims", pattern: /^\/api\/claims\/[^/]+\/sof(\/.*)?$/, method: "POST", permission: "sof:edit" },
  { prefix: "/api/claims", exact: true, method: "POST", permission: "claims:create" },
  { prefix: "/api/claims", pattern: /^\/api\/claims\/[^/]+$/, method: "DELETE", permission: "claims:delete" },
  { prefix: "/api/claims", permission: "claims:view" }
];

export function isApiRouteAllowed(
  role: string | null | undefined,
  pathname: string,
  method: string,
  isClient?: boolean
): boolean {
  const pathBase = pathname.split("?")[0];
  const upperMethod = method.toUpperCase();

  for (const rule of API_ROUTE_PERMISSION_RULES) {
    const matchesPath = rule.pattern
      ? rule.pattern.test(pathBase)
      : rule.exact
      ? pathBase === rule.prefix
      : pathBase === rule.prefix || pathBase.startsWith(`${rule.prefix}/`);

    if (!matchesPath) continue;
    if (rule.method && rule.method !== upperMethod) continue;
    return can(role, rule.permission, isClient);
  }

  return true;
}
