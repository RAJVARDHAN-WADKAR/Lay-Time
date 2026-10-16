import { getDatabase } from "@/lib/db";
import { UserRole, User } from "@/lib/types";
import { ScopedUser } from "@/lib/auth/session";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

export * from "./userHierarchyConstants";


/**
 * Recursively retrieves all user IDs in the actor's created_by subtree.
 */
export function getSubtreeUserIds(actorId: string): string[] {
  const db = getDatabase();
  const collectedIds = new Set<string>();
  let currentLevel = [actorId];

  while (currentLevel.length > 0) {
    const placeholders = currentLevel.map(() => "?").join(",");
    const rows = db
      .prepare(`SELECT id FROM users WHERE created_by IN (${placeholders})`)
      .all(...currentLevel) as { id: string }[];

    currentLevel = [];
    for (const row of rows) {
      if (!collectedIds.has(row.id)) {
        collectedIds.add(row.id);
        currentLevel.push(row.id);
      }
    }
  }

  return Array.from(collectedIds);
}

/**
 * Verifies if targetUserId is strictly inside the actor's created_by subtree.
 * Root Admin also has oversight over users directly or indirectly created.
 */
export function isUserInActorSubtree(actor: ScopedUser, targetUserId: string): boolean {
  if (actor.id === targetUserId) {
    return false; // Actor is not in their own created subtree
  }

  const subtree = getSubtreeUserIds(actor.id);
  return subtree.includes(targetUserId);
}

/**
 * Returns users belonging to the actor's subtree.
 */
export function getSubtreeUsers(actor: ScopedUser): User[] {
  const db = getDatabase();
  const subtreeIds = getSubtreeUserIds(actor.id);

  if (subtreeIds.length === 0) {
    return [];
  }

  const placeholders = subtreeIds.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT * FROM users WHERE id IN (${placeholders}) ORDER BY created_at DESC`)
    .all(...subtreeIds) as any[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    username: r.username,
    role: r.role as UserRole,
    clientId: r.client_id || undefined,
    client_id: r.client_id || undefined,
    clientName: r.client_name || undefined,
    createdBy: r.created_by || undefined,
    created_by: r.created_by || undefined,
    tokenVersion: r.token_version ?? 1,
    token_version: r.token_version ?? 1,
    avatar: r.avatar,
    status: r.status,
    roleDescription: r.role_description,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));
}

/**
 * Writes an entry to the immutable audit_logs table.
 */
export function logAudit(entry: {
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: any;
  ipAddress?: string;
}): void {
  try {
    const db = getDatabase();
    const id = `audit-${Date.now()}-${uuidv4().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO audit_logs (id, actor_id, actor_email, actor_role, action, target_type, target_id, details_json, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      entry.actorId,
      entry.actorEmail,
      entry.actorRole,
      entry.action,
      entry.targetType,
      entry.targetId,
      entry.details ? JSON.stringify(entry.details) : null,
      entry.ipAddress || null,
      new Date().toISOString()
    );
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
