"use client";

import React from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { UserRole, User } from "@/lib/types";

interface CanProps {
  roles?: UserRole[];
  perform?: (user: User) => boolean;
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
 * Client component zero-trust rendering guard fed by useAuth() / /api/auth/me session.
 * Renders NOTHING (not disabled) when the condition is not met.
 */
export function Can({ roles, perform, children }: CanProps) {
  const { user, role, isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated || !user) {
    return null;
  }

  if (roles && roles.length > 0) {
    const userNorm = normalizeRole(role);
    const isAllowed = roles.some((r) => normalizeRole(r) === userNorm);
    if (!isAllowed) {
      return null;
    }
  }

  if (perform && !perform(user)) {
    return null;
  }

  return <>{children}</>;
}
