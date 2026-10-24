const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "..", "data", "laytime.db");

if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = OFF");

console.log("Ensuring users table supports the 6-Role matrix...");

// Ensure all necessary columns exist on the users table
try {
  const cols = db.pragma("table_info(users)").map((c) => c.name);
  if (!cols.includes("client_id")) {
    db.exec("ALTER TABLE users ADD COLUMN client_id TEXT");
    console.log("✓ Added client_id column to users table");
  }
  if (!cols.includes("client_name")) {
    db.exec("ALTER TABLE users ADD COLUMN client_name TEXT");
    console.log("✓ Added client_name column to users table");
  }
  if (!cols.includes("created_by")) {
    db.exec("ALTER TABLE users ADD COLUMN created_by TEXT");
    console.log("✓ Added created_by column to users table");
  }
  if (!cols.includes("token_version")) {
    db.exec("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 1");
    console.log("✓ Added token_version column to users table");
  }

  // Check if inserting a temporary Finance test row works or fails CHECK constraint
  try {
    const testStmt = db.prepare("INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at) VALUES ('__test__', 'Test', '__test__@test.com', 'h', 'Finance', '2024-01-01', '2024-01-01')");
    testStmt.run();
    db.prepare("DELETE FROM users WHERE id = '__test__'").run();
  } catch (checkErr) {
    if (checkErr.message.includes("CHECK constraint failed")) {
      console.log("Migrating users table to remove restrictive CHECK constraint...");
      db.exec(`
        CREATE TABLE users_migrated (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          username TEXT UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL,
          client_id TEXT,
          client_name TEXT,
          created_by TEXT,
          token_version INTEGER NOT NULL DEFAULT 1,
          avatar TEXT,
          status TEXT NOT NULL DEFAULT 'Active',
          role_description TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT INTO users_migrated (id, name, email, username, password_hash, role, client_name, avatar, status, role_description, created_at, updated_at)
          SELECT id, name, email, username, password_hash, role, client_name, avatar, status, role_description, created_at, updated_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_migrated RENAME TO users;
      `);
      console.log("✓ Successfully migrated users table schema");
    } else {
      throw checkErr;
    }
  }
} catch (e) {
  console.error("Migration warning:", e.message);
}

db.pragma("foreign_keys = ON");

console.log("Seeding/updating the 6 role matrix accounts in database...");

const adminPassword = process.env.DEMO_ADMIN_PASSWORD || "Raj@123";
const processorPassword = process.env.DEMO_PROCESSOR_PASSWORD || "Rohit@123";
const supervisorPassword = process.env.DEMO_SUPERVISOR_PASSWORD || "Swayam@123";
const reviewerPassword = process.env.DEMO_REVIEWER_PASSWORD || "Paras@123";
const financePassword = process.env.DEMO_FINANCE_PASSWORD || "Finance@123";
const clientPassword = process.env.DEMO_CLIENT_PASSWORD || "Client@123";

const users = [
  {
    id: "usr-001",
    name: "Rajvardhan Wadkar",
    email: "rajvardhanwadkar76@gmail.com",
    username: "rajvardhan.wadkar",
    password: adminPassword,
    role: "Admin",
    roleDescription: "Principal Administrator & Master Mariner. System users and company settings management."
  },
  {
    id: "usr-002",
    name: "Rohit Mengane",
    email: "rohitmengane2975@gmail.com",
    username: "rohit.mengane",
    password: processorPassword,
    role: "Claim Processor",
    roleDescription: "Senior Demurrage Analyst. Manages primary assigned claims, SoF logging, and RAC cases."
  },
  {
    id: "usr-003",
    name: "Swayam Ghatage",
    email: "swayamghatage3839@gmail.com",
    username: "swayam.ghatage",
    password: supervisorPassword,
    role: "Supervisor",
    roleDescription: "Operations Supervisor & Lead. Claim approvals, overrides, negotiations, and settlements."
  },
  {
    id: "usr-004",
    name: "Paras Chougale",
    email: "paraschougale558@gmail.com",
    username: "paras.chougale",
    password: reviewerPassword,
    role: "Reviewer",
    roleDescription: "Legal Counsel & External Auditor. Read-only compliance inspection mode across all claims."
  },
  {
    id: "usr-005",
    name: "Anita Sharma",
    email: "anita.sharma@laytime.com",
    username: "anita.sharma",
    password: financePassword,
    role: "Finance",
    roleDescription: "Financial Controller. Invoice generation, payments recording, and financial dashboard metrics."
  },
  {
    id: "usr-006",
    name: "Trafigura Commercial",
    email: "client@trafigura.com",
    username: "client.trafigura",
    password: clientPassword,
    role: "Client",
    clientId: "client-trafigura",
    clientName: "Trafigura Trading Pte Ltd",
    createdBy: "usr-002",
    roleDescription: "External Client Counterparty Portal. View own claims, summaries, and approve final offers."
  }
];

// Map created_by
const createdByMap = {
  "usr-001": null,
  "usr-003": "usr-001",
  "usr-004": "usr-001",
  "usr-005": "usr-001",
  "usr-002": "usr-003",
  "usr-006": "usr-002"
};

const now = new Date().toISOString();

for (const u of users) {
  const hash = bcrypt.hashSync(u.password, 10);
  const existing = db.prepare("SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR id = ?").get(u.email, u.id);
  const cBy = u.createdBy || createdByMap[u.id] || null;
  const cId = u.clientId || null;

  if (existing) {
    db.prepare(`
      UPDATE users 
      SET name = ?, email = ?, username = ?, password_hash = ?, role = ?, client_id = ?, client_name = ?, created_by = ?, token_version = 1, status = 'Active', role_description = ?, updated_at = ? 
      WHERE id = ?
    `).run(u.name, u.email, u.username, hash, u.role, cId, u.clientName || null, cBy, u.roleDescription, now, existing.id);
    console.log(`✓ Updated account: ${u.email} (${u.role})`);
  } else {
    db.prepare(`
      INSERT INTO users (id, name, email, username, password_hash, role, client_id, client_name, created_by, token_version, status, role_description, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'Active', ?, ?, ?)
    `).run(u.id, u.name, u.email, u.username, hash, u.role, cId, u.clientName || null, cBy, u.roleDescription, now, now);
    console.log(`✓ Created account: ${u.email} (${u.role})`);
  }
}

// Ensure claims and rac cases are assigned to Rohit Mengane for processor testing
db.prepare("UPDATE claims SET assigned_to = ? WHERE assigned_to = 'Sarah Jenkins'").run("Rohit Mengane");
db.prepare("UPDATE rac_cases SET assigned_to = ? WHERE assigned_to = 'Sarah Jenkins'").run("Rohit Mengane");

console.log("\n=======================================================");
console.log("             DEMO USER CREDENTIALS SEEDED");
console.log("=======================================================");
console.log("  Role            | Email                         | Password");
console.log("  ----------------+-------------------------------+------------");
users.forEach((u) => {
  console.log(`  ${u.role.padEnd(16)}| ${u.email.padEnd(30)}| ${u.password}`);
});
console.log("=======================================================");
console.log("  SECURITY NOTICE: These demo credentials are for evaluation");
console.log("  purposes only. In production, rotate all passwords and configure");
console.log("  proper environment secrets (DEMO_*_PASSWORD or .env.local).");
console.log("=======================================================\n");

console.log("Database user accounts successfully migrated and verified for all 6 roles.");
db.close();
