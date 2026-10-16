/* Run with: node tests/contract.test.js */
const assert = require('node:assert/strict');
const { validateCalculationResult } = require('../js/lalkitab/contract.js');

const good = {
  longitudes: { Sun: 5, Moon: 45, Mars: 75, Mercury: 105, Jupiter: 135, Venus: 165, Saturn: 195, Rahu: 225, Ketu: 45 },
  passport: {
    inputs: {}, utc: '2000-01-01T00:00:00Z', ayanamsa: 'Lahiri',
    nodeType: 'mean', engine: 'test', warnings: []
  }
};
assert.deepEqual(validateCalculationResult(good), []);
assert.ok(validateCalculationResult({}).length > 0);
assert.ok(validateCalculationResult({ ...good, longitudes: { ...good.longitudes, Sun: 360 } })
  .some(e => e.includes('Sun')));
assert.ok(validateCalculationResult({ ...good, passport: undefined })
  .some(e => e.includes('passport')));
console.log('Contract tests passed.');
