import jwt from "jsonwebtoken";
import { UserRole } from "@/lib/types";

const JWT_SECRET = process.env.JWT_SECRET || "laytime_secure_jwt_secret_key_2024_shipping_demurrage";
const JWT_EXPIRES_IN = "7d";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export function signToken(payload: Omit<SessionPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch (error) {
    return null;
  }
}
