import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { ALL_ROLES, can, isApiRouteAllowed } from "@/lib/auth/accessMatrix";
import { verifySameOriginRequest } from "@/lib/api/withApi";
import { checkAndRecordOcrRateLimit } from "@/lib/ocr/rateLimiter";
import { getDatabase } from "@/lib/db";
import {
  persistOcrDraftAndDiscrepancies,
  tryAcquireDocumentOcrLock,
  getOcrDraftByDocumentId
} from "@/lib/ocr/draftStore";
import { loadDocument } from "@/lib/ocr/processor";

function assert(cond: unknown, msg: string) {
  if (!cond) {
    throw new Error(`ASSERTION FAILED: ${msg}`);
  }
}

async function run() {
  console.log("=== SECTION 5: OCR SECURITY, RBAC, CSRF, RATE-LIMIT & ATOMICITY TESTS ===");

  // 1. Access matrix ocr:run permissions across all 5 roles
  assert(can("ADMIN", "ocr:run") === true, "ADMIN must have ocr:run");
  assert(can("SUPERVISOR", "ocr:run") === true, "SUPERVISOR must have ocr:run");
  assert(can("CLAIM_PROCESSOR", "ocr:run") === true, "CLAIM_PROCESSOR must have ocr:run");
  assert(can("REVIEWER", "ocr:run") === false, "REVIEWER must NOT have ocr:run");
  assert(can("CLIENT", "ocr:run", true) === false, "CLIENT must NOT have ocr:run");

  for (const role of ALL_ROLES) {
    const allowedPost = isApiRouteAllowed(role, "/api/ocr", "POST", role === "CLIENT");
    const expected = role === "ADMIN" || role === "SUPERVISOR" || role === "CLAIM_PROCESSOR";
    assert(allowedPost === expected, `Route check mismatch for ${role}: expected ${expected}, got ${allowedPost}`);
  }
  console.log("  [PASS] 1. ocr:run matrix & /api/ocr POST route access verified across all 5 roles");

  // 2. CSRF Origin / Referer verification helper
  const makeReq = (headers: Record<string, string>) =>
    new NextRequest("http://localhost:3000/api/ocr", {
      method: "POST",
      headers
    });

  assert(
    verifySameOriginRequest(makeReq({ host: "localhost:3000", origin: "http://localhost:3000" })) === null,
    "Same-origin POST should be allowed"
  );
  const crossOriginRes = verifySameOriginRequest(
    makeReq({ host: "localhost:3000", origin: "https://evil.attacker.example" })
  );
  assert(crossOriginRes?.status === 403, `Cross-origin Origin must return 403, got ${crossOriginRes?.status}`);

  const crossRefRes = verifySameOriginRequest(
    makeReq({ host: "localhost:3000", referer: "https://evil.attacker.example/phish.html" })
  );
  assert(crossRefRes?.status === 403, `Cross-origin Referer must return 403, got ${crossRefRes?.status}`);
  console.log("  [PASS] 2. CSRF same-origin enforcement blocks mismatched Origin & Referer with 403");

  // 3. Per-user sliding-window rate limiter (10 requests / 10 min -> 11th rejected with Retry-After)
  const testUserId = `rate-test-${Date.now()}`;
  const baseTime = 1_700_000_000_000;
  for (let i = 1; i <= 10; i++) {
    const r = checkAndRecordOcrRateLimit(testUserId, baseTime + i * 100);
    assert(r.allowed === true, `Request ${i}/10 should be allowed`);
  }
  const blocked = checkAndRecordOcrRateLimit(testUserId, baseTime + 2000);
  assert(blocked.allowed === false && blocked.retryAfterSeconds > 0, "11th request must be rate-limited with retryAfterSeconds > 0");
  const afterWindow = checkAndRecordOcrRateLimit(testUserId, baseTime + 10 * 60 * 1000 + 2000);
  assert(afterWindow.allowed === true, "After 10-minute window passes, request should be allowed again");
  console.log("  [PASS] 3. Per-user OCR rate limiter (10 per 10m -> 429 + Retry-After) verified");

  // 4. Concurrent OCR lock & resolved discrepancy preservation in SQLite
  const db = getDatabase();
  const docId = `doc-sec5-${Date.now()}`;
  const claimRow = db.prepare("SELECT id FROM claims LIMIT 1").get() as { id: string } | undefined;
  if (claimRow) {
    const claimId = claimRow.id;
    const uploadDir = path.join(process.cwd(), "data", "uploads");
    fs.mkdirSync(uploadDir, { recursive: true });
    const fixturePdf = path.join(process.cwd(), "tests", "fixtures", "ocr", "sof-text-layer.pdf");
    const targetFile = path.join(uploadDir, `${docId}.pdf`);
    fs.copyFileSync(fixturePdf, targetFile);
    const stat = fs.statSync(targetFile);
    const now = new Date().toISOString();

    try {
      db.prepare(
        `INSERT INTO documents (id, claim_id, file_name, file_size, file_type, category, status, uploaded_by, uploaded_at, file_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(docId, claimId, "sec5-test.pdf", stat.size, "application/pdf", "SOF", "Uploaded", "test@laytime.io", now, targetFile);

      // Load verifies stored disk bytes & magic bytes cleanly
      const loaded = loadDocument(docId);
      assert(loaded.buffer.byteLength === stat.size, "loadDocument should read exact disk bytes");

      // Double-click atomic lock: first acquires, second returns false
      const lock1 = tryAcquireDocumentOcrLock(docId);
      const lock2 = tryAcquireDocumentOcrLock(docId);
      assert(lock1 === true && lock2 === false, `Atomic OCR lock failed: lock1=${lock1}, lock2=${lock2}`);

      // First persist creates open discrepancy
      persistOcrDraftAndDiscrepancies({
        documentId: docId,
        claimId,
        rawText: "01/03/2026 08:00 - 10:00 Vessel arrived",
        pages: [{ pageNumber: 1, text: "01/03/2026 08:00 - 10:00 Vessel arrived", averageConfidence: 65 }],
        parsedEvents: [
          {
            id: "evt-sec5-1",
            claimId,
            pageNumber: 1,
            rawLine: "01/03/2026 08:00 - 10:00 Vessel arrived",
            activityName: "Vessel arrived",
            deductionCategory: "Other",
            startTime: "2026-03-01T08:00:00.000Z",
            stopTime: "2026-03-01T10:00:00.000Z",
            durationMinutes: 120,
            durationFormatted: "02h 00m",
            percentageCounted: 100,
            prorata: 100,
            overallConfidencePct: 65,
            fieldConfidences: { date: 80, startTime: 80, stopTime: 80, activityName: 65 },
            isUnclassified: false
          }
        ],
        overallConfidencePct: 65,
        isScanned: false,
        isDemo: false,
        discrepancies: [
          {
            id: "disc-temp",
            claimId,
            type: "low_confidence",
            severity: "warning",
            title: "Low OCR Confidence (65%)",
            description: "Blurred event line",
            field: "ocrConfidence",
            currentValue: "65%",
            suggestedValue: "Verify",
            isResolved: false
          }
        ],
        actor: "sec5-tester"
      });

      const discRow = db
        .prepare("SELECT id FROM discrepancies WHERE claim_id = ? AND title = ?")
        .get(claimId, "Low OCR Confidence (65%)") as { id: string } | undefined;
      assert(discRow, "Deterministic discrepancy must be inserted");

      // Mark discrepancy resolved by human
      db.prepare("UPDATE discrepancies SET is_resolved = 1, resolved_by = 'supervisor' WHERE id = ?").run(discRow!.id);

      // Re-run persist -> must NOT reopen resolved discrepancy!
      persistOcrDraftAndDiscrepancies({
        documentId: docId,
        claimId,
        rawText: "01/03/2026 08:00 - 10:00 Vessel arrived",
        pages: [{ pageNumber: 1, text: "01/03/2026 08:00 - 10:00 Vessel arrived", averageConfidence: 65 }],
        parsedEvents: [],
        overallConfidencePct: 65,
        isScanned: false,
        isDemo: false,
        discrepancies: [
          {
            id: "disc-temp",
            claimId,
            type: "low_confidence",
            severity: "warning",
            title: "Low OCR Confidence (65%)",
            description: "Blurred event line",
            field: "ocrConfidence",
            currentValue: "65%",
            suggestedValue: "Verify",
            isResolved: false
          }
        ],
        actor: "sec5-tester"
      });

      const checkAfter = db.prepare("SELECT is_resolved FROM discrepancies WHERE id = ?").get(discRow!.id) as { is_resolved: number };
      assert(checkAfter.is_resolved === 1, "Re-running OCR must NOT overwrite already resolved discrepancies (is_resolved stays 1)");

      const draft = getOcrDraftByDocumentId(docId);
      assert(draft !== null && draft.overallConfidence === 65, "OCR draft stored cleanly in ocr_drafts");
      console.log("  [PASS] 4. Disk-only loadDocument, concurrent lock, & resolved discrepancy preservation verified");
    } finally {
      db.prepare("DELETE FROM discrepancies WHERE claim_id = ? AND title = 'Low OCR Confidence (65%)'").run(claimId);
      db.prepare("DELETE FROM ocr_drafts WHERE document_id = ?").run(docId);
      db.prepare("DELETE FROM documents WHERE id = ?").run(docId);
      if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);
    }
  } else {
    console.log("  [SKIP] 4. No seeded claim present for DB lock subtest");
  }

  console.log("ALL SECTION 5 OCR SECURITY TESTS PASSED!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
