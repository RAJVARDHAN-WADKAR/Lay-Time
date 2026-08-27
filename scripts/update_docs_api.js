const fs = require('fs');
const path = require('path');

const docsApi = `import { DocumentRecord } from "@/lib/types";

let documentsStore: DocumentRecord[] = [];

const delay = (ms: number = 100) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getDocuments(): Promise<DocumentRecord[]> {
  await delay();
  return JSON.parse(JSON.stringify(documentsStore));
}

export async function uploadDocument(
  file: { name: string; size: number; type: string },
  claimId: string,
  claimName: string
): Promise<DocumentRecord> {
  await delay(200);
  const newDocId = \`doc-\${Date.now()}\`;
  const now = new Date().toISOString();

  const isDemoBadFile = file.name.toLowerCase().includes("bad") || file.name.toLowerCase().includes("corrupt") || file.name.toLowerCase().includes("fail");

  const newDoc: DocumentRecord = {
    id: newDocId,
    claimId: claimId || "CLM-NEW",
    claimName: claimName || "New Voyage File",
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || "application/pdf",
    uploadedAt: now,
    status: "Uploaded",
    extractedItemsCount: 0,
    ocrConfidence: isDemoBadFile ? 0.35 : 0.94,
    errorReason: isDemoBadFile ? "Corrupted PDF header stream / Unreadable scan" : undefined,
  };

  documentsStore.unshift(newDoc);
  return JSON.parse(JSON.stringify(newDoc));
}

export async function updateDocumentStatus(
  id: string,
  status: DocumentRecord["status"],
  extractedItemsCount?: number
): Promise<DocumentRecord> {
  await delay(100);
  const doc = documentsStore.find((d) => d.id === id);
  if (!doc) throw new Error("Document not found");

  doc.status = status;
  if (extractedItemsCount !== undefined) {
    doc.extractedItemsCount = extractedItemsCount;
  }

  return JSON.parse(JSON.stringify(doc));
}

export async function deleteDocument(id: string): Promise<boolean> {
  await delay(100);
  documentsStore = documentsStore.filter((d) => d.id !== id);
  return true;
}

export async function clearAllDocuments(): Promise<void> {
  await delay(50);
  documentsStore = [];
}
`;

fs.writeFileSync(path.join(process.cwd(), 'lib/api/documents.ts'), docsApi, 'utf8');
console.log('Updated lib/api/documents.ts');
