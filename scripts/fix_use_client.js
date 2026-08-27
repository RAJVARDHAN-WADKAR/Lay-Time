const fs = require('fs');
const path = require('path');

function ensureUseClientAtTop(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/import Link from "next\/link";\s*"use client";/g, '');
  content = content.replace(/"use client";\s*/g, '');
  content = '"use client";\n\nimport Link from "next/link";\n' + content;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed ' + filePath);
}

ensureUseClientAtTop(path.join(process.cwd(), 'app/calculations/page.tsx'));
ensureUseClientAtTop(path.join(process.cwd(), 'app/reports/page.tsx'));
