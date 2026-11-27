import path from "path";
import { createRequire } from "module";
import { OcrExtractedLine, OcrExtractedPage } from "./parser";
import { detectMagicSignature } from "@/lib/uploads/serverValidation";

export const MAX_OCR_PAGES = 10;
export const DEFAULT_OCR_TIMEOUT_MS = 30_000;
export const MAX_CONCURRENT_OCR_JOBS = 2;

export type OcrErrorCode =
  | "EMPTY"
  | "CORRUPT"
  | "PASSWORD_PROTECTED"
  | "UNSUPPORTED"
  | "TIMEOUT"
  | "NO_TEXT"
  | "PROCESSING_ERROR";

export class OcrFailureError extends Error {
  code: OcrErrorCode;
  constructor(code: OcrErrorCode, message: string) {
    super(message);
    this.name = "OcrFailureError";
    this.code = code;
  }
}

// In-process concurrency limiter (max 2 active OCR jobs at once)
let activeJobs = 0;
const waitQueue: Array<() => void> = [];

async function acquireConcurrencySlot(): Promise<void> {
  if (activeJobs < MAX_CONCURRENT_OCR_JOBS) {
    activeJobs++;
    return;
  }
  await new Promise<void>((resolve) => {
    waitQueue.push(() => {
      activeJobs++;
      resolve();
    });
  });
}

