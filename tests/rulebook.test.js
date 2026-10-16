/* Run with: node tests/rulebook.test.js */
const assert = require('node:assert/strict');
const book = require('../data/lalkitab-rulebook.json');
const { analyze } = require('../js/lalkitab/rulebook.js');
const rel = require('../data/lalkitab-rule-candidates.json').rules.find(r => r.id === 'LK-CAND-PLANET-RELATIONSHIPS').conditionsDraft.table;

const get = (r, sid) => r.sections.find(s => s.id === sid);
const ct = (r, id) => get(r, 'chart-types').items.find(i => i.id === id);

// Sample chart from the supplied prompt's input example.
const sample = { Sun: 1, Moon: 4, Mars: 10, Mercury: 1, Jupiter: 2, Venus: 7, Saturn: 12, Rahu: 6, Ketu: 12 };
const r = analyze(book, { houses: sample, age: 30, relationships: rel });
const d = Object.fromEntries(get(r, 'dignity').rows.map(x => [x.planet, x]));
assert.equal(d.Sun.result, 'Grahfal');       // pacca + exalted in house 1
assert.equal(d.Moon.result, 'Grahfal');      // pacca house 4
assert.equal(d.Mercury.result, 'Rashiphal'); // house 1: not pacca/exalted/debilitated/own
assert.equal(d.Mercury.remedyAllowed, true);
assert.equal(d.Saturn.result, 'Rashiphal');  // house 12 not Saturn's
assert.equal(d.Ketu.result, 'Grahfal');      // exalted in 12
assert.equal(ct(r, 'nabalik').present, false); // kendra 1 has Sun
assert.equal(ct(r, 'aadha-andha').present, false);
assert.equal(ct(r, 'andhi').present, false);   // house 10 has only Mars
assert.equal(ct(r, 'dharmi').present, false);
// Masnooi: Sun+Mercury share house 1
assert.ok(get(r, 'masnooi').items.some(i => i.house === 1 && i.forms.startsWith('Mars Positive')));
// Aspects: house 1 occupied -> aspects house 7
assert.ok(get(r, 'aspects').aspects.some(a => a.from === 1 && a.to === 7 && a.percent === 100));
// Timing phases
const t = get(r, 'timing').rows;
assert.equal(t.find(x => x.planet === 'Jupiter').phase, 'passed');
assert.equal(t.find(x => x.planet === 'Mercury').phase, 'upcoming');
// Remedies are never issued
assert.equal(r.remedyPlan.status, 'cannot-derive');
assert.ok(r.cannotDerive.length >= 4);
// Prompt inconsistencies are surfaced
assert.ok(r.warnings.some(w => /house 9 appears for ages 3 and 11/.test(w)));
assert.ok(r.warnings.some(w => /house 1 does not appear/.test(w)));

// Nabalik + remedy lookup (no remedy text)
const nab = analyze(book, { houses: { Sun: 2, Moon: 3, Mars: 5, Mercury: 6, Jupiter: 8, Venus: 9, Saturn: 4, Rahu: 7, Ketu: 10 }, age: 5 });
assert.equal(ct(nab, 'nabalik').present, true); // kendras: 1 empty, 4 Saturn, 7 Rahu, 10 Ketu
assert.equal(nab.remedyPlan.nabalikLookup.house, 11);
assert.match(nab.remedyPlan.nabalikLookup.reason, /no remedy text/);

// Sparse input does not throw and reports missing positions.
const sparse = analyze(book, { houses: { Sun: 1 }, age: null });
assert.ok(get(sparse, 'dignity').rows.some(x => x.status === 'cannot-derive'));

// Andhi cannot be decided without an enemy table when house 10 holds 2+ planets.
const andhi = analyze(book, { houses: { Sun: 10, Saturn: 10 }, age: 20 });
assert.equal(ct(andhi, 'andhi').status, 'cannot-derive');

console.log('Rulebook tests passed.');
