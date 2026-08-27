import { DocumentRecord, SoFActivity } from "@/lib/types";
import { getStorageItem, setStorageItem } from "./storage";
import { createNotification } from "./notifications";

const STORAGE_KEY = "demurrage_documents";
const delay = (ms: number = 50) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getDocuments(): Promise<DocumentRecord[]> {
  await delay();
  return getStorageItem<DocumentRecord[]>(STORAGE_KEY, []);
}

export async function uploadDocument(
  file: { name: string; size: number; type: string },
  claimId: string = "",
  claimName: string = "",
  docType: DocumentRecord["type"] = "SOF"
): Promise<DocumentRecord> {
  await delay(100);
  const docs = getStorageItem<DocumentRecord[]>(STORAGE_KEY, []);
  const newDocId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newDoc: DocumentRecord = {
    id: newDocId,
    claimId: claimId || "General",
    claimName: claimName || "General Port Document",
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || "application/pdf",
    type: docType,
    version: "v1.0",
    uploadedAt: now,
    status: "Uploaded",
    extractedItemsCount: 0,
    ocrConfidence: 0.96,
  };

  const updatedDocs = [newDoc, ...docs];
  setStorageItem(STORAGE_KEY, updatedDocs);

  // Trigger dynamic notification
  try {
    await createNotification({
      title: "Document Uploaded",
      message: `Document "${file.name}" (${docType}) was uploaded for claim ${claimId || "General"}.`,
      type: "document",
      claimId: claimId,
      claimName: claimName,
    });
  } catch (e) {
    console.error(e);
  }

  return JSON.parse(JSON.stringify(newDoc));
}

export async function updateDocumentStatus(
  id: string,
  status: DocumentRecord["status"],
  extractedItemsCount?: number,
  extractedActivities?: SoFActivity[]
): Promise<DocumentRecord> {
  await delay(50);
  const docs = getStorageItem<DocumentRecord[]>(STORAGE_KEY, []);
  const doc = docs.find((d) => d.id === id);
  if (!doc) throw new Error("Document not found");

  doc.status = status;
  if (extractedItemsCount !== undefined) {
    doc.extractedItemsCount = extractedItemsCount;
  }
  if (extractedActivities !== undefined) {
    doc.ocrExtractedActivities = extractedActivities;
  }

  setStorageItem(STORAGE_KEY, docs);
  return JSON.parse(JSON.stringify(doc));
}

export async function deleteDocument(id: string): Promise<boolean> {
  await delay(50);
  const docs = getStorageItem<DocumentRecord[]>(STORAGE_KEY, []);
  const target = docs.find((d) => d.id === id);
  const filtered = docs.filter((d) => d.id !== id);
  setStorageItem(STORAGE_KEY, filtered);

  if (target) {
    try {
      await createNotification({
        title: "Document Deleted",
        message: `Document "${target.fileName}" was removed from the system.`,
        type: "document",
        claimId: target.claimId,
      });
    } catch (e) {
      console.error(e);
    }
  }

  return true;
}

export async function clearAllDocuments(): Promise<void> {
  await delay(50);
  setStorageItem(STORAGE_KEY, []);
}
