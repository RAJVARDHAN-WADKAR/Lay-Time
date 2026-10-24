import jwt from "jsonwebtoken";
import { UserRole } from "@/lib/types";
import { getJwtSecret } from "./jwt-secret";

export const JWT_EXPIRES_IN = "8h"; // 8 hours

export interface SessionPayload {
  userId: string;
  role: UserRole;
  assignedClientId: string | null;
  tokenVersion: number;
  email?: string;
  name?: string;
  clientName?: string;
  iat?: number;
  exp?: number;
}

export function signToken(payload: Omit<SessionPayload, "iat" | "exp">): string {
  return jwt.sign(
    {
      userId: payload.userId,
      role: payload.role,
      assignedClientId: payload.assignedClientId ?? null,
      tokenVersion: payload.tokenVersion ?? 1,
      email: payload.email,
      name: payload.name,
      clientName: payload.clientName
    },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as SessionPayload;
  } catch {
    return null;
  }
}
