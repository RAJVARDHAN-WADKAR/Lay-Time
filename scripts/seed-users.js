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
db.pragma("foreign_keys = ON");

console.log("Seeding/updating the 4 required role accounts in database...");

const users = [
  {
    id: "usr-001",
    name: "Rajvardhan Wadkar",
    email: "rajvardhanwadkar76@gmail.com",
    username: "rajvardhan.wadkar",
    password: "Raj@123",
    role: "Admin",
    roleDescription: "Principal Administrator & Master Mariner. Unrestricted global access."
  },
  {
    id: "usr-002",
    name: "Rohit Mengane",
    email: "rohitmengane2975@gmail.com",
    username: "rohit.mengane",
    password: "Rohit@123",
    role: "Claim Processor",
    roleDescription: "Senior Demurrage Analyst. Manages primary claim and RAC portfolios."
  },
  {
    id: "usr-003",
    name: "Swayam Ghatage",
    email: "swayamghatage3839@gmail.com",
    username: "swayam.ghatage",
    password: "Swayam@123",
    role: "Supervisor",
    roleDescription: "Operations Supervisor & Post-Fixture Lead. Full review and authorization authority."
  },
  {
    id: "usr-004",
    name: "Paras Chougale",
    email: "paraschougale558@gmail.com",
    username: "paras.chougale",
    password: "Paras@123",
    role: "Reviewer",
    roleDescription: "Legal Counsel & External Auditor. Read-only compliance inspection mode."
  }
];

const now = new Date().toISOString();

for (const u of users) {
  const hash = bcrypt.hashSync(u.password, 10);
  const existing = db.prepare("SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR id = ?").get(u.email, u.id);

  if (existing) {
    db.prepare(`
      UPDATE users 
      SET name = ?, email = ?, username = ?, password_hash = ?, role = ?, status = 'Active', role_description = ?, updated_at = ? 
      WHERE id = ?
    `).run(u.name, u.email, u.username, hash, u.role, u.roleDescription, now, existing.id);
    console.log(`✓ Updated account: ${u.email} (${u.role})`);
  } else {
    db.prepare(`
      INSERT INTO users (id, name, email, username, password_hash, role, status, role_description, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?)
    `).run(u.id, u.name, u.email, u.username, hash, u.role, u.roleDescription, now, now);
    console.log(`✓ Created account: ${u.email} (${u.role})`);
  }
}

// Ensure claims and rac cases are assigned to Rohit Mengane for processor testing
db.prepare("UPDATE claims SET assigned_to = ? WHERE assigned_to = 'Sarah Jenkins'").run("Rohit Mengane");
db.prepare("UPDATE rac_cases SET assigned_to = ? WHERE assigned_to = 'Sarah Jenkins'").run("Rohit Mengane");

console.log("Database user accounts successfully migrated and verified.");
db.close();
