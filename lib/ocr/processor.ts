import fs from "fs";
import path from "path";
import { Discrepancy, DocumentRecord, OcrDraft, OcrDraftEvent, Port } from "@/lib/types";
import { getDocumentById, getClaimById } from "@/lib/db/queries";
import { detectDiscrepancies } from "@/lib/calculations/discrepancies";
import { MAX_FILE_BYTES, MIN_FILE_BYTES, getFileExtension, formatHumanFileSize } from "@/lib/uploads/constants";
import { UPLOAD_STORAGE_DIR, detectMagicSignature } from "@/lib/uploads/serverValidation";
import {
  DEFAULT_OCR_TIMEOUT_MS,
  OcrFailureError,
  extractPagesFromBuffer
} from "./extractText";
import { OcrExtractedPage, parseSoFPages } from "./parser";
import {
  markDocumentOcrFailed,
  persistOcrDraftAndDiscrepancies,
  tryAcquireDocumentOcrLock
} from "./draftStore";

export interface OcrProcessingResult {
  documentId: string;
  fileName: string;
  isScanned: boolean;
  isDemo: boolean;
  overallConfidence: number; // 0-1 normalized
  overallConfidencePct: number; // 0-100
  extractedActivities: OcrDraftEvent[];
  lowConfidenceCount: number;
  flaggedDiscrepancies: Discrepancy[];
  rawTextPreview: string;
  pages: Array<{ pageNumber: number; text: string; averageConfidence: number }>;
  draft?: OcrDraft;
}

export interface LoadedOcrDocument {
  document: DocumentRecord;
  buffer: Buffer;
  ext: string;
}

/**
 * 1.2(a): Reads stored file bytes from disk using the documents DB table ONLY.
 * Never accepts raw file bytes or text strings from clients.
 */
export function loadDocument(documentId: string): LoadedOcrDocument {
  const doc = getDocumentById(documentId);
  if (!doc) {
    throw new OcrFailureError("CORRUPT", "Document record not found.");
  }

  if (!doc.filePath) {
    throw new OcrFailureError("CORRUPT", "Stored file path is missing for this document.");
  }

  const candidate = path.isAbsolute(doc.filePath)
    ? doc.filePath
    : path.join(UPLOAD_STORAGE_DIR, path.basename(doc.filePath));

  const normalizedRoot = path.resolve(UPLOAD_STORAGE_DIR);
  const normalizedTarget = path.resolve(candidate);
  if (!normalizedTarget.startsWith(normalizedRoot)) {
    throw new OcrFailureError("CORRUPT", "Document storage path is invalid.");
  }

  if (!fs.existsSync(normalizedTarget) || !fs.statSync(normalizedTarget).isFile()) {
    throw new OcrFailureError("CORRUPT", "Uploaded document binary is missing on disk.");
  }

  const buffer = fs.readFileSync(normalizedTarget);
  if (buffer.byteLength === 0) {
    throw new OcrFailureError("EMPTY", "Stored document is 0 bytes (empty).");
  }
  if (buffer.byteLength < MIN_FILE_BYTES || buffer.byteLength > MAX_FILE_BYTES) {
    throw new OcrFailureError(
      "UNSUPPORTED",
      `Stored document size (${formatHumanFileSize(buffer.byteLength)}) is outside allowed 15 KB to 1 MB OCR limit.`
    );
  }

  const extFromPath = getFileExtension(normalizedTarget);
  const extFromName = getFileExtension(doc.fileName);
  const ext = extFromPath || extFromName;
  const sig = detectMagicSignature(buffer);

  if (ext === "pdf" && sig !== "pdf") {
    throw new OcrFailureError("CORRUPT", "File magic bytes do not match PDF format.");
  }
  if (ext === "png" && sig !== "png") {
    throw new OcrFailureError("CORRUPT", "File magic bytes do not match PNG format.");
  }
  if ((ext === "jpg" || ext === "jpeg") && sig !== "jpg") {
    throw new OcrFailureError("CORRUPT", "File magic bytes do not match JPEG format.");
  }
  if (ext !== "pdf" && ext !== "png" && ext !== "jpg" && ext !== "jpeg") {
    throw new OcrFailureError("UNSUPPORTED", `Unsupported OCR format .${ext}. Only PDF, PNG, and JPG are supported.`);
  }

  return { document: doc, buffer, ext };
}

/**
 * Pure byte-based OCR execution helper (reused by both API and fixture tests).
 * Notice: fileName parameter is purely for display metadata and NEVER affects extraction.
 */
