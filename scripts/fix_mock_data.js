const fs = require('fs');
const path = require('path');

const dataPath = path.join(process.cwd(), 'lib/mock/data.ts');
let content = fs.readFileSync(dataPath, 'utf8');

// Replace the original MOCK_DOCUMENTS with SEED_DEMO_DOCUMENTS
content = content.replace('export const MOCK_DOCUMENTS: DocumentRecord[] = [', 'export const SEED_DEMO_DOCUMENTS: DocumentRecord[] = [');

// Ensure single clean export for MOCK_CLAIMS and MOCK_DOCUMENTS at the bottom
content = content.replace(/\/\/ Default empty data state as requested by user[\s\S]*$/, '');

content += `\n\n// Default empty data state\nexport const MOCK_CLAIMS: Claim[] = [];\nexport const MOCK_DOCUMENTS: DocumentRecord[] = [];\n`;

fs.writeFileSync(dataPath, content, 'utf8');
console.log('Fixed lib/mock/data.ts duplicate exports');
