const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "..", "data", "laytime.db");
const backupPath = path.join(__dirname, "..", "data", "laytime.db.bak");

console.log("=== Running Lay-Time Database Migration v2 ===");

// 1. Create a safety backup
if (fs.existsSync(dbPath)) {
  fs.copyFileSync(dbPath, backupPath);
  console.log("✓ Created safety backup at:", backupPath);
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = OFF"); // Disable during schema migration

const tx = db.transaction(() => {
  // 2. Create clients table
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      client_id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );
  `);
  console.log("✓ Created clients table");

  // 3. Seed initial clients from known counterparties and accounts
  const now = new Date().toISOString();
  const initialClients = [
    { client_id: "client-trafigura", name: "Trafigura Trading Pte Ltd" },
    { client_id: "client-bp", name: "BP Maritime" },
    { client_id: "client-cargill", name: "Cargill International SA" },
    { client_id: "client-chevron", name: "Chevron Marine Products" },
    { client_id: "client-glencore", name: "Glencore International AG" },
    { client_id: "client-gunvor", name: "Gunvor Group" },
    { client_id: "client-koch", name: "Koch Supply & Trading" },
    { client_id: "client-shell", name: "Shell Global Eastern" },
    { client_id: "client-totalenergies", name: "TotalEnergies Trading" },
    { client_id: "client-vitol", name: "Vitol Group" }
  ];

  const insertClient = db.prepare(`
    INSERT OR IGNORE INTO clients (client_id, name, created_at)
    VALUES (?, ?, ?)
  `);

  for (const c of initialClients) {
    insertClient.run(c.client_id, c.name, now);
  }
  console.log(`✓ Seeded ${initialClients.length} clients`);

  // 4. Add client_id to claims if not exists & backfill
  const claimCols = db.pragma("table_info(claims)").map((c) => c.name);
  if (!claimCols.includes("client_id")) {
    db.exec("ALTER TABLE claims ADD COLUMN client_id TEXT REFERENCES clients(client_id)");
    console.log("✓ Added client_id column to claims table");
  }

  // Backfill claims.client_id based on account_name or counterparty_name
  for (const c of initialClients) {
    db.prepare(`
      UPDATE claims 
      SET client_id = ? 
      WHERE (LOWER(account_name) LIKE LOWER(?) OR LOWER(counterparty_name) LIKE LOWER(?))
    `).run(c.client_id, `%${c.name.split(" ")[0]}%`, `%${c.name.split(" ")[0]}%`);
  }

  // Default any remaining unlinked claims to client-trafigura
  db.prepare(`
    UPDATE claims SET client_id = 'client-trafigura' WHERE client_id IS NULL OR client_id = ''
  `).run();
  console.log("✓ Backfilled claims.client_id for all claims");

  // 5. Migrate users table to include client_id, created_by, token_version
  const userCols = db.pragma("table_info(users)").map((c) => c.name);
  const needsUserMigration =
    !userCols.includes("client_id") ||
    !userCols.includes("created_by") ||
    !userCols.includes("token_version");

  if (needsUserMigration) {
    console.log("Migrating users table with new columns and constraints...");
    db.exec(`
      CREATE TABLE users_v2 (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        username TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('Admin', 'Claim Processor', 'Processor', 'Supervisor', 'Reviewer', 'Finance', 'Client')),
        client_id TEXT REFERENCES clients(client_id),
        client_name TEXT,
        created_by TEXT REFERENCES users(id),
        token_version INTEGER NOT NULL DEFAULT 1,
        avatar TEXT,
        status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Inactive')),
        role_description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      INSERT INTO users_v2 (id, name, email, username, password_hash, role, client_name, avatar, status, role_description, created_at, updated_at)
        SELECT id, name, email, username, password_hash, role, client_name, avatar, status, role_description, created_at, updated_at FROM users;

      DROP TABLE users;
      ALTER TABLE users_v2 RENAME TO users;
    `);
    console.log("✓ Successfully migrated users table structure");
  }

  // Backfill user hierarchy & client IDs for existing seed users
  db.prepare("UPDATE users SET created_by = NULL, token_version = 1 WHERE id = 'usr-001'").run(); // Admin
  db.prepare("UPDATE users SET created_by = 'usr-001', token_version = 1 WHERE id IN ('usr-003', 'usr-004', 'usr-005')").run(); // Supervisor, Reviewer, Finance
  db.prepare("UPDATE users SET created_by = 'usr-003', token_version = 1 WHERE id = 'usr-002'").run(); // Claim Processor created by Supervisor
  db.prepare("UPDATE users SET created_by = 'usr-002', client_id = 'client-trafigura', token_version = 1 WHERE id = 'usr-006'").run(); // Client created by Claim Processor

  // Ensure all other users have token_version >= 1
  db.prepare("UPDATE users SET token_version = 1 WHERE token_version IS NULL OR token_version < 1").run();
  console.log("✓ Backfilled user hierarchy relationships, client_id, and token_versions");

  // 6. Create negotiation_threads table
  db.exec(`
    CREATE TABLE IF NOT EXISTS negotiation_threads (
      id TEXT PRIMARY KEY,
      claim_id TEXT NOT NULL UNIQUE REFERENCES claims(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'Open',
      proposed_agreed_amount REAL,
      proposed_currency TEXT DEFAULT 'USD',
      proposed_by TEXT,
      proposed_at TEXT,
      supervisor_confirmed INTEGER NOT NULL DEFAULT 0,
      supervisor_confirmed_by TEXT,
      supervisor_confirmed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  console.log("✓ Created negotiation_threads table");

  // 7. Create negotiation_messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS negotiation_messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES negotiation_threads(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id),
      sender_role TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      message_type TEXT NOT NULL CHECK(message_type IN ('text', 'counter_offer')),
      content TEXT NOT NULL,
      counter_offer_amount REAL,
      currency TEXT,
      counter_offer_status TEXT CHECK(counter_offer_status IN ('Pending', 'Accepted', 'Rejected', NULL)),
      responded_by TEXT,
      responded_at TEXT,
      created_at TEXT NOT NULL
    );
  `);
  console.log("✓ Created negotiation_messages table");

  // 8. Create audit_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      actor_email TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      details_json TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
  `);
  console.log("✓ Created audit_logs table");

  // 9. Create Performance Indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_claims_client_id ON claims(client_id);
    CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id);
    CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);
    CREATE INDEX IF NOT EXISTS idx_negotiation_threads_claim ON negotiation_threads(claim_id);
    CREATE INDEX IF NOT EXISTS idx_negotiation_messages_thread ON negotiation_messages(thread_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
  `);
  console.log("✓ Created performance indexes");
});

tx();
db.pragma("foreign_keys = ON");
db.close();

console.log("=== Migration v2 Completed Successfully ===");
