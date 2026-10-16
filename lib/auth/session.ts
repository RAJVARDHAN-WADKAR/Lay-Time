import { NextRequest, NextResponse } from "next/server";
import { verifyToken, SessionPayload } from "./jwt";
import { UserRole } from "@/lib/types";

export const AUTH_COOKIE_NAME = "laytime_auth_token";

export function getCurrentUserFromRequest(request: NextRequest): SessionPayload | null {
  // Check Authorization Header: Bearer <token>
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    const payload = verifyToken(token);
    if (payload) return payload;
  }

  // Check Cookies
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    return verifyToken(token);
  }

  return null;
}

export interface ScopedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clientId?: string;
  client_id?: string;
  clientName?: string;
  createdBy?: string;
  tokenVersion: number;
  status: "Active" | "Inactive";
  assignedClientId?: string | null;
}

/**
 * Server helper requireUser(): on every API request, load the user from the database
 * and reject if inactive or tokenVersion differs.
 */
export async function requireUser(request: NextRequest): Promise<
  | { user: ScopedUser; error?: never }
  | { user?: never; error: NextResponse }
> {
  const session = getCurrentUserFromRequest(request);
  if (!session || !session.userId) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized: Active session required" },
        { status: 401 }
      )
    };
  }

  // Load from database to verify active state and tokenVersion
  const { getUserById } = await import("@/lib/db/queries");
  const dbUser = getUserById(session.userId);
  if (!dbUser) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized: User account not found" },
        { status: 401 }
      )
    };
  }

  if (dbUser.status === "Inactive") {
    return {
      error: NextResponse.json(
        { error: "Forbidden: Account is deactivated" },
        { status: 403 }
      )
    };
  }

  const currentTokenVersion = dbUser.token_version ?? dbUser.tokenVersion ?? 1;
  const sessionTokenVersion = session.tokenVersion ?? 1;
  if (currentTokenVersion !== sessionTokenVersion) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized: Session invalidated, please log in again" },
        { status: 401 }
      )
    };
  }

  const assignedClientId =
    (dbUser.role === "REVIEWER_CLIENT" || dbUser.role === "Client")
      ? dbUser.client_id || dbUser.clientId || null
      : null;

  return {
    user: {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      clientId: dbUser.client_id || dbUser.clientId,
      client_id: dbUser.client_id || dbUser.clientId,
      clientName: dbUser.clientName,
      createdBy: dbUser.created_by || dbUser.createdBy,
      tokenVersion: currentTokenVersion,
      status: dbUser.status,
      assignedClientId
    }
  };
}

export * from "./permissions";


