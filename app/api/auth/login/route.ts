import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db/queries";
import { comparePassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = getUserByEmail(email);
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

    // Sign JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
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

    // Set Secure HTTP-Only Cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/"
    });

    return response;
  } catch (error: any) {
    console.error("Login API Error:", error);
    return NextResponse.json({ error: "Internal authentication error" }, { status: 500 });
  }
}
