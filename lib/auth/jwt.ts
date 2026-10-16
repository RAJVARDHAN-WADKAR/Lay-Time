import jwt from "jsonwebtoken";
import { UserRole } from "@/lib/types";

export const JWT_SECRET = process.env.JWT_SECRET || "laytime_secure_jwt_secret_key_2024_shipping_demurrage";
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
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}
