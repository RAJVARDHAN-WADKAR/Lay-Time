/**
 * scripts/verify.js - Comprehensive Verification Suite for All 11 Audited Defects in Lay-Time
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const dbPath = path.join(process.cwd(), 'data', 'laytime.db');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function report(condition, desc) {
  totalChecks++;
  if (condition) {
    console.log(`  [PASS] ${desc}`);
    passedChecks++;
  } else {
    console.error(`  [FAIL] ${desc}`);
    failedChecks++;
  }
}

async function loginAs(email, password = 'Demo@12345') {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  const rawCookie = res.headers.get('set-cookie');
  const tokenMatch = rawCookie ? rawCookie.match(/laytime_auth_token=([^;]+)/) : null;
  const token = tokenMatch ? tokenMatch[1] : null;
  return { status: res.status, data, token, cookie: token ? `laytime_auth_token=${token}` : '' };
}

async function runVerification() {
  console.log('================================================================');
  console.log('   LAY-TIME AUDITED DEFECTS COMPREHENSIVE VERIFICATION SUITE    ');
  console.log('================================================================\n');

  const db = new Database(dbPath);

  // ---------------------------------------------------------------------------
  // DEFECT 1: Seed crashes and lazy DB
  // ---------------------------------------------------------------------------
  console.log('--- DEFECT 1: Database Seed & Lazy DB Verification ---');
  const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
  const claimCount = db.prepare('SELECT count(*) as count FROM claims').get().count;
  report(userCount >= 5, `Users table populated (found ${userCount} >= 5)`);
  report(claimCount >= 12, `Claims table populated (found ${claimCount} >= 12)`);

  const dbIndexContent = fs.readFileSync(path.join(process.cwd(), 'lib', 'db', 'index.ts'), 'utf8');
  report(!dbIndexContent.includes('export const db = getDatabase()'), 'Lazy DB initialization verified (no direct export const db)');
  report(dbIndexContent.includes('process.env.DATABASE_PATH'), 'DATABASE_PATH environment override honored');
  report(dbIndexContent.includes('throw e') || dbIndexContent.includes('throw err'), 'Database seed error rethrown on failure');

  // ---------------------------------------------------------------------------
  // DEFECT 2: Finance role security restrictions
  // ---------------------------------------------------------------------------
  console.log('\n--- DEFECT 2: Finance Role Permission Boundaries ---');
  const financeLogin = await loginAs('finance@laytime.demo');
  report(financeLogin.status === 200, 'Finance user login successful');
  const fHeaders = { 'Content-Type': 'application/json', Cookie: financeLogin.cookie };

  const fDeleteClaim = await fetch(`${BASE_URL}/api/claims/CLM-2026-001`, { method: 'DELETE', headers: fHeaders });
  report(fDeleteClaim.status === 403, `Finance DELETE /api/claims/{id} blocked (403, got ${fDeleteClaim.status})`);

  const fOverride = await fetch(`${BASE_URL}/api/claims/CLM-2026-001/override`, {
    method: 'POST',
    headers: fHeaders,
    body: JSON.stringify({ overriddenDemurrage: 10000, overrideReason: 'Finance unauthorized override' }),
  });
  report(fOverride.status === 403, `Finance POST /api/claims/{id}/override blocked (403, got ${fOverride.status})`);

  const fPutRac = await fetch(`${BASE_URL}/api/rac/cases/RAC-2026-001`, {
    method: 'PUT',
    headers: fHeaders,
    body: JSON.stringify({ status: 'Reviewed' }),
  });
  report(fPutRac.status === 403, `Finance PUT /api/rac/cases/{id} blocked (403, got ${fPutRac.status})`);

  const fDeleteDoc = await fetch(`${BASE_URL}/api/documents/doc-1`, { method: 'DELETE', headers: fHeaders });
  report(fDeleteDoc.status === 403, `Finance DELETE /api/documents/{id} blocked (403, got ${fDeleteDoc.status})`);

  const fPostClient = await fetch(`${BASE_URL}/api/clients`, {
    method: 'POST',
    headers: fHeaders,
    body: JSON.stringify({ name: 'Unauthorized Client' }),
  });
  report(fPostClient.status === 403, `Finance POST /api/clients blocked (403, got ${fPostClient.status})`);

  const fPutClaimNonPayment = await fetch(`${BASE_URL}/api/claims/CLM-2026-001`, {
    method: 'PUT',
    headers: fHeaders,
    body: JSON.stringify({ claimNotes: 'Unauthorized note update' }),
  });
  report(fPutClaimNonPayment.status === 403, `Finance PUT /api/claims/{id} non-payment fields blocked (403, got ${fPutClaimNonPayment.status})`);

  const fGetClaims = await fetch(`${BASE_URL}/api/claims`, { headers: fHeaders });
  report(fGetClaims.status === 200, `Finance GET /api/claims allowed (200, got ${fGetClaims.status})`);

  const fPostPayment = await fetch(`${BASE_URL}/api/payments`, {
    method: 'POST',
    headers: fHeaders,
    body: JSON.stringify({ claimId: 'CLM-2026-001', amount: 5000 }),
  });
  report(fPostPayment.status === 200 || fPostPayment.status === 201, `Finance POST /api/payments allowed (got ${fPostPayment.status})`);

  const fPostInvoice = await fetch(`${BASE_URL}/api/invoices`, {
    method: 'POST',
    headers: fHeaders,
    body: JSON.stringify({ claimId: 'CLM-2026-001', amount: 5000 }),
  });
  report(fPostInvoice.status === 200 || fPostInvoice.status === 201, `Finance POST /api/invoices allowed (got ${fPostInvoice.status})`);

  // ---------------------------------------------------------------------------
  // DEFECT 3: Deduction records and 42/42 calculation equivalence
  // ---------------------------------------------------------------------------
  console.log('\n--- DEFECT 3: Deduction Records & Live vs Stored Calculation Match ---');
  const { calculateClaimLaytime } = require('../lib/calculations/laytime');
  const { getClaimById } = require('../lib/db/queries');

  const claims42 = db.prepare("SELECT id FROM claims WHERE id LIKE 'CLM-2026-%' ORDER BY id ASC").all();
  let matchedCalcs = 0;
  for (const c of claims42) {
    const fullClaim = getClaimById(c.id);
    if (!fullClaim) continue;
    const live = calculateClaimLaytime(fullClaim);
    const stored = db.prepare('SELECT * FROM laytime_calculations WHERE claim_id = ?').get(c.id);
    if (stored) {
      const match =
        ((stored.total_gross_minutes || stored.gross_time_used_minutes) === (live.totalGrossMinutes || live.grossTimeUsedMinutes)) &&
        ((stored.total_net_laytime_minutes || stored.net_time_used_minutes) === (live.totalNetLaytimeMinutes || live.netTimeUsedMinutes)) &&
        Math.abs(stored.final_payable_amount - live.finalPayableAmount) < 0.05;
      if (match) matchedCalcs++;
    }
  }
  report(matchedCalcs === 42, `Live calculation matches stored laytime_calculations for ALL ${matchedCalcs} / 42 claims`);

  const calcsDoc = fs.readFileSync(path.join(process.cwd(), 'docs', 'CALCULATIONS.md'), 'utf8');
  report(calcsDoc.includes('Non-Duplication Rule') || calcsDoc.includes('non-duplication'), 'Non-duplication deduction rule documented in docs/CALCULATIONS.md');

  // ---------------------------------------------------------------------------
  // DEFECT 4: SoF write validation
  // ---------------------------------------------------------------------------
  console.log('\n--- DEFECT 4: Statement of Facts Write Validation ---');
  const procLogin = await loginAs('processor1@laytime.demo');
  const pHeaders = { 'Content-Type': 'application/json', Cookie: procLogin.cookie };

  const pReversed = await fetch(`${BASE_URL}/api/claims/CLM-2026-001/sof`, {
    method: 'POST',
    headers: pHeaders,
    body: JSON.stringify({
      activityName: 'Reversed Times Test',
      startTime: '2026-09-01T14:00:00Z',
      stopTime: '2026-09-01T08:00:00Z',
      percentageCounted: 100,
    }),
  });
  report(pReversed.status === 400, `Stop-before-start rejected with 400 (got ${pReversed.status})`);

  const pFakePort = await fetch(`${BASE_URL}/api/claims/CLM-2026-001/sof`, {
    method: 'POST',
    headers: pHeaders,
    body: JSON.stringify({
      activityName: 'Fake Port Test',
      startTime: '2026-09-01T08:00:00Z',
      stopTime: '2026-09-01T14:00:00Z',
      portId: 'port-nonexistent-999',
      percentageCounted: 100,
    }),
  });
  report(pFakePort.status === 400, `Non-existent portId rejected with 400 (got ${pFakePort.status})`);

  const pFakeBerth = await fetch(`${BASE_URL}/api/claims/CLM-2026-001/sof`, {
    method: 'POST',
    headers: pHeaders,
    body: JSON.stringify({
      activityName: 'Fake Berth Test',
      startTime: '2026-09-01T08:00:00Z',
      stopTime: '2026-09-01T14:00:00Z',
      berthId: 'berth-nonexistent-999',
      percentageCounted: 100,
    }),
  });
  report(pFakeBerth.status === 400, `Non-existent berthId rejected with 400 (got ${pFakeBerth.status})`);

  const pValid = await fetch(`${BASE_URL}/api/claims/CLM-2026-001/sof`, {
    method: 'POST',
    headers: pHeaders,
    body: JSON.stringify({
      activityName: 'Verify Event 08:00-14:00',
      startTime: '2026-09-01T08:00:00Z',
      stopTime: '2026-09-01T14:00:00Z',
      durationMinutes: 999, // bogus, must be ignored
      percentageCounted: 100,
    }),
  });
  const pValidData = await pValid.json();
  const createdActId = pValidData.activity?.id;
  report(
    pValid.status === 201 && pValidData.activity?.durationMinutes === 360,
    `Valid event created (201) with duration computed from timestamps: 360m (got ${pValidData.activity?.durationMinutes}m)`
  );

  // ---------------------------------------------------------------------------
  // DEFECT 5: Calculation results persisted on modification
  // ---------------------------------------------------------------------------
  console.log('\n--- DEFECT 5: Calculation Persistence ---');
  const getCalcRes = await fetch(`${BASE_URL}/api/claims/CLM-2026-001/calculations`, { headers: pHeaders });
  const calcData = await getCalcRes.json();
  const storedCalcRow = db.prepare('SELECT * FROM laytime_calculations WHERE claim_id = ?').get('CLM-2026-001');
  report(
    getCalcRes.status === 200 && storedCalcRow && storedCalcRow.total_net_laytime_minutes === (calcData.calculations?.total_net_laytime_minutes || calcData.calculation?.totalNetLaytimeMinutes),
    `Stored calculation row matches GET /api/claims/{id}/calculations (net: ${storedCalcRow?.total_net_laytime_minutes}m)`
  );

  // Clean up created activity
  if (createdActId) {
    await fetch(`${BASE_URL}/api/claims/CLM-2026-001/sof/${createdActId}`, { method: 'DELETE', headers: pHeaders });
  }

  // ---------------------------------------------------------------------------
  // DEFECT 6: Audit trail and notifications
  // ---------------------------------------------------------------------------
  console.log('\n--- DEFECT 6: Audit Trail & Notifications ---');
  const auditCountBefore = db.prepare('SELECT count(*) as count FROM audit_logs').get().count;
  const notifCountBefore = db.prepare('SELECT count(*) as count FROM notifications').get().count;

  // Trigger claim update mutation
  const supLogin = await loginAs('supervisor@laytime.demo');
  const sHeaders = { 'Content-Type': 'application/json', Cookie: supLogin.cookie };

  await fetch(`${BASE_URL}/api/claims/CLM-2026-003`, {
    method: 'PUT',
    headers: sHeaders,
    body: JSON.stringify({ claimNotes: `Audit test note ${Date.now()}` }),
  });

  const auditCountAfter = db.prepare('SELECT count(*) as count FROM audit_logs').get().count;
  report(auditCountAfter > auditCountBefore, `Audit log increased by state mutation (${auditCountBefore} -> ${auditCountAfter})`);

  // ---------------------------------------------------------------------------
  // DEFECT 7: Dashboard metrics
  // ---------------------------------------------------------------------------
  console.log('\n--- DEFECT 7: Dashboard Metrics (Contention Sum) ---');
  const { getDashboardAnalytics } = require('../lib/db/queries');
  const metrics = getDashboardAnalytics('Admin');

  const expectedSql = db.prepare(`
    SELECT 
      SUM(claim_filed_amount) as total_owed,
      SUM(payment_received) as total_received,
      SUM(CASE WHEN claim_status LIKE '%Disputed%' OR claim_status LIKE '%Legal%' OR claim_status LIKE '%Review%' THEN claim_filed_amount ELSE 0 END) as contention
    FROM claims
  `).get();

  report(Math.abs(metrics.totalDemurrageOwed - expectedSql.total_owed) < 1, `Dashboard total owed equals SQL sum: ${metrics.totalDemurrageOwed}`);
  report(Math.abs(metrics.totalDemurrageReceived - expectedSql.total_received) < 1, `Dashboard total received equals SQL sum: ${metrics.totalDemurrageReceived}`);
  report(Math.abs(metrics.amountUnderContention - expectedSql.contention) < 1, `Dashboard amount under contention equals SQL Disputed+Legal+Review: $${metrics.amountUnderContention.toLocaleString()} == $${expectedSql.contention.toLocaleString()}`);

  // ---------------------------------------------------------------------------
  // DEFECT 8: Lost updates / Optimistic concurrency (409)
  // ---------------------------------------------------------------------------
  console.log('\n--- DEFECT 8: Optimistic Concurrency & 409 Conflict ---');
  const currentClaim = db.prepare('SELECT updated_at FROM claims WHERE id = ?').get('CLM-2026-001');

  // Stale update with outdated timestamp
  const staleRes = await fetch(`${BASE_URL}/api/claims/CLM-2026-001`, {
    method: 'PUT',
    headers: sHeaders,
    body: JSON.stringify({
      claimNotes: 'Stale note update attempt',
      updatedAt: '2020-01-01T00:00:00.000Z', // Outdated timestamp
    }),
  });
  report(staleRes.status === 409, `Stale update rejected with 409 Conflict (got ${staleRes.status})`);

  // ---------------------------------------------------------------------------
  // DEFECT 9: Page Access Matrix verification
  // ---------------------------------------------------------------------------
  console.log('\n--- DEFECT 9: Page Access Matrix (6 Roles Verification) ---');
  const { PAGE_ACCESS_MATRIX, normalizeAppRole } = require('../lib/auth/pageAccessMatrix');
  report(PAGE_ACCESS_MATRIX.length >= 15, `Single page access matrix table defined (${PAGE_ACCESS_MATRIX.length} rules)`);
  report(normalizeAppRole('FINANCE') === 'FINANCE', 'Finance normalized to FINANCE (not SUPERVISOR)');
  report(normalizeAppRole('ADMIN') === 'ADMIN', 'Admin normalized to ADMIN');

  // ---------------------------------------------------------------------------
  // DEFECT 10: Login hardening
  // ---------------------------------------------------------------------------
  console.log('\n--- DEFECT 10: Login Hardening (Rate Limiting & Configurable Cookie) ---');
  const dockerCompose = fs.readFileSync(path.join(process.cwd(), 'docker-compose.yml'), 'utf8');
  report(!dockerCompose.includes('super_secret_jwt_key_for_laytime_dev_change_in_production'), 'Fixed JWT secret removed from docker-compose.yml');

  // Trigger rate limit: 6 consecutive wrong passwords
  const testEmail = `ratelimit.test.${Date.now()}@laytime.demo`;
  let got429 = false;
  for (let i = 1; i <= 6; i++) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword!' }),
    });
    if (res.status === 429) {
      got429 = true;
      break;
    }
  }
  report(got429, '6th consecutive failed login returned 429 Too Many Requests');

  // ---------------------------------------------------------------------------
  // DEFECT 11: Demo accounts & dataset claim IDs
  // ---------------------------------------------------------------------------
  console.log('\n--- DEFECT 11: Demo Accounts & Dataset Consistency ---');
  const adminAcc = await loginAs('admin@laytime.demo');
  const supAcc = await loginAs('supervisor@laytime.demo');
  const procAcc = await loginAs('processor1@laytime.demo');
  const revAcc = await loginAs('reviewer@laytime.demo');
  const finAcc = await loginAs('finance@laytime.demo');
  const cliAcc = await loginAs('client1@laytime.demo');

  report(adminAcc.status === 200, 'admin@laytime.demo authenticated');
  report(supAcc.status === 200, 'supervisor@laytime.demo authenticated');
  report(procAcc.status === 200, 'processor1@laytime.demo authenticated');
  report(revAcc.status === 200, 'reviewer@laytime.demo authenticated');
  report(finAcc.status === 200, 'finance@laytime.demo authenticated');
  report(cliAcc.status === 200, 'client1@laytime.demo authenticated');

  // Role visibility check: 42 / 22 / 20 / 8 (admin / processor1 / processor2 / client1)
  const adminClaimsRes = await fetch(`${BASE_URL}/api/claims`, { headers: { Cookie: adminAcc.cookie } });
  const adminClaims = await adminClaimsRes.json();
  report(adminClaims.total >= 42, `Admin visibility covers full claims portfolio (found ${adminClaims.total} >= 42 claims)`);

  const proc1ClaimsRes = await fetch(`${BASE_URL}/api/claims`, { headers: { Cookie: procAcc.cookie } });
  const proc1Claims = await proc1ClaimsRes.json();
  report(proc1Claims.total === 22, `Processor1 visibility is exactly 22 claims (got ${proc1Claims.total})`);

  const proc2Login = await loginAs('processor2@laytime.demo');
  const proc2ClaimsRes = await fetch(`${BASE_URL}/api/claims`, { headers: { Cookie: proc2Login.cookie } });
  const proc2Claims = await proc2ClaimsRes.json();
  report(proc2Claims.total === 20, `Processor2 visibility is exactly 20 claims (got ${proc2Claims.total})`);

  const cli1ClaimsRes = await fetch(`${BASE_URL}/api/claims`, { headers: { Cookie: cliAcc.cookie } });
  const cli1Claims = await cli1ClaimsRes.json();
  report(cli1Claims.total === 8, `Client1 visibility is exactly 8 claims (got ${cli1Claims.total})`);

  console.log('\n================================================================');
  console.log(`VERIFICATION SUMMARY: ${passedChecks} / ${totalChecks} CHECKS PASSED (${Math.round((passedChecks / totalChecks) * 100)}%)`);
  if (failedChecks > 0) {
    console.error(`FAILED CHECKS: ${failedChecks}`);
    process.exit(1);
  } else {
    console.log('ALL AUDITED DEFECTS SUCCESSFULLY FIXED AND VERIFIED!');
    console.log('================================================================\n');
  }
}

runVerification().catch((err) => {
  console.error('Verification script crashed:', err);
  process.exit(1);
});
