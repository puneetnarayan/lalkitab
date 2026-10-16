/* Run with: node tests/run-all.js  (or npm test) */
const fs = require('node:fs');
const path = require('node:path');
for (const f of fs.readdirSync(__dirname).filter(n => n.endsWith('.test.js')).sort()) {
  require(path.join(__dirname, f));
}
