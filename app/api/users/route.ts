import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { getAllUsers, createUser } from "@/lib/db/queries";
import { hashPassword } from "@/lib/auth/password";

export async function GET(request: NextRequest) {
  try {
    const session = getCurrentUserFromRequest(request);
    if (!session || session.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const users = getAllUsers();
    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getCurrentUserFromRequest(request);
    if (!session || session.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Only Admin can create users." }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, role, password, roleDescription } = body;

    if (!name || !email || !role || !password) {
      return NextResponse.json({ error: "Name, email, role and password are required" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const newUser = createUser({
      name,
      email,
      role,
      passwordHash,
      roleDescription
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error: any) {
    console.error("Create User API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 });
  }
}
