import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets, images, and API routes to pass through or handle their own auth
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/uploads")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("laytime_auth_token")?.value;

  // Public routes: /login
  if (pathname === "/login") {
    if (token) {
      // If already logged in, redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Root redirect: / -> /dashboard
  if (pathname === "/") {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Protected application routes
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/claims") ||
    pathname.startsWith("/rac") ||
    pathname.startsWith("/calculations") ||
    pathname.startsWith("/documents") ||
    pathname.startsWith("/ocr") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/ai-assistant") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/settings");

  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
