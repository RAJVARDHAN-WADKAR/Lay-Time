import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db/queries";
import { comparePassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
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

    const user = getUserByEmail(trimmedEmail);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.status === "Inactive") {
      return NextResponse.json({ error: "Your account is deactivated. Contact system administrator." }, { status: 403 });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Sign JWT with userId, role, assignedClientId (null unless Client), tokenVersion
    const isClientRole = user.role === "Client" || (user.role === "REVIEWER_CLIENT" && Boolean(user.client_id || user.clientId));
    const assignedClientId = isClientRole ? (user.client_id || user.clientId || null) : null;
    const token = signToken({
      userId: user.id,
      role: user.role,
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
      role: user.role,
      clientId: assignedClientId || undefined,
      clientName: user.clientName,
      avatar: user.avatar,
      status: user.status,
      roleDescription: user.roleDescription,
      createdAt: user.createdAt
    };

    const response = NextResponse.json({
      success: true,
      token,
      user: userResponse
    });

    // Set Secure HTTP-Only Cookie (8 hours)
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
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
