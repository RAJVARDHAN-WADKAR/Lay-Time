const fs = require('fs');
const Database = require('better-sqlite3');

function parseCSV(text) {
  const rows = [];
  let row = [];
  let token = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        token += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(token);
      token = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      row.push(token);
      token = '';
      if (row.some(cell => cell.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
    } else {
      token += c;
    }
  }
  if (token.length > 0 || row.length > 0) {
    row.push(token);
    if (row.some(cell => cell.trim().length > 0)) {
      rows.push(row);
    }
  }
  return rows;
}

function cleanNumber(val) {
  if (!val) return 0;
  const cleaned = String(val).replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const s = dateStr.trim();
  if (s === '13/02/1900' || s.endsWith('1900') || s.length < 8) return null;
  // Handle DD/MM/YYYY
  const parts = s.split(/[\/\-]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    if (day > 0 && day <= 31 && month > 0 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return s;
}

const db = new Database('data/laytime.db');

// Ensure schema has necessary tracker columns
try {
  db.exec(`
    ALTER TABLE claims ADD COLUMN invoice_number TEXT;
  `);
} catch (e) {
  // column already exists
}

try {
  db.exec(`
    ALTER TABLE claims ADD COLUMN tax_year TEXT;
  `);
} catch (e) {
  // column already exists
}

try {
  db.exec(`
    ALTER TABLE claims ADD COLUMN bl_quantity TEXT;
  `);
} catch (e) {
  // column already exists
}

try {
  db.exec(`
    ALTER TABLE claims ADD COLUMN owners_claim_amount REAL DEFAULT 0;
  `);
} catch (e) {
  // column already exists
}

try {
  db.exec(`
    ALTER TABLE claims ADD COLUMN claim_timebar_date TEXT;
  `);
} catch (e) {
  // column already exists
}

try {
  db.exec(`
    ALTER TABLE claims ADD COLUMN claim_filed_date TEXT;
  `);
} catch (e) {
  // column already exists
}

// 1. Seed the 4 Clients from tracker
const clients = [
  { id: 'client-sokana3', name: 'Sokana3' },
  { id: 'client-eastport', name: 'Eastport USA LLC' },
  { id: 'client-peregrine', name: 'Peregrine Tankers' },
  { id: 'client-norstar', name: 'Norstar' }
];

const insertClient = db.prepare(`
  INSERT OR IGNORE INTO clients (client_id, name, created_at)
  VALUES (?, ?, ?)
`);
const nowIso = new Date().toISOString();
clients.forEach(c => insertClient.run(c.id, c.name, nowIso));

// 2. Read and parse CSV
const content = fs.readFileSync('LaytimeServicesTracker.csv', 'utf8');
const rows = parseCSV(content);
const headers = rows[0].map(h => h.replace(/^\uFEFF/, '').trim());
const dataRows = rows.slice(1);

console.log(`Processing ${dataRows.length} tracker claims...`);

const insertClaim = db.prepare(`
  INSERT OR REPLACE INTO claims (
    id, client_id, claim_name, account_name, broker_name, claim_status, claim_type, ship_name,
    cp_type, voyage_number, assigned_to, days_open, claim_closed, contentions, claim_notes,
    document_links, demurrage_rate_per_day, counterparty_name, counterparty_type, claim_filed_amount,
    received_claim_amount, agreed_amount, billable_amount, payment_received, payment_concluded,
    layday, cancelling_date, voyage_end_date, instruction_received_date, notice_received_date,
    claim_received_date, notice_timebar_days, claim_timebar_days, timebarred, claim_agreed_date,
    charterparty_date, days_awaiting_payment, invoice_number, tax_year, bl_quantity,
    owners_claim_amount, claim_timebar_date, claim_filed_date, created_at, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?
  )
`);

let inserted = 0;
const tx = db.transaction((rows) => {
  for (const r of rows) {
    const claimId = r[0]?.trim();
    if (!claimId) continue;

    const account = r[1]?.trim() || 'Sokana3';
    let clientId = 'client-sokana3';
    if (account.includes('Eastport')) clientId = 'client-eastport';
    else if (account.includes('Peregrine')) clientId = 'client-peregrine';
    else if (account.includes('Norstar')) clientId = 'client-norstar';

    const openDaysPlus = cleanNumber(r[2]);
    const claimStatus = r[3]?.trim() || 'Submitted';
    const shipName = r[4]?.trim() || 'Unknown Vessel';
    const voyageNo = r[5]?.trim() || '';
    const cpDate = parseDate(r[6]);
    const charterer = r[7]?.trim() || '';
    const broker = r[8]?.trim() || '';
    const claimFiledDate = parseDate(r[9]);
    const filedAmount = cleanNumber(r[10]);
    const agreedAmount = cleanNumber(r[11]);
    const claimType = r[12]?.trim() || 'Demurrage';
    const notes = r[13]?.trim() || '';
    const invoiceNo = r[14]?.trim() || '';
    const agreedDate = parseDate(r[15]);
    const paymentReceived = cleanNumber(r[16]);
    const counterparty = r[17]?.trim() || charterer;
    const contractType = r[18]?.trim() || 'CP';
    const layday = parseDate(r[19]);
    const cancelling = parseDate(r[20]);
    const instructionReceived = parseDate(r[21]);
    const blQuantity = r[22]?.trim() || '';
    const voyageEnds = parseDate(r[23]);
    const claimReceived = parseDate(r[24]);
    const timebarDays = cleanNumber(r[25]) || 45;
    const timebarDate = parseDate(r[26]);
    const timebarred = r[27]?.trim().toLowerCase() === 'true' ? 1 : 0;
    const ownersClaim = cleanNumber(r[28]);
    const openDays = cleanNumber(r[29]) || openDaysPlus;
    const paymentConcluded = r[30]?.trim().toLowerCase() === 'true' ? 1 : 0;
    const claimClosed = (r[31]?.trim().toLowerCase() === 'true' || claimStatus.includes('Claim Closed') || claimStatus.includes('Write Off')) ? 1 : 0;
    const billableAmount = cleanNumber(r[32]);
    const taxYear = r[33]?.trim() || '2024-2025';

    const claimName = `${shipName} - ${charterer || 'Voyage'} (${claimId})`;
    const assignedTo = 'Rohit Mengane'; // Senior Demurrage Analyst

    // Approximate created date from instruction or CP date
    const createdAt = instructionReceived ? `${instructionReceived}T08:00:00.000Z` : (cpDate ? `${cpDate}T08:00:00.000Z` : nowIso);

    insertClaim.run(
      claimId,
      clientId,
      claimName,
      account,
      broker,
      claimStatus,
      claimType,
      shipName,
      contractType,
      voyageNo,
      assignedTo,
      openDays,
      claimClosed,
      '', // contentions
      notes,
      JSON.stringify([]), // document_links
      0, // demurrage_rate_per_day
      counterparty,
      'Charterer',
      filedAmount,
      ownersClaim, // received_claim_amount
      agreedAmount,
      billableAmount,
      paymentReceived,
      paymentConcluded,
      layday || '',
      cancelling || '',
      voyageEnds || '',
      instructionReceived || '',
      '', // notice_received_date
      claimReceived || '',
      30, // notice_timebar_days
      timebarDays,
      timebarred,
      agreedDate || '',
      cpDate || '',
      0, // days_awaiting_payment
      invoiceNo,
      taxYear,
      blQuantity,
      ownersClaim,
      timebarDate || '',
      claimFiledDate || '',
      createdAt,
      nowIso
    );
    inserted++;
  }
});

tx(dataRows);
console.log(`Successfully imported ${inserted} claims into SQLite database!`);

const totalClaims = db.prepare('SELECT count(*) as count FROM claims').get();
console.log(`Total claims now in database: ${totalClaims.count}`);

const statusSummary = db.prepare('SELECT claim_status, count(*) as c FROM claims GROUP BY claim_status').all();
console.log('Database Status Summary:', statusSummary);
