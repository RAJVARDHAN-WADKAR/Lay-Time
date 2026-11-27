export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { withApi, isClaimAssignedToUser, isClaimOwnedByClient } from "@/lib/api/withApi";
import { normalizeRole } from "@/lib/auth/accessMatrix";
import { getDocumentById, getClaimById } from "@/lib/db/queries";
import { UPLOAD_STORAGE_DIR } from "@/lib/uploads/serverValidation";
import { sanitizeFileName } from "@/lib/uploads/constants";

export const GET = withApi({
  permission: "documents:view",
  handler: async ({ user, params }) => {
    const doc = getDocumentById(params.id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const isClient = Boolean(user.assignedClientId || user.clientId);
    const normRole = normalizeRole(user.role, isClient);
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

    const safeDownloadName = sanitizeFileName(doc.fileName);

    // Serve real stored bytes from data/uploads/ when present
    if (doc.filePath) {
      const resolvedPath = path.isAbsolute(doc.filePath)
        ? doc.filePath
        : path.join(UPLOAD_STORAGE_DIR, path.basename(doc.filePath));
      const normalizedUploadsRoot = path.resolve(UPLOAD_STORAGE_DIR);
      const normalizedTarget = path.resolve(resolvedPath);
      if (
        normalizedTarget.startsWith(normalizedUploadsRoot) &&
        fs.existsSync(normalizedTarget) &&
        fs.statSync(normalizedTarget).isFile()
      ) {
        const buffer = fs.readFileSync(normalizedTarget);
        return new NextResponse(new Uint8Array(buffer), {
          status: 200,
          headers: {
            "Content-Type": doc.fileType || "application/octet-stream",
            "Content-Disposition": `attachment; filename="${safeDownloadName}"`,
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store"
          }
        });
      }
    }

    // Seeded metadata-only fallback summary if no physical binary exists yet
    const fallbackText = [
      `Laytime Calculation System - Maritime Document Metadata`,
      `File Name: ${doc.fileName}`,
      `Category: ${doc.category || doc.type || "SOF"}`,
      `Claim ID: ${doc.claimId || "General"}`,
      `Version: ${doc.version || "v1.0"}`,
      `Uploaded By: ${doc.uploadedBy || "System"}`,
      `Uploaded At: ${doc.uploadedAt}`
    ].join("\n");

    return new NextResponse(fallbackText, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeDownloadName}.txt"`,
        "Cache-Control": "no-store"
      }
    });
  }
});
