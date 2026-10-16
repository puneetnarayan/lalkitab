/**
 * Lal Kitab Teva utilities.
 *
 * IMPORTANT: "fixed natural-zodiac houses" is a commonly taught modern
 * convention, but must be verified against the selected primary edition.
 * Keep the mapping policy explicit so another convention can be added
 * without changing the astronomy engine.
 */
(function (root) {
  'use strict';

  const PLANETS = Object.freeze([
    'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter',
    'Venus', 'Saturn', 'Rahu', 'Ketu'
  ]);
  const SIGNS = Object.freeze([
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ]);
  const HOUSE_MAPPING_POLICIES = Object.freeze({
    FIXED_NATURAL_ZODIAC: 'fixed-natural-zodiac-provisional',
    SOURCE_DEFINED: 'source-defined'
  });

  function normalizeDegrees(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new TypeError('Longitude must be a finite number');
    return ((n % 360) + 360) % 360;
  }

  function signFromLongitude(longitude) {
    return SIGNS[Math.floor(normalizeDegrees(longitude) / 30)];
  }

  function signDegree(longitude) {
    const value = normalizeDegrees(longitude);
    return {
      degree: Math.floor(value % 30),
      minute: Math.floor((value % 1) * 60),
      second: Math.floor((((value % 1) * 60) % 1) * 60)
    };
  }

  /**
   * Provisional mapping: 0° Aries–29°59' Pisces map to houses 1–12.
   * This does NOT use the Parashari Ascendant/whole-sign house calculation.
   */
  function fixedNaturalZodiacHouse(longitude) {
    return Math.floor(normalizeDegrees(longitude) / 30) + 1;
  }

  function buildPlanetInventory(longitudes, options = {}) {
    if (!longitudes || typeof longitudes !== 'object') {
      throw new TypeError('A planet-to-longitude object is required');
    }
    const policy = options.mappingPolicy || HOUSE_MAPPING_POLICIES.FIXED_NATURAL_ZODIAC;
    if (!Object.values(HOUSE_MAPPING_POLICIES).includes(policy)) {
      throw new Error('Unknown Lal Kitab house mapping policy: ' + policy);
    }
    const rows = [];
    for (const planet of PLANETS) {
      const raw = longitudes[planet];
      if (raw === undefined || raw === null || !Number.isFinite(Number(raw))) {
        rows.push({ planet, status: 'missing-calculation', longitude: null, sign: null, house: null });
        continue;
      }
      const longitude = normalizeDegrees(raw);
      const sign = signFromLongitude(longitude);
      const house = policy === HOUSE_MAPPING_POLICIES.FIXED_NATURAL_ZODIAC
        ? fixedNaturalZodiacHouse(longitude)
        : null;
      rows.push({
        planet, status: 'calculated', longitude,
        sign, signDegree: signDegree(longitude), house,
        mappingPolicy: policy,
        mappingConfidence: policy === HOUSE_MAPPING_POLICIES.FIXED_NATURAL_ZODIAC
          ? 'provisional-common-teaching-convention'
          : 'awaiting-source-defined-mapper'
      });
    }
    return rows;
  }

  function groupByHouse(inventory) {
    const houses = Array.from({ length: 12 }, (_, index) => ({
      house: index + 1, planets: []
    }));
    for (const row of inventory || []) {
      if (row.status === 'calculated' && Number.isInteger(row.house) &&
          row.house >= 1 && row.house <= 12) {
        houses[row.house - 1].planets.push(row.planet);
      }
    }
    return houses;
  }

  const api = {
    PLANETS, SIGNS, HOUSE_MAPPING_POLICIES,
    normalizeDegrees, signFromLongitude, signDegree,
    fixedNaturalZodiacHouse, buildPlanetInventory, groupByHouse
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LalKitabChart = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
