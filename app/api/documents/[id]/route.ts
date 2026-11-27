export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { withApi, isClaimAssignedToUser, isClaimOwnedByClient } from "@/lib/api/withApi";
import { normalizeRole } from "@/lib/auth/accessMatrix";
import { getDocumentById, updateDocument, getClaimById } from "@/lib/db/queries";
import { getDatabase } from "@/lib/db";
import { logAudit } from "@/lib/db/audit";
import { UPLOAD_STORAGE_DIR } from "@/lib/uploads/serverValidation";

export const GET = withApi({
  permission: "documents:view",
  handler: async ({ user, params }) => {
    const doc = getDocumentById(params.id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    const normRole = normalizeRole(user.role, Boolean(user.assignedClientId || user.clientId));
    if ((normRole === "CLIENT" || normRole === "CLAIM_PROCESSOR") && doc.claimId) {
      const claim = getClaimById(doc.claimId);
      if (claim) {
        if (normRole === "CLIENT" && !isClaimOwnedByClient(claim, user)) {
          return NextResponse.json({ error: "Forbidden: Document belongs to another client." }, { status: 403 });
        }
        if (normRole === "CLAIM_PROCESSOR" && !isClaimAssignedToUser(claim, user)) {
          return NextResponse.json({ error: "Forbidden: Document belongs to an unassigned claim." }, { status: 403 });
        }
      }
    }
    return NextResponse.json({ document: doc });
  }
});

export const PUT = withApi({
  permission: "documents:upload",
  handler: async ({ user, params, body }) => {
    const doc = getDocumentById(params.id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    if (normalizeRole(user.role) === "CLAIM_PROCESSOR" && doc.claimId) {
      const claim = getClaimById(doc.claimId);
      if (claim && !isClaimAssignedToUser(claim, user)) {
        return NextResponse.json({ error: "Forbidden: Claim Processors may only modify documents on assigned claims." }, { status: 403 });
      }
    }

    const updated = updateDocument(params.id, body, user.name || user.email || "System");
    return NextResponse.json({ success: true, document: updated });
  }
});

export const DELETE = withApi({
  permission: "documents:delete",
  handler: async ({ user, params }) => {
    const existing = getDocumentById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const db = getDatabase();
    const res = db.prepare("DELETE FROM documents WHERE id = ?").run(params.id);
    if (res.changes === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (existing.filePath) {
      try {
        const candidate = path.isAbsolute(existing.filePath)
          ? existing.filePath
          : path.join(UPLOAD_STORAGE_DIR, path.basename(existing.filePath));
        const normalizedRoot = path.resolve(UPLOAD_STORAGE_DIR);
        const normalizedTarget = path.resolve(candidate);
        if (normalizedTarget.startsWith(normalizedRoot) && fs.existsSync(normalizedTarget)) {
          fs.unlinkSync(normalizedTarget);
        }
      } catch {}
    }

    logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: normalizeRole(user.role),
      action: "document_delete",
      targetType: "document",
      targetId: params.id
    });

    return NextResponse.json({ success: true, message: "Document deleted" });
  }
});
