const fs = require('fs');
const path = require('path');

const tablePath = path.join(process.cwd(), 'components/claims/LedgerTable.tsx');
let content = fs.readFileSync(tablePath, 'utf8');

content = content.replace(
  '{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}',
  '{table.getFilteredRowModel().rows.length === 0 ? 0 : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}'
);

fs.writeFileSync(tablePath, content, 'utf8');
console.log('Fixed pagination display in LedgerTable.tsx');
