const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "..", "data", "laytime.db");
const db = new Database(dbPath);

console.log("Migrating users in SQLite to the 4 exact roles...");

// 1. Map old role names to 4 exact roles
function mapRole(oldRole) {
  if (!oldRole) return "REVIEWER_CLIENT";
  const upper = oldRole.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (upper === "ADMIN") return "ADMIN";
  if (upper === "SUPERVISOR") return "SUPERVISOR";
  if (upper === "CLAIM_PROCESSOR" || upper === "PROCESSOR") return "CLAIM_PROCESSOR";
  if (upper === "REVIEWER" || upper === "CLIENT" || upper === "REVIEWER_CLIENT") return "REVIEWER_CLIENT";
  if (upper === "FINANCE") return "SUPERVISOR";
  return "REVIEWER_CLIENT";
}

db.pragma("foreign_keys = OFF");

db.transaction(() => {
  db.prepare("DROP TABLE IF EXISTS users_new").run();
  // Create users_new with exact 4-role CHECK constraint
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users_new (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      username TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'SUPERVISOR', 'CLAIM_PROCESSOR', 'REVIEWER_CLIENT')),
      client_id TEXT REFERENCES clients(client_id),
      client_name TEXT,
      created_by TEXT REFERENCES users(id),
      token_version INTEGER NOT NULL DEFAULT 1,
      avatar TEXT,
      status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Inactive')),
      role_description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();

  const existingUsers = db.prepare("SELECT * FROM users").all();
  console.log(`Found ${existingUsers.length} existing users to migrate.`);

  const insert = db.prepare(`
    INSERT INTO users_new (
      id, name, email, username, password_hash, role,
      client_id, client_name, created_by, token_version,
      avatar, status, role_description, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  for (const u of existingUsers) {
    const newRole = mapRole(u.role);
    insert.run(
      u.id,
      u.name,
      u.email,
      u.username,
      u.password_hash,
      newRole,
      u.client_id,
      u.client_name,
      u.created_by,
      u.token_version,
      u.avatar,
      u.status,
      u.role_description,
      u.created_at,
      u.updated_at
    );
    console.log(`Migrated user ${u.email}: '${u.role}' -> '${newRole}'`);
  }

  db.prepare("DROP TABLE users").run();
  db.prepare("ALTER TABLE users_new RENAME TO users").run();
})();

db.pragma("foreign_keys = ON");

console.log("Migration to 4 roles completed successfully!");
const updatedUsers = db.prepare("SELECT id, name, email, role, client_id FROM users").all();
console.table(updatedUsers);
