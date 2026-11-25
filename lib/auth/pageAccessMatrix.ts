export type AppRole =
  | "ADMIN"
  | "SUPERVISOR"
  | "CLAIM_PROCESSOR"
  | "REVIEWER"
  | "FINANCE"
  | "CLIENT";

export interface PageAccessRule {
  prefix: string;
  allowedRoles: AppRole[];
}

/**
 * Single source of truth for Page Access Matrix.
 * Used by middleware.ts, navigation bars, and access verification tests.
 */
export const PAGE_ACCESS_MATRIX: PageAccessRule[] = [
  // 1. Role-specific Dashboards
  { prefix: "/dashboard/admin", allowedRoles: ["ADMIN"] },
  { prefix: "/dashboard/supervisor", allowedRoles: ["SUPERVISOR"] },
  { prefix: "/dashboard/claim-processor", allowedRoles: ["CLAIM_PROCESSOR"] },
  { prefix: "/dashboard/reviewer-client", allowedRoles: ["REVIEWER", "CLIENT"] },
  { prefix: "/dashboard/finance", allowedRoles: ["FINANCE"] },
  { prefix: "/dashboard", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR", "REVIEWER", "FINANCE", "CLIENT"] },

  // 2. Features & Functional Screens
  { prefix: "/settings", allowedRoles: ["ADMIN"] },
  { prefix: "/users", allowedRoles: ["ADMIN", "SUPERVISOR"] },
  { prefix: "/claims/create", allowedRoles: ["SUPERVISOR", "CLAIM_PROCESSOR"] },
  { prefix: "/claims", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR", "REVIEWER", "FINANCE", "CLIENT"] },
  { prefix: "/calculator", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR"] },
  { prefix: "/calculations", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR"] },
  { prefix: "/ocr", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR"] },
  { prefix: "/ai-assistant", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR"] },
  { prefix: "/rac", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR", "REVIEWER", "FINANCE"] },
  { prefix: "/timebar", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR", "REVIEWER", "FINANCE", "CLIENT"] },
  { prefix: "/analytics", allowedRoles: ["ADMIN", "SUPERVISOR", "REVIEWER", "FINANCE"] },
  { prefix: "/reports", allowedRoles: ["ADMIN", "SUPERVISOR", "REVIEWER", "FINANCE"] },
  { prefix: "/documents", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR", "REVIEWER", "FINANCE", "CLIENT"] },
  { prefix: "/sof", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR", "REVIEWER", "FINANCE", "CLIENT"] },
  { prefix: "/notifications", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR", "REVIEWER", "FINANCE", "CLIENT"] }
];

export function normalizeAppRole(role?: string | null, isClient?: boolean): AppRole {
  if (!role) return "REVIEWER";
  const upper = role.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (upper === "ADMIN") return "ADMIN";
  if (upper === "SUPERVISOR") return "SUPERVISOR";
  if (upper === "CLAIM_PROCESSOR" || upper === "PROCESSOR") return "CLAIM_PROCESSOR";
  if (upper === "FINANCE") return "FINANCE";
  if (upper === "CLIENT" || isClient) return "CLIENT";
  if (upper === "REVIEWER") return "REVIEWER";
  if (upper === "REVIEWER_CLIENT") return isClient ? "CLIENT" : "REVIEWER";
  return "REVIEWER";
}

export function isPageAllowedForRole(pathname: string, role?: string | null, isClient?: boolean): boolean {
  const normRole = normalizeAppRole(role, isClient);
  // Match prefix in order of declaration
  for (const rule of PAGE_ACCESS_MATRIX) {
    if (pathname === rule.prefix || pathname.startsWith(rule.prefix + "/") || pathname.startsWith(rule.prefix + "?")) {
      return rule.allowedRoles.includes(normRole);
    }
  }
  return true; // Routes not restricted in matrix are permitted
}
