const path = require("path");
const jitiFactory = require("jiti");

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/run-ts.js <script.ts>");
  process.exit(1);
}

const root = process.cwd();
const jiti = jitiFactory(__filename, {
  alias: {
    "@": root
  },
  interopDefault: true
});

Promise.resolve(jiti(path.resolve(root, target))).catch((err) => {
  console.error(err);
  process.exit(1);
});
