const fs = require('fs');
const path = require('path');

const reportPath = path.join(process.cwd(), 'app/reports/page.tsx');
let content = fs.readFileSync(reportPath, 'utf8');

if (!content.includes('claims.length === 0')) {
  content = content.replace(
    '{claim && calculation && (',
    '{claims.length === 0 ? (\n        <Card className="p-12 text-center border-slate-200 bg-white shadow-2xs">\n          <div className="max-w-md mx-auto space-y-3">\n            <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-2">\n              <FileText className="h-6 w-6" />\n            </div>\n            <h3 className="text-base font-bold text-slate-800">No Reports Available</h3>\n            <p className="text-xs text-slate-500 leading-relaxed">\n              Create a claim first to generate downloadable settlement and operations PDF reports.\n            </p>\n            <div className="pt-2">\n              <Link href="/claims/create">\n                <Button className="text-xs bg-blue-600 hover:bg-blue-700">\n                  Create First Claim\n                </Button>\n              </Link>\n            </div>\n          </div>\n        </Card>\n      ) : claim && calculation && ('
  );

  if (!content.includes('import Link from "next/link";')) {
    content = 'import Link from "next/link";\n' + content;
  }

  fs.writeFileSync(reportPath, content, 'utf8');
  console.log('Updated app/reports/page.tsx with empty state');
}
