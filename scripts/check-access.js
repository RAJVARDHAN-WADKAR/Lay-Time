/**
 * scripts/check-access.js
 * Validates that middleware.ts ROUTE_ROLES_MAP and app/access/roles/*.role.ts agree 100%.
 * Prints a clean Role x Route matrix table and exits with code 1 if any discrepancy exists.
 */

const fs = require("fs");
const path = require("path");

function normalizeRole(role) {
  if (!role) return "REVIEWER_CLIENT";
  const upper = role.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (upper === "ADMIN") return "ADMIN";
  if (upper === "SUPERVISOR") return "SUPERVISOR";
  if (upper === "CLAIM_PROCESSOR" || upper === "PROCESSOR") return "CLAIM_PROCESSOR";
  if (upper === "REVIEWER" || upper === "CLIENT" || upper === "REVIEWER_CLIENT") return "REVIEWER_CLIENT";
  return "REVIEWER_CLIENT";
}

function parseMiddlewareRouteMap() {
  const middlewarePath = path.join(__dirname, "..", "middleware.ts");
  const content = fs.readFileSync(middlewarePath, "utf8");

  const mapRegex = /const\s+ROUTE_ROLES_MAP\s*:\s*[^=]+=\s*\[([\s\S]*?)\];/;
  const match = content.match(mapRegex);
  if (!match) {
    throw new Error("Could not find ROUTE_ROLES_MAP in middleware.ts");
  }

  const entries = [];
  const entryRegex = /\{\s*prefix:\s*["']([^"']+)["'],\s*allowedRoles:\s*\[([\s\S]*?)\]\s*\}/g;
  let entryMatch;
  while ((entryMatch = entryRegex.exec(match[1])) !== null) {
    const prefix = entryMatch[1];
    const roles = entryMatch[2]
      .split(",")
      .map((r) => r.replace(/["'\s]/g, "").trim())
      .filter(Boolean)
      .map(normalizeRole);
    entries.push({ prefix, allowedRoles: roles });
  }

  return entries;
}

function parseRoleScreens(roleFileName) {
  const filePath = path.join(__dirname, "..", "app", "access", "roles", roleFileName);
  const content = fs.readFileSync(filePath, "utf8");

  // Handle static array: visibleScreens: [ ... ]
  const staticMatch = content.match(/visibleScreens:\s*\[([\s\S]*?)\]/);
  if (staticMatch) {
    return staticMatch[1]
      .split(",")
      .map((s) => s.replace(/["'\s]/g, "").trim())
      .filter(Boolean);
  }

  // Handle function: visibleScreens: (context) => [ ... ]
  const screens = new Set();
  const screenRegex = /["'](\/[^"']*)["']/g;
  let m;
  const funcMatch = content.match(/visibleScreens:\s*\([^\)]*\)[^\{]*\{([\s\S]*?)\n\s*\},/);
  if (funcMatch) {
    while ((m = screenRegex.exec(funcMatch[1])) !== null) {
      screens.add(m[1]);
    }
  }

  return Array.from(screens);
}

function runCheck() {
  console.log("=========================================================");
  console.log("     ROLE-BASED ACCESS CONTROL (RBAC) ROUTE MATRIX AUDIT");
  console.log("=========================================================\n");

  const middlewareRules = parseMiddlewareRouteMap();

  const roleDefinitions = {
    ADMIN: parseRoleScreens("admin.role.ts"),
    SUPERVISOR: parseRoleScreens("supervisor.role.ts"),
    CLAIM_PROCESSOR: parseRoleScreens("claim-processor.role.ts"),
    REVIEWER_CLIENT: parseRoleScreens("reviewer-client.role.ts")
  };

  const ROLES = ["ADMIN", "SUPERVISOR", "CLAIM_PROCESSOR", "REVIEWER_CLIENT"];
  let discrepancies = 0;

  // Header
  console.log(
    "Route Prefix".padEnd(28) +
      " | " +
      "ADMIN".padEnd(8) +
      " | " +
      "SUPERVISOR".padEnd(12) +
      " | " +
      "PROCESSOR".padEnd(10) +
      " | " +
      "REVIEWER_CLIENT".padEnd(16) +
      " | Result"
  );
  console.log("-".repeat(95));

  for (const rule of middlewareRules) {
    const rowStatus = [];
    let rowHasDiscrepancy = false;

    for (const role of ROLES) {
      const mwAllowed = rule.allowedRoles.includes(role);
      const screens = roleDefinitions[role];
      const roleAllowed = screens.includes(rule.prefix);

      if (mwAllowed !== roleAllowed) {
        rowStatus.push(`MISMATCH(MW:${mwAllowed ? "Y" : "N"}, Role:${roleAllowed ? "Y" : "N"})`);
        rowHasDiscrepancy = true;
        discrepancies++;
      } else {
        rowStatus.push(mwAllowed ? "ALLOW" : "DENY");
      }
    }

    const resultLabel = rowHasDiscrepancy ? "❌ FAILED" : "✓ OK";
    console.log(
      rule.prefix.padEnd(28) +
        " | " +
        rowStatus[0].padEnd(8) +
        " | " +
        rowStatus[1].padEnd(12) +
        " | " +
        rowStatus[2].padEnd(10) +
        " | " +
        rowStatus[3].padEnd(16) +
        " | " +
        resultLabel
    );
  }

  console.log("-".repeat(95));

  if (discrepancies > 0) {
    console.error(`\n❌ AUDIT FAILED: ${discrepancies} discrepancy(ies) found between middleware.ts and app/access/roles/*`);
    process.exit(1);
  } else {
    console.log("\n✓ AUDIT PASSED: 100% agreement between middleware.ts and app/access/roles/*.role.ts!");
    process.exit(0);
  }
}

runCheck();
