/* Run with: node tests/rules250.test.js */
const assert = require('node:assert/strict');
const book = require('../data/lalkitab-250-rules.json');
const { evaluateAll } = require('../js/lalkitab/rules250.js');
const rel = require('../data/lalkitab-rule-candidates.json').rules.find(r => r.id === 'LK-CAND-PLANET-RELATIONSHIPS').conditionsDraft.table;

// Data integrity: 250 rules, numbered 1..250, all classified.
assert.equal(book.rules.length, 250);
book.rules.forEach((r, i) => { assert.equal(r.number, i + 1); assert.ok(r.text.length > 10, 'text ' + r.number); assert.ok(r.kind, 'kind ' + r.number); });
assert.deepEqual(Object.keys(book.pucca), ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu']);

const by = (out, n) => out.results.find(r => r.number === n);
// Chart: Sun1 Mercury1 Saturn8 Venus9 Moon6 Ketu6 Jupiter7 Mars10 Rahu12; houses 2,3,4,5,11 empty.
const houses = { Sun: 1, Mercury: 1, Saturn: 8, Venus: 9, Moon: 6, Ketu: 6, Jupiter: 7, Mars: 10, Rahu: 12 };
const out = evaluateAll(book, { houses, age: 30, relationships: rel });
assert.equal(out.results.length, 250);
assert.equal(by(out, 123).status, 'applies');   // Sun in 1
assert.equal(by(out, 148).status, 'applies');   // Saturn in 8
assert.equal(by(out, 149).status, 'applies');   // Saturn 8 + empty 2
assert.equal(by(out, 232).status, 'applies');   // Venus in 9
assert.equal(by(out, 233).status, 'applies');   // Moon in 6
assert.equal(by(out, 142).status, 'applies');
assert.equal(by(out, 62).status, 'applies');    // Mars in 10
assert.equal(by(out, 62).sensitive, true);
assert.equal(by(out, 86).status, 'applies');    // Sun + Mercury
assert.equal(by(out, 136).status, 'not-applicable');
assert.equal(by(out, 160).status, 'not-applicable'); // Moon not in 11
assert.equal(by(out, 4).status, 'applies');     // Sun in Pucca Ghar 1, Saturn 8, Ketu 6
assert.equal(by(out, 126).status, 'applies');   // house 2 empty
assert.equal(by(out, 21).status, 'applies');
assert.equal(by(out, 8).status, 'not-applicable'); // count(7)=1 vs count(1)=2
// Undefined-term rules are never evaluated.
for (const n of [131, 134, 138, 55, 5, 82, 98]) assert.equal(by(out, n).status, 'cannot-derive', 'rule ' + n);
// Partial: placement matches, "weak"/"malefic" undefined.
const p = evaluateAll(book, { houses: { ...houses, Moon: 11 }, relationships: rel });
assert.equal(by(p, 160).status, 'partial');
// Enemy-table rules cannot be derived without a table.
const noRel = evaluateAll(book, { houses, age: 30 });
assert.equal(by(noRel, 6).status, 'cannot-derive');
assert.equal(by(out, 6).usesUnverifiedInput === true || by(out, 6).status === 'not-applicable', true);
// Missing positions are reported, not guessed.
const sparse = evaluateAll(book, { houses: { Sun: 1 } });
assert.equal(by(sparse, 148).status, 'cannot-derive');
// Counts add up.
assert.equal(Object.values(out.counts).reduce((a, b) => a + b, 0), 250);
// Artificial planets and aspects.
assert.ok(out.artificial.some(a => a.house === 1 && a.forms === 'Artificial Mars'));
assert.ok(out.aspects.some(a => a.a === 1 && a.b === 7 && a.percent === 100));
console.log('250-rules tests passed:', JSON.stringify(out.counts));
