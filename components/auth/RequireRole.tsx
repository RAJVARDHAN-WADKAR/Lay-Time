import React from "react";
import { cookies } from "next/headers";
import { verifyEdgeToken } from "@/lib/auth/edge-jwt";
import { AppRole, normalizeRole } from "@/lib/auth/accessMatrix";
import { NoAccessScreen } from "./NoAccessScreen";

const AUTH_COOKIE_NAME = "laytime_auth_token";

interface RequireRoleProps {
  allowedRoles: (AppRole | string)[];
  children: React.ReactNode;
}

/**
 * Server component that reads verified role from the HTTP-only cookie on the server.
 * Renders the 403 No-Access screen when the user role is not allowed.
 */
export async function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return <NoAccessScreen />;
    }

    const session = await verifyEdgeToken(token);
    if (!session || !session.role) {
      return <NoAccessScreen />;
    }

    const isClient = Boolean(session.assignedClientId);
    const normSessionRole = normalizeRole(session.role, isClient);
    const isAllowed = allowedRoles.some((r) => normalizeRole(r) === normSessionRole);

    if (!isAllowed) {
      return <NoAccessScreen />;
    }

    return <>{children}</>;
  } catch {
    return <NoAccessScreen />;
  }
}
