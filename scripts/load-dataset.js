const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DATABASE_PATH
  ? (path.isAbsolute(process.env.DATABASE_PATH) ? process.env.DATABASE_PATH : path.join(process.cwd(), process.env.DATABASE_PATH))
  : path.join(process.cwd(), 'data', 'laytime.db');

const sqlPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(process.cwd(), 'laytime_dataset.sql');

console.log('====================================================');
console.log('   Lay-Time Database Loader');
console.log('====================================================');
console.log(`Database Path: ${dbPath}`);
console.log(`SQL Source:    ${sqlPath}`);

if (!fs.existsSync(sqlPath)) {
  console.error(`Error: SQL file not found at ${sqlPath}`);
  process.exit(1);
}

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Remove old DB files if exist
if (fs.existsSync(dbPath)) {
  try { fs.unlinkSync(dbPath); } catch {}
}
if (fs.existsSync(`${dbPath}-wal`)) {
  try { fs.unlinkSync(`${dbPath}-wal`); } catch {}
}
if (fs.existsSync(`${dbPath}-shm`)) {
  try { fs.unlinkSync(`${dbPath}-shm`); } catch {}
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const sql = fs.readFileSync(sqlPath, 'utf8');
console.log(`Executing SQL script (${(sql.length / 1024).toFixed(1)} KB)...`);
const startTime = Date.now();
db.exec(sql);
console.log(`SQL executed successfully in ${Date.now() - startTime}ms.`);

// Foreign key check
console.log('\nRunning PRAGMA foreign_key_check...');
const fkErrors = db.pragma('foreign_key_check');
if (fkErrors.length > 0) {
  console.warn(`WARNING: Found ${fkErrors.length} foreign key check violations:`, fkErrors);
} else {
  console.log('PRAGMA foreign_key_check: OK (0 errors)');
}

// Integrity check
const integrity = db.pragma('integrity_check');
console.log(`PRAGMA integrity_check:   ${integrity[0]?.integrity_check || 'ok'}`);

// Print table row counts
const tables = [
  'clients',
  'users',
  'claims',
  'ports',
  'berths',
  'statement_of_facts',
  'deductions',
  'laytime_calculations',
  'owner_comparisons',
  'documents',
  'document_revisions',
  'discrepancies',
  'notifications',
  'email_followups',
  'incoming_emails',
  'oil_chem_calculations',
  'timesheet_imports',
  'business_rules',
  'rac_cases',
  'rac_calculations',
  'rac_status_history',
  'negotiation_threads',
  'negotiation_messages',
  'audit_logs'
];

console.log('\nTable Row Counts:');
console.log('----------------------------------------------------');
console.log('| #  | Table                     | Rows            |');
console.log('----------------------------------------------------');

let totalRows = 0;
tables.forEach((table, i) => {
  try {
    const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
    const count = row ? row.count : 0;
    totalRows += count;
    console.log(`| ${(i + 1).toString().padEnd(2)} | ${table.padEnd(25)} | ${count.toString().padStart(15)} |`);
  } catch (err) {
    console.log(`| ${(i + 1).toString().padEnd(2)} | ${table.padEnd(25)} |   [NOT CREATED] |`);
  }
});
console.log('----------------------------------------------------');
console.log(`Total records: ${totalRows}`);
console.log('====================================================\n');
