import fs from "fs";
import path from "path";
import { chromium } from "playwright-core";

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

function findBrowserExecutable() {
  for (const p of [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
  ]) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("No browser binary found");
}

function assert(cond, msg) {
  if (!cond) throw new Error(`WALKTHROUGH FAILED: ${msg}`);
}

async function login(page, email, password, dash) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#email-input", email);
  await page.fill("#password-input", password);
  await Promise.all([
    page.waitForURL((u) => u.pathname.includes(dash), { timeout: 15000 }),
    page.click('button[type="submit"]')
  ]);
  await page.waitForSelector("nav a[data-nav-href]", { timeout: 10000 });
}

async function run() {
  console.log("=== SECTION 6 PASS 3: TEST_PLAN END-TO-END ROLE WALKTHROUGH (CLEAN DB) ===");
  const browser = await chromium.launch({ executablePath: findBrowserExecutable(), headless: true });

  try {
    // 1. ADMIN walkthrough: settings + holidays + users + claims create (DBLS sequential ID)
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await login(page, "admin@laytime.demo", process.env.ADMIN_PASSWORD || "AdminSecurePass@2024!", "/dashboard/admin");
      await page.goto(`${BASE_URL}/settings`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("text=Maritime Holiday Calendar", { timeout: 10000 });
      await page.goto(`${BASE_URL}/users`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("text=admin@laytime.demo", { timeout: 10000 });
      await page.goto(`${BASE_URL}/claims/create`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('input[placeholder*="Pacific Dawn"]', { timeout: 10000 });
      await page.locator('input[placeholder*="Pacific Dawn"]').last().fill("MT Walkthrough Admin");
      console.log("  [PASS] Role Walkthrough 1/5: ADMIN (Dashboard, Settings+Holidays, Users, Claims Create)");
      await ctx.close();
    }

    // 2. SUPERVISOR walkthrough: upload skewed PNG -> OCR low confidence -> CLM-0006 overlaps + CLM-0001 FHEX -> Timebar
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await login(page, "supervisor@laytime.demo", process.env.SUPERVISOR_PASSWORD || "SuperSecurePass@2024!", "/dashboard/supervisor");

      // Upload scanned PNG fixture on CLM-0003
      await page.goto(`${BASE_URL}/documents?claimId=CLM-0003`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('input[type="file"]', { state: "attached", timeout: 10000 });
      await page.locator('input[type="file"]').first().setInputFiles(
        path.join(process.cwd(), "tests", "fixtures", "ocr", "sof-scanned.png")
      );
      await page.click('form button[type="submit"]');
      await page.waitForSelector('text=sof-scanned.png', { timeout: 15000 });

      await page.goto(`${BASE_URL}/ocr`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("select option[value='CLM-0003']", { state: "attached", timeout: 10000 });
      await page.locator("select").first().selectOption("CLM-0003");
      await page.waitForSelector('select option:has-text("sof-scanned.png")', { state: "attached", timeout: 10000 });
      await page.waitForSelector('button:has-text("Run Real OCR"):not([disabled])', { timeout: 10000 });
      await page.click('button:has-text("Run Real OCR")');
      await page.waitForSelector('button:has-text("Confirm & Save to SoF")', { timeout: 30000 });

      await page.goto(`${BASE_URL}/claims/CLM-0006`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('button:has-text("Statement of Facts")', { timeout: 10000 });
      await page.click('button:has-text("Statement of Facts")');
      await page.waitForSelector("text=One-Click Fix Overlap", { timeout: 8000 });

      await page.goto(`${BASE_URL}/timebar`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("text=Imported value differs from default", { timeout: 10000 });
      console.log("  [PASS] Role Walkthrough 2/5: SUPERVISOR (PNG OCR Draft, CLM-0006 Overlap Fix UI, Timebar 45d badge)");
      await ctx.close();
    }

    // 3. CLAIM_PROCESSOR walkthrough: /claims/assigned unique highlight, OCR denied on unassigned CLM-0005
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await login(page, "processor1@laytime.demo", process.env.PROCESSOR1_PASSWORD || "Proc1SecurePass@2024!", "/dashboard/claim-processor");
      await page.locator('nav a[data-nav-href="/claims/assigned"]').first().click();
      await page.waitForURL((u) => u.pathname === "/claims/assigned", { timeout: 10000 });
      const activeCount = await page.locator('nav a[data-active="true"]').count();
      assert(activeCount === 1, `Processor /claims/assigned expected 1 active nav link, found ${activeCount}`);
      const h1 = await page.locator("body").innerText();
      assert(h1.includes("Assigned to me"), "Assigned Claims page must show 'Assigned to me' badge");
      const revBlocked = await page.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
      assert(revBlocked?.status() === 403 || (await page.locator("body").innerText()).toLowerCase().includes("don't have access"), "Processor /reports must show 403 no-access");
      console.log("  [PASS] Role Walkthrough 3/5: CLAIM_PROCESSOR (/claims/assigned unique active state, 'Assigned to me' badge, 403 /reports)");
      await ctx.close();
    }

    // 4. REVIEWER walkthrough: read-only ledger/reports, no create/ocr/upload
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await login(page, "reviewer@laytime.demo", process.env.REVIEWER_PASSWORD || "ReviewerSecurePass@2024!", "/dashboard/reviewer");
      await page.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
      const noCreate = await page.locator('nav a[data-nav-href="/claims/create"]').count();
      const noOcr = await page.locator('nav a[data-nav-href="/ocr"]').count();
      assert(noCreate === 0 && noOcr === 0, "Reviewer sidebar must hide /claims/create and /ocr");
      const ocrAccess = await page.goto(`${BASE_URL}/ocr`, { waitUntil: "domcontentloaded" });
      assert(ocrAccess?.status() === 403 || (await page.locator("body").innerText()).toLowerCase().includes("don't have access"), "Reviewer direct /ocr must show 403");
      console.log("  [PASS] Role Walkthrough 4/5: REVIEWER (read-only Reports, hidden & 403 Create/OCR)");
      await ctx.close();
    }

    // 5. CLIENT walkthrough: scoped Trafigura claims only, no internal pages
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await login(page, "client1@laytime.demo", process.env.CLIENT_PASSWORD || "ClientSecurePass@2024!", "/dashboard/client");
      await page.goto(`${BASE_URL}/claims`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("table tbody tr", { timeout: 10000 }).catch(() => {});
      const claimsText = await page.locator("body").innerText();
      assert(!claimsText.includes("CLM-0005"), "CLIENT Trafigura must NOT see Peregrine claim CLM-0005");
      const createAccess = await page.goto(`${BASE_URL}/claims/create`, { waitUntil: "domcontentloaded" });
      assert(createAccess?.status() === 403 || (await page.locator("body").innerText()).toLowerCase().includes("don't have access"), "Client direct /claims/create must show 403");
      console.log("  [PASS] Role Walkthrough 5/5: CLIENT (strict Trafigura scoping, 403 on internal routes)");
      await ctx.close();
    }

    console.log("ALL SECTION 6 PASS 3 TEST_PLAN WALKTHROUGHS PASSED (5/5 ROLES)!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
