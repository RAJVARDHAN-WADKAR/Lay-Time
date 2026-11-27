export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { requireUser } from "@/lib/auth/session";
import { can, normalizeRole } from "@/lib/auth/accessMatrix";
import { isClaimAssignedToUser, isClaimOwnedByClient, verifySameOriginRequest } from "@/lib/api/withApi";
import {
  getDocuments,
  createDocument,
  createNotificationRecord,
  getClaimById,
  findDuplicateDocumentByHash
} from "@/lib/db/queries";
import { logAudit } from "@/lib/db/audit";
import { MAX_FILE_BYTES, MAX_REQUEST_BYTES, formatHumanFileSize } from "@/lib/uploads/constants";
import {
  ensureUploadDir,
  validateUploadedFileBuffer
} from "@/lib/uploads/serverValidation";

async function readStreamWithLimit(
  request: NextRequest,
  maxBytes: number
): Promise<{ buffer: Buffer; exceeded: boolean }> {
  const body = request.body;
  if (!body) {
    return { buffer: Buffer.alloc(0), exceeded: false };
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        try {
          await reader.cancel();
        } catch {}
        return { buffer: Buffer.alloc(0), exceeded: true };
      }
      chunks.push(value);
    }
  }

  return { buffer: Buffer.concat(chunks, totalBytes), exceeded: false };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const { user } = auth;
    const isClient = Boolean(user.assignedClientId || user.clientId);
    const normRole = normalizeRole(user.role, isClient);
    if (!can(normRole, "documents:view", isClient)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const claimId = searchParams.get("claimId") || undefined;
    const racCaseId = searchParams.get("racCaseId") || undefined;

    let documents = getDocuments({ claimId, racCaseId });
    if (normRole === "CLIENT" || normRole === "CLAIM_PROCESSOR") {
      documents = documents.filter((d) => {
        if (!d.claimId) return false;
        const claim = getClaimById(d.claimId);
        if (!claim) return false;
        return normRole === "CLIENT" ? isClaimOwnedByClient(claim, user) : isClaimAssignedToUser(claim, user);
      });
    }
    return NextResponse.json({ documents, total: documents.length });
  } catch {
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const originBlock = verifySameOriginRequest(request);
    if (originBlock) return originBlock;

    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const { user } = auth;
    const isClient = Boolean(user.assignedClientId || user.clientId);
    const userRoleNorm = normalizeRole(user.role, isClient);
    if (!can(userRoleNorm, "documents:upload", isClient)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to upload documents." },
        { status: 403 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Multipart form-data upload is required (PDF, PNG, JPG, CSV, TSV; 15 KB to 1 MB)." },
        { status: 400 }
      );
    }

    // Measure actual streamed request bytes (never trust Content-Length) and abort early with 413 if > max
    const { buffer: rawRequestBytes, exceeded } = await readStreamWithLimit(request, MAX_REQUEST_BYTES);
    if (exceeded) {
      return NextResponse.json(
        {
          error: `Upload request exceeds maximum allowed size (${formatHumanFileSize(MAX_FILE_BYTES)}).`
        },
        { status: 413 }
      );
    }

    const clonedReq = new Request(request.url, {
      method: "POST",
      headers: { "content-type": contentType },
      body: new Uint8Array(rawRequestBytes)
    });

    const formData = await clonedReq.formData();
    const uploadedEntry = formData.get("file");
    if (!uploadedEntry || typeof uploadedEntry === "string") {
      return NextResponse.json({ error: "No file provided in upload payload." }, { status: 400 });
    }

    const claimIdRaw = String(formData.get("claimId") || "").trim();
    const resolvedClaimId = claimIdRaw && claimIdRaw !== "General" ? claimIdRaw : null;
    const claimNameRaw = String(formData.get("claimName") || "").trim();
    const racCaseIdRaw = String(formData.get("racCaseId") || "").trim() || undefined;
    const categoryRaw = String(formData.get("category") || formData.get("type") || "SOF").trim();
    const titleRaw = String(formData.get("title") || "").trim();

    // Verify claim scope for CLAIM_PROCESSOR (must be assigned to target claim)
    let linkedClaim = resolvedClaimId ? getClaimById(resolvedClaimId) : null;
    if (resolvedClaimId && !linkedClaim) {
      return NextResponse.json({ error: `Claim ${resolvedClaimId} not found.` }, { status: 404 });
    }
    if (userRoleNorm === "CLAIM_PROCESSOR") {
      if (!linkedClaim || !isClaimAssignedToUser(linkedClaim, user)) {
        return NextResponse.json(
          { error: "Forbidden: Claim Processors may only upload documents to their own assigned claims." },
          { status: 403 }
        );
      }
    }

    const fileBuffer = Buffer.from(await uploadedEntry.arrayBuffer());
    const effectiveName = titleRaw ? (titleRaw.includes(".") ? titleRaw : `${titleRaw}.${uploadedEntry.name.split(".").pop() || "pdf"}`) : uploadedEntry.name;
    const validation = validateUploadedFileBuffer(effectiveName || uploadedEntry.name, fileBuffer);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Invalid document upload." },
        { status: validation.statusCode || 400 }
      );
    }

    // Deduplicate by SHA-256 hash within the same claim
    const duplicate = findDuplicateDocumentByHash(resolvedClaimId, validation.sha256!);
    if (duplicate) {
      return NextResponse.json(
        {
          error: `Duplicate document rejected: an identical file ("${duplicate.fileName}") is already attached to ${resolvedClaimId || "this repository"}.`
        },
        { status: 409 }
      );
    }

    // Persist bytes outside public/ with generated UUID filename
    const uploadDir = ensureUploadDir();
    const storedFileName = `${crypto.randomUUID()}.${validation.ext}`;
    const storedPath = path.join(uploadDir, storedFileName);
    fs.writeFileSync(storedPath, fileBuffer);

    const doc = createDocument(
      {
        fileName: validation.sanitizedName!,
        fileSize: fileBuffer.byteLength,
        fileType: uploadedEntry.type || "application/octet-stream",
        claimId: resolvedClaimId || undefined,
        claimName: claimNameRaw || linkedClaim?.claimName || undefined,
        racCaseId: racCaseIdRaw,
        category: categoryRaw as any,
        type: categoryRaw as any,
        status: "Uploaded",
        filePath: storedFileName,
        fileHash: validation.sha256
      },
      user.name || user.email || "System"
    );

    logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: userRoleNorm,
      action: "document_upload",
      targetType: "document",
      targetId: doc.id,
      details: {
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        sha256: validation.sha256,
        category: doc.category,
        claimId: doc.claimId,
        version: doc.version
      }
    });

    createNotificationRecord({
      title: "Document Uploaded",
      message: `${doc.fileName} (${doc.category || "General"}) ${doc.version || "v1.0"} uploaded for ${doc.claimName || doc.claimId || "case"}.`,
      type: "document",
      claimId: doc.claimId || undefined,
      claimName: doc.claimName || undefined,
      racCaseId: doc.racCaseId || undefined
    });

    return NextResponse.json({ success: true, document: doc }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to upload document" }, { status: 500 });
  }
}
