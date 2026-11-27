import {
  ACCESS_MATRIX,
  ALL_ROLES,
  AppRole,
  Permission,
  can,
  normalizeRole as baseNormalizeRole,
  getSidebarItemsForRole
} from "@/lib/auth/accessMatrix";
import { DataScope, UserContext } from "./permissions.types";

export * from "./permissions.types";
export { ACCESS_MATRIX, ALL_ROLES, can };

export const EXACT_ROLES: AppRole[] = [...ALL_ROLES];

export function normalizeRole(role?: string | null, isClient?: boolean): AppRole {
  return baseNormalizeRole(role, isClient);
}

export function getRoleScope(role: string | null | undefined, context?: UserContext): DataScope {
  const isClient = Boolean(context?.clientId || context?.assignedClientId);
  const norm = normalizeRole(role, isClient);
  if (norm === "CLIENT") return "own client only";
  if (norm === "CLAIM_PROCESSOR") return "own assigned claims only";
  return "company-wide";
}

export function getVisibleScreens(role: string | null | undefined, context?: UserContext): string[] {
  const isClient = Boolean(context?.clientId || context?.assignedClientId);
  const norm = normalizeRole(role, isClient);
  return [...ACCESS_MATRIX[norm].routes];
}

export function getMenuItems(role: string | null | undefined, context?: UserContext): string[] {
  const isClient = Boolean(context?.clientId || context?.assignedClientId);
  return getSidebarItemsForRole(role, isClient).map((item) => item.label);
}

export function getVisibleTabs(role: string | null | undefined, context?: UserContext): string[] {
  const isClient = Boolean(context?.clientId || context?.assignedClientId);
  const norm = normalizeRole(role, isClient);
  const tabs: string[] = ["overview"];

  if (can(norm, "documents:view", isClient)) tabs.push("documents");
  if (can(norm, "negotiations:view", isClient)) tabs.push("negotiations");

  if (norm !== "CLIENT") {
    tabs.push("claimInfo", "voyage", "ports", "sof", "discrepancies", "ownerComparison", "activity");
  }
  if (can(norm, "calculator:view", isClient)) tabs.push("calculations");
  if (can(norm, "rac:view", isClient)) tabs.push("rac");
  if (can(norm, "timebar:view", isClient)) tabs.push("timebar");
  if (can(norm, "payments:view", isClient)) tabs.push("payments");
  if (can(norm, "reports:view", isClient)) tabs.push("reports");

  return tabs;
}

export function getVisibleButtons(role: string | null | undefined, context?: UserContext): string[] {
  const isClient = Boolean(context?.clientId || context?.assignedClientId);
  const norm = normalizeRole(role, isClient);
  return [...ACCESS_MATRIX[norm].permissions];
}

export function hasRolePermission(
  role: string | null | undefined,
  permission: Permission,
  context?: UserContext
): boolean {
  const isClient = Boolean(context?.clientId || context?.assignedClientId);
  return can(role, permission, isClient);
}
