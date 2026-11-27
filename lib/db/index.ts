import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { SCHEMA_SQL } from "./schema";
import { seedDatabase } from "./seed";

let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    const dbPath = process.env.DATABASE_PATH
      ? (path.isAbsolute(process.env.DATABASE_PATH)
          ? process.env.DATABASE_PATH
          : path.join(process.cwd(), process.env.DATABASE_PATH))
      : path.join(process.cwd(), "data", "laytime.db");

    // Ensure data folder exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    dbInstance = new Database(dbPath);
    dbInstance.pragma("journal_mode = WAL");
    dbInstance.pragma("foreign_keys = ON");
    dbInstance.pragma("busy_timeout = 5000");

    // Initialize Schema
    dbInstance.exec(SCHEMA_SQL);
    try { dbInstance.exec("ALTER TABLE claims ADD COLUMN is_overridden INTEGER NOT NULL DEFAULT 0;"); } catch {}
    try { dbInstance.exec("ALTER TABLE claims ADD COLUMN overridden_demurrage REAL;"); } catch {}
    try { dbInstance.exec("ALTER TABLE claims ADD COLUMN override_reason TEXT;"); } catch {}
    try { dbInstance.exec("ALTER TABLE documents ADD COLUMN file_hash TEXT;"); } catch {}
    try { dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_documents_hash ON documents(claim_id, file_hash);"); } catch {}
    try { dbInstance.exec("ALTER TABLE claims ADD COLUMN day_rule TEXT DEFAULT 'SHEX';"); } catch {}
    try { dbInstance.exec("ALTER TABLE claims ADD COLUMN once_on_demurrage INTEGER NOT NULL DEFAULT 1;"); } catch {}
    try { dbInstance.exec("ALTER TABLE claims ADD COLUMN notice_grace_hours REAL DEFAULT 6;"); } catch {}
    try { dbInstance.exec("ALTER TABLE claims ADD COLUMN apply_24ch INTEGER NOT NULL DEFAULT 1;"); } catch {}
    try { dbInstance.exec("ALTER TABLE claims ADD COLUMN country_code TEXT;"); } catch {}
    try { dbInstance.exec("ALTER TABLE claims ADD COLUMN port_timezone TEXT DEFAULT 'UTC';"); } catch {}
    try { dbInstance.exec("ALTER TABLE claims ADD COLUMN overlap_policy TEXT DEFAULT 'block';"); } catch {}
    try { dbInstance.exec("ALTER TABLE claims ADD COLUMN overlap_override_reason TEXT;"); } catch {}
    try { dbInstance.exec("ALTER TABLE claims ADD COLUMN notice_days_source TEXT DEFAULT 'default';"); } catch {}
    try { dbInstance.exec("ALTER TABLE claims ADD COLUMN claim_days_source TEXT DEFAULT 'default';"); } catch {}
    try { dbInstance.exec("ALTER TABLE claims ADD COLUMN payment_received_date TEXT;"); } catch {}
    try { dbInstance.exec("ALTER TABLE claims ADD COLUMN payment_received_amount REAL DEFAULT 0;"); } catch {}
    try { dbInstance.exec("ALTER TABLE claims ADD COLUMN is_incomplete INTEGER NOT NULL DEFAULT 0;"); } catch {}
    try { dbInstance.exec("ALTER TABLE claims ADD COLUMN missing_fields TEXT;"); } catch {}
    try { dbInstance.exec("ALTER TABLE claims ADD COLUMN base_date_estimated INTEGER NOT NULL DEFAULT 0;"); } catch {}
    try { dbInstance.exec("ALTER TABLE claims ADD COLUMN notes_structured TEXT;"); } catch {}
    try { dbInstance.exec("ALTER TABLE ports ADD COLUMN country_code TEXT;"); } catch {}
    try { dbInstance.exec("ALTER TABLE ports ADD COLUMN timezone TEXT DEFAULT 'UTC';"); } catch {}
    try {
      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS holidays (
          id TEXT PRIMARY KEY,
          country_code TEXT NOT NULL,
          port_id TEXT,
          date TEXT NOT NULL,
          name TEXT NOT NULL,
          source TEXT NOT NULL DEFAULT 'manual',
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_holidays_country_date ON holidays(country_code, date);
        CREATE INDEX IF NOT EXISTS idx_holidays_port_date ON holidays(port_id, date);
      `);
    } catch {}
    try {
      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS ocr_drafts (
          id TEXT PRIMARY KEY,
          document_id TEXT NOT NULL UNIQUE,
          claim_id TEXT NOT NULL,
          port_id TEXT,
          berth_id TEXT,
          raw_text TEXT NOT NULL,
          pages_json TEXT NOT NULL,
          parsed_events_json TEXT NOT NULL,
          overall_confidence REAL NOT NULL DEFAULT 0,
          is_scanned INTEGER NOT NULL DEFAULT 0,
          is_demo INTEGER NOT NULL DEFAULT 0,
          confirmed_at TEXT,
          confirmed_by TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        );
      `);
    } catch {}

    // Run Initial Seed
    try {
      seedDatabase(dbInstance);
    } catch (e) {
      console.error("Error running database seed:", e);
      throw e;
    }
  }

  return dbInstance;
}
