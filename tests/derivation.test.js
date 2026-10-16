/* Run with: node tests/derivation.test.js */
const assert = require('node:assert/strict');
const { deriveCandidates } = require('../js/lalkitab/derivation.js');
const chart = require('../js/lalkitab/chart.js');
const data = require('../data/lalkitab-rule-candidates.json');

// Moon in house 2 (45deg), Ketu not in 4 => mother's debt condition not met.
const inv = chart.buildPlanetInventory({ Sun: 5, Moon: 45, Mars: 75, Mercury: 105, Jupiter: 135, Venus: 165, Saturn: 195, Rahu: 225, Ketu: 255 });
const out = deriveCandidates(data.rules, inv);
const byId = Object.fromEntries([...out.derived, ...out.cannotDerive].map(r => [r.ruleId, r]));
assert.equal(byId['LK-CAND-RIN-MOTHER'].outcome, 'condition-not-met');
assert.equal(byId['LK-CAND-RIN-FATHER-A'].status, 'cannot-derive');
assert.equal(byId['LK-CAND-ANDHA-TEVA'].status, 'cannot-derive');
assert.equal(byId['LK-CAND-NABALIG-TEVA'].status, 'cannot-derive');
assert.equal(out.derived.length + out.cannotDerive.length, data.rules.length);
assert.ok([...out.derived, ...out.cannotDerive].every(r => r.label === 'unverified'));

// Missing positions are reported, not guessed.
const partial = deriveCandidates(data.rules, chart.buildPlanetInventory({ Sun: 5 }));
assert.equal(partial.derived.find(r => r.ruleId === 'LK-CAND-RIN-MOTHER'), undefined);
assert.match(partial.cannotDerive.find(r => r.ruleId === 'LK-CAND-RIN-MOTHER').reason, /Missing/);

// Moon in 3 and Mercury in 2 triggers sibling condition.
const inv2 = chart.buildPlanetInventory({ Sun: 5, Moon: 65, Mars: 75, Mercury: 35, Jupiter: 135, Venus: 165, Saturn: 195, Rahu: 225, Ketu: 255 });
const o2 = deriveCandidates(data.rules, inv2);
assert.equal(o2.derived.find(r => r.ruleId === 'LK-CAND-RIN-SIBLING').outcome, 'condition-met');
console.log('Derivation tests passed.');
