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
    assert(data.user.role === "Admin" || data.user.role === "ADMIN", `Admin role verified: ${data.user.role}`);
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
    assert(data.user.role === "Claim Processor" || data.user.role === "CLAIM_PROCESSOR", `Processor role verified: ${data.user.role}`);
    processorToken = extractAuthCookie(res);
  }

  if (processorToken) {
    // Processor blocked from /settings by middleware
    const settingsPageRes = await fetch(`${BASE_URL}/settings`, {
      headers: { Cookie: `laytime_auth_token=${processorToken}` },
      redirect: "manual"
    });
    assert(
      settingsPageRes.status === 307 || settingsPageRes.status === 302,
      `Processor blocked from /settings by middleware (status ${settingsPageRes.status})`
    );
    const location = settingsPageRes.headers.get("location") || "";
    assert(location.includes("/dashboard"), `Processor redirected to /dashboard: ${location}`);

    // Processor allowed on /api/users for subtree
    const usersApiRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { Cookie: `laytime_auth_token=${processorToken}` }
    });
    assert(
      usersApiRes.status === 200,
      `Processor allowed on /api/users for subtree (status ${usersApiRes.status})`
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
    assert(data.user.role === "Supervisor" || data.user.role === "SUPERVISOR", `Supervisor role verified: ${data.user.role}`);
    supervisorToken = extractAuthCookie(res);
  }

  if (supervisorToken) {
    // Supervisor can access /users
    const usersPageRes = await fetch(`${BASE_URL}/users`, {
      headers: { Cookie: `laytime_auth_token=${supervisorToken}` },
      redirect: "manual"
    });
    assert(
      usersPageRes.status === 200,
      `Supervisor can access /users by middleware (status ${usersPageRes.status})`
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
    assert(data.user.role === "Reviewer" || data.user.role === "REVIEWER_CLIENT", `Reviewer role verified: ${data.user.role}`);
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

  // =========================================================================
  // TEST 9: EXTENDED ENTERPRISE AUTHORIZATION & ROW-LEVEL ISOLATION SUITE
  // =========================================================================
  console.log("\n--- 9. Extended Enterprise Authorization & Row-Level Isolation ---");

  async function loginAs(email, password) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    const token = extractAuthCookie(res);
    return { res, data, token };
  }

  // Re-authenticate test actors
  const adminActor = await loginAs("rajvardhanwadkar76@gmail.com", "Raj@123");
  const supervisorActor = await loginAs("swayamghatage3839@gmail.com", "Swayam@123");
  const processorActor = await loginAs("rohitmengane2975@gmail.com", "Rohit@123");
  const reviewerActor = await loginAs("paraschougale558@gmail.com", "Paras@123");
  const clientActor = await loginAs("client@trafigura.com", "Client@123");

  // 9.1 HIERARCHICAL USER CREATION & CREATE_MATRIX ENFORCEMENT
  console.log("\n--- 9.1 Testing Hierarchical User Creation (CREATE_MATRIX) ---");
  {
    const rand = Date.now();

    // Admin -> Reviewer (ALLOWED)
    const adminCreateReviewer = await fetch(`${BASE_URL}/api/users/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${adminActor.token}`
      },
      body: JSON.stringify({
        name: `Subtree Reviewer ${rand}`,
        email: `rev.${rand}@laytime.com`,
        role: "Reviewer"
      })
    });
    assert(
      adminCreateReviewer.status === 201,
      `Admin can create Reviewer per CREATE_MATRIX (status ${adminCreateReviewer.status})`
    );

    // Admin -> Claim Processor (FORBIDDEN per CREATE_MATRIX)
    const adminCreateProcessor = await fetch(`${BASE_URL}/api/users/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${adminActor.token}`
      },
      body: JSON.stringify({
        name: `Illegal Processor ${rand}`,
        email: `illegal.proc.${rand}@laytime.com`,
        role: "Claim Processor"
      })
    });
    assert(
      adminCreateProcessor.status === 403,
      `Admin blocked from creating Claim Processor out-of-hierarchy (status ${adminCreateProcessor.status})`
    );

    // Supervisor -> Claim Processor (ALLOWED)
    const supCreateProcessor = await fetch(`${BASE_URL}/api/users/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${supervisorActor.token}`
      },
      body: JSON.stringify({
        name: `Subtree Processor ${rand}`,
        email: `proc.${rand}@laytime.com`,
        role: "Claim Processor"
      })
    });
    assert(
      supCreateProcessor.status === 201,
      `Supervisor can create Claim Processor per CREATE_MATRIX (status ${supCreateProcessor.status})`
    );

    // Supervisor -> Client (FORBIDDEN per CREATE_MATRIX)
    const supCreateClient = await fetch(`${BASE_URL}/api/users/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${supervisorActor.token}`
      },
      body: JSON.stringify({
        name: `Illegal Client ${rand}`,
        email: `illegal.client.${rand}@laytime.com`,
        role: "Client",
        clientId: "client-trafigura"
      })
    });
    assert(
      supCreateClient.status === 403,
      `Supervisor blocked from creating Client out-of-hierarchy (status ${supCreateClient.status})`
    );

    // Claim Processor -> Client (ALLOWED)
    const procCreateClient = await fetch(`${BASE_URL}/api/users/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${processorActor.token}`
      },
      body: JSON.stringify({
        name: `Subtree Client ${rand}`,
        email: `client.${rand}@trafigura.com`,
        role: "Client",
        clientId: "client-trafigura",
        clientName: "Trafigura"
      })
    });
    assert(
      procCreateClient.status === 201,
      `Claim Processor can create Client per CREATE_MATRIX (status ${procCreateClient.status})`
    );

    // Claim Processor -> Supervisor (FORBIDDEN per CREATE_MATRIX)
    const procCreateSupervisor = await fetch(`${BASE_URL}/api/users/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${processorActor.token}`
      },
      body: JSON.stringify({
        name: `Illegal Supervisor ${rand}`,
        email: `illegal.sup.${rand}@laytime.com`,
        role: "Supervisor"
      })
    });
    assert(
      procCreateSupervisor.status === 403,
      `Claim Processor blocked from creating Supervisor out-of-hierarchy (status ${procCreateSupervisor.status})`
    );

    // Reviewer -> Any User (FORBIDDEN)
    const revCreateUser = await fetch(`${BASE_URL}/api/users/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${reviewerActor.token}`
      },
      body: JSON.stringify({
        name: `Illegal Reviewer Sub ${rand}`,
        email: `rev.sub.${rand}@laytime.com`,
        role: "Reviewer"
      })
    });
    assert(
      revCreateUser.status === 403,
      `Reviewer forbidden from creating users (status ${revCreateUser.status})`
    );

    // Client -> Any User (FORBIDDEN)
    const cliCreateUser = await fetch(`${BASE_URL}/api/users/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${clientActor.token}`
      },
      body: JSON.stringify({
        name: `Illegal Client Sub ${rand}`,
        email: `cli.sub.${rand}@laytime.com`,
        role: "Client"
      })
    });
    assert(
      cliCreateUser.status === 403,
      `Client forbidden from creating users (status ${cliCreateUser.status})`
    );
  }

  // 9.2 SUBTREE ISOLATION & SELF-PROTECTION GUARDS
  console.log("\n--- 9.2 Testing Subtree Isolation & Self-Protection ---");
  {
    // Processor cannot update Supervisor (outside actor subtree)
    const procUpdateSupervisor = await fetch(`${BASE_URL}/api/users/usr-003`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${processorActor.token}`
      },
      body: JSON.stringify({ name: "Attempt Subtree Breach" })
    });
    assert(
      procUpdateSupervisor.status === 403,
      `Processor forbidden from updating user outside actor subtree (status ${procUpdateSupervisor.status})`
    );

    // Processor cannot deactivate Supervisor (outside actor subtree)
    const procDeactivateSupervisor = await fetch(`${BASE_URL}/api/users/usr-003`, {
      method: "DELETE",
      headers: { Cookie: `laytime_auth_token=${processorActor.token}` }
    });
    assert(
      procDeactivateSupervisor.status === 403,
      `Processor forbidden from deactivating user outside actor subtree (status ${procDeactivateSupervisor.status})`
    );

    // Admin cannot self-deactivate
    const adminSelfDeactivate = await fetch(`${BASE_URL}/api/users/usr-001`, {
      method: "DELETE",
      headers: { Cookie: `laytime_auth_token=${adminActor.token}` }
    });
    assert(
      adminSelfDeactivate.status === 403,
      `Self-deactivation safely blocked (status ${adminSelfDeactivate.status})`
    );
  }

  // 9.3 ROW-LEVEL DATA ISOLATION (PROCESSOR & CLIENT)
  console.log("\n--- 9.3 Testing Row-Level Data Isolation ---");
  {
    // Processor reading assigned claim -> 200
    const procAssigned = await fetch(`${BASE_URL}/api/claims/CLM-2024-001`, {
      headers: { Cookie: `laytime_auth_token=${processorActor.token}` }
    });
    assert(
      procAssigned.status === 200,
      `Processor can read assigned claim CLM-2024-001 (status ${procAssigned.status})`
    );

    // Processor reading unassigned claim -> 404 (outside user's scope)
    const procUnassigned = await fetch(`${BASE_URL}/api/claims/CLM-2024-003`, {
      headers: { Cookie: `laytime_auth_token=${processorActor.token}` }
    });
    assert(
      procUnassigned.status === 404,
      `Processor reading unassigned claim returns 404 (status ${procUnassigned.status})`
    );

    // Client reading own claim -> 200
    const clientOwn = await fetch(`${BASE_URL}/api/claims/CLM-2024-001`, {
      headers: { Cookie: `laytime_auth_token=${clientActor.token}` }
    });
    assert(
      clientOwn.status === 200,
      `Client can read own claim CLM-2024-001 (status ${clientOwn.status})`
    );
    const clientOwnData = await clientOwn.json();
    const claimKeys = Object.keys(clientOwnData.claim || {});
    const isRestrictedDto =
      claimKeys.includes("claimReference") &&
      claimKeys.includes("totalDemurrageClaimed") &&
      !claimKeys.includes("contentions") &&
      !claimKeys.includes("calculations") &&
      !claimKeys.includes("ports");
    assert(
      isRestrictedDto,
      "Client receives restricted DTO with no calculations, SoF, or internal contentions"
    );

    // Client reading other client's claim -> 404
    const clientOther = await fetch(`${BASE_URL}/api/claims/CLM-2024-002`, {
      headers: { Cookie: `laytime_auth_token=${clientActor.token}` }
    });
    assert(
      clientOther.status === 404,
      `Client reading other client claim CLM-2024-002 returns 404 (status ${clientOther.status})`
    );
  }

  // 9.4 CLIENT PROTECTED FEATURE RESTRICTIONS (403)
  console.log("\n--- 9.4 Testing Client Protected Feature Restrictions ---");
  {
    // Client blocked from Calculations endpoint -> 403
    const cliCalcRes = await fetch(`${BASE_URL}/api/claims/CLM-2024-001/calculations`, {
      headers: { Cookie: `laytime_auth_token=${clientActor.token}` }
    });
    assert(
      cliCalcRes.status === 403,
      `Client forbidden from calculation endpoints (status ${cliCalcRes.status})`
    );

    // Client blocked from SoF endpoint -> 403
    const cliSofRes = await fetch(`${BASE_URL}/api/claims/CLM-2024-001/sof`, {
      headers: { Cookie: `laytime_auth_token=${clientActor.token}` }
    });
    assert(
      cliSofRes.status === 403,
      `Client forbidden from SoF endpoints (status ${cliSofRes.status})`
    );

    // Client blocked from Override endpoint -> 403
    const cliOverrideRes = await fetch(`${BASE_URL}/api/claims/CLM-2024-001/override`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${clientActor.token}`
      },
      body: JSON.stringify({ overrideAmount: 15000, reason: "Unauthorized attempt" })
    });
    assert(
      cliOverrideRes.status === 403,
      `Client forbidden from override endpoint (status ${cliOverrideRes.status})`
    );

    // Client blocked from RAC endpoint -> 403
    const cliRacRes = await fetch(`${BASE_URL}/api/rac`, {
      headers: { Cookie: `laytime_auth_token=${clientActor.token}` }
    });
    assert(
      cliRacRes.status === 403,
      `Client forbidden from RAC endpoint (status ${cliRacRes.status})`
    );
  }

  // 9.5 TOKEN VERSION REVOCATION & ACCOUNT DEACTIVATION
  console.log("\n--- 9.5 Testing Token Version Revocation & Deactivation ---");
  {
    const rand = Date.now();
    const tempUserEmail = `session.revocation.${rand}@laytime.com`;

    // Supervisor creates temporary user
    const createRes = await fetch(`${BASE_URL}/api/users/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${supervisorActor.token}`
      },
      body: JSON.stringify({
        name: `Revocation Test User ${rand}`,
        email: tempUserEmail,
        role: "Claim Processor",
        password: "TempPassword@123"
      })
    });
    const createData = await createRes.json();
    const tempUserId = createData.user?.id;

    // Log in as temporary user
    const tempLogin = await loginAs(tempUserEmail, "TempPassword@123");
    assert(tempLogin.res.status === 200, "Temporary user login successful");

    // Verify session works before revocation
    const activeMe = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `laytime_auth_token=${tempLogin.token}` }
    });
    assert(activeMe.status === 200, "Active session verified before revocation");

    // Deactivate temporary user account
    const deactRes = await fetch(`${BASE_URL}/api/users/${tempUserId}`, {
      method: "DELETE",
      headers: { Cookie: `laytime_auth_token=${supervisorActor.token}` }
    });
    assert(deactRes.status === 200, "Temporary user deactivated successfully");

    // Next request with existing token is rejected immediately
    const revokedMe = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `laytime_auth_token=${tempLogin.token}` }
    });
    assert(
      revokedMe.status === 403 || revokedMe.status === 401,
      `Deactivated account rejected on next request (status ${revokedMe.status})`
    );
  }

  // 9.6 CLIENT NEGOTIATIONS LIFECYCLE & IMMUTABILITY
  console.log("\n--- 9.6 Testing Client Negotiations Lifecycle & Immutability ---");
  {
    // Client posts text message -> 201
    const postText = await fetch(`${BASE_URL}/api/claims/CLM-2024-001/negotiations/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${clientActor.token}`
      },
      body: JSON.stringify({
        messageType: "text",
        content: "Automated negotiation message verification"
      })
    });
    assert(
      postText.status === 201,
      `Client can post negotiation text message (status ${postText.status})`
    );

    // Attempt PUT/DELETE on negotiation messages -> 405 Method Not Allowed (Append-only)
    const putMsg = await fetch(`${BASE_URL}/api/claims/CLM-2024-001/negotiations/messages`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${clientActor.token}`
      },
      body: JSON.stringify({ content: "Edit attempt" })
    });
    assert(
      putMsg.status === 405,
      `Negotiation messages are append-only: PUT returns 405 (status ${putMsg.status})`
    );

    const delMsg = await fetch(`${BASE_URL}/api/claims/CLM-2024-001/negotiations/messages`, {
      method: "DELETE",
      headers: { Cookie: `laytime_auth_token=${clientActor.token}` }
    });
    assert(
      delMsg.status === 405,
      `Negotiation messages are append-only: DELETE returns 405 (status ${delMsg.status})`
    );

    // Client posts counter_offer -> 201 with status "Pending"
    const postOffer = await fetch(`${BASE_URL}/api/claims/CLM-2024-001/negotiations/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${clientActor.token}`
      },
      body: JSON.stringify({
        messageType: "counter_offer",
        content: "Proposed settlement offer",
        counterOfferAmount: 22000
      })
    });
    const offerData = await postOffer.json();
    assert(
      postOffer.status === 201 && offerData.message?.counterOfferStatus === "Pending",
      `Client counter-offer posted with Pending status (status ${postOffer.status})`
    );
    const counterOfferMsgId = offerData.message?.id;

    // Processor accepts counter_offer -> 200 (creates proposed agreed amount)
    const procAccept = await fetch(`${BASE_URL}/api/claims/CLM-2024-001/negotiations/respond`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${processorActor.token}`
      },
      body: JSON.stringify({
        messageId: counterOfferMsgId,
        decision: "Accepted"
      })
    });
    const acceptData = await procAccept.json();
    assert(
      procAccept.status === 200 && acceptData.thread?.proposedAgreedAmount === 22000,
      `Processor acceptance sets proposed agreed amount to 22000 (status ${procAccept.status})`
    );

    // Supervisor confirms settlement -> 200 (commits to claims.agreed_amount)
    const supConfirm = await fetch(`${BASE_URL}/api/claims/CLM-2024-001/negotiations/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${supervisorActor.token}`
      }
    });
    assert(
      supConfirm.status === 200,
      `Supervisor confirms negotiation settlement (status ${supConfirm.status})`
    );

    // Verify claim agreed_amount reflects confirmed settlement
    const verifiedClaimRes = await fetch(`${BASE_URL}/api/claims/CLM-2024-001`, {
      headers: { Cookie: `laytime_auth_token=${supervisorActor.token}` }
    });
    const verifiedClaimData = await verifiedClaimRes.json();
    assert(
      verifiedClaimData.claim?.agreedAmount === 22000,
      `Confirmed settlement updated claims.agreed_amount to 22000: ${verifiedClaimData.claim?.agreedAmount}`
    );
  }

  // 9.7 ZOD VALIDATION & SQL INJECTION RESILIENCE
  console.log("\n--- 9.7 Testing Zod Validation & SQL Injection Resilience ---");
  {
    // Zod rejects malformed email
    const malformedUser = await fetch(`${BASE_URL}/api/users/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${supervisorActor.token}`
      },
      body: JSON.stringify({
        name: "Test",
        email: "not-an-email",
        role: "Claim Processor"
      })
    });
    assert(
      malformedUser.status === 400,
      `Zod rejects malformed email in user creation (status ${malformedUser.status})`
    );

    // Zod rejects oversized negotiation message (>2000 chars)
    const oversizedContent = "A".repeat(2005);
    const oversizedMsg = await fetch(`${BASE_URL}/api/claims/CLM-2024-001/negotiations/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${clientActor.token}`
      },
      body: JSON.stringify({
        messageType: "text",
        content: oversizedContent
      })
    });
    assert(
      oversizedMsg.status === 400,
      `Zod rejects oversized message payload >2000 chars (status ${oversizedMsg.status})`
    );

    // Zod rejects negative counter-offer amount
    const negativeOffer = await fetch(`${BASE_URL}/api/claims/CLM-2024-001/negotiations/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${clientActor.token}`
      },
      body: JSON.stringify({
        messageType: "counter_offer",
        content: "Negative offer test",
        counterOfferAmount: -500
      })
    });
    assert(
      negativeOffer.status === 400,
      `Zod rejects negative counter-offer amount (status ${negativeOffer.status})`
    );

    // SQL Injection attack attempt in parameterized endpoint returns 404 safely
    const sqliRes = await fetch(`${BASE_URL}/api/claims/CLM-2024-001' OR '1'='1`, {
      headers: { Cookie: `laytime_auth_token=${clientActor.token}` }
    });
    assert(
      sqliRes.status === 404,
      `SQL injection attempt safely neutralized by parameterization (status ${sqliRes.status})`
    );
  }

  // 9.8 COMPREHENSIVE REVIEWER STRICTLY READ-ONLY ACCESS & PROHIBITION MATRIX
  console.log("\n--- 9.8 Testing Reviewer Strictly Read-Only Permissions & Prohibitions Matrix ---");
  {
    // Reviewer login
    const revLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "paraschougale558@gmail.com", password: "Paras@123" })
    });
    const revToken = extractAuthCookie(revLoginRes);
    const revHeaders = { Cookie: `laytime_auth_token=${revToken}` };
    const revJsonHeaders = {
      "Content-Type": "application/json",
      Cookie: `laytime_auth_token=${revToken}`
    };

    // --- WHAT THE REVIEWER CAN DO (READ ONLY) ---
    // 1. View claims, claim list, claim details and status
    const revClaims = await fetch(`${BASE_URL}/api/claims`, { headers: revHeaders });
    assert(revClaims.status === 200, `Reviewer can view claims list (status ${revClaims.status})`);
    const revClaim = await fetch(`${BASE_URL}/api/claims/CLM-2024-001`, { headers: revHeaders });
    assert(revClaim.status === 200, `Reviewer can view claim details and status (status ${revClaim.status})`);

    // 2. View Statement of Facts (SoF), ports and berths
    const revSof = await fetch(`${BASE_URL}/api/claims/CLM-2024-001/sof`, { headers: revHeaders });
    assert(revSof.status === 200, `Reviewer can view Statement of Facts, ports and berths (status ${revSof.status})`);

    // 3. View documents and preview/download them
    const revDocs = await fetch(`${BASE_URL}/api/documents`, { headers: revHeaders });
    assert(revDocs.status === 200, `Reviewer can view documents list (status ${revDocs.status})`);
    const revDocItem = await fetch(`${BASE_URL}/api/documents/doc-101`, { headers: revHeaders });
    assert(revDocItem.status === 200, `Reviewer can preview/inspect document (status ${revDocItem.status})`);

    // 4. View saved laytime calculation results and summaries (read stored results only)
    const revCalc = await fetch(`${BASE_URL}/api/claims/CLM-2024-001/calculations`, { headers: revHeaders });
    assert(revCalc.status === 200, `Reviewer can view saved laytime calculation results (status ${revCalc.status})`);
    const revOilChem = await fetch(`${BASE_URL}/api/oil-chem`, { headers: revHeaders });
    assert(revOilChem.status === 200, `Reviewer can view saved oil/chem calculation summaries (status ${revOilChem.status})`);

    // 5. View RAC findings and their status
    const revRacCases = await fetch(`${BASE_URL}/api/rac/cases`, { headers: revHeaders });
    assert(revRacCases.status === 200, `Reviewer can view RAC cases and findings (status ${revRacCases.status})`);
    const revRacCase = await fetch(`${BASE_URL}/api/rac/cases/RAC-2024-001`, { headers: revHeaders });
    assert(revRacCase.status === 200, `Reviewer can view RAC finding status (status ${revRacCase.status})`);

    // 6. View payments and invoices
    const revPayments = await fetch(`${BASE_URL}/api/payments`, { headers: revHeaders });
    assert(revPayments.status === 200, `Reviewer can view payments (status ${revPayments.status})`);
    const revInvoices = await fetch(`${BASE_URL}/api/invoices`, { headers: revHeaders });
    assert(revInvoices.status === 200, `Reviewer can view invoices (status ${revInvoices.status})`);

    // 7. View negotiation history, including minimum acceptable amount
    const revNego = await fetch(`${BASE_URL}/api/claims/CLM-2024-001/negotiations`, { headers: revHeaders });
    const revNegoData = await revNego.json();
    assert(
      revNego.status === 200 && revNegoData.roleType === "oversight",
      `Reviewer can view negotiation history in oversight mode (status ${revNego.status})`
    );

    // 8. View clients and vessels
    const revClients = await fetch(`${BASE_URL}/api/clients`, { headers: revHeaders });
    assert(revClients.status === 200, `Reviewer can view clients and vessels (status ${revClients.status})`);

    // 9. View dashboards, analytics and reports that already exist
    const revDash = await fetch(`${BASE_URL}/api/dashboard`, { headers: revHeaders });
    assert(revDash.status === 200, `Reviewer can view dashboard metrics (status ${revDash.status})`);
    const revReports = await fetch(`${BASE_URL}/api/reports`, { headers: revHeaders });
    assert(revReports.status === 200, `Reviewer can view existing reports (status ${revReports.status})`);
    const revFinReport = await fetch(`${BASE_URL}/api/reports/financial`, { headers: revHeaders });
    assert(revFinReport.status === 200, `Reviewer can view existing financial reports (status ${revFinReport.status})`);

    // --- WHAT THE REVIEWER MUST NEVER DO ---
    // 1. Never create, edit or delete Statement of Facts (SoF)
    const revPostSof = await fetch(`${BASE_URL}/api/claims/CLM-2024-001/sof`, {
      method: "POST",
      headers: revJsonHeaders,
      body: JSON.stringify({ activityName: "Unauthorized SoF Activity", startTime: "2024-07-12T10:00:00Z", stopTime: "2024-07-12T12:00:00Z" })
    });
    assert(revPostSof.status === 403, `Reviewer forbidden from creating/editing SoF (status ${revPostSof.status})`);

    // 2. Never run, recalculate, preview-calculate or override laytime calculations
    const revPostCalc = await fetch(`${BASE_URL}/api/calculations`, {
      method: "POST",
      headers: revJsonHeaders,
      body: JSON.stringify({ claimFiledAmount: 10000 })
    });
    assert(revPostCalc.status === 403, `Reviewer forbidden from executing laytime calculation (status ${revPostCalc.status})`);

    const revPostClaimCalc = await fetch(`${BASE_URL}/api/claims/CLM-2024-001/calculations`, {
      method: "POST",
      headers: revJsonHeaders
    });
    assert(revPostClaimCalc.status === 403, `Reviewer forbidden from recalculating claim laytime (status ${revPostClaimCalc.status})`);

    const revPostOverride = await fetch(`${BASE_URL}/api/claims/CLM-2024-001/override`, {
      method: "POST",
      headers: revJsonHeaders,
      body: JSON.stringify({ overriddenDemurrage: 20000, overrideReason: "Unauthorized override attempt" })
    });
    assert(revPostOverride.status === 403, `Reviewer forbidden from overriding laytime calculation (status ${revPostOverride.status})`);

    const revPostOilChem = await fetch(`${BASE_URL}/api/oil-chem`, {
      method: "POST",
      headers: revJsonHeaders,
      body: JSON.stringify({ cargoName: "Crude Oil", quantityMetricTons: 50000 })
    });
    assert(revPostOilChem.status === 403, `Reviewer forbidden from executing oil/chem calculation (status ${revPostOilChem.status})`);

    // 3. Never run RAC analysis, or resolve, ignore, authorize or close RAC findings
    const revPostRacCalc = await fetch(`${BASE_URL}/api/rac/calculations`, {
      method: "POST",
      headers: revJsonHeaders,
      body: JSON.stringify({ racCaseId: "RAC-2024-001" })
    });
    assert(revPostRacCalc.status === 403, `Reviewer forbidden from running RAC analysis (status ${revPostRacCalc.status})`);

    const revPostRacCase = await fetch(`${BASE_URL}/api/rac/cases`, {
      method: "POST",
      headers: revJsonHeaders,
      body: JSON.stringify({ title: "Unauthorized Case" })
    });
    assert(revPostRacCase.status === 403, `Reviewer forbidden from creating RAC case (status ${revPostRacCase.status})`);

    const revPutRacCase = await fetch(`${BASE_URL}/api/rac/cases/RAC-2024-001`, {
      method: "PUT",
      headers: revJsonHeaders,
      body: JSON.stringify({ status: "Closed" })
    });
    assert(revPutRacCase.status === 403, `Reviewer forbidden from updating/closing RAC case (status ${revPutRacCase.status})`);

    // 4. Never run OCR, edit or verify OCR results
    const revPostOcr = await fetch(`${BASE_URL}/api/ocr`, {
      method: "POST",
      headers: revJsonHeaders,
      body: JSON.stringify({ fileName: "test.pdf", claimId: "CLM-2024-001" })
    });
    assert(revPostOcr.status === 403, `Reviewer forbidden from executing OCR (status ${revPostOcr.status})`);

    // 5. Never upload, edit or delete documents
    const revPostDoc = await fetch(`${BASE_URL}/api/documents`, {
      method: "POST",
      headers: revJsonHeaders,
      body: JSON.stringify({ fileName: "unauthorized.pdf", claimId: "CLM-2024-001" })
    });
    assert(revPostDoc.status === 403, `Reviewer forbidden from uploading documents (status ${revPostDoc.status})`);

    const revPutDoc = await fetch(`${BASE_URL}/api/documents/doc-101`, {
      method: "PUT",
      headers: revJsonHeaders,
      body: JSON.stringify({ status: "Verified" })
    });
    assert(revPutDoc.status === 403, `Reviewer forbidden from modifying documents (status ${revPutDoc.status})`);

    const revDelDoc = await fetch(`${BASE_URL}/api/documents/doc-101`, {
      method: "DELETE",
      headers: revHeaders
    });
    assert(revDelDoc.status === 403, `Reviewer forbidden from deleting documents (status ${revDelDoc.status})`);

    // 6. Never record or edit payments, or create or edit invoices
    const revPostPay = await fetch(`${BASE_URL}/api/payments`, {
      method: "POST",
      headers: revJsonHeaders,
      body: JSON.stringify({ claimId: "CLM-2024-001", amount: 5000 })
    });
    assert(revPostPay.status === 403, `Reviewer forbidden from recording payments (status ${revPostPay.status})`);

    const revPostInv = await fetch(`${BASE_URL}/api/invoices`, {
      method: "POST",
      headers: revJsonHeaders,
      body: JSON.stringify({ claimId: "CLM-2024-001", amount: 5000 })
    });
    assert(revPostInv.status === 403, `Reviewer forbidden from creating invoices (status ${revPostInv.status})`);

    // 7. Never assign or reassign claims, or review-and-settle / approve / close claim
    const revAssign = await fetch(`${BASE_URL}/api/claims/CLM-2024-001`, {
      method: "PUT",
      headers: revJsonHeaders,
      body: JSON.stringify({ assignedTo: "another.user@laytime.com" })
    });
    assert(revAssign.status === 403, `Reviewer forbidden from assigning claims (status ${revAssign.status})`);

    const revSettle = await fetch(`${BASE_URL}/api/claims/CLM-2024-001`, {
      method: "PUT",
      headers: revJsonHeaders,
      body: JSON.stringify({ claimStatus: "Settled" })
    });
    assert(revSettle.status === 403, `Reviewer forbidden from settling claims (status ${revSettle.status})`);

    // 8. Never create, edit or delete clients, vessels, or settings
    const revPostClient = await fetch(`${BASE_URL}/api/clients`, {
      method: "POST",
      headers: revJsonHeaders,
      body: JSON.stringify({ name: "Unauthorized Client" })
    });
    assert(revPostClient.status === 403, `Reviewer forbidden from creating clients (status ${revPostClient.status})`);

    const revSettings = await fetch(`${BASE_URL}/api/settings`, { headers: revHeaders });
    assert(revSettings.status === 403, `Reviewer forbidden from settings API (status ${revSettings.status})`);

    // 9. Never generate new computed reports or trigger AI assistant
    const revPostReport = await fetch(`${BASE_URL}/api/reports/financial`, {
      method: "POST",
      headers: revJsonHeaders
    });
    assert(revPostReport.status === 403, `Reviewer forbidden from triggering report computation (status ${revPostReport.status})`);

    const revPostAi = await fetch(`${BASE_URL}/api/ai-assistant`, {
      method: "POST",
      headers: revJsonHeaders,
      body: JSON.stringify({ prompt: "Calculate demurrage" })
    });
    assert(revPostAi.status === 403, `Reviewer forbidden from triggering AI assistant (status ${revPostAi.status})`);

    // 10. Never initiate, draft, accept, reject or close negotiations
    const revPostMsg = await fetch(`${BASE_URL}/api/claims/CLM-2024-001/negotiations/messages`, {
      method: "POST",
      headers: revJsonHeaders,
      body: JSON.stringify({ messageType: "text", content: "Unauthorized review comment" })
    });
    assert(revPostMsg.status === 403, `Reviewer forbidden from posting negotiation messages (status ${revPostMsg.status})`);

    const revRespondNego = await fetch(`${BASE_URL}/api/claims/CLM-2024-001/negotiations/respond`, {
      method: "POST",
      headers: revJsonHeaders,
      body: JSON.stringify({ messageId: "msg-1", decision: "Accepted" })
    });
    assert(revRespondNego.status === 403, `Reviewer forbidden from accepting/rejecting counter-offers (status ${revRespondNego.status})`);

    const revConfirmNego = await fetch(`${BASE_URL}/api/claims/CLM-2024-001/negotiations/confirm`, {
      method: "POST",
      headers: revJsonHeaders
    });
    assert(revConfirmNego.status === 403, `Reviewer forbidden from confirming settlements (status ${revConfirmNego.status})`);

    // 11. Middleware page-level enforcement: restricted pages redirect Reviewer
    const revCalcPage = await fetch(`${BASE_URL}/calculator`, { headers: revHeaders, redirect: "manual" });
    assert(revCalcPage.status === 307 || revCalcPage.status === 302, `Reviewer redirected away from /calculator (status ${revCalcPage.status})`);

    const revOcrPage = await fetch(`${BASE_URL}/ocr`, { headers: revHeaders, redirect: "manual" });
    assert(revOcrPage.status === 307 || revOcrPage.status === 302, `Reviewer redirected away from /ocr (status ${revOcrPage.status})`);

    const revAiPage = await fetch(`${BASE_URL}/ai-assistant`, { headers: revHeaders, redirect: "manual" });
    assert(revAiPage.status === 307 || revAiPage.status === 302, `Reviewer redirected away from /ai-assistant (status ${revAiPage.status})`);
  }

  // TEST 12: Dedicated Dashboard Landing and Wrong-Role URL Redirections
  console.log("\n--- 12. Testing Dedicated Dashboard Landing & Cross-Dashboard Redirection ---");
  {
    // 12.1 Each role lands on its own dashboard from /dashboard
    // Admin -> /dashboard/admin
    const adminDashRes = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: `laytime_auth_token=${adminActor.token}` },
      redirect: "manual"
    });
    assert(adminDashRes.status === 307 || adminDashRes.status === 302, `Admin /dashboard redirects (status ${adminDashRes.status})`);
    const adminLoc = adminDashRes.headers.get("location") || "";
    assert(adminLoc.includes("/dashboard/admin"), `Admin redirected to /dashboard/admin: ${adminLoc}`);

    // Supervisor -> /dashboard/supervisor
    const supDashRes = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: `laytime_auth_token=${supervisorActor.token}` },
      redirect: "manual"
    });
    assert(supDashRes.status === 307 || supDashRes.status === 302, `Supervisor /dashboard redirects (status ${supDashRes.status})`);
    const supLoc = supDashRes.headers.get("location") || "";
    assert(supLoc.includes("/dashboard/supervisor"), `Supervisor redirected to /dashboard/supervisor: ${supLoc}`);

    // Processor -> /dashboard/claim-processor
    const procDashRes = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: `laytime_auth_token=${processorActor.token}` },
      redirect: "manual"
    });
    assert(procDashRes.status === 307 || procDashRes.status === 302, `Processor /dashboard redirects (status ${procDashRes.status})`);
    const procLoc = procDashRes.headers.get("location") || "";
    assert(procLoc.includes("/dashboard/claim-processor"), `Processor redirected to /dashboard/claim-processor: ${procLoc}`);

    // External Client -> /dashboard/reviewer-client
    const cliDashRes = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: `laytime_auth_token=${clientActor.token}` },
      redirect: "manual"
    });
    assert(cliDashRes.status === 307 || cliDashRes.status === 302, `Client /dashboard redirects (status ${cliDashRes.status})`);
    const cliLoc = cliDashRes.headers.get("location") || "";
    assert(cliLoc.includes("/dashboard/reviewer-client"), `Client redirected to /dashboard/reviewer-client: ${cliLoc}`);

    // 12.2 Wrong-role URLs redirect to user's own dashboard
    // Admin blocked from /dashboard/supervisor -> redirects to /dashboard/admin
    const adminWrongRes = await fetch(`${BASE_URL}/dashboard/supervisor`, {
      headers: { Cookie: `laytime_auth_token=${adminActor.token}` },
      redirect: "manual"
    });
    assert(adminWrongRes.status === 307 || adminWrongRes.status === 302, `Admin blocked from /dashboard/supervisor (status ${adminWrongRes.status})`);
    const adminWrongLoc = adminWrongRes.headers.get("location") || "";
    assert(adminWrongLoc.includes("/dashboard/admin"), `Admin redirected back to /dashboard/admin: ${adminWrongLoc}`);

    // Supervisor blocked from /dashboard/admin -> redirects to /dashboard/supervisor
    const supWrongRes = await fetch(`${BASE_URL}/dashboard/admin`, {
      headers: { Cookie: `laytime_auth_token=${supervisorActor.token}` },
      redirect: "manual"
    });
    assert(supWrongRes.status === 307 || supWrongRes.status === 302, `Supervisor blocked from /dashboard/admin (status ${supWrongRes.status})`);
    const supWrongLoc = supWrongRes.headers.get("location") || "";
    assert(supWrongLoc.includes("/dashboard/supervisor"), `Supervisor redirected back to /dashboard/supervisor: ${supWrongLoc}`);

    // Processor blocked from /dashboard/admin -> redirects to /dashboard/claim-processor
    const procWrongRes = await fetch(`${BASE_URL}/dashboard/admin`, {
      headers: { Cookie: `laytime_auth_token=${processorActor.token}` },
      redirect: "manual"
    });
    assert(procWrongRes.status === 307 || procWrongRes.status === 302, `Processor blocked from /dashboard/admin (status ${procWrongRes.status})`);
    const procWrongLoc = procWrongRes.headers.get("location") || "";
    assert(procWrongLoc.includes("/dashboard/claim-processor"), `Processor redirected back to /dashboard/claim-processor: ${procWrongLoc}`);

    // Client blocked from /dashboard/claim-processor -> redirects to /dashboard/reviewer-client
    const cliWrongRes = await fetch(`${BASE_URL}/dashboard/claim-processor`, {
      headers: { Cookie: `laytime_auth_token=${clientActor.token}` },
      redirect: "manual"
    });
    assert(cliWrongRes.status === 307 || cliWrongRes.status === 302, `Client blocked from /dashboard/claim-processor (status ${cliWrongRes.status})`);
    const cliWrongLoc = cliWrongRes.headers.get("location") || "";
    assert(cliWrongLoc.includes("/dashboard/reviewer-client"), `Client redirected back to /dashboard/reviewer-client: ${cliWrongLoc}`);
  }

  // TEST 13: Processor Cannot Edit Unassigned or Other Processor's Claim
  console.log("\n--- 13. Testing Processor Claim Isolation & Edit Restrictions ---");
  {
    // Processor cannot edit unassigned claim
    const procEditUnassigned = await fetch(`${BASE_URL}/api/claims/CLM-2024-003`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${processorActor.token}`
      },
      body: JSON.stringify({ claimNotes: "Unauthorized processor edit attempt" })
    });
    assert(
      procEditUnassigned.status === 403,
      `Processor cannot edit unassigned claim CLM-2024-003 (status ${procEditUnassigned.status})`
    );

    // Processor cannot edit another processor's claim (CLM-2024-005 assigned to Marcus Aurelius)
    const procEditOther = await fetch(`${BASE_URL}/api/claims/CLM-2024-005`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${processorActor.token}`
      },
      body: JSON.stringify({ claimNotes: "Unauthorized edit on other claim" })
    });
    assert(
      procEditOther.status === 403,
      `Processor cannot edit claim outside their assignment CLM-2024-005 (status ${procEditOther.status})`
    );
  }

  // TEST 14: External Client Data Scope Isolation
  console.log("\n--- 14. Testing External Client Strict Data Isolation ---");
  {
    // Client cannot read another client's claim
    const cliOtherClaimRes = await fetch(`${BASE_URL}/api/claims/CLM-2024-002`, {
      headers: { Cookie: `laytime_auth_token=${clientActor.token}` }
    });
    assert(
      cliOtherClaimRes.status === 404 || cliOtherClaimRes.status === 403,
      `Client cannot read another client's claim CLM-2024-002 (status ${cliOtherClaimRes.status})`
    );

    // Client cannot read missing-docs for another client's claim
    const cliOtherDocsRes = await fetch(`${BASE_URL}/api/claims/CLM-2024-002/missing-docs`, {
      headers: { Cookie: `laytime_auth_token=${clientActor.token}` }
    });
    assert(
      cliOtherDocsRes.status === 403 || cliOtherDocsRes.status === 404,
      `Client cannot read missing-docs for another client's claim (status ${cliOtherDocsRes.status})`
    );

    // Client cannot access oil-chem calculations for another client's claim
    const cliOtherOilChem = await fetch(`${BASE_URL}/api/oil-chem?claimId=CLM-2024-002`, {
      headers: { Cookie: `laytime_auth_token=${clientActor.token}` }
    });
    assert(
      cliOtherOilChem.status === 403 || cliOtherOilChem.status === 404,
      `Client cannot read oil-chem data for another client's claim (status ${cliOtherOilChem.status})`
    );

    // Client scoped notifications: only own client's or system wide
    const cliNotifsRes = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { Cookie: `laytime_auth_token=${clientActor.token}` }
    });
    assert(cliNotifsRes.status === 200, `Client can fetch notifications (status ${cliNotifsRes.status})`);
    const cliNotifsData = await cliNotifsRes.json();
    assert(Array.isArray(cliNotifsData.notifications), "Client notifications is an array");
    const containsOtherClientClaim = cliNotifsData.notifications.some(
      (n) => n.claimId === "CLM-2024-002" || n.claimId === "CLM-2024-003"
    );
    assert(!containsOtherClientClaim, "Client notifications do not leak other clients' claims");
  }

  // TEST 15: Reviewer Mutation Lockdown (POST/PUT/DELETE)
  console.log("\n--- 15. Testing Reviewer Complete Mutation Lockdown ---");
  {
    // Reviewer cannot POST notifications
    const revPostNotif = await fetch(`${BASE_URL}/api/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${reviewerActor.token}`
      },
      body: JSON.stringify({ title: "Spam", message: "Reviewer spam" })
    });
    assert(revPostNotif.status === 403, `Reviewer cannot POST notifications (status ${revPostNotif.status})`);

    // Reviewer cannot PUT notifications
    const revPutNotif = await fetch(`${BASE_URL}/api/notifications`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${reviewerActor.token}`
      },
      body: JSON.stringify({ id: "notif-001" })
    });
    assert(revPutNotif.status === 403, `Reviewer cannot PUT notifications (status ${revPutNotif.status})`);

    // Reviewer cannot POST oil-chem calculations
    const revPostOilChem = await fetch(`${BASE_URL}/api/oil-chem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `laytime_auth_token=${reviewerActor.token}`
      },
      body: JSON.stringify({ cargoName: "Crude Oil", quantityMetricTons: 50000 })
    });
    assert(revPostOilChem.status === 403, `Reviewer cannot POST oil-chem calculations (status ${revPostOilChem.status})`);
  }

  // TEST 16: Unauthenticated Requests to Every API Route Return 401
  console.log("\n--- 16. Testing Unauthenticated Access Rejection (401) on All API Endpoints ---");
  {
    const apiEndpoints = [
      { url: "/api/claims", method: "GET" },
      { url: "/api/dashboard", method: "GET" },
      { url: "/api/documents", method: "GET" },
      { url: "/api/notifications", method: "GET" },
      { url: "/api/oil-chem", method: "GET" },
      { url: "/api/rac", method: "GET" },
      { url: "/api/reports", method: "GET" },
      { url: "/api/settings", method: "GET" },
      { url: "/api/users", method: "GET" },
      { url: "/api/ai-assistant", method: "POST", body: { prompt: "test" } },
      { url: "/api/calculations", method: "GET" },
      { url: "/api/invoices", method: "GET" },
      { url: "/api/payments", method: "GET" },
      { url: "/api/clients", method: "GET" },
      { url: "/api/ocr", method: "GET" },
      { url: "/api/claims/CLM-2024-001/missing-docs", method: "GET" }
    ];

    for (const ep of apiEndpoints) {
      const res = await fetch(`${BASE_URL}${ep.url}`, {
        method: ep.method,
        headers: { "Content-Type": "application/json" },
        body: ep.body ? JSON.stringify(ep.body) : undefined
      });
      assert(
        res.status === 401,
        `Unauthenticated ${ep.method} ${ep.url} returns 401 (status ${res.status})`
      );
    }
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
