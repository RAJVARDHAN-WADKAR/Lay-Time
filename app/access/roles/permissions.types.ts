import { AppRole } from "@/lib/auth/accessMatrix";

export type RoleName = AppRole;

export type DataScope = "company-wide" | "own client only" | "own assigned claims only";

export interface UserContext {
  userId?: string;
  role?: RoleName | string;
  clientId?: string | null;
  assignedClientId?: string | null;
  email?: string;
}
