const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'laytime.db');
const db = new Database(dbPath, { readonly: true });

const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();

console.log('=== DATABASE OVERVIEW ===');
console.log(`Database file: ${dbPath}`);
console.log(`Total Tables: ${tables.length}\n`);

for (const t of tables) {
  const count = db.prepare(`SELECT COUNT(*) as cnt FROM "${t.name}"`).get().cnt;
  const cols = db.prepare(`PRAGMA table_info("${t.name}")`).all();
  
  console.log('------------------------------------------------------------');
  console.log(`TABLE: ${t.name} (Total Records: ${count})`);
  console.log('COLUMNS:');
  for (const c of cols) {
    const pk = c.pk ? ' [PRIMARY KEY]' : '';
    const notNull = c.notnull ? ' NOT NULL' : '';
    const dflt = c.dflt_value !== null ? ` DEFAULT ${c.dflt_value}` : '';
    console.log(`  • ${c.name.padEnd(25)} : ${c.type}${pk}${notNull}${dflt}`);
  }
  
  const sample = db.prepare(`SELECT * FROM "${t.name}" LIMIT 2`).all();
  console.log('\nSAMPLE DATA (first 2 rows):');
  console.log(JSON.stringify(sample, null, 2));
  console.log('');
}
