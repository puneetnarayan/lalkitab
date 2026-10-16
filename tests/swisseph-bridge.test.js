/* Regression tests for the Parashari-derived Swiss Ephemeris adapter. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('../js/swissephBridge.js'), 'utf8');
const adapterSource = source.slice(source.indexOf('const normalize360'), source.indexOf('window.createSwissEphemerisAdapter'));
const context = { Date, Number, Math, TypeError, RangeError, Error, Object };
vm.createContext(context);
vm.runInContext(adapterSource + '\nthis.createSwissEphemerisAdapter = createSwissEphemerisAdapter;', context);

const calls = [];
const swe = {
  SE_SUN: 0, SE_MOON: 1, SE_MARS: 4, SE_MERCURY: 2,
  SE_JUPITER: 5, SE_VENUS: 3, SE_SATURN: 6, SE_MEAN_NODE: 10,
  SEFLG_SWIEPH: 2, SEFLG_SIDEREAL: 65536,
  julday: (...args) => { calls.push(['julday', ...args]); return 2451545; },
  calc_ut: (jd, body, flags) => { calls.push(['calc_ut', jd, body, flags]); return [body * 10 - 1, 0, 1, 0, 0, 0]; },
  houses: (jd, lat, lon, system) => { calls.push(['houses', jd, lat, lon, system]); return { cusps: [], ascmc: [100] }; },
  get_ayanamsa: jd => { calls.push(['ayanamsa', jd]); return 24; }
};
const adapter = context.createSwissEphemerisAdapter(swe);
const date = new Date('2000-01-01T12:00:00.000Z');
assert.equal(adapter.longitude('Sun', date), 359);
assert.equal(adapter.longitude('Rahu', date), 99);
assert.equal(adapter.longitude('Ketu', date), 279);
const all = adapter.longitudes(date);
assert.equal(Object.keys(all).length, 9);
assert.equal(all.Ketu, ((all.Rahu + 180) % 360));
assert.equal(adapter.ascendant(date, 26.76, 83.37), 76);
assert.throws(() => adapter.longitude('Pluto', date), /Unsupported body/);
assert.throws(() => adapter.ascendant(date, 91, 0), /Latitude/);
assert.ok(calls.some(call => call[0] === 'calc_ut' && call[3] === (2 | 65536)));
console.log('Swiss Ephemeris adapter tests passed.');
