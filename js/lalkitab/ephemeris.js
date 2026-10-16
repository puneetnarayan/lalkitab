// Local (offline) ephemeris. Ported/adapted from the sibling KP app's
// ephemeris.js — the underlying astronomy math (sidereal longitudes, mean
// lunar node, Lahiri ayanamsa) is identical for any Vedic technique.
// Swiss Ephemeris WASM (swissephBridge.js) is the primary engine; this
// file's astronomy-engine calculation is only the automatic fallback.

const EPHEMERIS_LOGIC_TEXT = [
  ['Ephemeris — Logic and Sequence'],
  [''],
  ['0. PRIMARY ENGINE: the real Swiss Ephemeris, compiled to WebAssembly (js/swissephBridge.js), is used whenever it has finished loading (window.SWISSEPH_READY). It typically finishes loading within a fraction of a second of the page opening. Only if it is still loading, or failed to load at all, does this file\'s own astronomy-engine-based calculation below run instead, as an automatic, seamless fallback.'],
  ['1. [Fallback engine] Astronomy-engine computes each planet\'s TROPICAL geocentric ecliptic longitude (0-360°) for the given date/time, entirely offline from its built-in analytic/VSOP87 models — no network call is made.'],
  ['2. Parashari (classical Vedic) astrology uses the SIDEREAL zodiac, offset from the tropical zodiac by the "ayanamsa" (precession of the equinoxes). This app uses the Lahiri ayanamsa, the most common choice for Parashari practice.'],
  ['3. [Fallback engine] Sidereal longitude = Tropical longitude - Ayanamsa (wrapped to 0-360°). Swiss Ephemeris computes this natively via its own sidereal mode instead.'],
  ['4. Rahu and Ketu are not physical planets — they are the Moon\'s two orbital nodes. This app computes the MEAN ascending node (Rahu), the smoothed long-term-average node position (the standard choice in most classical Parashari software), rather than the instantaneous true node. Ketu is exactly 180° opposite it.'],
  [''],
  ['Caveat: Ayanamsa choice (Lahiri here) is the single biggest source of disagreement between different Vedic software — if your other software uses a different ayanamsa, sign placements may shift by up to ~1°. Swiss Ephemeris here is licensed AGPL-3.0-or-later — fine for this app\'s personal, single-user, non-distributed use, but revisit before ever sharing or hosting this app for others.']
];

function lahiriAyanamsaDegrees(date) {
  const jd = astronomyDateToJulianDay(date);
  const t = (jd - 2451545.0) / 36525.0;
  const ayanamsaAtJ2000 = 23.85337988;
  const precessionRatePerCentury = 1.396042;
  return ayanamsaAtJ2000 + precessionRatePerCentury * t;
}

function astronomyDateToJulianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function normalizeDegrees(deg) {
  return ((deg % 360) + 360) % 360;
}

const BODY_NAME_MAP = {
  Sun: 'Sun', Moon: 'Moon', Mars: 'Mars', Mercury: 'Mercury',
  Jupiter: 'Jupiter', Venus: 'Venus', Saturn: 'Saturn'
};

function tropicalLongitude(bodyName, date) {
  const vector = Astronomy.GeoVector(BODY_NAME_MAP[bodyName], date, true);
  const ecliptic = Astronomy.Ecliptic(vector);
  return normalizeDegrees(ecliptic.elon);
}

function meanLunarNodeLongitude(date) {
  const jd = astronomyDateToJulianDay(date);
  const t = (jd - 2451545.0) / 36525.0;
  const omega = 125.0445479 - 1934.1362891 * t + 0.0020754 * t * t + t * t * t / 467441 - t * t * t * t / 60616000;
  return normalizeDegrees(omega);
}

// Sidereal longitudes (Parashari zodiac) for all 9 planets/nodes at the given date.
function computePlanetLongitudes(date) {
  if (typeof window !== 'undefined' && window.SWISSEPH_READY) {
    return window.swePlanetLongitudes(date);
  }
  const ayanamsa = lahiriAyanamsaDegrees(date);
  const result = {};
  Object.keys(BODY_NAME_MAP).forEach(name => {
    result[name] = normalizeDegrees(tropicalLongitude(name, date) - ayanamsa);
  });
  const rahuTropical = meanLunarNodeLongitude(date);
  result.Rahu = normalizeDegrees(rahuTropical - ayanamsa);
  result.Ketu = normalizeDegrees(result.Rahu + 180);
  return result;
}

function computeSingleLongitude(bodyName, date) {
  if (typeof window !== 'undefined' && window.SWISSEPH_READY) {
    return window.sweSingleLongitude(bodyName, date);
  }
  const ayanamsa = lahiriAyanamsaDegrees(date);
  if (bodyName === 'Rahu') return normalizeDegrees(meanLunarNodeLongitude(date) - ayanamsa);
  if (bodyName === 'Ketu') return normalizeDegrees(meanLunarNodeLongitude(date) - ayanamsa + 180);
  return normalizeDegrees(tropicalLongitude(bodyName, date) - ayanamsa);
}

// Sidereal Ascendant longitude — used to determine the whole-sign D1 house 1.
// Swiss Ephemeris computes this via its houses() call (cheap, ~17us);
// fallback uses astronomy-engine's sidereal-time-based local ecliptic.
function computeAscendant(date, latitude, longitude) {
  if (typeof window !== 'undefined' && window.SWISSEPH_READY) {
    return window.sweAscendantSidereal(date, latitude, longitude);
  }
  const ayanamsa = lahiriAyanamsaDegrees(date);
  const jd = astronomyDateToJulianDay(date);
  const gst = Astronomy.SiderealTime(date); // hours
  const lst = normalizeDegrees(gst * 15 + longitude); // local sidereal time, degrees
  const obliquity = 23.4392911; // mean obliquity, degrees, close enough for a fallback
  const latRad = latitude * Math.PI / 180;
  const oblRad = obliquity * Math.PI / 180;
  const lstRad = lst * Math.PI / 180;
  const y = -Math.cos(lstRad);
  const x = Math.sin(lstRad) * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad);
  // atan2(y, x) here lands on the DESCENDANT (verified against Swiss
  // Ephemeris across multiple latitudes/dates: consistently exactly 180°
  // off) rather than the Ascendant, so add 180° to get the actual Ascendant.
  let ascTropical = normalizeDegrees(Math.atan2(y, x) * 180 / Math.PI + 180);
  return normalizeDegrees(ascTropical - ayanamsa);
}

function isRetrogradeNow(bodyName, date) {
  if (bodyName === 'Sun' || bodyName === 'Moon') return false;
  if (bodyName === 'Rahu' || bodyName === 'Ketu') return true;
  const now = computePlanetLongitudes(date)[bodyName];
  const later = computePlanetLongitudes(new Date(date.getTime() + 86400000))[bodyName];
  const forwardMotion = ((later - now + 540) % 360) - 180; // signed shortest delta
  return forwardMotion < 0;
}

if (typeof module !== 'undefined') {
  module.exports = {
    EPHEMERIS_LOGIC_TEXT, computePlanetLongitudes, computeSingleLongitude,
    computeAscendant, isRetrogradeNow, lahiriAyanamsaDegrees, normalizeDegrees
  };
}
