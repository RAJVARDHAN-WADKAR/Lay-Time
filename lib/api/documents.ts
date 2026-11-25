import { DocumentRecord, DocumentType } from "@/lib/types";
import {
  getStoreDocuments,
  getStoreDocumentById,
  addStoreDocument,
  deleteStoreDocument,
  updateStoreDocumentStatus
} from "@/lib/mock/clientStore";

export async function getDocuments(filter?: { claimId?: string; racCaseId?: string }): Promise<DocumentRecord[]> {
  try {
    const params = new URLSearchParams();
    if (filter?.claimId) params.set("claimId", filter.claimId);
    if (filter?.racCaseId) params.set("racCaseId", filter.racCaseId);
    const res = await fetch(`/api/documents?${params.toString()}`, {
      method: "GET",
      headers: { "Cache-Control": "no-cache" }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.documents)) return data.documents;
    }
  } catch {
    // fallback to store
  }
  return getStoreDocuments(filter);
}

export async function getDocumentById(id: string): Promise<DocumentRecord | null> {
  try {
    const res = await fetch(`/api/documents/${id}`, {
      method: "GET",
      headers: { "Cache-Control": "no-cache" }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.document) return data.document;
    }
  } catch {
    // fallback
  }
  return getStoreDocumentById(id);
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
      claimId: claimId && claimId !== "General" ? claimId : undefined,
      claimName: claimName || undefined,
      category: docType || "SOF",
      type: docType || "SOF",
      version: "v1.0",
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
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to upload document");
  }

  const data = await res.json();
  if (data.document) {
    addStoreDocument(data.document);
    return data.document;
  }
  return addStoreDocument(payload);
}

export async function updateDocumentStatus(id: string, status: DocumentRecord["status"]): Promise<DocumentRecord> {
  try {
    const res = await fetch(`/api/documents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.document) return data.document;
    }
  } catch {
    // fallback
  }
  return updateStoreDocumentStatus(id, status);
}

export async function deleteDocument(id: string): Promise<boolean> {
  const res = await fetch(`/api/documents/${id}`, {
    method: "DELETE"
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete document");
  }

  deleteStoreDocument(id);
  return true;
}

export async function triggerDocumentOcr(docId: string, claimId: string, fileName: string): Promise<any> {
  // Simulate realistic OCR extraction delay
  await new Promise((r) => setTimeout(r, 600));
  updateStoreDocumentStatus(docId, "OCR Completed");

  return {
    success: true,
    docId,
    claimId,
    fileName,
    confidence: 0.94,
    extractedActivitiesCount: 6,
    status: "Verified"
  };
}
