import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0 && !process.env[trimmed.slice(0, eq).trim()]) {
      process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  }
}

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const CREDS = {
  ADMIN: { email: "admin@laytime.demo", password: process.env.ADMIN_PASSWORD || "AdminSecurePass@2024!" },
  SUPERVISOR: { email: "supervisor@laytime.demo", password: process.env.SUPERVISOR_PASSWORD || "SuperSecurePass@2024!" },
  PROCESSOR1: { email: "processor1@laytime.demo", password: process.env.PROCESSOR1_PASSWORD || "Proc1SecurePass@2024!" },
  PROCESSOR2: { email: "processor2@laytime.demo", password: process.env.PROCESSOR2_PASSWORD || "Proc2SecurePass@2024!" },
  REVIEWER: { email: "reviewer@laytime.demo", password: process.env.REVIEWER_PASSWORD || "ReviewerSecurePass@2024!" },
  CLIENT: { email: "client1@laytime.demo", password: process.env.CLIENT_PASSWORD || "ClientSecurePass@2024!" }
};

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
}

function getCookieFromRes(res: Response): string {
  const cookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const c of cookies) {
    const m = c.match(/laytime_auth_token=([^;]+)/);
    if (m) return `laytime_auth_token=${m[1]}`;
  }
  const raw = res.headers.get("set-cookie") || "";
  const m = raw.match(/laytime_auth_token=([^;]+)/);
  assert(m, "Expected auth cookie from login");
  return `laytime_auth_token=${m![1]}`;
}

async function loginRole(key: keyof typeof CREDS): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(CREDS[key])
  });
  assert(res.status === 200, `Login failed for ${key}: status=${res.status}`);
  return getCookieFromRes(res);
}

async function uploadBuffer(
  cookie: string,
  claimId: string,
  filename: string,
  mime: string,
  buf: Buffer,
  extraHeaders: Record<string, string> = {}
) {
  const form = new FormData();
  form.append("claimId", claimId);
  form.append("category", "SOF");
  form.append("documentType", "SOF");
  form.append("file", new Blob([new Uint8Array(buf)], { type: mime }), filename);
  return fetch(`${BASE_URL}/api/documents`, {
    method: "POST",
    headers: { Cookie: cookie, ...extraHeaders },
    body: form
  });
}

