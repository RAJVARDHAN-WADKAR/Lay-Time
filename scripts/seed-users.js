const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

// Load .env.local if present
const envLocalPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

// 1. Validate mandatory password environment variables (NO HARDCODED DEFAULTS ALLOWED)
const adminPassword = process.env.ADMIN_PASSWORD || process.env.DEMO_ADMIN_PASSWORD;
const supervisorPassword = process.env.SUPERVISOR_PASSWORD || process.env.DEMO_SUPERVISOR_PASSWORD;
const processor1Password = process.env.PROCESSOR1_PASSWORD || process.env.DEMO_PROCESSOR_PASSWORD;
const processor2Password = process.env.PROCESSOR2_PASSWORD || process.env.DEMO_PROCESSOR2_PASSWORD;
const reviewerPassword = process.env.REVIEWER_PASSWORD || process.env.DEMO_REVIEWER_PASSWORD;
const clientPassword = process.env.CLIENT_PASSWORD || process.env.DEMO_CLIENT_PASSWORD;

const missing = [];
if (!adminPassword) missing.push("ADMIN_PASSWORD");
if (!supervisorPassword) missing.push("SUPERVISOR_PASSWORD");
if (!processor1Password) missing.push("PROCESSOR1_PASSWORD");
if (!processor2Password) missing.push("PROCESSOR2_PASSWORD");
if (!reviewerPassword) missing.push("REVIEWER_PASSWORD");

if (missing.length > 0) {
  console.error("================================================================================");
  console.error("FATAL ERROR: scripts/seed-users.js refuses to execute without environment variables!");
  console.error(`Missing mandatory passwords: ${missing.join(", ")}`);
  console.error("Configure these in .env.local or pass them via environment variables.");
  console.error("Hardcoded fallback passwords ('Raj@123', 'Demo@12345') have been strictly prohibited.");
  console.error("================================================================================");
  process.exit(1);
}

const dbPath = process.env.DATABASE_PATH
  ? (path.isAbsolute(process.env.DATABASE_PATH)
      ? process.env.DATABASE_PATH
      : path.join(__dirname, "..", process.env.DATABASE_PATH))
  : path.join(__dirname, "..", "data", "laytime.db");

if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = OFF");

console.log("Setting up database user schema for Lay-Time...");

// Ensure user columns exist
try {
  const cols = db.pragma("table_info(users)").map((c) => c.name);
  if (!cols.includes("client_id")) db.exec("ALTER TABLE users ADD COLUMN client_id TEXT");
  if (!cols.includes("client_name")) db.exec("ALTER TABLE users ADD COLUMN client_name TEXT");
  if (!cols.includes("created_by")) db.exec("ALTER TABLE users ADD COLUMN created_by TEXT");
  if (!cols.includes("token_version")) db.exec("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 1");
} catch (e) {
  console.error("Schema check notice:", e.message);
}

db.pragma("foreign_keys = ON");

// Ensure default client exists
const insertClient = db.prepare(`
  INSERT OR IGNORE INTO clients (client_id, name, created_at)
  VALUES (?, ?, ?)
`);
const now = new Date().toISOString();
insertClient.run("client-trafigura", "Trafigura Trading Pte Ltd", now);
insertClient.run("client-sokana3", "Sokana3", now);
insertClient.run("client-eastport", "Eastport USA LLC", now);
insertClient.run("client-peregrine", "Peregrine Tankers", now);
insertClient.run("client-norstar", "Norstar", now);

// Define clean seed users: 1 Admin, 1 Supervisor, 2 Claim Processors, 1 Reviewer (+ 1 Client Portal)
const seedUsers = [
  {
    id: "usr-admin-01",
    name: "System Administrator",
    email: "admin@laytime.io",
    altEmail: "admin@laytime.demo",
    username: "admin.laytime",
    password: adminPassword,
    role: "Admin",
    roleDescription: "Principal Administrator & Master Mariner. System governance, users, and audit logs."
  },
  {
    id: "usr-supervisor-01",
    name: "Operations Supervisor",
    email: "supervisor@laytime.io",
    altEmail: "supervisor@laytime.demo",
    username: "supervisor.laytime",
    password: supervisorPassword,
    role: "Supervisor",
    roleDescription: "Operations Supervisor. Claim reviews, overrides, assignments, and RAC authorisation."
  },
  {
    id: "usr-processor-01",
    name: "Rohan Patil",
    email: "processor1@laytime.io",
    altEmail: "processor1@laytime.demo",
    username: "processor1.laytime",
    password: processor1Password,
    role: "Claim Processor",
    roleDescription: "Senior Demurrage Analyst. Assigned claims, SoF timeline logging, and calculation engine."
  },
  {
    id: "usr-processor-02",
    name: "Sneha Joshi",
    email: "processor2@laytime.io",
    altEmail: "processor2@laytime.demo",
    username: "processor2.laytime",
    password: processor2Password,
    role: "Claim Processor",
    roleDescription: "Voyage Claim Analyst. Operational claims processing and timesheet reconciliations."
  },
  {
    id: "usr-reviewer-01",
    name: "Compliance Reviewer",
    email: "reviewer@laytime.io",
    altEmail: "reviewer@laytime.demo",
    username: "reviewer.laytime",
    password: reviewerPassword,
    role: "Reviewer",
    roleDescription: "Compliance Reviewer & External Auditor. Read-only audit inspection across claims."
  }
];

