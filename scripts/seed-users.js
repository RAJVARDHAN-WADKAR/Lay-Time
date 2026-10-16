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

// Check if migration is needed to allow all roles ('Admin', 'Supervisor', 'Claim Processor', 'Processor', 'Finance', 'Reviewer', 'Client')
try {
  // Check columns
  const cols = db.pragma("table_info(users)").map((c) => c.name);
  if (!cols.includes("client_name")) {
    db.exec("ALTER TABLE users ADD COLUMN client_name TEXT");
    console.log("✓ Added client_name column to users table");
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
          client_name TEXT,
          avatar TEXT,
          status TEXT NOT NULL DEFAULT 'Active',
          role_description TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT INTO users_migrated (id, name, email, username, password_hash, role, avatar, status, role_description, created_at, updated_at)
          SELECT id, name, email, username, password_hash, role, avatar, status, role_description, created_at, updated_at FROM users;
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

const users = [
  {
    id: "usr-001",
    name: "Rajvardhan Wadkar",
    email: "rajvardhanwadkar76@gmail.com",
    username: "rajvardhan.wadkar",
    password: "Raj@123",
    role: "Admin",
    roleDescription: "Principal Administrator & Master Mariner. System users and company settings management."
  },
  {
    id: "usr-002",
    name: "Rohit Mengane",
    email: "rohitmengane2975@gmail.com",
    username: "rohit.mengane",
    password: "Rohit@123",
    role: "Claim Processor",
    roleDescription: "Senior Demurrage Analyst. Manages primary assigned claims, SoF logging, and RAC cases."
  },
  {
    id: "usr-003",
    name: "Swayam Ghatage",
    email: "swayamghatage3839@gmail.com",
    username: "swayam.ghatage",
    password: "Swayam@123",
    role: "Supervisor",
    roleDescription: "Operations Supervisor & Lead. Claim approvals, overrides, negotiations, and settlements."
  },
  {
    id: "usr-004",
    name: "Paras Chougale",
    email: "paraschougale558@gmail.com",
    username: "paras.chougale",
    password: "Paras@123",
    role: "Reviewer",
    roleDescription: "Legal Counsel & External Auditor. Read-only compliance inspection mode across all claims."
  },
  {
    id: "usr-005",
    name: "Anita Sharma",
    email: "anita.sharma@laytime.com",
    username: "anita.sharma",
    password: "Finance@123",
    role: "Finance",
    roleDescription: "Financial Controller. Invoice generation, payments recording, and financial dashboard metrics."
  },
  {
    id: "usr-006",
    name: "Trafigura Commercial",
    email: "client@trafigura.com",
    username: "client.trafigura",
    password: "Client@123",
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
  const cBy = (u as any).createdBy || createdByMap[u.id] || null;
  const cId = (u as any).clientId || null;

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

console.log("Database user accounts successfully migrated and verified for all 6 roles.");
db.close();
