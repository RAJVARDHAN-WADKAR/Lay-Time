import {
  RoleName,
  Role,
  Resource,
  Action,
  DataScope,
  UserContext,
  RoleDefinition
} from "./permissions.types";
import { adminRole } from "./admin.role";
import { supervisorRole } from "./supervisor.role";
import { claimProcessorRole } from "./claim-processor.role";
import { reviewerClientRole } from "./reviewer-client.role";

export * from "./permissions.types";
export * from "./admin.role";
export * from "./supervisor.role";
export * from "./claim-processor.role";
export * from "./reviewer-client.role";

export const ROLES_REGISTRY: Record<RoleName, RoleDefinition> = {
  ADMIN: adminRole,
  SUPERVISOR: supervisorRole,
  CLAIM_PROCESSOR: claimProcessorRole,
  REVIEWER_CLIENT: reviewerClientRole
};

export const EXACT_ROLES: RoleName[] = [
  "ADMIN",
  "SUPERVISOR",
  "CLAIM_PROCESSOR",
  "REVIEWER_CLIENT"
];

/**
 * Normalizes any incoming role string into one of the exact 4 roles:
 * ADMIN, SUPERVISOR, CLAIM_PROCESSOR, REVIEWER_CLIENT
 */
export function normalizeRole(role?: string | null): RoleName {
  if (!role) return "REVIEWER_CLIENT";
  const upper = role.trim().toUpperCase().replace(/[\s-]+/g, "_");

  if (upper === "ADMIN") return "ADMIN";
  if (upper === "SUPERVISOR") return "SUPERVISOR";
  if (upper === "CLAIM_PROCESSOR" || upper === "PROCESSOR") return "CLAIM_PROCESSOR";
  if (upper === "REVIEWER" || upper === "CLIENT" || upper === "REVIEWER_CLIENT") return "REVIEWER_CLIENT";
  if (upper === "FINANCE") return "SUPERVISOR"; // Invoices/payments managed by Supervisor

  return "REVIEWER_CLIENT";
}

/**
 * Returns the RoleDefinition for a role
 */
export function getRoleDefinition(role?: string | null): RoleDefinition {
  const normalized = normalizeRole(role);
  return ROLES_REGISTRY[normalized];
}

/**
 * Checks whether a given role has permission to perform an action on a resource
 */
export function hasPermission(
  role: string | null | undefined,
  resource: Resource,
  action: Action,
  context?: UserContext
): boolean {
  const def = getRoleDefinition(role);
  const actions = def.permissions[resource] || [];

  if (!actions.includes(action)) {
    return false;
  }

  // Special case: External client vs Internal reviewer on sensitive resources
  if (def.name === "REVIEWER_CLIENT") {
    const isClient = Boolean(context?.clientId || context?.assignedClientId);

    if (isClient) {
      // External clients cannot access RAC or master lists
      if (resource === "rac" || resource === "clients" || resource === "vessels" || resource === "auditLog" || resource === "settings" || resource === "users") {
        return false;
      }
      // External client can only upload requested documents and approve final offers
      if (resource === "documents" && action !== "view" && action !== "create") {
        return false;
      }
      if (resource === "negotiations" && action !== "view" && action !== "approve") {
        return false;
      }
    } else {
      // Internal reviewer is strictly read-only: no create on documents or approve on negotiations
      if (action !== "view" && action !== "export") {
        return false;
      }
    }
  }

  return true;
}

/**
 * Returns the data scope for a given user context
 */
export function getRoleScope(
  role: string | null | undefined,
  context?: UserContext
): DataScope {
  const def = getRoleDefinition(role);
  if (typeof def.scope === "function") {
    return def.scope(context);
  }
  return def.scope;
}

/**
 * Returns whether a field is hidden for this role
 */
export function isFieldHidden(
  role: string | null | undefined,
  fieldName: string,
  context?: UserContext
): boolean {
  const def = getRoleDefinition(role);
  const hidden = typeof def.hiddenFields === "function" ? def.hiddenFields(context) : def.hiddenFields;
  return hidden.includes(fieldName);
}

/**
 * Returns visible screens for the role
 */
export function getVisibleScreens(
  role: string | null | undefined,
  context?: UserContext
): string[] {
  const def = getRoleDefinition(role);
  return typeof def.visibleScreens === "function" ? def.visibleScreens(context) : def.visibleScreens;
}

/**
 * Returns navigation menu items for the role
 */
export function getMenuItems(
  role: string | null | undefined,
  context?: UserContext
): string[] {
  const def = getRoleDefinition(role);
  return typeof def.menuItems === "function" ? def.menuItems(context) : def.menuItems;
}

/**
 * Returns visible tabs for the role
 */
export function getVisibleTabs(
  role: string | null | undefined,
  context?: UserContext
): string[] {
  const def = getRoleDefinition(role);
  return typeof def.tabs === "function" ? def.tabs(context) : def.tabs;
}

/**
 * Returns visible buttons for the role
 */
export function getVisibleButtons(
  role: string | null | undefined,
  context?: UserContext
): string[] {
  const def = getRoleDefinition(role);
  return typeof def.buttons === "function" ? def.buttons(context) : def.buttons;
}