if (clientPassword) {
  seedUsers.push({
    id: "usr-client-01",
    name: "Sokana Commercial",
    email: "client@laytime.io",
    altEmail: "client1@laytime.demo",
    username: "client1.laytime",
    password: clientPassword,
    role: "Client",
    clientId: "client-sokana",
    clientName: "Sokana Commercial",
    roleDescription: "External Client Portal. Read-only access to Sokana claims and counter-offers."
  });
}

// Clean up old legacy/test accounts
console.log("Purging deprecated test and demo accounts...");
try {
  db.prepare("DELETE FROM users WHERE role = 'Finance' OR role = 'FINANCE'").run();
} catch {}

const insertCleanUser = db.prepare(`
  INSERT INTO users (id, name, email, username, password_hash, role, client_id, client_name, token_version, status, role_description, created_at, updated_at)
  VALUES (@id, @name, @email, @username, @password_hash, @role, @client_id, @client_name, 1, 'Active', @role_description, @now, @now)
`);

const updateUser = db.prepare(`
  UPDATE users 
  SET name = @name, email = @email, username = @username, password_hash = @password_hash, role = @role,
      client_id = @client_id, client_name = @client_name, status = 'Active', role_description = @role_description, updated_at = @now
  WHERE id = @id
`);

for (const u of seedUsers) {
  const hash = bcrypt.hashSync(u.password, 10);
  const existing = db.prepare("SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR id = ?").get(u.email, u.id);

  if (existing) {
    updateUser.run({
      id: existing.id,
      name: u.name,
      email: u.email,
      username: u.username,
      password_hash: hash,
      role: u.role,
      client_id: u.clientId || null,
      client_name: u.clientName || null,
      role_description: u.roleDescription,
      now
    });
    console.log(`✓ Updated user: ${u.email} [${u.role}] (id: ${existing.id})`);
  } else {
    insertCleanUser.run({
      id: u.id,
      name: u.name,
      email: u.email,
      username: u.username,
      password_hash: hash,
      role: u.role,
      client_id: u.clientId || null,
      client_name: u.clientName || null,
      role_description: u.roleDescription,
      now
    });
    console.log(`✓ Created user: ${u.email} [${u.role}] (id: ${u.id})`);
  }

  if (u.altEmail && u.altEmail !== u.email) {
    const existingAlt = db.prepare("SELECT id FROM users WHERE LOWER(email) = LOWER(?)").get(u.altEmail);
    if (existingAlt) {
      updateUser.run({
        id: existingAlt.id,
        name: u.name,
        email: u.altEmail,
        username: u.username + ".alt",
        password_hash: hash,
        role: u.role,
        client_id: u.clientId || null,
        client_name: u.clientName || null,
        role_description: u.roleDescription,
        now
      });
    } else {
      insertCleanUser.run({
        id: u.id + "-alt",
        name: u.name,
        email: u.altEmail,
        username: u.username + ".alt",
        password_hash: hash,
        role: u.role,
        client_id: u.clientId || null,
        client_name: u.clientName || null,
        role_description: u.roleDescription,
        now
      });
    }
  }
}

// Assign test claims to processor1
try {
  db.prepare("UPDATE claims SET assigned_to = ? WHERE assigned_to IS NULL OR assigned_to = ''").run("Senior Demurrage Analyst");
} catch {}

console.log("\n=======================================================");
console.log("       CLEAN SEED COMPLETE (PASSWORDS FROM ENV)");
console.log("=======================================================");
console.log("Total seeded users: 1 Admin, 1 Supervisor, 2 Processors, 1 Reviewer" + (clientPassword ? " (+ 1 Client)" : ""));
console.log("All passwords loaded securely from environment variables.");
console.log("=======================================================\n");

db.close();