export async function processBufferOcr(params: {
  buffer: Buffer;
  ext: string;
  claimId?: string;
  portId?: string;
  berthId?: string;
  ports?: Port[];
  fileName?: string;
  timeoutMs?: number;
}): Promise<Omit<OcrProcessingResult, "documentId" | "draft">> {
  const { pages, isScanned } = await extractPagesFromBuffer(params.buffer, params.ext, {
    timeoutMs: params.timeoutMs ?? DEFAULT_OCR_TIMEOUT_MS
  });

  const parsed = parseSoFPages(pages, {
    claimId: params.claimId || "",
    portId: params.portId,
    berthId: params.berthId
  });

  if (parsed.events.length === 0) {
    throw new OcrFailureError(
      "NO_TEXT",
      "Document text was read, but no valid Statement of Facts date/time events were found."
    );
  }

  const portsToCheck = params.ports !== undefined
    ? params.ports
    : params.claimId
    ? getClaimById(params.claimId)?.ports || []
    : [];
  const detected = detectDiscrepancies(parsed.events, portsToCheck, 0.8);

  const lowConfEvents = parsed.events.filter((e) => e.overallConfidencePct < 80);
  const overallPct = parsed.overallConfidence;
  const overallNorm = Number((overallPct / 100).toFixed(2));

  // Ensure overall confidence discrepancy exists if document confidence < 80% and none attached yet
  if (overallPct < 80 && !detected.some((d) => d.type === "low_confidence")) {
    detected.push({
      id: `disc-conf-overall`,
      claimId: params.claimId || "",
      type: "low_confidence",
      severity: "warning",
      title: `Low OCR Extraction Confidence (${overallPct}%)`,
      description: `Overall OCR confidence is ${overallPct}% (threshold 80%). Review highlighted fields against original document.`,
      field: "ocrConfidence",
      currentValue: `${overallPct}%`,
      suggestedValue: "Review highlighted events in OCR studio",
      isResolved: false
    });
  }

  const safePages = pages.map((p: OcrExtractedPage) => ({
    pageNumber: p.pageNumber,
    text: p.text,
    averageConfidence: p.averageConfidence
  }));

  return {
    fileName: params.fileName || "document",
    isScanned,
    isDemo: false,
    overallConfidence: overallNorm,
    overallConfidencePct: overallPct,
    extractedActivities: parsed.events,
    lowConfidenceCount: lowConfEvents.length,
    flaggedDiscrepancies: detected,
    rawTextPreview: parsed.rawText,
    pages: safePages
  };
}

/**
 * 1.5 Opt-in Demo Mode: strictly disabled in production and off by default unless OCR_MODE=demo.
 */
export function isDemoOcrModeEnabled(): boolean {
  return process.env.OCR_MODE === "demo" && process.env.NODE_ENV !== "production";
}

function buildDemoOcrResult(
  doc: DocumentRecord,
  claimId: string,
  portId?: string,
  berthId?: string
): Omit<OcrProcessingResult, "documentId" | "draft"> {
  const pages: OcrExtractedPage[] = [
    {
      pageNumber: 1,
      averageConfidence: 96,
      text: [
        "10/07/2024 0400 Vessel arrived at port limits",
        "10/07/2024 0430-1030 NOR tendered",
        "10/07/2024 1030 Waiting for berth",
        "11/07/2024 1400 All fast",
        "11/07/2024 1600 Commenced discharging",
        "12/07/2024 1400-1800 Rain",
        "14/07/2024 2000 Completed discharging"
      ].join("\n")
    }
  ];
  const parsed = parseSoFPages(pages, { claimId, portId, berthId });
  return {
    fileName: doc.fileName,
    isScanned: false,
    isDemo: true,
    overallConfidence: Number((parsed.overallConfidence / 100).toFixed(2)),
    overallConfidencePct: parsed.overallConfidence,
    extractedActivities: parsed.events,
    lowConfidenceCount: 0,
    flaggedDiscrepancies: [],
    rawTextPreview: parsed.rawText,
    pages
  };
}

/**
 * Full server-side OCR pipeline for an uploaded documentId:
 * loadDocument -> status OCR Processing -> extractText -> parseSoF -> save Draft -> status OCR Completed / OCR Failed.
 */
export async function runRealOcrForDocument(params: {
  documentId: string;
  portId?: string;
  berthId?: string;
  actor: string;
}): Promise<OcrProcessingResult> {
  const { document, buffer, ext } = loadDocument(params.documentId);
  const claimId = document.claimId;
  if (!claimId) {
    throw new OcrFailureError("UNSUPPORTED", "Document must be linked to a claim before running OCR.");
  }

  const acquired = tryAcquireDocumentOcrLock(params.documentId);
  if (!acquired) {
    throw new OcrFailureError("PROCESSING_ERROR", "OCR is already running on this document.");
  }

  try {
    const core = isDemoOcrModeEnabled()
      ? buildDemoOcrResult(document, claimId, params.portId, params.berthId)
      : await processBufferOcr({
          buffer,
          ext,
          claimId,
          portId: params.portId,
          berthId: params.berthId,
          fileName: document.fileName
        });

    const draft = persistOcrDraftAndDiscrepancies({
      documentId: params.documentId,
      claimId,
      portId: params.portId,
      berthId: params.berthId,
      rawText: core.rawTextPreview,
      pages: core.pages,
      parsedEvents: core.extractedActivities,
      overallConfidencePct: core.overallConfidencePct,
      isScanned: core.isScanned,
      isDemo: core.isDemo,
      discrepancies: core.flaggedDiscrepancies,
      actor: params.actor
    });

    return {
      documentId: params.documentId,
      ...core,
      draft
    };
  } catch (err: any) {
    const reason = err?.message || "OCR extraction failed.";
    markDocumentOcrFailed(params.documentId, reason, params.actor);
    throw err;
  }
}
