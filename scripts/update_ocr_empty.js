const fs = require('fs');
const path = require('path');

const ocrPath = path.join(process.cwd(), 'app/ocr/page.tsx');
let content = fs.readFileSync(ocrPath, 'utf8');

if (!content.includes('claims.length === 0')) {
  content = content.replace(
    '{/* Discrepancy Warnings Cards */}',
    '{claims.length === 0 ? (\n        <Card className="p-12 text-center border-slate-200 bg-white shadow-2xs">\n          <div className="max-w-md mx-auto space-y-3">\n            <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">\n              <ScanText className="h-6 w-6" />\n            </div>\n            <h3 className="text-base font-bold text-slate-800">No Statement of Facts Loaded</h3>\n            <p className="text-xs text-slate-500 leading-relaxed">\n              Upload a Statement of Facts PDF in Documents or create a claim to run automated discrepancy checks.\n            </p>\n            <div className="flex items-center justify-center space-x-2 pt-2">\n              <Link href="/documents">\n                <Button variant="outline" className="text-xs">\n                  Upload SoF PDF\n                </Button>\n              </Link>\n              <Link href="/claims/create">\n                <Button className="text-xs bg-blue-600 hover:bg-blue-700">\n                  Create Claim\n                </Button>\n              </Link>\n            </div>\n          </div>\n        </Card>\n      ) : (\n        <>\n        {/* Discrepancy Warnings Cards */}'
  );

  content = content.replace(
    '{/* Edit Activity Modal */}',
    '</>\n      )}\n\n      {/* Edit Activity Modal */}'
  );

  fs.writeFileSync(ocrPath, content, 'utf8');
  console.log('Updated app/ocr/page.tsx with empty state');
}
