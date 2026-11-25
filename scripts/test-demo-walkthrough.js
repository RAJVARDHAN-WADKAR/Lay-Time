const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function runDemoChecks() {
  console.log('================================================================');
  console.log('   ACADEMIC & EXAMINER DEMONSTRATION VERIFICATION SUITE         ');
  console.log('================================================================\n');

  let passes = 0;
  let fails = 0;

  function report(condition, desc) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passes++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      fails++;
    }
  }

  // 1. Test 4 @laytime.io demo logins
  console.log('--- 1. One-Click Demo Role Accounts Authentication ---');
  const roles = [
    { role: 'Admin', email: 'admin@laytime.io', pass: 'Admin@123' },
    { role: 'Supervisor', email: 'supervisor@laytime.io', pass: 'Super@123' },
    { role: 'Claim Processor', email: 'processor@laytime.io', pass: 'Proc@123' },
    { role: 'Reviewer', email: 'reviewer@laytime.io', pass: 'Review@123' }
  ];

  for (const r of roles) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: r.email, password: r.pass })
    });
    const data = await res.json().catch(() => ({}));
    const cookie = res.headers.get('set-cookie');
    const hasToken = cookie && cookie.includes('laytime_auth_token=');
    report(res.status === 200 && hasToken && data.user?.role, `Login as ${r.role} (${r.email}): HTTP 200 with JWT cookie`);
  }

  // 2. Test Invalid Email (400) and Invalid Credentials (401)
  console.log('\n--- 2. Input Validation & Authentication Error Handling ---');
  const badEmailRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'invalid-email-format', password: 'AnyPassword123' })
  });
  report(badEmailRes.status === 400, `Malformed email returns HTTP 400 (got ${badEmailRes.status})`);

  const badPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@laytime.io', password: 'WrongPassword@123' })
  });
  report(badPassRes.status === 401, `Invalid credentials returns HTTP 401 (got ${badPassRes.status})`);

  // 3. Test Logout Cache-Control & Cookie clearing
  console.log('\n--- 3. Session Logout & Cache Headers ---');
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, { method: 'POST' });
  const logoutCc = logoutRes.headers.get('cache-control');
  const logoutCookie = logoutRes.headers.get('set-cookie');
  report(logoutRes.status === 200, `Logout returns HTTP 200`);
  report(logoutCc && logoutCc.includes('no-store'), `Logout sets Cache-Control: no-store (got "${logoutCc}")`);
  report(logoutCookie && logoutCookie.includes('Max-Age=0'), `Logout clears JWT cookie (Max-Age=0)`);

  // 4. Test Unauthenticated Protected Route Redirect
  console.log('\n--- 4. Unauthenticated Access Protection ---');
  const unauthDash = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
  const redirLocation = unauthDash.headers.get('location');
  report(
    unauthDash.status === 307 && redirLocation && redirLocation.includes('/login'),
    `Unauthenticated /dashboard redirects to /login (HTTP ${unauthDash.status}, location: ${redirLocation})`
  );

  // 5. Login as Supervisor for protected module inspection
  const supLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'supervisor@laytime.io', password: 'Super@123' })
  });
  const supCookie = supLogin.headers.get('set-cookie');
  const supToken = supCookie.match(/laytime_auth_token=([^;]+)/)[1];
  const authHeaders = { Cookie: `laytime_auth_token=${supToken}`, 'Content-Type': 'application/json' };

  // 6. Test Benchmark Claim CLM-0001
  console.log('\n--- 5. Deterministic Laytime Engine Benchmark (CLM-0001) ---');
  const clm1Res = await fetch(`${BASE_URL}/api/claims/CLM-0001/calculations`, { headers: authHeaders });
  const clm1Data = await clm1Res.json();
  const c = clm1Data.calculations || clm1Data.calculation;
  report(
    clm1Res.status === 200 && c && c.total_gross_minutes === 5760,
    `CLM-0001 Gross Laytime Elapsed: 96h 00m (5,760 minutes) (got ${c?.total_gross_minutes}m)`
  );
  report(
    c && c.total_deductions_minutes === 720,
    `CLM-0001 Documented Deductions: 12h 00m (720 minutes: 6h rain + 6h shifting) (got ${c?.total_deductions_minutes}m)`
  );
  report(
    c && c.total_net_laytime_minutes === 5040,
    `CLM-0001 Net Laytime Used: 84h 00m (5,040 minutes) (got ${c?.total_net_laytime_minutes}m)`
  );
  report(
    c && c.total_allowed_minutes === 4320,
    `CLM-0001 Allowed Laytime: 72h 00m (4,320 minutes) (got ${c?.total_allowed_minutes}m)`
  );
  report(
    c && c.net_demurrage_minutes === 720,
    `CLM-0001 Excess Laytime: 12h 00m (720 minutes = 0.50 days) (got ${c?.net_demurrage_minutes}m)`
  );
  report(
    c && c.final_payable_amount === 10000,
    `CLM-0001 Demurrage Payable: exactly $10,000.00 @ $20k/day (got $${c?.final_payable_amount})`
  );

  // 7. Test RAC Cases
  console.log('\n--- 6. RAC Module & 6-State Lifecycle ---');
  const racRes = await fetch(`${BASE_URL}/api/rac/cases`, { headers: authHeaders });
  const racData = await racRes.json();
  const racCases = racData.cases || [];
  const hasRac1 = racCases.some(r => r.id === 'RAC-0001' && r.status === 'Draft');
  const hasRac2 = racCases.some(r => r.id === 'RAC-0002' && r.status === 'Under Review');
  const hasRac3 = racCases.some(r => r.id === 'RAC-0003' && r.status === 'Reviewed');
  const hasRac4 = racCases.some(r => r.id === 'RAC-0004' && r.status === 'Closed');
  report(hasRac1 && hasRac2 && hasRac3 && hasRac4, `RAC benchmark cases present across lifecycle states: Draft, Under Review, Reviewed, Closed`);

  // 8. Test Grounded Maritime RAG AI Assistant
  console.log('\n--- 7. Grounded Maritime RAG AI Assistant ---');
  const aiGrounded = await fetch(`${BASE_URL}/api/ai-assistant`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ prompt: 'What is the demurrage payable for CLM-0001?' })
  });
  const aiGroundedData = await aiGrounded.json();
  const groundedPass =
    aiGroundedData.answer &&
    aiGroundedData.answer.includes('$10,000') &&
    aiGroundedData.citation &&
    aiGroundedData.citation.includes('CLM-0001');
  report(groundedPass, `Query 'What is the demurrage payable for CLM-0001?' cites stored DB row and $10,000.00 payable`);

  const aiOutOfScope = await fetch(`${BASE_URL}/api/ai-assistant`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ prompt: 'What is the fuel consumption of an Airbus A380?' })
  });
  const aiOosData = await aiOutOfScope.json();
  const oosPass = aiOosData.answer === 'Insufficient information available in the provided claim documents.';
  report(oosPass, `Out-of-scope query strictly returns: "Insufficient information available in the provided claim documents."`);

  console.log('\n================================================================');
  console.log(`   ACADEMIC DEMO TEST RESULTS: ${passes} PASSED / ${fails} FAILED `);
  console.log('================================================================\n');

  if (fails > 0) process.exit(1);
}

runDemoChecks().catch((err) => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
