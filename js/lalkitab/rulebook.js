/**
 * Deterministic analysis using the project owner's supplied rulebook
 * (data/lalkitab-rulebook.json). Evidence type: user-supplied, UNSOURCED.
 *
 * Each section reports what was derived and what cannot be derived, with
 * reasons. Nothing outside the rulebook is invented; where the rulebook is
 * ambiguous or silent the result is "cannot-derive" or flagged "assumption".
 *
 * @param {Object} book   parsed data/lalkitab-rulebook.json
 * @param {Object} input  { houses: {Planet: houseNumber}, age: number|null,
 *                          relationships?: table used only for Andhi enemy test }
 */
(function (root) {
  'use strict';

  const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  const KENDRA = [1, 4, 7, 10];
  const MALEFICS = ['Saturn', 'Rahu', 'Ketu'];

  const sec = (id, title, status, summary, extra) => Object.assign({ id, title, status, summary }, extra || {});
  const has = (obj, house, planet) => (obj[String(house)] || []).includes(planet);

  function occupants(houses) {
    const m = {};
    for (let i = 1; i <= 12; i++) m[i] = [];
    for (const p of PLANETS) if (houses[p] !== undefined) m[houses[p]].push(p);
    return m;
  }

  function dignity(book, houses) {
    const rows = [];
    for (const p of PLANETS) {
      const h = houses[p];
      if (h === undefined) { rows.push({ planet: p, status: 'cannot-derive', reason: 'Position missing' }); continue; }
      const reasons = [];
      if (has(book.pacca, h, p)) reasons.push('Pacca Ghar');
      if (has(book.exalted, h, p)) reasons.push('Exalted');
      if (has(book.debilitated, h, p)) reasons.push('Debilitated');
      if (has(book.ownSigns.houses, h, p)) reasons.push('Own sign (assumption: standard rulership)');
      const grahfal = reasons.length > 0;
      rows.push({
        planet: p, house: h, result: grahfal ? 'Grahfal' : 'Rashiphal', reasons,
        remedyAllowed: !grahfal,
        remedyNote: grahfal ? 'Direct remedy not allowed; the rulebook says to use Masnooi (artificial planet) proxy techniques, but gives no proxy table.' : 'Direct remedy allowed by the rulebook (no remedy content is supplied).'
      });
    }
    return sec('dignity', 'Dignity audit (Grahfal / Rashiphal)', 'derived',
      'Classification from the supplied Pacca Ghar, exaltation and debilitation tables. Own-sign uses standard rulership, which is not in the supplied rulebook.', { rows });
  }

  function chartTypes(book, houses, occ, relationships) {
    const out = [];
    // Nabalik
    const kendraOk = KENDRA.every(h => {
      const o = occ[h];
      return o.length === 0 || o.every(p => MALEFICS.includes(p)) || (o.length === 1 && o[0] === 'Mercury');
    });
    out.push({ id: 'nabalik', name: 'Nabalik Kundali', status: 'derived', present: kendraOk,
      detail: 'Each of houses 1, 4, 7, 10 is empty, holds only Saturn/Rahu/Ketu, or holds Mercury alone (per-house reading of the rule; the wording is slightly ambiguous).',
      interpretation: kendraOk ? 'Destiny is described as dormant/uncertain until age 12; direct fortune predictions are unconfirmed.' : null });
    // Andhi
    const o10 = occ[10];
    if (o10.length < 2) {
      out.push({ id: 'andhi', name: 'Andhi Kundali', status: 'derived', present: false, detail: 'House 10 holds fewer than 2 planets.' });
    } else if (!relationships) {
      out.push({ id: 'andhi', name: 'Andhi Kundali', status: 'cannot-derive', reason: 'House 10 holds 2+ planets but the rulebook gives no enemy table, so "mutual enemies" cannot be tested.' });
    } else {
      const deb = o10.filter(p => has(book.debilitated, 10, p));
      const mutual = [];
      for (const a of o10) for (const b of o10) {
        if (a < b && relationships[a] && relationships[b] && relationships[a].enemies.includes(b) && relationships[b].enemies.includes(a)) mutual.push(a + '/' + b);
      }
      const present = deb.length >= 2 || mutual.length > 0;
      out.push({ id: 'andhi', name: 'Andhi Kundali', status: 'derived', present,
        detail: 'Mutual-enemy test uses the UNVERIFIED web-sourced relationship table (not part of the rulebook). Mutual enemies found: ' + (mutual.join(', ') || 'none') + '; debilitated in house 10: ' + (deb.join(', ') || 'none') + '.',
        usesUnverifiedInput: true,
        interpretation: present ? 'Chart is described as behaving blindly; overall fortune unpredictable.' : null });
    }
    // Aadha Andha
    const aadha = houses.Sun === 4 && houses.Saturn === 7;
    out.push({ id: 'aadha-andha', name: 'Aadha Andha Tewa', status: 'derived', present: aadha,
      detail: 'Sun in house ' + houses.Sun + ', Saturn in house ' + houses.Saturn + '.',
      interpretation: aadha ? 'Partial blindness in financial and career outcomes; daytime actions yield mixed results.' : null });
    // Dharmi
    const clauses = [];
    for (const n of ['Rahu', 'Ketu']) {
      if (houses[n] === 4) clauses.push(n + ' in house 4');
      if (houses[n] !== undefined && houses[n] === houses.Moon) clauses.push(n + ' conjunct Moon');
    }
    if (houses.Saturn === 11) clauses.push('Saturn in house 11');
    if (houses.Saturn !== undefined && houses.Saturn === houses.Jupiter) clauses.push('Saturn conjunct Jupiter');
    out.push({ id: 'dharmi', name: 'Dharmi Kundali', status: 'derived', present: clauses.length > 0,
      detail: clauses.length ? 'Matched: ' + clauses.join('; ') : 'No clause matched.',
      interpretation: clauses.length ? 'Malefics (Saturn, Rahu, Ketu) are described as becoming neutral/righteous and ceasing active harm.' : null });
    return sec('chart-types', 'Chart classification', 'derived', 'Global chart conditions from the supplied rulebook.', { items: out });
  }

  function nabalikRemedy(book, age, isNabalik) {
    if (!isNabalik) return null;
    if (age === null || age < 1 || age > 12) return { status: 'not-applicable', reason: 'Native is outside the 1-12 age table.' };
    const row = book.nabalikLookup.find(r => r.age === age);
    return { status: 'partial', age, house: row.house, lord: row.lord,
      reason: 'The rulebook only names which house\'s remedy applies at this age; it supplies no remedy text, so none can be given.' };
  }

  function aspects(book, houses, occ) {
    const list = [];
    for (const a of book.aspects) {
      if (occ[a.from].length === 0) continue;
      list.push({ from: a.from, to: a.to, percent: a.percent, note: a.note || null,
        by: occ[a.from].slice(), targetOccupants: occ[a.to].slice() });
    }
    const incoming = new Set(book.aspects.filter(a => occ[a.from].length).map(a => a.to));
    const soyaGhar = [];
    for (let h = 1; h <= 12; h++) if (occ[h].length === 0 && !incoming.has(h)) soyaGhar.push(h);
    const soyaGrah = [];
    for (const p of PLANETS) {
      const h = houses[p];
      if (h === undefined || h > 6) continue;
      const targets = book.aspects.filter(a => a.from === h).map(a => a.to);
      if (targets.length && targets.every(t => occ[t].length === 0)) soyaGrah.push({ planet: p, house: h, emptyTargets: targets });
    }
    return sec('aspects', 'Aspects (drishti) and dormant states', 'derived',
      'Fixed look matrix from the rulebook. Soya Grah uses "all aspected target houses empty" for planets in houses 1-6 (houses with two targets are ambiguous in the wording). Activation "by age cycle or Varshphal" is not computed.',
      { aspects: list, soyaGhar, soyaGrah, incomplete: 'Companion (Sathi) and collision (Takkar) rules are mentioned but not defined, so they are not applied.' });
  }

  function masnooi(book, occ) {
    const found = [];
    for (let h = 1; h <= 12; h++) {
      for (const m of book.masnooi) {
        if (m.pair.every(p => occ[h].includes(p))) found.push({ house: h, pair: m.pair, forms: m.forms, meaning: m.meaning });
      }
      const amb = book.masnooiAmbiguous;
      if (amb.pair.every(p => occ[h].includes(p))) {
        found.push({ house: h, pair: amb.pair, ambiguous: true, alt: amb.alt, note: amb.note });
      }
    }
    return sec('masnooi', 'Masnooi (artificial) planets', 'derived',
      'Pairs sharing a house, checked against the supplied table. Only two-planet pairs are defined; larger groups are not interpreted.', { items: found });
  }

  function timing(book, houses, age) {
    const rows = book.activationAges.map(a => ({
      planet: a.planet, age: a.age, domain: a.domain, house: houses[a.planet] === undefined ? null : houses[a.planet],
      phase: age === null ? 'age unknown' : age > a.age ? 'passed' : age === a.age ? 'current' : 'upcoming'
    }));
    return sec('timing', '35-year planetary activation ages', 'partial',
      'Activation ages and domains are listed from the rulebook. The rulebook does not say how a planet\'s house changes the outcome, so no event prediction is made.', { rows });
  }

  function qurbani(book, houses) {
    const rows = book.qurbani.map(q => {
      if (q.by && houses[q.afflicted] !== undefined && houses[q.afflicted] === houses[q.by]) {
        return { rule: q.afflicted + ' afflicted by ' + q.by + ' → harms ' + q.harms, domain: q.domain, status: 'partial',
          reason: q.by + ' shares house ' + houses[q.by] + ' with ' + q.afflicted + '. The rulebook does not define "afflicted", so this is shown as a possibility only.' };
      }
      return { rule: q.afflicted + (q.by ? ' afflicted by ' + q.by : ' afflicted') + ' → harms ' + q.harms, domain: q.domain, status: 'cannot-derive',
        reason: q.by ? 'Not co-located; "afflicted" is undefined, so other forms of affliction cannot be tested.' : '"Afflicted" is undefined in the rulebook.' };
    });
    return sec('qurbani', 'Qurbani ka Bakra', 'partial', 'Only the two rules naming a specific afflicting planet can be partly checked.', { rows });
  }

  function consistencyWarnings(book) {
    const w = [];
    const seen = {};
    for (const r of book.nabalikLookup) (seen[r.house] = seen[r.house] || []).push(r.age);
    for (const h of Object.keys(seen)) if (seen[h].length > 1) w.push('Nabalik age table: house ' + h + ' appears for ages ' + seen[h].join(' and ') + '.');
    for (let h = 1; h <= 12; h++) if (!seen[h]) w.push('Nabalik age table: house ' + h + ' does not appear for any age.');
    for (const r of book.nabalikLookup) {
      const expected = book.pacca[String(r.house)] || [];
      const named = r.lord.split('/').map(s => s.trim());
      if (!named.every(n => expected.includes(n))) {
        w.push('Nabalik age ' + r.age + ': house ' + r.house + ' lord given as ' + r.lord + ' but the Pacca Ghar list gives ' + expected.join(' & ') + '.');
      }
    }
    w.push('Sun + Saturn appears twice in the Masnooi table (Mars Manda, and "Debilitated" → Rahu Debilitated) without saying what is debilitated.');
    return w;
  }

  function analyze(book, input) {
    const houses = input.houses || {};
    const occ = occupants(houses);
    const age = typeof input.age === 'number' ? input.age : null;
    const types = chartTypes(book, houses, occ, input.relationships);
    const nab = types.items.find(i => i.id === 'nabalik');
    const sections = [
      types, dignity(book, houses), aspects(book, houses, occ), masnooi(book, occ), timing(book, houses, age), qurbani(book, houses)
    ];
    const remedyPlan = {
      status: 'cannot-derive',
      nabalikLookup: nabalikRemedy(book, age, nab && nab.present),
      rules: book.upayRules,
      reason: 'The rulebook defines how remedies must be performed but contains no remedy content (no items, mantras or actions per planet or house), and does not say how to pick the "planet causing active distress", the Birth Day planet or the Birth Time planet. No upay is issued.'
    };
    const cannot = [
      'Life-domain predictions (Career, Marriage, Health, Personality): the rulebook has no planet-in-house result tables, so no prediction can be derived.',
      'Specific upayas: no remedy content is supplied (see remedial plan).',
      'Birth Day / Birth Time planet routing: the weekday-to-planet mapping and the Birth Time planet definition are not supplied.',
      'Companion (Sathi) and collision (Takkar) aspect rules: mentioned, not defined.'
    ];
    return { provenance: book.provenance, sections, remedyPlan, cannotDerive: cannot, warnings: consistencyWarnings(book) };
  }

  const api = { analyze, occupants };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LalKitabRulebook = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
