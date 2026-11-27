import crypto from "crypto";
import path from "path";
import fs from "fs";
import {
  MIN_FILE_BYTES,
  MAX_FILE_BYTES,
  ALLOWED_UPLOAD_EXTENSIONS,
  getFileExtension,
  formatHumanFileSize,
  sanitizeFileName
} from "./constants";

export const UPLOAD_STORAGE_DIR = path.join(process.cwd(), "data", "uploads");

export function ensureUploadDir(): string {
  if (!fs.existsSync(UPLOAD_STORAGE_DIR)) {
    fs.mkdirSync(UPLOAD_STORAGE_DIR, { recursive: true });
  }
  return UPLOAD_STORAGE_DIR;
}

export function detectMagicSignature(buf: Buffer): string | null {
  if (buf.length >= 5 && buf.subarray(0, 5).toString("ascii") === "%PDF-") {
    return "pdf";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "png";
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "jpg";
  }
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    return "zip";
  }
  if (buf.length >= 4 && buf.subarray(0, 4).toString("ascii") === "GIF8") {
    return "gif";
  }
  if (buf.length >= 2 && buf[0] === 0x4d && buf[1] === 0x5a) {
    return "exe";
  }
  if (buf.length >= 4 && buf[0] === 0x7f && buf.subarray(1, 4).toString("ascii") === "ELF") {
    return "elf";
  }
  return null;
}

function isValidTabularText(buf: Buffer, ext: "csv" | "tsv"): { valid: boolean; reason?: string } {
  // Reject any binary signature spoofed as CSV/TSV
  const binarySig = detectMagicSignature(buf);
  if (binarySig) {
    return { valid: false, reason: `File content is ${binarySig.toUpperCase()} binary, not .${ext.toUpperCase()}.` };
  }

  // Reject NUL bytes anywhere in text payload
  if (buf.includes(0x00)) {
    return { valid: false, reason: `Binary NUL bytes detected; not a valid ${ext.toUpperCase()} file.` };
  }

  let text: string;
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    text = decoder.decode(buf);
  } catch {
    return { valid: false, reason: `File is not valid UTF-8 text (${ext.toUpperCase()}).` };
  }

  // Check for excessive non-printable control chars
  const sample = text.slice(0, Math.min(text.length, 4096));
  let controlCount = 0;
  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i);
    if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) {
      controlCount++;
    }
  }
  if (controlCount > 0) {
    return { valid: false, reason: `Control characters detected; file is not plain text ${ext.toUpperCase()}.` };
  }

  if (ext === "tsv" && !text.includes("\t")) {
    return { valid: false, reason: "TSV file must contain tab-delimited columns." };
  }
  if (ext === "csv" && !text.includes(",") && !text.includes("\n")) {
    return { valid: false, reason: "CSV file must contain comma-delimited columns or rows." };
  }

  return { valid: true };
}

export interface ServerFileValidationResult {
  valid: boolean;
  statusCode?: number;
  error?: string;
  sanitizedName?: string;
  ext?: string;
  sha256?: string;
}

export function validateUploadedFileBuffer(
  rawFileName: string,
  buf: Buffer
): ServerFileValidationResult {
  const sanitizedName = sanitizeFileName(rawFileName);
  const ext = getFileExtension(sanitizedName);

  if (!ext || !(ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(ext)) {
    return {
      valid: false,
      statusCode: 400,
      error: "Invalid file type. Allowed formats: PDF, PNG, JPG, CSV, TSV."
    };
  }

  const byteLength = buf.byteLength;
  if (byteLength === 0) {
    return {
      valid: false,
      statusCode: 400,
      error: "File is 0 bytes (empty). Minimum is 15 KB."
    };
  }

  if (byteLength < MIN_FILE_BYTES) {
    return {
      valid: false,
      statusCode: 400,
      error: `File is ${formatHumanFileSize(byteLength)}. Minimum is 15 KB.`
    };
  }

  if (byteLength > MAX_FILE_BYTES) {
    return {
      valid: false,
      statusCode: 413,
      error: `File is ${formatHumanFileSize(byteLength)}. Maximum is 1 MB.`
    };
  }

  // Magic-byte verification on actual payload
  if (ext === "pdf") {
    if (detectMagicSignature(buf) !== "pdf") {
      return {
        valid: false,
        statusCode: 400,
        error: "Spoofed or corrupted PDF: file bytes do not start with %PDF- signature."
      };
    }
  } else if (ext === "png") {
    if (detectMagicSignature(buf) !== "png") {
      return {
        valid: false,
        statusCode: 400,
        error: "Spoofed or corrupted PNG: invalid PNG magic header."
      };
    }
  } else if (ext === "jpg" || ext === "jpeg") {
    if (detectMagicSignature(buf) !== "jpg") {
      return {
        valid: false,
        statusCode: 400,
        error: "Spoofed or corrupted JPG: invalid JPEG magic header."
      };
    }
  } else if (ext === "csv" || ext === "tsv") {
    const tabCheck = isValidTabularText(buf, ext);
    if (!tabCheck.valid) {
      return {
        valid: false,
        statusCode: 400,
        error: tabCheck.reason || `Invalid ${ext.toUpperCase()} content.`
      };
    }
  }

  const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
  return {
    valid: true,
    sanitizedName,
    ext,
    sha256
  };
}
