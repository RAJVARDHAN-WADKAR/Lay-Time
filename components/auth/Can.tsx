"use client";

import React from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { UserRole, User } from "@/lib/types";

interface CanProps {
  roles?: UserRole[];
  perform?: (user: User) => boolean;
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
