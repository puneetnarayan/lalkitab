// Swiss Ephemeris browser bridge, adapted from the user's Parashari-Astrology- repo.
// Keep the wrapper as the single source of truth for Swiss Ephemeris API shapes.
// See ephemeris/LICENSE-swisseph-wasm.txt before redistribution or commercial use.
import SwissEph from '../ephemeris/src/swisseph.js';

window.SWISSEPH_READY = false;
window.SWISSEPH_LOAD_ERROR = null;

const normalize360 = value => ((value % 360) + 360) % 360;

function dateToJulianDayUtc(swe, date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError('A valid UTC Date is required for ephemeris calculations.');
  }
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60
    + date.getUTCSeconds() / 3600 + date.getUTCMilliseconds() / 3600000;
  return swe.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), hour);
}

function createSwissEphemerisAdapter(swe) {
  const bodyIds = {
    Sun: swe.SE_SUN, Moon: swe.SE_MOON, Mars: swe.SE_MARS,
    Mercury: swe.SE_MERCURY, Jupiter: swe.SE_JUPITER,
    Venus: swe.SE_VENUS, Saturn: swe.SE_SATURN
  };
  const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SIDEREAL;

  function longitude(bodyId, date) {
    const result = swe.calc_ut(dateToJulianDayUtc(swe, date), bodyId, flags);
    if (!result || typeof result[0] !== 'number' || !Number.isFinite(result[0])) {
      throw new Error('Swiss Ephemeris returned an invalid longitude.');
    }
    return normalize360(result[0]);
  }

  return {
    longitude(name, date) {
      if (name === 'Rahu' || name === 'Ketu') {
        const rahu = longitude(swe.SE_MEAN_NODE, date);
        return name === 'Ketu' ? normalize360(rahu + 180) : rahu;
      }
      if (!Object.prototype.hasOwnProperty.call(bodyIds, name)) throw new Error('Unsupported body: ' + name);
      return longitude(bodyIds[name], date);
    },
    longitudes(date) {
      const result = {};
      Object.keys(bodyIds).forEach(name => { result[name] = this.longitude(name, date); });
      result.Rahu = this.longitude('Rahu', date);
      result.Ketu = this.longitude('Ketu', date);
      return result;
    },
    ascendant(date, latitude, longitude) {
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new RangeError('Latitude must be between -90 and 90 degrees.');
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new RangeError('Longitude must be between -180 and 180 degrees.');
      const jd = dateToJulianDayUtc(swe, date);
      const houses = swe.houses(jd, latitude, longitude, 'P');
      if (!houses || !houses.ascmc || typeof houses.ascmc[0] !== 'number') throw new Error('Swiss Ephemeris did not return an Ascendant.');
      // The Parashari wrapper returns tropical angles from houses(); apply the selected Lahiri ayanamsa.
      const ayanamsa = swe.get_ayanamsa(jd);
      if (!Number.isFinite(ayanamsa)) throw new Error('Swiss Ephemeris returned an invalid ayanamsa.');
      return normalize360(houses.ascmc[0] - ayanamsa);
    }
  };
}

window.createSwissEphemerisAdapter = createSwissEphemerisAdapter;

window.SWISSEPH_INIT_PROMISE = (async () => {
  try {
    const swe = new SwissEph();
    await swe.initSwissEph();
    swe.set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0);
    const adapter = createSwissEphemerisAdapter(swe);
    window.sweSingleLongitude = (name, date) => adapter.longitude(name, date);
    window.swePlanetLongitudes = date => adapter.longitudes(date);
    window.sweAscendantSidereal = (date, latitude, longitude) => adapter.ascendant(date, latitude, longitude);
    window.SWISSEPH_VERSION = typeof swe.version === 'function' ? swe.version() : 'unknown';
    window.SWISSEPH_READY = true;
    document.dispatchEvent(new CustomEvent('swisseph-ready'));
    return true;
  } catch (error) {
    window.SWISSEPH_LOAD_ERROR = error;
    window.SWISSEPH_READY = false;
    document.dispatchEvent(new CustomEvent('swisseph-load-failed', { detail: error }));
    return false;
  }
})();
