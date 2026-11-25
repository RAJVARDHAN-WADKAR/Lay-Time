import { getDatabase } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export interface AuditLogEntry {
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  details?: any;
  ipAddress?: string | null;
}

/**
 * Writes an entry to the immutable audit_logs table.
 */
export function logAudit(entry: AuditLogEntry): void {
  try {
    const db = getDatabase();
    const id = `audit-${Date.now()}-${uuidv4().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO audit_logs (id, actor_id, actor_email, actor_role, action, target_type, target_id, details_json, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      entry.actorId || "system",
      entry.actorEmail || "system@laytime.demo",
      entry.actorRole || "SYSTEM",
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
