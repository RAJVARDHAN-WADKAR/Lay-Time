const fs = require('fs');
const content = fs.readFileSync('LaytimeServicesTracker.csv', 'utf8');

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

const rows = parseCSV(content);
console.log('Total parsed rows:', rows.length);
const headers = rows[0];
console.log('Headers:', headers);

const statuses = new Set();
const accounts = new Set();
const claimTypes = new Set();
const contractTypes = new Set();
const brokers = new Set();
const charterers = new Set();

for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  if (r[3]) statuses.add(r[3].trim());
  if (r[1]) accounts.add(r[1].trim());
  if (r[12]) claimTypes.add(r[12].trim());
  if (r[18]) contractTypes.add(r[18].trim());
  if (r[8]) brokers.add(r[8].trim());
  if (r[7]) charterers.add(r[7].trim());
}

console.log('\n--- STATUSES ---');
console.log(Array.from(statuses));

console.log('\n--- ACCOUNTS ---');
console.log(Array.from(accounts));

console.log('\n--- CLAIM TYPES ---');
console.log(Array.from(claimTypes));

console.log('\n--- CONTRACT TYPES ---');
console.log(Array.from(contractTypes));

console.log('\n--- SUMMARY ---');
console.log(`Brokers: ${brokers.size}, Charterers: ${charterers.size}`);
console.log('Headers length:', headers.length);
headers.forEach((h, idx) => console.log(`${idx}: ${h}`));
