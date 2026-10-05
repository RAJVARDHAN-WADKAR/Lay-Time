import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyEdgeToken } from "@/lib/auth/edge-jwt";

const AUTH_COOKIE_NAME = "laytime_auth_token";

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

  // 2. Read authentication cookie
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifyEdgeToken(token) : null;
  const isAuthenticated = !!session;

  // 3. Root URL redirect
  if (pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 4. Login Page Handling
  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
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

  // 6. Check if route is protected
  const isProtectedPage = PROTECTED_PAGE_ROUTES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isApiRoute = pathname.startsWith("/api/");

  if (isProtectedPage) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      // Clear invalid cookie if present
      if (token) {
        redirectResponse.cookies.delete(AUTH_COOKIE_NAME);
      }
      return redirectResponse;
    }

    // Role-based route enforcement: /users is Admin-only
    if (pathname === "/users" || pathname.startsWith("/users/")) {
      if (session.role !== "Admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    // Authenticated access: set no-cache headers to prevent browser back-button caching of protected content
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  }

  if (isApiRoute && !isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized: Active session required" },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
