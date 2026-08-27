const fs = require('fs');
const path = require('path');

const dataPath = path.join(process.cwd(), 'lib/mock/data.ts');
let content = fs.readFileSync(dataPath, 'utf8');

// Replace export const MOCK_CLAIMS: Claim[] = [ ... ] with SEED and empty default
content = content.replace(
  'export const MOCK_CLAIMS: Claim[] = [',
  'export const SEED_DEMO_CLAIMS: Claim[] = ['
);

// Append empty MOCK_CLAIMS export and empty MOCK_DOCUMENTS
content += `\n\n// Default empty data state as requested by user\nexport const MOCK_CLAIMS: Claim[] = [];\nexport const MOCK_DOCUMENTS: DocumentRecord[] = [];\n`;

fs.writeFileSync(dataPath, content, 'utf8');
console.log('Updated lib/mock/data.ts with empty data default');
