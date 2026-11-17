import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { SCHEMA_SQL } from "./schema";
import { seedDatabase } from "./seed";

const DB_PATH = path.join(process.cwd(), "data", "laytime.db");

// Ensure data folder exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma("journal_mode = WAL");
    dbInstance.pragma("foreign_keys = ON");
    dbInstance.pragma("busy_timeout = 5000");

    // Initialize Schema
    dbInstance.exec(SCHEMA_SQL);
    try { dbInstance.exec("ALTER TABLE claims ADD COLUMN is_overridden INTEGER NOT NULL DEFAULT 0;"); } catch {}
    try { dbInstance.exec("ALTER TABLE claims ADD COLUMN overridden_demurrage REAL;"); } catch {}
    try { dbInstance.exec("ALTER TABLE claims ADD COLUMN override_reason TEXT;"); } catch {}

    // Run Initial Seed
    try {
      seedDatabase(dbInstance);
    } catch (e) {
      console.error("Error running database seed:", e);
    }
  }

  return dbInstance;
}

export const db = getDatabase();
