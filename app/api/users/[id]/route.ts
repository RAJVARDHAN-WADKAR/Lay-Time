import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import {
  CREATE_MATRIX,
  UpdateUserSchema,
  isUserInActorSubtree,
  logAudit
} from "@/lib/auth/userHierarchy";
import { getUserById, updateUser, setUserStatus } from "@/lib/db/queries";
import { hashPassword } from "@/lib/auth/password";
import { getDatabase } from "@/lib/db";

// GET /api/users/[id]: Get user details within subtree or self
export const GET = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor"],
  handler: async ({ user, params }) => {
    const targetId = params.id;
    const isSelf = user.id === targetId;
    const inSubtree = isUserInActorSubtree(user, targetId);

    if (!isSelf && !inSubtree && user.role !== "Admin") {
      return NextResponse.json(
        { error: "Forbidden: Target user is outside your management hierarchy" },
        { status: 403 }
      );
    }

    const targetUser = getUserById(targetId);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: targetUser });
  }
});

// PUT /api/users/[id]: Update user within actor's subtree
export const PUT = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor"],
  schema: UpdateUserSchema,
  handler: async ({ user, params, body, req }) => {
    const targetId = params.id;
    const inSubtree = isUserInActorSubtree(user, targetId);

    if (!inSubtree) {
      return NextResponse.json(
        { error: "Forbidden: You may only manage users in your own created_by subtree" },
        { status: 403 }
      );
    }

    const existing = getUserById(targetId);
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Role modification check: New role must be within actor's CREATE_MATRIX
    if (body.role && body.role !== existing.role) {
      const allowedRoles = CREATE_MATRIX[user.role] || [];
      const normalizedRole = body.role === "Processor" ? "Claim Processor" : body.role;
      if (!allowedRoles.includes(normalizedRole as any)) {
        return NextResponse.json(
          {
            error: `Forbidden: Role '${user.role}' cannot assign role '${body.role}'`
          },
          { status: 403 }
        );
      }
    }

    let passwordHash: string | undefined = undefined;
    if (body.password && body.password.trim() !== "") {
      passwordHash = await hashPassword(body.password);
    }

    const updated = updateUser(targetId, {
      ...body,
      clientId: body.clientId || undefined,
      clientName: body.clientName || undefined,
      passwordHash,
      bumpToken: true
    } as any);

    logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "USER_UPDATE",
      targetType: "user",
      targetId,
      details: {
        updatedFields: Object.keys(body),
        roleChanged: body.role !== undefined && body.role !== existing.role
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined
    });

    return NextResponse.json({ success: true, user: updated });
  }
});

// DELETE /api/users/[id]: Deactivate user account with hierarchy & last-Admin guards
export const DELETE = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor"],
  handler: async ({ user, params, req }) => {
    const targetId = params.id;

    // 1. Guard against self-deactivation
    if (user.id === targetId) {
      return NextResponse.json(
        { error: "Forbidden: Self-deactivation is prohibited" },
        { status: 403 }
      );
    }

    // 2. Guard against deactivating users outside actor's subtree
    const inSubtree = isUserInActorSubtree(user, targetId);
    if (!inSubtree) {
      return NextResponse.json(
        { error: "Forbidden: You may only manage users in your own created_by subtree" },
        { status: 403 }
      );
    }

    const db = getDatabase();
    const target = getUserById(targetId);
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3. Guard against removal of the last active Admin
    if (target.role === "Admin") {
      const activeAdmins = (
        db
          .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'Admin' AND status = 'Active'")
          .get() as any
      )?.count || 0;

      if (activeAdmins <= 1) {
        return NextResponse.json(
          { error: "Forbidden: Cannot deactivate the last active Admin account" },
          { status: 403 }
        );
      }
    }

    // 4. Deactivate and bump token_version immediately
    setUserStatus(targetId, "Inactive");

    // 5. Audit log
    logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "USER_DEACTIVATE",
      targetType: "user",
      targetId,
      details: {
        targetEmail: target.email,
        targetRole: target.role
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined
    });

    return NextResponse.json({
      success: true,
      message: "User account deactivated successfully and sessions invalidated."
    });
  }
});
