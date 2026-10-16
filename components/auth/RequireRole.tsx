import React from "react";
import { cookies } from "next/headers";
import { verifyEdgeToken } from "@/lib/auth/edge-jwt";
import { UserRole } from "@/lib/types";

const AUTH_COOKIE_NAME = "laytime_auth_token";

interface RequireRoleProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

function normalizeRole(role?: string): UserRole {
  if (!role) return "Reviewer";
  if (role === "Claim Processor" || role === "Processor") return "Claim Processor";
  if (role === "Admin") return "Admin";
  if (role === "Supervisor") return "Supervisor";
  if (role === "Finance") return "Finance";
  if (role === "Reviewer") return "Reviewer";
  if (role === "Client") return "Client";
  return "Reviewer";
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
