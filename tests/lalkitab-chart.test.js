/* Run with: node tests/lalkitab-chart.test.js */
const assert = require('node:assert/strict');
const chart = require('../js/lalkitab/chart.js');
const schema = require('../js/lalkitab/ruleSchema.js');

assert.equal(chart.normalizeDegrees(360), 0);
assert.equal(chart.normalizeDegrees(-30), 330);
assert.equal(chart.signFromLongitude(0), 'Aries');
assert.equal(chart.signFromLongitude(359.999), 'Pisces');
assert.equal(chart.fixedNaturalZodiacHouse(0), 1);
assert.equal(chart.fixedNaturalZodiacHouse(29.999), 1);
assert.equal(chart.fixedNaturalZodiacHouse(30), 2);
assert.equal(chart.fixedNaturalZodiacHouse(359.999), 12);

const longitudes = {
  Sun: 5, Moon: 45, Mars: 75, Mercury: 105, Jupiter: 135,
  Venus: 165, Saturn: 195, Rahu: 225, Ketu: 255
};
const inventory = chart.buildPlanetInventory(longitudes);
assert.equal(inventory.length, 9);
assert.deepEqual(inventory.map(p => p.house), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
assert.equal(chart.groupByHouse(inventory)[0].planets[0], 'Sun');
assert.equal(chart.buildPlanetInventory({ Sun: 1 })[1].status, 'missing-calculation');

const unverifiedRule = {
  id: 'LK-TEST', title: 'Test only', module: 'test',
  status: 'research-pending', confidence: 'provisional',
  source: { title: 'Test source', edition: '1952', evidenceType: 'primary-text' }
};
assert.equal(schema.validateRule(unverifiedRule).length, 0);
assert.equal(schema.isEligibleForInterpretation(unverifiedRule), false);

const activeButUncited = {
  ...unverifiedRule, status: 'active', confidence: 'verified',
  paraphrase: 'Example paraphrase', conditions: {}
};
assert.ok(schema.validateRule(activeButUncited).some(e => e.includes('pinpoint reference')));
assert.equal(schema.isEligibleForInterpretation(activeButUncited), false);

console.log('Lal Kitab chart/schema tests passed.');
