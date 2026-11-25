import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyEdgeToken } from "@/lib/auth/edge-jwt";
import { normalizeRole, can, getRoleDashboardPath } from "@/lib/auth/rolePermissions";

const AUTH_COOKIE_NAME = "laytime_auth_token";

// Project route-to-roles map for edge middleware
// Note: More specific prefixes must come BEFORE more general prefixes
const ROUTE_ROLES_MAP: { prefix: string; allowedRoles: string[] }[] = [
  // 1. Role-specific Separate Dashboards (Strict 1-to-1 role matching)
  { prefix: "/dashboard/admin", allowedRoles: ["ADMIN"] },
  { prefix: "/dashboard/supervisor", allowedRoles: ["SUPERVISOR"] },
  { prefix: "/dashboard/claim-processor", allowedRoles: ["CLAIM_PROCESSOR"] },
  { prefix: "/dashboard/reviewer", allowedRoles: ["REVIEWER", "ADMIN"] },
  { prefix: "/dashboard/reviewer-client", allowedRoles: ["REVIEWER", "CLIENT"] },
  { prefix: "/dashboard", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR", "REVIEWER", "CLIENT"] },

  // 2. Application Feature Screens
  { prefix: "/settings", allowedRoles: ["ADMIN"] },
  { prefix: "/users", allowedRoles: ["ADMIN", "SUPERVISOR"] },
  { prefix: "/claims/create", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR"] },
  { prefix: "/claims", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR", "REVIEWER", "CLIENT"] },
  { prefix: "/calculator", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR"] },
  { prefix: "/calculations", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR"] },
  { prefix: "/ocr", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR"] },
  { prefix: "/ai-assistant", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR"] },
  { prefix: "/rac", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR", "REVIEWER"] },
  { prefix: "/timebar", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR", "REVIEWER", "CLIENT"] },
  { prefix: "/analytics", allowedRoles: ["ADMIN", "SUPERVISOR"] },
  { prefix: "/reports", allowedRoles: ["ADMIN", "SUPERVISOR", "REVIEWER"] },
  { prefix: "/documents", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR", "REVIEWER", "CLIENT"] },
  { prefix: "/sof", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR", "REVIEWER", "CLIENT"] },
  { prefix: "/notifications", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR", "REVIEWER", "CLIENT"] }
];

// API route-to-roles map for edge middleware
const API_ROLES_MAP: { prefix: string; method?: string; exact?: boolean; allowedRoles: string[] }[] = [
  { prefix: "/api/settings", allowedRoles: ["ADMIN"] },
  { prefix: "/api/ocr", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR"] },
  { prefix: "/api/ai-assistant", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR"] },
  { prefix: "/api/rac", allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR", "REVIEWER"] },
  { prefix: "/api/claims", method: "POST", exact: true, allowedRoles: ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR"] }
];

// Protected application page prefixes
const PROTECTED_PAGE_ROUTES = [
  "/dashboard",
  "/claims",
  "/rac",
  "/timebar",
  "/analytics",
  "/reports",
  "/calculator",
  "/calculations",
  "/documents",
  "/ocr",
  "/sof",
  "/users",
  "/settings",
  "/notifications",
  "/ai-assistant"
];

function roleMatches(userRole: any, allowedRoles: string[], isClient?: boolean): boolean {
  const normUser = normalizeRole(userRole, isClient);
  return allowedRoles.some((r) => {
    const normAllowed = normalizeRole(r);
    return normAllowed === normUser;
  });
}

function getRoleDashboardUrl(role?: string, isClient?: boolean): string {
  return getRoleDashboardPath(role, isClient);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip static assets, Next internal files, and favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Read authentication cookie or Bearer token header
  let token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
  }

  const session = token ? await verifyEdgeToken(token) : null;
  const isAuthenticated = !!session;
  const isClient = Boolean(session?.assignedClientId || session?.role === "Client");

  // 3. Root URL redirect to dedicated role dashboard
  if (pathname === "/") {
    if (isAuthenticated) {
      const targetDashboard = getRoleDashboardUrl(session?.role, isClient);
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 4. Login Page Handling: redirect already logged-in users to their role dashboard
  if (pathname === "/login") {
    if (isAuthenticated) {
      const targetDashboard = getRoleDashboardUrl(session?.role, isClient);
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }
    return NextResponse.next();
  }

  // 5. Auth API endpoints are public
  if (
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/auth/me"
  ) {
    return NextResponse.next();
  }

  const isApiRoute = pathname.startsWith("/api/");
  const isProtectedPage = PROTECTED_PAGE_ROUTES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // 6. Handle API routes
  if (isApiRoute) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Unauthorized: Active session required" },
        { status: 401 }
      );
    }

    // Edge API role map enforcement
    for (const rule of API_ROLES_MAP) {
      const isMatch = rule.exact
        ? pathname === rule.prefix
        : (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`));

      if (isMatch) {
        if (rule.method && request.method !== rule.method) {
          continue;
        }
        if (session.assignedClientId && rule.prefix === "/api/rac") {
          return NextResponse.json(
            { error: "Forbidden: Client role may not access this resource" },
            { status: 403 }
          );
        }
        if (!roleMatches(session.role, rule.allowedRoles, Boolean(session.assignedClientId))) {
          return NextResponse.json(
            { error: "Forbidden: Insufficient permissions for this resource" },
            { status: 403 }
          );
        }
      }
    }

    return NextResponse.next();
  }

  // 7. Handle Protected Pages
  if (isProtectedPage) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      if (token) {
        redirectResponse.cookies.delete(AUTH_COOKIE_NAME);
      }
      return redirectResponse;
    }

    // Exact /dashboard URL: immediately redirect to the user's separate role dashboard
    if (pathname === "/dashboard") {
      const targetDashboard = getRoleDashboardUrl(session?.role, isClient);
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }

    // External Client Restrictions: client can only access client-allowed screens
    if (isClient) {
      const clientBlockedPrefixes = [
        "/rac",
        "/calculator",
        "/calculations",
        "/ocr",
        "/users",
        "/settings",
        "/dashboard/admin",
        "/dashboard/supervisor",
        "/dashboard/claim-processor",
        "/dashboard/finance"
      ];

      const isBlocked = clientBlockedPrefixes.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`)
      );

      if (isBlocked) {
        return NextResponse.redirect(new URL("/dashboard/reviewer-client", request.url));
      }
    }

    // Edge route-to-roles map enforcement
    for (const rule of ROUTE_ROLES_MAP) {
      if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
        if (!roleMatches(session?.role, rule.allowedRoles, isClient)) {
          // If accessing an unauthorized role dashboard or screen, redirect to their own separate dashboard
          const fallback = getRoleDashboardUrl(session?.role, isClient);
          return NextResponse.redirect(new URL(fallback, request.url));
        }
      }
    }

    // Authenticated access: set no-cache headers
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
