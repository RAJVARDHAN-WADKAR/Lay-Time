import React from "react";
import { cookies } from "next/headers";
import { verifyEdgeToken } from "@/lib/auth/edge-jwt";
import { UserRole } from "@/lib/types";

const AUTH_COOKIE_NAME = "laytime_auth_token";

interface RequireRoleProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

function normalizeRole(role?: string): string {
  if (!role) return "REVIEWER_CLIENT";
  const upper = role.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (upper === "ADMIN") return "ADMIN";
  if (upper === "SUPERVISOR") return "SUPERVISOR";
  if (upper === "CLAIM_PROCESSOR" || upper === "PROCESSOR") return "CLAIM_PROCESSOR";
  if (upper === "REVIEWER" || upper === "CLIENT" || upper === "REVIEWER_CLIENT") return "REVIEWER_CLIENT";
  if (upper === "FINANCE") return "SUPERVISOR";
  return "REVIEWER_CLIENT";
}

/**
 * Server component that reads verified role from the HTTP-only cookie on the server.
 * Renders NOTHING (not disabled) when the user role is not allowed. Zero-trust enforcement.
 */
export async function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return null;
    }

    const session = await verifyEdgeToken(token);
    if (!session || !session.role) {
      return null;
    }

    const normSessionRole = normalizeRole(session.role);
    const isAllowed = allowedRoles.some((r) => normalizeRole(r) === normSessionRole);

    if (!isAllowed) {
      return null;
    }

    return <>{children}</>;
  } catch {
    return null;
  }
}
