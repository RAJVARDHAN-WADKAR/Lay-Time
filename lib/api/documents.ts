import { DocumentRecord, DocumentType } from "@/lib/types";

export async function getDocuments(filter?: { claimId?: string; racCaseId?: string }): Promise<DocumentRecord[]> {
  const params = new URLSearchParams();
  if (filter?.claimId) params.set("claimId", filter.claimId);
  if (filter?.racCaseId) params.set("racCaseId", filter.racCaseId);
  const res = await fetch(`/api/documents?${params.toString()}`, {
    method: "GET",
    cache: "no-store"
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to load documents (HTTP ${res.status})`);
  }
  return Array.isArray(data.documents) ? data.documents : [];
}

export async function getDocumentById(id: string): Promise<DocumentRecord | null> {
  const res = await fetch(`/api/documents/${id}`, {
    method: "GET",
    cache: "no-store"
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to load document ${id} (HTTP ${res.status})`);
  }
  return data.document || null;
}

export interface UploadDocumentOptions {
  file: File;
  claimId?: string;
  claimName?: string;
  racCaseId?: string;
  category?: DocumentType;
  title?: string;
  onProgress?: (percent: number) => void;
}

export function uploadDocument(options: UploadDocumentOptions): Promise<DocumentRecord> {
  const formData = new FormData();
  formData.append("file", options.file);
  if (options.claimId && options.claimId !== "General") {
    formData.append("claimId", options.claimId);
  }
  if (options.claimName) formData.append("claimName", options.claimName);
  if (options.racCaseId) formData.append("racCaseId", options.racCaseId);
  if (options.category) {
    formData.append("category", options.category);
    formData.append("type", options.category);
  }
  if (options.title) formData.append("title", options.title);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/documents", true);

    if (xhr.upload && options.onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const pct = Math.min(100, Math.round((event.loaded / event.total) * 100));
          options.onProgress?.(pct);
        }
      };
    }

    xhr.onload = () => {
      let data: any = {};
      try {
        data = JSON.parse(xhr.responseText || "{}");
      } catch {}

      if (xhr.status >= 200 && xhr.status < 300 && data.document) {
        options.onProgress?.(100);
        resolve(data.document);
      } else {
        reject(new Error(data.error || `Upload failed (HTTP ${xhr.status})`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error while uploading document."));
    };

    xhr.send(formData);
  });
}

export async function updateDocumentStatus(id: string, status: DocumentRecord["status"]): Promise<DocumentRecord> {
  const res = await fetch(`/api/documents/${id}`, {
    method: "PUT",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.document) {
    throw new Error(data.error || `Failed to update document status (HTTP ${res.status})`);
  }
  return data.document;
}

export async function deleteDocument(id: string): Promise<boolean> {
  const res = await fetch(`/api/documents/${id}`, {
    method: "DELETE",
    cache: "no-store"
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete document (HTTP ${res.status})`);
  }
  return true;
}

export async function getClaimOcrData(claimId: string): Promise<{
  documents: DocumentRecord[];
  drafts: any[];
}> {
  const res = await fetch(`/api/ocr?claimId=${encodeURIComponent(claimId)}`, {
    method: "GET",
    cache: "no-store"
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to load OCR workspace (HTTP ${res.status})`);
  }
  return {
    documents: Array.isArray(data.documents) ? data.documents : [],
    drafts: Array.isArray(data.drafts) ? data.drafts : []
  };
}

export async function runDocumentOcr(params: {
  documentId: string;
  portId?: string;
  berthId?: string;
}): Promise<any> {
  const res = await fetch("/api/ocr", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `OCR extraction failed (HTTP ${res.status})`);
  }
  return data.result;
}

export async function confirmOcrDraft(params: {
  documentId: string;
  events: any[];
  portId?: string;
  berthId?: string;
}): Promise<any> {
  const res = await fetch("/api/ocr/confirm", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to save confirmed OCR events (HTTP ${res.status})`);
  }
  return data;
}
