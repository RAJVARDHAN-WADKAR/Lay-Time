const fs = require('fs');
const path = require('path');

const calcPath = path.join(process.cwd(), 'app/calculations/page.tsx');
let content = fs.readFileSync(calcPath, 'utf8');

// Ensure graceful empty state when claims is empty
content = content.replace(
  '{calculationResult && claim && (',
  '{claims.length === 0 ? (\n        <Card className="p-12 text-center border-slate-200 bg-white shadow-2xs">\n          <div className="max-w-md mx-auto space-y-3">\n            <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">\n              <Calculator className="h-6 w-6" />\n            </div>\n            <h3 className="text-base font-bold text-slate-800">No Claims in System</h3>\n            <p className="text-xs text-slate-500 leading-relaxed">\n              Create a claim with port and berth particulars to run automated laytime and demurrage calculations.\n            </p>\n            <div className="pt-2">\n              <Link href="/claims/create">\n                <Button className="text-xs bg-blue-600 hover:bg-blue-700">\n                  Create First Claim\n                </Button>\n              </Link>\n            </div>\n          </div>\n        </Card>\n      ) : calculationResult && claim && ('
);

// Ensure Link is imported if not present
if (!content.includes('import Link from "next/link";')) {
  content = 'import Link from "next/link";\n' + content;
}

fs.writeFileSync(calcPath, content, 'utf8');
console.log('Updated app/calculations/page.tsx with empty state');
