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
const dataRows = rows.slice(1);

const accCounts = {};
const statusCounts = {};

dataRows.forEach(r => {
  const acc = r[1]?.trim() || 'Unknown';
  accCounts[acc] = (accCounts[acc] || 0) + 1;
  const st = r[3]?.trim() || 'Unknown';
  statusCounts[st] = (statusCounts[st] || 0) + 1;
});

console.log('Account counts:', accCounts);
console.log('Status counts:', statusCounts);