async function run() {
  console.log("=== SECTION 6 PASS 1: LIVE SERVER API, SECURITY, OCR, HOLIDAYS, UPLOADS & CONCURRENCY ===");

  const cookies = {
    ADMIN: await loginRole("ADMIN"),
    SUPERVISOR: await loginRole("SUPERVISOR"),
    PROCESSOR1: await loginRole("PROCESSOR1"),
    PROCESSOR2: await loginRole("PROCESSOR2"),
    REVIEWER: await loginRole("REVIEWER"),
    CLIENT: await loginRole("CLIENT")
  };
  console.log("  [PASS] Authenticated all 6 seeded role accounts");

  // 1. Unauthenticated access checks
  const unauthOcr = await fetch(`${BASE_URL}/api/ocr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId: "doc-nonexistent" })
  });
  assert(unauthOcr.status === 401, `Unauthenticated /api/ocr must return 401, got ${unauthOcr.status}`);
  console.log("  [PASS] Unauthenticated /api/ocr blocked (401)");

  // 2. Role x Create Claim & Future-Date Blocking + Concurrent DBLS Claim IDs
  for (const denied of ["REVIEWER", "CLIENT"] as const) {
    const res = await fetch(`${BASE_URL}/api/claims`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookies[denied] },
      body: JSON.stringify({ claimName: "Unauthorized Claim Test", shipName: "MT Denied" })
    });
    assert(res.status === 403, `${denied} POST /api/claims must be 403, got ${res.status}`);
  }

  const futureDateRes = await fetch(`${BASE_URL}/api/claims`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookies.ADMIN },
    body: JSON.stringify({
      claimName: "Future Date Reject Claim",
      shipName: "MT Future",
      voyageEndDate: "2099-05-01"
    })
  });
  assert(futureDateRes.status === 400, `Future voyageEndDate must return 400, got ${futureDateRes.status}`);

  // Parallel concurrent claim creation -> distinct DBLS IDs
  const parallelCreates = await Promise.all(
    Array.from({ length: 4 }, (_, i) =>
      fetch(`${BASE_URL}/api/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookies.PROCESSOR1 },
        body: JSON.stringify({
          claimName: `Concurrency Test Vessel ${i + 1}`,
          shipName: `MT Concurrent ${i + 1}`,
          accountName: "Trafigura Trading Pte Ltd",
          instructionReceivedDate: "2026-02-15",
          demurrageRatePerDay: 22000,
          dayRule: "SHEX"
        })
      }).then(async (r) => ({ status: r.status, json: await r.json() }))
    )
  );
  const createdIds = parallelCreates.map((r) => {
    assert(r.status === 201, `Parallel create expected 201, got ${r.status}`);
    assert(/^DBLS\d{5,}$/.test(r.json.claim.id), `Unexpected DBLS ID format: ${r.json.claim.id}`);
    return r.json.claim.id;
  });
  assert(new Set(createdIds).size === 4, `Duplicate Claim ID generated in concurrency: ${createdIds.join(",")}`);
  const processorClaimId = createdIds[0];
  console.log(`  [PASS] Concurrent DBLS ID creation + future-date blocking + RBAC verified (${createdIds.join(", ")})`);

  // 3. Holidays API CRUD & RBAC
  const holForbidden = await fetch(`${BASE_URL}/api/holidays`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookies.SUPERVISOR },
    body: JSON.stringify({ action: "add", countryCode: "SG", date: "2026-12-25", name: "Unauthorized Hol" })
  });
  assert(holForbidden.status === 403, `SUPERVISOR POST /api/holidays must return 403, got ${holForbidden.status}`);

  const holAdd = await fetch(`${BASE_URL}/api/holidays`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookies.ADMIN },
    body: JSON.stringify({ action: "add", countryCode: "SG", date: "2026-12-26", name: "Pass1 Boxing Holiday" })
  });
  assert(holAdd.status === 201 || holAdd.status === 200, `ADMIN POST /api/holidays expected 201/200, got ${holAdd.status}`);
  const holJson = await holAdd.json();
  const holDel = await fetch(`${BASE_URL}/api/holidays?id=${encodeURIComponent(holJson.holiday.id)}`, {
    method: "DELETE",
    headers: { Cookie: cookies.ADMIN }
  });
  assert(holDel.status === 200, `ADMIN DELETE /api/holidays expected 200, got ${holDel.status}`);
  console.log("  [PASS] Holidays API CRUD & RBAC verified");

  // 4. Upload Limits (0B, <15KB -> 400; >1MB -> 413; spoofed magic -> 400; valid PDF -> 201) & CSRF
  const tinyBuf = Buffer.from("%PDF-1.4\ntiny");
  const overBuf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(1024 * 1024 + 5000, 65)]);
  const spoofBuf = Buffer.alloc(20 * 1024, 65);

  const upTiny = await uploadBuffer(cookies.PROCESSOR1, processorClaimId, "tiny.pdf", "application/pdf", tinyBuf);
  assert(upTiny.status === 400, `<15 KB upload must return 400, got ${upTiny.status}`);

  const upOver = await uploadBuffer(cookies.PROCESSOR1, processorClaimId, "huge.pdf", "application/pdf", overBuf);
  assert(upOver.status === 413, `>1 MB upload must return 413, got ${upOver.status}`);

  const upSpoof = await uploadBuffer(cookies.PROCESSOR1, processorClaimId, "fake.pdf", "application/pdf", spoofBuf);
  assert(upSpoof.status === 400, `Spoofed PDF magic bytes must return 400, got ${upSpoof.status}`);

  const upReviewer = await uploadBuffer(cookies.REVIEWER, "CLM-0001", "rev.pdf", "application/pdf", tinyBuf);
  assert(upReviewer.status === 403, `REVIEWER document upload must return 403, got ${upReviewer.status}`);

  const upCsrf = await uploadBuffer(cookies.PROCESSOR1, processorClaimId, "csrf.pdf", "application/pdf", spoofBuf, {
    Origin: "https://evil.attacker.example"
  });
  assert(upCsrf.status === 403, `Cross-origin document upload must return 403, got ${upCsrf.status}`);

  const fixturePdfBuf = fs.readFileSync(path.join(process.cwd(), "tests", "fixtures", "ocr", "sof-text-layer.pdf"));
  const upValid = await uploadBuffer(cookies.PROCESSOR1, processorClaimId, "sof-text-layer.pdf", "application/pdf", fixturePdfBuf);
  assert(upValid.status === 201, `Valid fixture PDF upload must return 201, got ${upValid.status}`);
  const validDocJson = await upValid.json();
  const uploadedDocId = validDocJson.document.id;

  // Duplicate upload of identical bytes on same claim should return 409
  const upDup = await uploadBuffer(cookies.PROCESSOR1, processorClaimId, "sof-copy.pdf", "application/pdf", fixturePdfBuf);
  assert(upDup.status === 409, `Duplicate SHA-256 upload on same claim expected 409, got ${upDup.status}`);
  console.log("  [PASS] Upload size bounds, magic bytes, dedupe, RBAC & CSRF verified");

  // 5. Live OCR Security & Workflow Tests (Section 5.10)
  // Denied roles: REVIEWER, CLIENT, unassigned PROCESSOR2
  for (const denied of ["REVIEWER", "CLIENT", "PROCESSOR2"] as const) {
    const res = await fetch(`${BASE_URL}/api/ocr`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookies[denied] },
      body: JSON.stringify({ documentId: uploadedDocId })
    });
    assert(res.status === 403, `${denied} POST /api/ocr must return 403, got ${res.status}`);
  }

  // Cross-origin CSRF on /api/ocr
  const ocrCsrf = await fetch(`${BASE_URL}/api/ocr`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookies.PROCESSOR1,
      Origin: "https://attacker.evil"
    },
    body: JSON.stringify({ documentId: uploadedDocId })
  });
  assert(ocrCsrf.status === 403, `Cross-origin /api/ocr must return 403, got ${ocrCsrf.status}`);

  // Invalid documentId & mismatched portId from CLM-0001
  const badPortOcr = await fetch(`${BASE_URL}/api/ocr`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookies.PROCESSOR1 },
    body: JSON.stringify({ documentId: uploadedDocId, portId: "port-clm-0001-1" })
  });
  assert(badPortOcr.status === 400, `Mismatched portId from another claim must return 400, got ${badPortOcr.status}`);

  // Run OCR on PDF fixture cleanly
  const ocrPdfRes = await fetch(`${BASE_URL}/api/ocr`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookies.PROCESSOR1 },
    body: JSON.stringify({ documentId: uploadedDocId })
  });
  assert(ocrPdfRes.status === 200, `Assigned processor OCR on PDF expected 200, got ${ocrPdfRes.status}`);

  // Upload scanned PNG fixture (Tesseract takes ~1.5s) to genuinely test concurrent double-click 409 lock over HTTP
  const scannedPngBuf = fs.readFileSync(path.join(process.cwd(), "tests", "fixtures", "ocr", "sof-scanned.png"));
  const upScan = await uploadBuffer(cookies.PROCESSOR1, processorClaimId, "sof-scanned.png", "image/png", scannedPngBuf);
  assert(upScan.status === 201, `Valid PNG upload must return 201, got ${upScan.status}`);
  const scannedDocId = (await upScan.json()).document.id;

  const pScanA = fetch(`${BASE_URL}/api/ocr`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookies.PROCESSOR1 },
    body: JSON.stringify({ documentId: scannedDocId })
  });
  await new Promise((r) => setTimeout(r, 80));
  const pScanB = fetch(`${BASE_URL}/api/ocr`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookies.PROCESSOR1 },
    body: JSON.stringify({ documentId: scannedDocId })
  });
  const [ocrA, ocrB] = await Promise.all([pScanA, pScanB]);
  const statuses = [ocrA.status, ocrB.status].sort((x, y) => x - y);
  assert(statuses[0] === 200 && statuses[1] === 409, `Concurrent double-click expected [200, 409], got [${statuses.join(", ")}]`);

  // Verify draft created BEFORE confirming (SoF still empty!)
  const ocrDataRes = await fetch(`${BASE_URL}/api/ocr?claimId=${encodeURIComponent(processorClaimId)}`, {
    headers: { Cookie: cookies.PROCESSOR1 }
  });
  assert(ocrDataRes.status === 200, "GET /api/ocr?claimId= must succeed");
  const ocrData = await ocrDataRes.json();
  assert(ocrData.drafts.length >= 1 && ocrData.drafts[0].parsedEvents.length >= 5, "Draft must contain extracted SoF events");

  const claimPreConfirmRes = await fetch(`${BASE_URL}/api/claims/${encodeURIComponent(processorClaimId)}`, {
    headers: { Cookie: cookies.PROCESSOR1 }
  });
  const claimPre = (await claimPreConfirmRes.json()).claim;
  assert((claimPre.activities || []).length === 0, "statement_of_facts must remain empty before user confirmation");

  // Confirm draft with corrected activity name
  const firstEvt = ocrData.drafts[0].parsedEvents[0];
  const confirmRes = await fetch(`${BASE_URL}/api/ocr/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookies.PROCESSOR1 },
    body: JSON.stringify({
      documentId: uploadedDocId,
      events: [
        {
          ...firstEvt,
          activityName: "Vessel arrived (Verified)",
          isCorrected: true
        }
      ]
    })
  });
  assert(confirmRes.status === 200, `POST /api/ocr/confirm expected 200, got ${confirmRes.status}`);

  // Rate limit check on ADMIN (10 runs -> 11th returns 429 + Retry-After) using fast nonexistent/validation doc?
  // Note rate limit runs BEFORE loadDocument inside /api/ocr POST handler!
  let saw429 = false;
  let sawRetryHeader = false;
  for (let i = 1; i <= 12; i++) {
    const r = await fetch(`${BASE_URL}/api/ocr`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookies.ADMIN },
      body: JSON.stringify({ documentId: "doc-rate-probe-nonexistent" })
    });
    if (r.status === 429) {
      saw429 = true;
      sawRetryHeader = Number(r.headers.get("retry-after") || "0") > 0;
      break;
    }
  }
  assert(saw429 && sawRetryHeader, "Rate limiter must enforce 429 + Retry-After after 10 OCR calls");
  console.log("  [PASS] OCR HTTP auth, ownership, port-scope, CSRF, concurrency 409, draft->confirm & 429 rate-limit verified");

  // 6. Clean up temporary concurrency test claims
  for (const cid of createdIds) {
    await fetch(`${BASE_URL}/api/claims/${encodeURIComponent(cid)}`, {
      method: "DELETE",
      headers: { Cookie: cookies.ADMIN }
    });
  }

  console.log("ALL SECTION 6 PASS 1 LIVE API VERIFICATION TESTS PASSED!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
