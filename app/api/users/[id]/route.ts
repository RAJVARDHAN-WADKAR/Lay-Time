import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { getUserById, updateUser, setUserStatus } from "@/lib/db/queries";
import { hashPassword } from "@/lib/auth/password";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getCurrentUserFromRequest(request);
    if (!session || session.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const user = getUserById(params.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getCurrentUserFromRequest(request);
    if (!session || session.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Only Admin can modify users." }, { status: 403 });
    }

    const body = await request.json();
    let passwordHash: string | undefined = undefined;
    if (body.password && body.password.trim() !== "") {
      passwordHash = await hashPassword(body.password);
    }

    const updated = updateUser(params.id, {
      ...body,
      passwordHash
    });

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getCurrentUserFromRequest(request);
    if (!session || session.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Only Admin can deactivate users." }, { status: 403 });
    }

    // Deactivate user rather than hard deleting to maintain audit trails
    const ok = setUserStatus(params.id, "Inactive");
    if (!ok) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User account deactivated successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to deactivate user" }, { status: 500 });
  }
}
