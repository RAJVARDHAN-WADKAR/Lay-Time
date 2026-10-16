export type RoleName = "ADMIN" | "SUPERVISOR" | "CLAIM_PROCESSOR" | "REVIEWER_CLIENT";

export enum Role {
  ADMIN = "ADMIN",
  SUPERVISOR = "SUPERVISOR",
  CLAIM_PROCESSOR = "CLAIM_PROCESSOR",
  REVIEWER_CLIENT = "REVIEWER_CLIENT"
}

export type Resource =
  | "claims"
  | "sof"
  | "ports"
  | "berths"
  | "documents"
  | "calculations"
  | "rac"
  | "ocr"
  | "negotiations"
  | "invoices"
  | "payments"
  | "clients"
  | "vessels"
  | "users"
  | "settings"
  | "dashboard"
  | "analytics"
  | "reports"
  | "auditLog";

export type Action =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "approve"
  | "assign"
  | "override"
  | "settle"
  | "export";

export type DataScope = "company-wide" | "own client only" | "own assigned claims only";

export interface UserContext {
  userId?: string;
  role?: RoleName | string;
  clientId?: string | null;
  assignedClientId?: string | null;
  email?: string;
}

export interface RoleDefinition {
  name: RoleName;
  purpose: string;
  scope: DataScope | ((context?: UserContext) => DataScope);
  permissions: Record<Resource, Action[]>;
  hiddenFields: string[] | ((context?: UserContext) => string[]);
  visibleScreens: string[] | ((context?: UserContext) => string[]);
  menuItems: string[] | ((context?: UserContext) => string[]);
  tabs: string[] | ((context?: UserContext) => string[]);
  buttons: string[] | ((context?: UserContext) => string[]);
  specialRules: string[];
}
