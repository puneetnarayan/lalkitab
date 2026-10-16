(// eslint-disable-next-line
async function () {
  'use strict';
  window.SWISSEPH_READY = false;
  window.SWISSEPH_LOAD_ERROR = null;

  try {
    const { default: SwissEph } = await import('../ephemeris/src/swisseph.js');
    const swe = new SwissEph();
    window.SWISSEPH_INIT_PROMISE = swe.initSwissEph().then(() => {
      swe.set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0);
      const bodyIds = {
        Sun: swe.SE_SUN, Moon: swe.SE_MOON, Mars: swe.SE_MARS,
        Mercury: swe.SE_MERCURY, Jupiter: swe.SE_JUPITER,
        Venus: swe.SE_VENUS, Saturn: swe.SE_SATURN
      };
      const norm = d => ((d % 360) + 360) % 360;
      const jd = date => swe.julday(
        date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(),
        date.getUTCHours() + date.getUTCMinutes() / 60 +
        date.getUTCSeconds() / 3600 + date.getUTCMilliseconds() / 3600000
      );
      window.sweSingleLongitude = (name, date) => {
        const day = jd(date);
        const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SIDEREAL;
        if (name === 'Rahu' || name === 'Ketu') {
          const node = norm(swe.calc_ut(day, swe.SE_MEAN_NODE, flags)[0]);
          return name === 'Ketu' ? norm(node + 180) : node;
        }
        if (!(name in bodyIds)) throw new Error('Unsupported body: ' + name);
        return norm(swe.calc_ut(day, bodyIds[name], flags)[0]);
      };
      window.swePlanetLongitudes = date => {
        const result = {};
        Object.keys(bodyIds).forEach(name => { result[name] = window.sweSingleLongitude(name, date); });
        result.Rahu = window.sweSingleLongitude('Rahu', date);
        result.Ketu = window.sweSingleLongitude('Ketu', date);
        return result;
      };
      window.sweAscendantSidereal = (date, latitude, longitude) => {
        const houses = swe.houses(jd(date), latitude, longitude, 'P');
        const ayanamsa = swe.get_ayanamsa(jd(date));
        return norm(houses.ascmc[0] - ayanamsa);
      };
      window.SWISSEPH_READY = true;
      document.dispatchEvent(new CustomEvent('swisseph-ready'));
      return true;
    }).catch(error => {
      window.SWISSEPH_LOAD_ERROR = error;
      window.SWISSEPH_READY = false;
      document.dispatchEvent(new CustomEvent('swisseph-load-failed', { detail: error }));
      return false;
    });
    await window.SWISSEPH_INIT_PROMISE;
  } catch (error) {
    window.SWISSEPH_LOAD_ERROR = error;
    window.SWISSEPH_READY = false;
    document.dispatchEvent(new CustomEvent('swisseph-load-failed', { detail: error }));
  }
})();
