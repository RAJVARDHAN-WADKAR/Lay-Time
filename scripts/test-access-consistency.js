/**
 * Section 1.3 Unit Test: Single Source of Truth Access Consistency
 *
 * Verifies that for EVERY role in ALL_ROLES:
 *  1. Every sidebar item returned by getSidebarItemsForRole() is allowed by isRouteAllowed() (middleware).
 *  2. Every sidebar-defined route allowed by isRouteAllowed() appears in getSidebarItemsForRole() (no reverse drift).
 *  3. Each role's dedicated dashboard is allowed by isRouteAllowed() and appears in its sidebar.
 *  4. Longest-match sidebar activation highlights strictly ONE item for every allowed route.
 *  5. Duplicate access tables (pageAccessMatrix.ts, rolePermissions.ts, *.role.ts) do not exist.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ts = require("typescript");

function loadTsModule(relPath) {
  const fullPath = path.join(process.cwd(), relPath);
  const src = fs.readFileSync(fullPath, "utf8");
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true
    }
  });
  const mod = { exports: {} };
  const fn = new Function("exports", "require", "module", "__filename", "__dirname", outputText);
  fn(mod.exports, require, mod, fullPath, path.dirname(fullPath));
  return mod.exports;
}

const accessMatrix = loadTsModule("lib/auth/accessMatrix.ts");
const {
  ALL_ROLES,
  ACCESS_MATRIX,
  SIDEBAR_NAV_DEFINITIONS,
  isRouteAllowed,
  getSidebarItemsForRole,
  getLongestMatchingSidebarHref,
  isApiRouteAllowed,
  can
} = accessMatrix;

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error(`  [FAIL] ${msg}`);
    failures++;
  }
}

console.log("=================================================================");
console.log("   ACCESS MATRIX <-> SIDEBAR <-> MIDDLEWARE CONSISTENCY TEST     ");
console.log("=================================================================");

// 1. Ensure duplicate tables stay deleted
const forbiddenLegacyFiles = [
  "lib/auth/pageAccessMatrix.ts",
  "lib/auth/rolePermissions.ts",
  "app/access/roles/admin.role.ts",
  "app/access/roles/supervisor.role.ts",
  "app/access/roles/claim-processor.role.ts",
  "app/access/roles/reviewer-client.role.ts",
  "app/access/roles/finance.role.ts"
];
for (const f of forbiddenLegacyFiles) {
  assert(!fs.existsSync(path.join(process.cwd(), f)), `Duplicate access file still exists: ${f}`);
}

// 2. Verify middleware.ts imports from @/lib/auth/accessMatrix and has no hardcoded ROUTE_ROLES_MAP
const mwSrc = fs.readFileSync(path.join(process.cwd(), "middleware.ts"), "utf8");
assert(mwSrc.includes("@/lib/auth/accessMatrix"), "middleware.ts must import from @/lib/auth/accessMatrix");
assert(!mwSrc.includes("ROUTE_ROLES_MAP"), "middleware.ts must not contain hardcoded ROUTE_ROLES_MAP");

// 3. Verify every role
for (const role of ALL_ROLES) {
  const cfg = ACCESS_MATRIX[role];
  const isClient = role === "CLIENT";
  const sidebarItems = getSidebarItemsForRole(role, isClient);
  const sidebarHrefs = new Set(sidebarItems.map((i) => i.href));

  // Dashboard check
  assert(isRouteAllowed(role, cfg.dashboard, isClient), `${role}: dashboard ${cfg.dashboard} blocked by middleware`);
  assert(sidebarHrefs.has(cfg.dashboard), `${role}: dashboard ${cfg.dashboard} missing from sidebar`);

  // Forward check: every sidebar item -> middleware allows it & longest-match highlights strictly 1 item
  for (const item of sidebarItems) {
    assert(isRouteAllowed(role, item.href, isClient), `${role}: sidebar item ${item.href} is blocked by middleware`);
    const active = getLongestMatchingSidebarHref(sidebarItems, item.href);
    assert(active === item.href, `${role}: longest-match on ${item.href} returned '${active}' instead of '${item.href}'`);
  }

  // Reverse check: every sidebar-navigable definition allowed by middleware MUST appear in sidebar
  for (const def of SIDEBAR_NAV_DEFINITIONS) {
    const allowed = isRouteAllowed(role, def.href, isClient);
    if (allowed) {
      assert(sidebarHrefs.has(def.href), `${role}: middleware allows ${def.href} but sidebar omits it`);
    } else {
      assert(!sidebarHrefs.has(def.href), `${role}: middleware blocks ${def.href} but sidebar includes it`);
    }
  }

  console.log(`  [PASS] ${role.padEnd(16)} -> ${sidebarItems.length} sidebar items verified against ACCESS_MATRIX & middleware`);
}

// 4. Role-specific critical assertions from Section 2
assert(!isRouteAllowed("REVIEWER", "/claims/create"), "REVIEWER must be blocked from /claims/create");
assert(!isRouteAllowed("CLIENT", "/claims/create"), "CLIENT must be blocked from /claims/create");
assert(!isApiRouteAllowed("REVIEWER", "/api/claims", "POST"), "REVIEWER POST /api/claims must be blocked");
assert(!isApiRouteAllowed("CLIENT", "/api/claims", "POST"), "CLIENT POST /api/claims must be blocked");
assert(isRouteAllowed("ADMIN", "/claims/create"), "ADMIN must have /claims/create");
assert(isRouteAllowed("ADMIN", "/calculator"), "ADMIN must have /calculator");
assert(isRouteAllowed("ADMIN", "/calculations"), "ADMIN must have /calculations");
assert(isRouteAllowed("ADMIN", "/ocr"), "ADMIN must have /ocr");
assert(isRouteAllowed("ADMIN", "/timebar"), "ADMIN must have /timebar");
assert(!isRouteAllowed("SUPERVISOR", "/users"), "SUPERVISOR must NOT have /users");
assert(!isRouteAllowed("SUPERVISOR", "/settings"), "SUPERVISOR must NOT have /settings");
assert(!can("SUPERVISOR", "claims:delete"), "SUPERVISOR must NOT have claims:delete");
assert(!can("SUPERVISOR", "documents:delete"), "SUPERVISOR must NOT have documents:delete");
assert(isRouteAllowed("CLAIM_PROCESSOR", "/claims/assigned"), "CLAIM_PROCESSOR must have /claims/assigned");
assert(!isRouteAllowed("CLAIM_PROCESSOR", "/claims"), "CLAIM_PROCESSOR must NOT have /claims (All Claims)");
assert(isRouteAllowed("CLAIM_PROCESSOR", "/claims/DBLS24397"), "CLAIM_PROCESSOR must access /claims/[id] details");

if (failures > 0) {
  console.error(`\nFAILED: ${failures} access consistency error(s).`);
  process.exit(1);
} else {
  console.log("\nALL ACCESS MATRIX CONSISTENCY CHECKS PASSED (100%)!");
}
