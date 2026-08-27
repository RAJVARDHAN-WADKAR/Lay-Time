const fs = require('fs');
const path = require('path');

const typesPath = path.join(process.cwd(), 'lib/types/index.ts');
let content = fs.readFileSync(typesPath, 'utf8');

content = content.replace(
  'isOverridden?: boolean;',
  'isOverridden?: boolean;\n  isProrataOverridden?: boolean;'
);

fs.writeFileSync(typesPath, content, 'utf8');
console.log('Updated lib/types/index.ts');
