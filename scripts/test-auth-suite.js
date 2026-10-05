const BASE_URL = "http://localhost:3000";

async function runTestSuite() {
  console.log("=========================================================");
  console.log("     AUTOMATED AUTHENTICATION & ACCESS CONTROL TEST SUITE");
  console.log("=========================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${message}`);
    }
  }

  // Extract set-cookie token
  function extractAuthCookie(res) {
    const rawCookie = res.headers.get("set-cookie");
    if (!rawCookie) return null;
    const match = rawCookie.match(/laytime_auth_token=([^;]+)/);
    return match ? match[1] : null;
  }

  // TEST 1: Protected Routes Without Login
  console.log("--- 1. Testing Protected Routes Without Login ---");
  {
    const res = await fetch(`${BASE_URL}/dashboard`, { redirect: "manual" });
    assert(
      res.status === 307 || res.status === 302,
      `Unauthenticated /dashboard redirects (status ${res.status})`
    );
    const location = res.headers.get("location") || "";
    assert(
      location.includes("/login"),
      `Redirect target includes /login: ${location}`
    );
  }

  {
    const res = await fetch(`${BASE_URL}/claims`, { redirect: "manual" });
    assert(
      res.status === 307 || res.status === 302,
      `Unauthenticated /claims redirects (status ${res.status})`
    );
  }

  {
    const res = await fetch(`${BASE_URL}/timebar`, { redirect: "manual" });
    assert(
      res.status === 307 || res.status === 302,
      `Unauthenticated /timebar redirects (status ${res.status})`
    );
  }

  {
    const res = await fetch(`${BASE_URL}/users`, { redirect: "manual" });
    assert(
      res.status === 307 || res.status === 302,
      `Unauthenticated /users redirects (status ${res.status})`
    );
  }

  {
    const res = await fetch(`${BASE_URL}/`, { redirect: "manual" });
    assert(
      res.status === 307 || res.status === 302,
      `Root / unauthenticated redirects (status ${res.status})`
    );
    const location = res.headers.get("location") || "";
    assert(location.includes("/login"), `Root redirects to /login: ${location}`);
  }

  {
    const res = await fetch(`${BASE_URL}/api/claims`);
    assert(
      res.status === 401,
      `Unauthenticated API /api/claims returns 401 (status ${res.status})`
    );
  }

  // TEST 2: Invalid Email & Missing Input
  console.log("\n--- 2. Testing Invalid Email & Missing Input ---");
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid-email-string", password: "Raj@123" })
    });
    const data = await res.json();
    assert(res.status === 400, `Malformed email returns 400 (status ${res.status})`);
    assert(
      data.error.includes("valid corporate email"),
      `Validation message received: "${data.error}"`
    );
  }

  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "", password: "" })
    });
    assert(res.status === 400, `Empty credentials returns 400 (status ${res.status})`);
  }

  // TEST 3: Incorrect Password & Non-existent User
  console.log("\n--- 3. Testing Incorrect Password & Non-existent User ---");
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "rajvardhanwadkar76@gmail.com", password: "WrongPassword999" })
    });
    const data = await res.json();
    assert(res.status === 401, `Wrong password returns 401 (status ${res.status})`);
    assert(
      data.error === "Invalid email or password",
      `Safe error message received: "${data.error}"`
    );
  }

  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nonexistent.user@laytime.com", password: "SomePassword123" })
    });
    assert(res.status === 401, `Non-existent user returns 401 (status ${res.status})`);
  }

  // TEST 4: Account 1 - Admin (rajvardhanwadkar76@gmail.com / Raj@123)
  console.log("\n--- 4. Testing Admin Account ---");
  let adminToken = null;
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "rajvardhanwadkar76@gmail.com", password: "Raj@123" })
    });
    const data = await res.json();
    assert(res.status === 200 && data.success, "Admin login successful");
    assert(data.user.role === "Admin", `Admin role verified: ${data.user.role}`);
    assert(!data.user.password_hash, "Admin response does NOT expose password_hash");
    adminToken = extractAuthCookie(res);
    assert(!!adminToken, "Admin session cookie (laytime_auth_token) received");
  }

  if (adminToken) {
    // Check /api/auth/me
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `laytime_auth_token=${adminToken}` }
    });
    const meData = await meRes.json();
    assert(meRes.status === 200 && meData.authenticated, "Admin /api/auth/me authenticated");
    assert(meData.user.email === "rajvardhanwadkar76@gmail.com", "Admin email in session verified");

    // Check Admin access to /users route
    const usersPageRes = await fetch(`${BASE_URL}/users`, {
      headers: { Cookie: `laytime_auth_token=${adminToken}` },
      redirect: "manual"
    });
    assert(
      usersPageRes.status === 200,
      `Admin can access /users route (status ${usersPageRes.status})`
    );

    // Check Admin access to /api/users
    const usersApiRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { Cookie: `laytime_auth_token=${adminToken}` }
    });
    const usersApiData = await usersApiRes.json();
    assert(usersApiRes.status === 200 && Array.isArray(usersApiData.users), "Admin can access /api/users API");
  }

  // TEST 5: Account 2 - Claim Processor (rohitmengane2975@gmail.com / Rohit@123)
  console.log("\n--- 5. Testing Claim Processor Account ---");
  let processorToken = null;
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "rohitmengane2975@gmail.com", password: "Rohit@123" })
    });
    const data = await res.json();
    assert(res.status === 200 && data.success, "Claim Processor login successful");
    assert(data.user.role === "Claim Processor", `Processor role verified: ${data.user.role}`);
    processorToken = extractAuthCookie(res);
  }

  if (processorToken) {
    // Non-Admin blocked from /users in middleware
    const usersPageRes = await fetch(`${BASE_URL}/users`, {
      headers: { Cookie: `laytime_auth_token=${processorToken}` },
      redirect: "manual"
    });
    assert(
      usersPageRes.status === 307 || usersPageRes.status === 302,
      `Processor blocked from /users by middleware (status ${usersPageRes.status})`
    );
    const location = usersPageRes.headers.get("location") || "";
    assert(location.includes("/dashboard"), `Processor redirected to /dashboard: ${location}`);

    // Non-Admin blocked from /api/users API
    const usersApiRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { Cookie: `laytime_auth_token=${processorToken}` }
    });
    assert(
      usersApiRes.status === 403,
      `Processor blocked from /api/users API (status ${usersApiRes.status})`
    );

    // Processor can edit assigned claim
    const editAssignedRes = await fetch(`${BASE_URL}/api/claims/CLM-2024-001`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${processorToken}`
      },
      body: JSON.stringify({ claimNotes: "Processor updated notes verified" })
    });
    assert(
      editAssignedRes.status === 200,
      `Processor can edit assigned claim CLM-2024-001 (status ${editAssignedRes.status})`
    );

    // Processor cannot edit unassigned claim
    const editUnassignedRes = await fetch(`${BASE_URL}/api/claims/CLM-2024-003`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${processorToken}`
      },
      body: JSON.stringify({ claimNotes: "Attempt unauthorized edit" })
    });
    assert(
      editUnassignedRes.status === 403,
      `Processor forbidden from editing unassigned claim CLM-2024-003 (status ${editUnassignedRes.status})`
    );
  }

  // TEST 6: Account 3 - Supervisor (swayamghatage3839@gmail.com / Swayam@123)
  console.log("\n--- 6. Testing Supervisor Account ---");
  let supervisorToken = null;
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "swayamghatage3839@gmail.com", password: "Swayam@123" })
    });
    const data = await res.json();
    assert(res.status === 200 && data.success, "Supervisor login successful");
    assert(data.user.role === "Supervisor", `Supervisor role verified: ${data.user.role}`);
    supervisorToken = extractAuthCookie(res);
  }

  if (supervisorToken) {
    // Supervisor blocked from /users
    const usersPageRes = await fetch(`${BASE_URL}/users`, {
      headers: { Cookie: `laytime_auth_token=${supervisorToken}` },
      redirect: "manual"
    });
    assert(
      usersPageRes.status === 307 || usersPageRes.status === 302,
      `Supervisor blocked from /users by middleware (status ${usersPageRes.status})`
    );

    // Supervisor can manage any claim
    const editRes = await fetch(`${BASE_URL}/api/claims/CLM-2024-003`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${supervisorToken}`
      },
      body: JSON.stringify({ claimNotes: "Supervisor authorized adjustment" })
    });
    assert(
      editRes.status === 200,
      `Supervisor can manage any claim CLM-2024-003 (status ${editRes.status})`
    );
  }

  // TEST 7: Account 4 - Reviewer (paraschougale558@gmail.com / Paras@123)
  console.log("\n--- 7. Testing Reviewer Account (Strictly Read-Only) ---");
  let reviewerToken = null;
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "paraschougale558@gmail.com", password: "Paras@123" })
    });
    const data = await res.json();
    assert(res.status === 200 && data.success, "Reviewer login successful");
    assert(data.user.role === "Reviewer", `Reviewer role verified: ${data.user.role}`);
    reviewerToken = extractAuthCookie(res);
  }

  if (reviewerToken) {
    // Reviewer can view claims
    const getClaimsRes = await fetch(`${BASE_URL}/api/claims`, {
      headers: { Cookie: `laytime_auth_token=${reviewerToken}` }
    });
    assert(getClaimsRes.status === 200, `Reviewer can read claims list (status ${getClaimsRes.status})`);

    // Reviewer cannot create claims
    const createRes = await fetch(`${BASE_URL}/api/claims`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${reviewerToken}`
      },
      body: JSON.stringify({ claimName: "Unauthorized Test Claim" })
    });
    assert(
      createRes.status === 403,
      `Reviewer forbidden from creating claims (status ${createRes.status})`
    );

    // Reviewer cannot edit claims
    const editRes = await fetch(`${BASE_URL}/api/claims/CLM-2024-001`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${reviewerToken}`
      },
      body: JSON.stringify({ claimNotes: "Reviewer edit attempt" })
    });
    assert(
      editRes.status === 403,
      `Reviewer forbidden from editing claims (status ${editRes.status})`
    );

    // Reviewer cannot delete claims
    const delRes = await fetch(`${BASE_URL}/api/claims/CLM-2024-001`, {
      method: "DELETE",
      headers: { Cookie: `laytime_auth_token=${reviewerToken}` }
    });
    assert(
      delRes.status === 403,
      `Reviewer forbidden from deleting claims (status ${delRes.status})`
    );

    // Reviewer cannot access /users
    const usersRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { Cookie: `laytime_auth_token=${reviewerToken}` }
    });
    assert(
      usersRes.status === 403,
      `Reviewer forbidden from user management API (status ${usersRes.status})`
    );
  }

  // TEST 8: Logout & Post-Logout Access
  console.log("\n--- 8. Testing Logout & Post-Logout Access ---");
  {
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: `laytime_auth_token=${adminToken}` }
    });
    assert(logoutRes.status === 200, "Logout API succeeded");
    const rawCookie = logoutRes.headers.get("set-cookie") || "";
    assert(
      rawCookie.includes("Max-Age=0") || rawCookie.includes("expires=Thu, 01 Jan 1970"),
      "Logout invalidated the session cookie"
    );

    // Verify /api/auth/me rejects after logout
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `laytime_auth_token=` }
    });
    assert(
      meRes.status === 401,
      `Post-logout /api/auth/me returns 401 Unauthorized (status ${meRes.status})`
    );

    // Verify /dashboard redirects to /login post-logout
    const dashRes = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: `laytime_auth_token=` },
      redirect: "manual"
    });
    assert(
      dashRes.status === 307 || dashRes.status === 302,
      `Post-logout /dashboard redirects to /login (status ${dashRes.status})`
    );
  }

  console.log("\n=========================================================");
  console.log(`TEST SUITE RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("=========================================================");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution encountered an error:", err);
  process.exit(1);
});
