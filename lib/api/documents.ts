import { DocumentRecord, DocumentType } from "@/lib/types";
import {
  getStoreDocuments,
  getStoreDocumentById,
  addStoreDocument,
  deleteStoreDocument,
  updateStoreDocumentStatus
} from "@/lib/mock/clientStore";

export async function getDocuments(filter?: { claimId?: string; racCaseId?: string }): Promise<DocumentRecord[]> {
  return getStoreDocuments(filter);
}

export async function getDocumentById(id: string): Promise<DocumentRecord | null> {
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
      claimId: claimId || undefined,
      claimName: claimName || undefined,
      category: docType || "SOF",
      type: docType || "SOF",
      version: "1.0",
      uploadedBy: "Current User",
      status: "Uploaded"
    };
  } else {
    payload = fileOrDoc as Partial<DocumentRecord>;
  }

  return addStoreDocument(payload);
}

export async function updateDocumentStatus(id: string, status: DocumentRecord["status"]): Promise<DocumentRecord> {
  return updateStoreDocumentStatus(id, status);
}

export async function deleteDocument(id: string): Promise<boolean> {
  return deleteStoreDocument(id);
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
