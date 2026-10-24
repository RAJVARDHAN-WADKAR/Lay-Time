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
const headers = rows[0].map(h => h.replace(/^\uFEFF/, '').trim());

console.log('Headers count:', headers.length);
console.log('Header list:', headers);

const dataRows = rows.slice(1);
console.log('Data rows count:', dataRows.length);

let validClaimNo = 0;
dataRows.forEach((r, idx) => {
  const claimNo = r[0]?.trim();
  if (claimNo && claimNo.startsWith('DBLS')) {
    validClaimNo++;
  }
});

console.log('Rows starting with DBLS:', validClaimNo);

// Check sample parsed claim
const sample = {};
headers.forEach((h, i) => {
  sample[h] = dataRows[0][i];
});
console.log('Sample Row 1:\n', JSON.stringify(sample, null, 2));

const sample2 = {};
headers.forEach((h, i) => {
  sample2[h] = dataRows[3][i]; // Rudolf Schulte
});
console.log('Sample Row 4 (Rudolf Schulte):\n', JSON.stringify(sample2, null, 2));
