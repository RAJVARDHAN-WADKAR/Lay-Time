import { DocumentRecord, DocumentType } from "@/lib/types";

export async function getDocuments(filter?: { claimId?: string; racCaseId?: string }): Promise<DocumentRecord[]> {
  try {
    const query = new URLSearchParams();
    if (filter?.claimId) query.set("claimId", filter.claimId);
    if (filter?.racCaseId) query.set("racCaseId", filter.racCaseId);

    const res = await fetch(`/api/documents?${query.toString()}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.documents || [];
  } catch (error) {
    console.error("API getDocuments error:", error);
    return [];
  }
}

export async function getDocumentById(id: string): Promise<DocumentRecord | null> {
  try {
    const res = await fetch(`/api/documents/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.document || null;
  } catch (error) {
    return null;
  }
}

export async function uploadDocument(
  fileOrDoc: Partial<DocumentRecord> | { name: string; size: number; type: string },
  claimId?: string,
  claimName?: string,
  docType?: DocumentType
): Promise<DocumentRecord> {
  let payload: Partial<DocumentRecord>;

  if ("name" in fileOrDoc && typeof fileOrDoc.name === "string" && !("fileName" in fileOrDoc)) {
    payload = {
      fileName: fileOrDoc.name,
      fileSize: fileOrDoc.size,
      fileType: fileOrDoc.type || "application/pdf",
      claimId: claimId || undefined,
      claimName: claimName || undefined,
      category: docType || "SOF",
      version: "1.0",
      uploadedBy: "Current User",
      status: "Uploaded"
    };
  } else {
    payload = fileOrDoc as Partial<DocumentRecord>;
  }

  const res = await fetch("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to upload document");
  }

  const data = await res.json();
  return data.document;
}

export async function updateDocumentStatus(id: string, status: DocumentRecord["status"]): Promise<DocumentRecord> {
  const res = await fetch(`/api/documents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });

  if (!res.ok) throw new Error("Failed to update document status");
  const data = await res.json();
  return data.document;
}

export async function deleteDocument(id: string): Promise<boolean> {
  const res = await fetch(`/api/documents/${id}`, {
    method: "DELETE"
  });
  return res.ok;
}

export async function triggerDocumentOcr(docId: string, claimId: string, fileName: string): Promise<any> {
  const res = await fetch("/api/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName,
      claimId,
      docId
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "OCR Processing failed");
  }

  return await res.json();
}
