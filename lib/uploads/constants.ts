export const MIN_FILE_BYTES = 15 * 1024; // 15,360 bytes (15 KB)
export const MAX_FILE_BYTES = 1 * 1024 * 1024; // 1,048,576 bytes (1 MB)

/**
 * Overhead allowed for multipart/form-data headers and metadata fields alongside the file.
 * Requests whose streamed body exceeds MAX_FILE_BYTES + MULTIPART_OVERHEAD_BYTES are
 * aborted and rejected with HTTP 413 Payload Too Large.
 */
export const MULTIPART_OVERHEAD_BYTES = 128 * 1024;
export const MAX_REQUEST_BYTES = MAX_FILE_BYTES + MULTIPART_OVERHEAD_BYTES;

export const ALLOWED_UPLOAD_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "csv", "tsv"] as const;
export type AllowedUploadExtension = (typeof ALLOWED_UPLOAD_EXTENSIONS)[number];

export const UPLOAD_LIMIT_LABEL = "PDF, PNG, JPG, CSV, TSV. 15 KB to 1 MB";

export function formatHumanFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 bytes";
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return kb >= 10 ? `${Math.round(kb)} KB` : `${Number(kb.toFixed(1))} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${Number(mb.toFixed(1))} MB`;
}

export function getFileExtension(fileName: string): string {
  const parts = String(fileName || "").trim().split(".");
  if (parts.length < 2) return "";
  return parts.pop()!.toLowerCase();
}

export function sanitizeFileName(rawName: string): string {
  const base = String(rawName || "document.pdf")
    .replace(/[/\\]/g, "_")
    .replace(/\.\.+/g, ".")
    .replace(/[^a-zA-Z0-9._\-\s]/g, "_")
    .trim();
  const collapsed = base.replace(/\s+/g, " ");
  return collapsed.slice(0, 180) || "document.pdf";
}

export function validateUploadFileClient(file: { name: string; size: number; type?: string }): {
  valid: boolean;
  error?: string;
} {
  const ext = getFileExtension(file.name);
  if (!ext || !(ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(ext)) {
    return {
      valid: false,
      error: `Invalid file type (.${ext || "unknown"}). Allowed: ${UPLOAD_LIMIT_LABEL}.`
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: `File is 0 bytes (empty). Minimum is 15 KB.`
    };
  }

  if (file.size < MIN_FILE_BYTES) {
    return {
      valid: false,
      error: `File is ${formatHumanFileSize(file.size)}. Minimum is 15 KB.`
    };
  }

  if (file.size > MAX_FILE_BYTES) {
    return {
      valid: false,
      error: `File is ${formatHumanFileSize(file.size)}. Maximum is 1 MB.`
    };
  }

  return { valid: true };
}
