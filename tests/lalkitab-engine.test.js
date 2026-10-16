/* Run with: node tests/lalkitab-engine.test.js */
const assert = require('node:assert/strict');
const schema = require('../js/lalkitab/ruleSchema.js');
const engine = require('../js/lalkitab/ruleEngine.js');

const pending = {
  id: 'LK-PENDING', title: 'Pending rule', module: 'test',
  status: 'research-pending', confidence: 'provisional',
  source: { title: 'Example edition', edition: '1952', evidenceType: 'primary-text' },
  paraphrase: 'Must not appear in a reading.',
  conditions: { planet: 'Sun', house: 1 }
};
const activeNoPinpoint = {
  ...pending, id: 'LK-NO-PINPOINT', status: 'active', confidence: 'verified'
};
const verified = {
  ...pending, id: 'LK-VERIFIED', status: 'active', confidence: 'verified',
  source: { title: 'Test primary edition', edition: '1952', evidenceType: 'primary-text', pageOrSection: 'p. 12' }
};
assert.equal(schema.isEligibleForInterpretation(pending), false);
assert.equal(schema.isEligibleForInterpretation(activeNoPinpoint), false);
assert.equal(schema.isEligibleForInterpretation(verified), true);

const contexts = [{ planet: 'Sun', house: 1, sign: 'Aries', housePlanets: ['Sun'] }];
assert.equal(engine.evaluate([pending], contexts).length, 0);
assert.equal(engine.evaluate([activeNoPinpoint], contexts).length, 0);
const findings = engine.evaluate([verified], contexts);
assert.equal(findings.length, 1);
assert.equal(findings[0].ruleId, 'LK-VERIFIED');
console.log('Lal Kitab rule-engine tests passed.');
