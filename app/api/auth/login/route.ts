export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db/queries";
import { comparePassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";
import { verifySameOriginRequest } from "@/lib/api/withApi";

interface RateLimitEntry {
  failures: number;
  firstFailureTime: number;
}

const loginFailureStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

export async function POST(request: NextRequest) {
  try {
    const originBlock = verifySameOriginRequest(request);
    if (originBlock) return originBlock;

    const body = await request.json();
    const { email, password } = body;

    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json({ error: "Please enter a valid corporate email address" }, { status: 400 });
    }

    const ip = getClientIp(request);
    const rateLimitKey = `${ip}:${trimmedEmail}`;
    const now = Date.now();
    const rateLimit = loginFailureStore.get(rateLimitKey);

    if (rateLimit) {
      if (now - rateLimit.firstFailureTime > RATE_LIMIT_WINDOW_MS) {
        loginFailureStore.delete(rateLimitKey);
      } else if (rateLimit.failures >= MAX_FAILED_ATTEMPTS) {
        return NextResponse.json(
          { error: "Too many failed login attempts. Please try again after 15 minutes." },
          { status: 429 }
        );
      }
    }

    const recordFailure = () => {
      const entry = loginFailureStore.get(rateLimitKey);
      if (!entry || now - entry.firstFailureTime > RATE_LIMIT_WINDOW_MS) {
        loginFailureStore.set(rateLimitKey, { failures: 1, firstFailureTime: now });
      } else {
        entry.failures += 1;
      }
    };

    const user = getUserByEmail(trimmedEmail);

    // Uniform generic error for: user not found, inactive account, or incorrect password
    if (!user || user.status === "Inactive") {
      recordFailure();
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      recordFailure();
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Login succeeded - clear failure counter
    loginFailureStore.delete(rateLimitKey);

    // Sign JWT with normalized role (5 distinct roles: ADMIN, SUPERVISOR, CLAIM_PROCESSOR, REVIEWER, CLIENT)
    const { normalizeRole } = await import("@/lib/auth/accessMatrix");
    const normRole = normalizeRole(user.role, Boolean(user.client_id || user.clientId));
    const assignedClientId = normRole === "CLIENT" ? (user.client_id || user.clientId || null) : null;
    const token = signToken({
      userId: user.id,
      role: normRole,
      assignedClientId,
      tokenVersion: user.token_version ?? user.tokenVersion ?? 1,
      email: user.email,
      name: user.name,
      clientName: user.clientName
    });

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: normRole,
      clientId: assignedClientId || undefined,
      clientName: user.clientName,
      avatar: user.avatar,
      status: user.status,
      roleDescription: user.roleDescription,
      createdAt: user.createdAt
    };

    // Return user info in body, JWT in HttpOnly cookie ONLY (never in body)
    const response = NextResponse.json({
      success: true,
      user: userResponse
    });

    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()?.toLowerCase();
    const isHttpsRequest = forwardedProto === "https" || request.nextUrl?.protocol === "https:";
    const isSecure = process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === "true"
      : process.env.NODE_ENV === "production" && isHttpsRequest;

    // Set Secure HTTP-Only Cookie (8 hours)
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 8 * 60 * 60, // 8 hours
      path: "/"
    });

    return response;
  } catch (error: any) {
    console.error("Login API Error:", error);
    return NextResponse.json({ error: "Internal authentication error" }, { status: 500 });
  }
}
