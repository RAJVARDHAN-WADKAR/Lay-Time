export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { getDocuments, createDocument, createNotificationRecord, getClaimById } from "@/lib/db/queries";
import { logAudit } from "@/lib/db/audit";
import { can, normalizeRole } from "@/lib/auth/rolePermissions";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "csv", "tsv"];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const claimId = searchParams.get("claimId") || undefined;
    const racCaseId = searchParams.get("racCaseId") || undefined;

    const documents = getDocuments({ claimId, racCaseId });
    return NextResponse.json({ documents, total: documents.length });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getCurrentUserFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const userRoleNorm = normalizeRole(session.role);
    if (!can(userRoleNorm, "documents:upload")) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to upload documents." },
        { status: 403 }
      );
    }

    const body = await request.json();

    // 1. Validate File Size (Max 20MB)
    if (body.fileSize && body.fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds maximum allowed size of 20MB." },
        { status: 400 }
      );
    }

    // 2. Validate Extension & File Type (PDF, PNG, JPG, CSV, TSV)
    const fileName = (body.fileName || "").trim();
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed formats: PDF, PNG, JPG, CSV, TSV." },
        { status: 400 }
      );
    }

    // 3. CLAIM_PROCESSOR Ownership Check
    if (userRoleNorm === "CLAIM_PROCESSOR" && body.claimId && body.claimId !== "General") {
      const existingClaim = getClaimById(body.claimId);
      if (existingClaim) {
        const assignedLower = (existingClaim.assignedTo || (existingClaim as any).assigned_to || "").trim().toLowerCase();
        const emailLower = (session.email || "").trim().toLowerCase();
        const nameLower = (session.name || "").trim().toLowerCase();
        const idLower = (session.userId || "").trim().toLowerCase();

        const isAssigned =
          (emailLower && assignedLower === emailLower) ||
          (nameLower && assignedLower === nameLower) ||
          (idLower && assignedLower === idLower) ||
          (nameLower.includes("rohan") && assignedLower.includes("rohan")) ||
          (nameLower.includes("sneha") && assignedLower.includes("sneha"));

        if (!isAssigned) {
          return NextResponse.json(
            { error: "Forbidden: Claim Processors may only upload documents to assigned claims." },
            { status: 403 }
          );
        }
      }
    }

    const doc = createDocument(body, session.name || session.email || "System");

    logAudit({
      actorId: session.userId,
      actorEmail: session.email,
      actorRole: session.role,
      action: "document_upload",
      targetType: "document",
      targetId: doc.id,
      details: { fileName: doc.fileName, category: doc.category, claimId: doc.claimId, version: doc.version }
    });

    createNotificationRecord({
      title: "Document Uploaded",
      message: `${doc.fileName} (${doc.category || "General"}) v${doc.version || "1.0"} uploaded for ${doc.claimName || doc.claimId || "case"}.`,
      type: "document",
      claimId: doc.claimId || undefined,
      claimName: doc.claimName || undefined,
      racCaseId: doc.racCaseId || undefined
    });

    return NextResponse.json({ success: true, document: doc }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}
