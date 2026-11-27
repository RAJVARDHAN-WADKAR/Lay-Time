import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyEdgeToken } from "@/lib/auth/edge-jwt";
import {
  getRoleDashboardPath,
  isApiRouteAllowed,
  isProtectedAppPath,
  isRouteAllowed
} from "@/lib/auth/accessMatrix";

const AUTH_COOKIE_NAME = "laytime_auth_token";

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

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
  const isClient = Boolean(session?.assignedClientId);

  // 3. Root URL redirect to dedicated role dashboard or login
  if (pathname === "/") {
    if (isAuthenticated) {
      const targetDashboard = getRoleDashboardPath(session?.role, isClient);
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 4. Login Page Handling: redirect already logged-in users to their role dashboard
  if (pathname === "/login") {
    if (isAuthenticated) {
      const targetDashboard = getRoleDashboardPath(session?.role, isClient);
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }
    return NextResponse.next();
  }

  // 5. Public Auth API endpoints
  if (
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/auth/me"
  ) {
    return NextResponse.next();
  }

  // 6. API routes: enforce authentication and ACCESS_MATRIX
  if (pathname.startsWith("/api/")) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Unauthorized: Active session required" },
        { status: 401 }
      );
    }

    if (!isApiRouteAllowed(session?.role, pathname, request.method, isClient)) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient permissions for this resource" },
        { status: 403 }
      );
    }

    return NextResponse.next();
  }

  // 7. Protected Application Pages
  if (isProtectedAppPath(pathname) || pathname === "/no-access") {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", `${pathname}${search || ""}`);
      const redirectResponse = NextResponse.redirect(loginUrl);
      if (token) {
        redirectResponse.cookies.delete(AUTH_COOKIE_NAME);
      }
      return redirectResponse;
    }

    // Exact /dashboard dispatcher -> role's dedicated dashboard
    if (pathname === "/dashboard") {
      const targetDashboard = getRoleDashboardPath(session?.role, isClient);
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }

    // Section 1.4: Unauthorized page access shows the 403 No-Access screen
    // WITHOUT silently redirecting to the dashboard.
    if (!isRouteAllowed(session?.role, pathname, isClient)) {
      return NextResponse.rewrite(new URL("/no-access", request.url), { status: 403 });
    }

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