function releaseConcurrencySlot(): void {
  activeJobs = Math.max(0, activeJobs - 1);
  const next = waitQueue.shift();
  if (next) next();
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  return new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => {
      reject(new OcrFailureError("TIMEOUT", `${label} exceeded ${Math.round(timeoutMs / 1000)}s timeout.`));
    }, timeoutMs);
    promise.then(
      (val) => {
        if (timer) clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        if (timer) clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function getBundledEngLangPath(): string {
  try {
    const req = createRequire(import.meta.url);
    const eng = req("@tesseract.js-data/eng");
    if (eng?.langPath) return eng.langPath;
  } catch {}
  return path.join(process.cwd(), "node_modules", "@tesseract.js-data", "eng", "4.0.0");
}

async function runTesseractOnImages(
  images: Array<{ pageNumber: number; buffer: Buffer }>,
  deadlineMs: number
): Promise<OcrExtractedPage[]> {
  const { createWorker } = await import("tesseract.js");
  const langPath = getBundledEngLangPath();

  const worker = await createWorker("eng", 1, {
    langPath,
    gzip: true,
    logger: () => {}
  });

  try {
    const pages: OcrExtractedPage[] = [];
    for (const img of images) {
      const remaining = deadlineMs - Date.now();
      if (remaining <= 500) {
        throw new OcrFailureError("TIMEOUT", "OCR processing timed out across pages.");
      }

      const recognizeResult: any = await withTimeout(
        worker.recognize(img.buffer, {}, { blocks: true }),
        remaining,
        `Tesseract page ${img.pageNumber}`
      );

      const data = recognizeResult?.data || {};
      const lines: OcrExtractedLine[] = [];
      const blocks = Array.isArray(data.blocks) ? data.blocks : [];

      for (const blk of blocks) {
        for (const para of blk.paragraphs || []) {
          for (const ln of para.lines || []) {
            const words = Array.isArray(ln.words)
              ? ln.words.map((w: any) => ({
                  text: String(w.text || "").trim(),
                  confidence: Math.round(Number(w.confidence ?? ln.confidence ?? data.confidence ?? 0))
                }))
              : undefined;
            const txt = String(ln.text || "").trim();
            if (txt) {
              lines.push({
                text: txt,
                confidence: Math.round(Number(ln.confidence ?? data.confidence ?? 0)),
                words
              });
            }
          }
        }
      }

      const rawText = String(data.text || "").trim();
      const avgConf = Math.max(0, Math.min(100, Math.round(Number(data.confidence ?? 0))));
      pages.push({
        pageNumber: img.pageNumber,
        text: rawText,
        averageConfidence: avgConf,
        lines
      });
    }
    return pages;
  } finally {
    await worker.terminate().catch(() => {});
  }
}

export async function extractPagesFromBuffer(
  buffer: Buffer,
  expectedExt: string,
  options: { timeoutMs?: number; maxPages?: number } = {}
): Promise<{
  pages: OcrExtractedPage[];
  isScanned: boolean;
}> {
  if (!buffer || buffer.byteLength === 0) {
    throw new OcrFailureError("EMPTY", "Uploaded document file is empty (0 bytes).");
  }

  const ext = expectedExt.toLowerCase();
  const sig = detectMagicSignature(buffer);
  if (ext === "pdf" && sig !== "pdf") {
    throw new OcrFailureError("CORRUPT", "File content is not a valid PDF document (%PDF- header missing).");
  }
  if (ext === "png" && sig !== "png") {
    throw new OcrFailureError("CORRUPT", "File content is not a valid PNG image.");
  }
  if ((ext === "jpg" || ext === "jpeg") && sig !== "jpg") {
    throw new OcrFailureError("CORRUPT", "File content is not a valid JPEG image.");
  }
  if (ext !== "pdf" && ext !== "png" && ext !== "jpg" && ext !== "jpeg") {
    throw new OcrFailureError("UNSUPPORTED", `OCR only supports PDF, PNG, and JPG documents (received .${ext}).`);
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_OCR_TIMEOUT_MS;
  const maxPages = Math.min(options.maxPages ?? MAX_OCR_PAGES, MAX_OCR_PAGES);
  const deadlineMs = Date.now() + timeoutMs;

  await acquireConcurrencySlot();
  try {
    if (ext === "png" || ext === "jpg" || ext === "jpeg") {
      const pages = await runTesseractOnImages([{ pageNumber: 1, buffer }], deadlineMs);
      const nonBlankText = pages.map((p) => p.text.replace(/\s+/g, "")).join("");
      if (nonBlankText.length < 3) {
        throw new OcrFailureError("NO_TEXT", "Scanned image yielded no readable text.");
      }
      return { pages, isScanned: true };
    }

    // PDF extraction path via pdf-parse v2
    const pdfParseMod = await import("pdf-parse");
    const PDFParseClass = (pdfParseMod as any).PDFParse;
    if (!PDFParseClass) {
      throw new OcrFailureError("PROCESSING_ERROR", "PDFParse engine unavailable.");
    }

    const parser = new PDFParseClass({ data: new Uint8Array(buffer) });
    try {
      const textResult = await withTimeout<any>(
        parser.getText({ first: maxPages }),
        Math.max(1000, deadlineMs - Date.now()),
        "PDF text extraction"
      );

      const extractedPages: OcrExtractedPage[] = (textResult?.pages || [])
        .slice(0, maxPages)
        .map((p: any, idx: number) => {
          const pageTxt = String(p.text || "").trim();
          return {
            pageNumber: Number(p.num || idx + 1),
            text: pageTxt,
            averageConfidence: 100
          };
        });

      const combinedClean = extractedPages
        .map((p) => p.text.replace(/[^a-zA-Z0-9]/g, ""))
        .join("");

      // Detect embedded text layer (>= 15 alphanumeric characters) vs scanned image PDF
      if (combinedClean.length >= 15) {
        return {
          pages: extractedPages,
          isScanned: false
        };
      }

      // Image-only scanned PDF -> rasterize up to maxPages via pdf-parse getScreenshot and run Tesseract OCR
      const shots = await withTimeout<any>(
        parser.getScreenshot({ first: maxPages, imageBuffer: true, scale: 2 }),
        Math.max(1000, deadlineMs - Date.now()),
        "PDF page rendering"
      );

      const pageImages = (shots?.pages || [])
        .slice(0, maxPages)
        .filter((pg: any) => pg?.data && pg.data.length > 0)
        .map((pg: any, idx: number) => ({
          pageNumber: Number(pg.pageNumber || idx + 1),
          buffer: Buffer.from(pg.data)
        }));

      if (pageImages.length === 0) {
        throw new OcrFailureError("NO_TEXT", "PDF contains no extractable text or renderable pages.");
      }

      const ocrPages = await runTesseractOnImages(pageImages, deadlineMs);
      const ocrCombined = ocrPages.map((p) => p.text.replace(/\s+/g, "")).join("");
      if (ocrCombined.length < 3) {
        throw new OcrFailureError("NO_TEXT", "Blank or unreadable scanned PDF: no text could be extracted.");
      }

      return {
        pages: ocrPages,
        isScanned: true
      };
    } catch (err: any) {
      if (err instanceof OcrFailureError) throw err;
      const errName = String(err?.name || "");
      const errMsg = String(err?.message || "").toLowerCase();
      if (errName === "PasswordException" || errMsg.includes("password")) {
        throw new OcrFailureError("PASSWORD_PROTECTED", "PDF is password-protected and cannot be read.");
      }
      if (
        errName === "InvalidPDFException" ||
        errName === "FormatError" ||
        errMsg.includes("invalid pdf") ||
        errMsg.includes("bad xref") ||
        errMsg.includes("corrupt")
      ) {
        throw new OcrFailureError("CORRUPT", "PDF file is corrupted or unreadable.");
      }
      throw new OcrFailureError("PROCESSING_ERROR", err?.message || "Failed to parse PDF document.");
    } finally {
      await parser.destroy().catch(() => {});
    }
  } finally {
    releaseConcurrencySlot();
  }
}
