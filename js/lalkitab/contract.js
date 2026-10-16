/**
 * Contract for the calculation result that any engine (the Swiss Ephemeris
 * bridge from the Parashari repo, or code produced elsewhere) must hand to
 * the Lal Kitab layer. Engine code lives in js/engine/ and ephemeris/;
 * it must return this shape and nothing Parashari-specific.
 */
(function (root) {
  'use strict';

  const REQUIRED_PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

  /**
   * Expected shape:
   * {
   *   longitudes: { Sun: <0-360 sidereal degrees>, ... all 9 planets },
   *   passport: {
   *     inputs: { date, time, timezone, latitude, longitude },
   *     utc: <ISO string>,
   *     ayanamsa: 'Lahiri' | ...,
   *     nodeType: 'mean' | 'true',
   *     engine: <name>, engineVersion: <string>,
   *     warnings: [<string>]
   *   }
   * }
   */
  function validateCalculationResult(result) {
    const errors = [];
    if (!result || typeof result !== 'object') return ['Result must be an object'];
    const l = result.longitudes;
    if (!l || typeof l !== 'object') {
      errors.push('Missing longitudes');
    } else {
      for (const p of REQUIRED_PLANETS) {
        const v = l[p];
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v >= 360) {
          errors.push('Longitude for ' + p + ' must be a number in [0, 360)');
        }
      }
    }
    const pass = result.passport;
    if (!pass || typeof pass !== 'object') {
      errors.push('Missing calculation passport');
    } else {
      if (!pass.inputs) errors.push('passport.inputs missing');
      if (!pass.utc) errors.push('passport.utc missing');
      if (!pass.ayanamsa) errors.push('passport.ayanamsa missing');
      if (!pass.nodeType) errors.push('passport.nodeType missing');
      if (!pass.engine) errors.push('passport.engine missing');
      if (!Array.isArray(pass.warnings)) errors.push('passport.warnings must be an array');
    }
    return errors;
  }

  const api = { REQUIRED_PLANETS, validateCalculationResult };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LalKitabContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
