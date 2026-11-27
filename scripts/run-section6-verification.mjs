import { spawn, spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function runStep(label, cmd, args) {
  console.log(`\n>>> [${label}] Running: ${cmd} ${args.join(" ")}`);
  const start = Date.now();
  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, BASE_URL: "http://localhost:3000" }
  });
  const ms = Date.now() - start;
  const passed = res.status === 0;
  console.log(`<<< [${label}] ${passed ? "PASS" : "FAIL"} (${ms}ms)`);
  return { label, passed, ms, code: res.status };
}

async function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${url}/login`);
      if (r.status === 200) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timed out waiting for Next server at ${url}`);
}

async function main() {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

  // Start built Next.js production server on localhost:3000
  const server = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["next", "start", "-p", "3000"],
    {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
      env: { ...process.env }
    }
  );

  server.stdout.on("data", (d) => {
    const msg = d.toString().trim();
    if (msg) console.log(`[next-start] ${msg}`);
  });
  server.stderr.on("data", (d) => {
    const msg = d.toString().trim();
    if (msg) console.error(`[next-start-err] ${msg}`);
  });

  const results = [];

  try {
    await waitForServer("http://localhost:3000", 35000);
    console.log("Production server is up on http://localhost:3000");

    // Initialize clean SQLite DB + Holidays + Tracker CSV via first DB request, then seed test auth users
    await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "probe@laytime.demo", password: "init" })
    }).catch(() => {});

    results.push(runStep("Seed: Test Auth Users", "node", ["scripts/seed-users.js"]));

    // =========================================================================
    // PASS 1: Full Automated Unit + API + Security + Engine + Existing Suites
    // =========================================================================
    const pass1Steps = [
      ["Pass 1 - Access Matrix Consistency", npmCmd, ["run", "test:access"]],
      ["Pass 1 - Real OCR Extraction Fixtures (Sec 1)", npmCmd, ["run", "test:ocr"]],
      ["Pass 1 - Laytime Day Rules & Holidays (Sec 2)", npmCmd, ["run", "test:rules"]],
      ["Pass 1 - Timebar Defaults & Thresholds (Sec 3)", npmCmd, ["run", "test:timebar"]],
      ["Pass 1 - Overlap Detection & Sweep-Line (Sec 4)", npmCmd, ["run", "test:overlaps"]],
      ["Pass 1 - OCR Security, CSRF, Rate-Limit (Sec 5)", npmCmd, ["run", "test:ocr-sec"]],
      ["Pass 1 - Deterministic Laytime Engine", npmCmd, ["run", "test:engine"]],
      ["Pass 1 - Auth & RBAC API Suite", npmCmd, ["run", "test:auth"]],
      ["Pass 1 - Existing Core E2E API Suite", npmCmd, ["run", "test:e2e"]],
      ["Pass 1 - Live Multi-Role Security/Upload/OCR API (Sec 6)", npmCmd, ["run", "verify:pass1"]]
    ];

    for (const [label, cmd, args] of pass1Steps) {
      const r = runStep(label, cmd, args);
      results.push(r);
      if (!r.passed) throw new Error(`Stopped at failing step: ${label}`);
    }

    // =========================================================================
    // PASS 2: Real Chromium/Edge Browser E2E Suite Across All 5 Roles
    // =========================================================================
    const p2 = runStep("Pass 2 - Browser E2E All 5 Roles (Playwright)", npmCmd, ["run", "verify:pass2"]);
    results.push(p2);
    if (!p2.passed) throw new Error("Pass 2 Browser E2E failed");

    // =========================================================================
    // PASS 3: Full End-to-End Role Walkthrough Per docs/TEST_PLAN.md
    // =========================================================================
    const p3 = runStep("Pass 3 - Full Role Walkthrough (docs/TEST_PLAN.md)", npmCmd, ["run", "verify:pass3"]);
    results.push(p3);
    if (!p3.passed) throw new Error("Pass 3 Walkthrough failed");

    console.log("\n=========================================================");
    console.log("   SECTION 6 THREE-PASS VERIFICATION SUMMARY (ALL GREEN)  ");
    console.log("=========================================================");
    for (const r of results) {
      console.log(`  [${r.passed ? "PASS" : "FAIL"}] ${r.label} (${r.ms}ms)`);
    }
  } finally {
    if (process.platform === "win32" && server.pid) {
      spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      server.kill("SIGTERM");
    }
  }
}

main().catch((err) => {
  console.error("\nVERIFICATION SUITE FAILED:", err.message);
  process.exit(1);
});
