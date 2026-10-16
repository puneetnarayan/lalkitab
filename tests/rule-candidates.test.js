/* Run with: node tests/rule-candidates.test.js */
const assert = require('node:assert/strict');
const data = require('../data/lalkitab-rule-candidates.json');
const schema = require('../js/lalkitab/ruleSchema.js');
const ids = new Set();
for (const r of data.rules) {
  assert.deepEqual(schema.validateRule(r), [], r.id);
  assert.equal(r.status, 'research-pending', r.id + ' must stay research-pending');
  assert.equal(schema.isEligibleForInterpretation(r), false, r.id);
  assert.ok(!ids.has(r.id), 'duplicate id ' + r.id); ids.add(r.id);
  for (const c of r.conflictsWith || []) assert.ok(data.rules.some(x => x.id === c), 'dangling ' + c);
}
assert.equal(require('../data/lalkitab-rules.json').rules.length, 0);
console.log('Rule candidate tests passed (' + data.rules.length + ' candidates, none eligible).');
