import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import {
  CREATE_MATRIX,
  CreateUserSchema,
  getSubtreeUsers,
  isUserInActorSubtree,
  logAudit
} from "@/lib/auth/userHierarchy";
import { hashPassword } from "@/lib/auth/password";
import { getDatabase } from "@/lib/db";
import { getUserById } from "@/lib/db/queries";
import { normalizeRole } from "@/app/access/roles";

// GET /api/users: Lists users strictly scoped to the actor's subtree
export const GET = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor"],
  handler: async ({ user }) => {
    const subtreeUsers = getSubtreeUsers(user);

    // If Admin, also include Admin themselves in the directory
    let result = subtreeUsers;
    if (normalizeRole(user.role) === "ADMIN") {
      const adminSelf = getUserById(user.id);
      if (adminSelf && !subtreeUsers.some((u) => u.id === adminSelf.id)) {
        result = [adminSelf, ...subtreeUsers];
      }
    }

    return NextResponse.json({ users: result });
  }
});

// POST /api/users: Hierarchical User Creation
export const POST = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor"],
  schema: CreateUserSchema,
  handler: async ({ user, body, req }) => {
    const db = getDatabase();

    // 1. Check CREATE_MATRIX using verified DB role
    const allowedCreatedRoles = CREATE_MATRIX[user.role] || [];
    const requestedRole = body.role === "Processor" ? "Claim Processor" : body.role;

    const isRoleAllowed = allowedCreatedRoles.some(
      (r) =>
        r === requestedRole ||
        normalizeRole(r) === normalizeRole(requestedRole)
    );

    if (!isRoleAllowed) {
      return NextResponse.json(
        {
          error: `Forbidden: Role '${user.role}' is not permitted to create '${body.role}' users.`
        },
        { status: 403 }
      );
    }

    // 2. Check email uniqueness
    const existingEmail = db
      .prepare("SELECT id FROM users WHERE LOWER(email) = LOWER(?)")
      .get(body.email.trim());
    if (existingEmail) {
      return NextResponse.json(
        { error: "A user with this email address already exists." },
        { status: 400 }
      );
    }

    // 3. Resolve client_id if role is Client or REVIEWER_CLIENT with client info
    let finalClientId: string | null = null;
    let finalClientName: string | null = null;

    if (body.role === "Client" || (body.clientId || body.clientName)) {
      if (body.clientId) {
        const clientRow = db
          .prepare("SELECT client_id, name FROM clients WHERE client_id = ?")
          .get(body.clientId) as any;
        if (clientRow) {
          finalClientId = clientRow.client_id;
          finalClientName = clientRow.name;
        } else {
          finalClientId = body.clientId;
          finalClientName = body.clientName || body.clientId;
          db.prepare(
            "INSERT OR IGNORE INTO clients (client_id, name, created_at) VALUES (?, ?, ?)"
          ).run(finalClientId, finalClientName, new Date().toISOString());
        }
      } else if (body.clientName) {
        const clientRow = db
          .prepare("SELECT client_id, name FROM clients WHERE LOWER(name) = LOWER(?)")
          .get(body.clientName.trim()) as any;
        if (clientRow) {
          finalClientId = clientRow.client_id;
          finalClientName = clientRow.name;
        } else {
          finalClientId = `client-${body.clientName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
          finalClientName = body.clientName.trim();
          db.prepare(
            "INSERT OR IGNORE INTO clients (client_id, name, created_at) VALUES (?, ?, ?)"
          ).run(finalClientId, finalClientName, new Date().toISOString());
        }
      }
    }

    // 4. Temporary password generation and hashing
    const tempPassword = body.password || body.temporaryPassword || "TempPass@123";
    const passwordHash = await hashPassword(tempPassword);

    const newUserId = `usr-${Date.now()}`;
    const now = new Date().toISOString();
    const dbRole = normalizeRole(requestedRole);

    // 5. Transaction: Insert user + Insert audit log
    const createTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO users (
          id, name, email, username, password_hash, role,
          client_id, client_name, created_by, token_version,
          status, role_description, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'Active', ?, ?, ?)
      `).run(
        newUserId,
        body.name.trim(),
        body.email.trim().toLowerCase(),
        body.username?.trim() || body.email.split("@")[0],
        passwordHash,
        dbRole,
        finalClientId,
        finalClientName,
        user.id,
        body.roleDescription || `Created by ${user.role} (${user.name})`,
        now,
        now
      );

      logAudit({
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: "USER_CREATE",
        targetType: "user",
        targetId: newUserId,
        details: {
          role: dbRole,
          email: body.email,
          clientId: finalClientId
        },
        ipAddress: req.headers.get("x-forwarded-for") || undefined
      });
    });

    createTx();

    const createdUser = getUserById(newUserId);
    return NextResponse.json({ success: true, user: createdUser }, { status: 201 });
  }
});
