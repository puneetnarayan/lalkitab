/**
 * Derivation of UNVERIFIED candidate rules against a calculated chart.
 *
 * Every result is labelled "unverified". Outcomes:
 *  - derived: the candidate's condition is fully computable from the chart
 *    (it may or may not match). It is a statement about what a reported rule
 *    would say, not a validated reading.
 *  - cannot-derive: conditions unknown, ambiguous, disputed or dependent on
 *    missing data. The reason is always stated. Nothing is guessed.
 */
(function (root) {
  'use strict';

  function houseMap(inventory) {
    const m = {};
    for (const p of inventory || []) if (p.status === 'calculated') m[p.planet] = p.house;
    return m;
  }
  const inSet = (h, set) => set.includes(h);
  const result = (rule, status, outcome, reason, detail) => ({
    ruleId: rule.id, title: rule.title, module: rule.module,
    status, outcome, reason, detail: detail || null, label: 'unverified',
    confidence: rule.confidence, source: rule.source
  });
  const missing = (h, names) => names.filter(n => h[n] === undefined);

  function deriveRin(rule, h) {
    const need = (names) => {
      const m = missing(h, names);
      return m.length ? result(rule, 'cannot-derive', null, 'Missing calculated position: ' + m.join(', ')) : null;
    };
    switch (rule.id) {
      case 'LK-CAND-RIN-MOTHER': {
        const m = need(['Moon', 'Ketu']); if (m) return m;
        const met = !inSet(h.Moon, [2, 4]) || h.Ketu === 4;
        return result(rule, 'derived', met ? 'condition-met' : 'condition-not-met',
          'Moon in house ' + h.Moon + ', Ketu in house ' + h.Ketu + ' (reported rule: Moon not in 2/4, or Ketu in 4).');
      }
      case 'LK-CAND-RIN-SIBLING': {
        const m = need(['Mercury', 'Moon']); if (m) return m;
        const met = inSet(h.Mercury, [1, 2, 4, 5, 8, 10, 11]) && inSet(h.Moon, [3, 6]);
        return result(rule, 'derived', met ? 'condition-met' : 'condition-not-met',
          'Mercury in house ' + h.Mercury + ', Moon in house ' + h.Moon + '.');
      }
      case 'LK-CAND-RIN-SPOUSE': {
        const m = need(['Venus', 'Sun', 'Moon', 'Rahu']); if (m) return m;
        const met = inSet(h.Venus, [3, 4, 5, 6, 9, 10, 11]) && ['Sun', 'Moon', 'Rahu'].some(p => inSet(h[p], [2, 7]));
        return result(rule, 'derived', met ? 'condition-met' : 'condition-not-met',
          'Venus in house ' + h.Venus + '; Sun ' + h.Sun + ', Moon ' + h.Moon + ', Rahu ' + h.Rahu + '.');
      }
      case 'LK-CAND-RIN-FATHER-B': {
        const m = need(['Jupiter', 'Mercury', 'Venus', 'Rahu', 'Ketu']); if (m) return m;
        const met = inSet(h.Jupiter, [3, 6, 7, 8, 10]) &&
          ['Mercury', 'Venus', 'Rahu', 'Ketu'].some(p => inSet(h[p], [2, 5, 9, 12]));
        return result(rule, 'derived', met ? 'condition-met' : 'condition-not-met',
          'Jupiter in house ' + h.Jupiter + '. This variant is disputed against variant A and shown for comparison only.');
      }
      case 'LK-CAND-RIN-FATHER-A':
        return result(rule, 'cannot-derive', null,
          'Wording "Mercury in the sign of that planet" is ambiguous (sign ruled by the planet? same sign? in Lal Kitab fixed houses?). Not guessed.');
      default:
        return result(rule, 'cannot-derive', null, 'Conditions were not captured from the source.');
    }
  }

  function derivePakkaGhar(rule, h) {
    const table = rule.conditionsDraft.table;
    const rows = Object.keys(table).filter(p => h[p] !== undefined).map(p => ({
      planet: p, house: h[p], pakkaHouses: table[p], inPakkaGhar: table[p].includes(h[p])
    }));
    return result(rule, 'derived', 'informational',
      'Placement compared with this table; the two available tables disagree for Jupiter and Saturn, so treat those rows as disputed.',
      rows);
  }

  function deriveRelationships(rule, h) {
    const table = rule.conditionsDraft.table;
    const byHouse = {};
    for (const p of Object.keys(h)) (byHouse[h[p]] = byHouse[h[p]] || []).push(p);
    const pairs = [], undetermined = [];
    for (const house of Object.keys(byHouse)) {
      const ps = byHouse[house];
      for (const a of ps) for (const b of ps) {
        if (a === b) continue;
        const row = table[a];
        if (!row) { undetermined.push({ house: +house, from: a, to: b, why: 'No row for ' + a + ' in the reported table' }); continue; }
        const rel = row.friends.includes(b) ? 'friend' : row.enemies.includes(b) ? 'enemy' : row.neutral.includes(b) ? 'neutral' : null;
        if (rel) pairs.push({ house: +house, from: a, to: b, relation: rel });
        else undetermined.push({ house: +house, from: a, to: b, why: 'Not listed in ' + a + "'s row" });
      }
    }
    return result(rule, 'derived', 'informational',
      'Conjunction relations read from each planet\'s own row. The table is asymmetric and has no Jupiter row, so entries are one-directional.',
      { pairs, undetermined });
  }

  /** @returns {{derived:Object[], cannotDerive:Object[]}} */
  function deriveCandidates(rules, inventory) {
    const h = houseMap(inventory);
    const all = [];
    for (const rule of rules || []) {
      if (rule.module === 'rin') all.push(deriveRin(rule, h));
      else if (rule.module === 'pakka-ghar') all.push(derivePakkaGhar(rule, h));
      else if (rule.module === 'planet-relationships') all.push(deriveRelationships(rule, h));
      else if (rule.id === 'LK-CAND-ANDHA-TEVA') all.push(result(rule, 'cannot-derive', null,
        'It is unclear which planet the "enemy planets" are enemies of, and it relies on the unverified relationship table.'));
      else all.push(result(rule, 'cannot-derive', null, 'Formation conditions are unknown or no source was found.'));
    }
    return {
      derived: all.filter(r => r.status === 'derived'),
      cannotDerive: all.filter(r => r.status === 'cannot-derive'),
      remedies: 'None. No candidate has a source-verified remedy, so none are issued.'
    };
  }

  const api = { deriveCandidates };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LalKitabDerivation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
