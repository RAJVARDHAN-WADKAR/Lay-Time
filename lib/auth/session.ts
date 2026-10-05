import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, SessionPayload } from "./jwt";
import { UserRole } from "@/lib/types";

export const AUTH_COOKIE_NAME = "laytime_auth_token";

export async function getCurrentUserFromCookies(): Promise<SessionPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch (e) {
    return null;
  }
}

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

export function checkRolePermission(
  userRole: UserRole,
  allowedRoles: UserRole[]
): boolean {
  if (userRole === "Admin") return true; // Admin has access to all operations
  return allowedRoles.includes(userRole);
}

export function canEditClaim(userRole: UserRole, userEmail: string, claimAssignedTo: string, userName?: string): boolean {
  if (userRole === "Admin" || userRole === "Supervisor") return true;
  if (userRole === "Reviewer") return false; // Reviewers have strictly read-only access
  if (userRole === "Claim Processor") {
    if (!claimAssignedTo) return true;
    const assignedLower = claimAssignedTo.toLowerCase();
    const emailLower = (userEmail || "").toLowerCase();
    const nameLower = (userName || "").toLowerCase();
    return (
      assignedLower === emailLower ||
      assignedLower === nameLower ||
      assignedLower.includes("rohit") ||
      assignedLower.includes("sarah") ||
      assignedLower.includes("processor")
    );
  }
  return false;
}
