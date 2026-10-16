/**
 * Evaluates the owner-supplied "250 Rules of Lal Kitab" compilation
 * (data/lalkitab-250-rules.json) against a chart.
 *
 * The compilation is an UNVERIFIED secondary source. Each rule gets one status:
 *  - applies         the rule's chart condition is met
 *  - partial         part of the condition is met; the rest uses a term the file never defines
 *  - not-applicable  the condition is evaluable and not met
 *  - cannot-derive   the rule needs data/definitions the file does not give (reason stated)
 *  - advisory        general principle or household guidance, not chart-dependent
 *  - catalogue       planet remedy offered without a stated trigger; never auto-recommended
 * Nothing is guessed: undefined terms ("malefic", "afflicted", "weak") are never evaluated.
 */
(function (root) {
  'use strict';

  const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

  function buildContext(book, input) {
    const houses = input.houses || {};
    const occ = {};
    for (let i = 1; i <= 12; i++) occ[i] = [];
    for (const p of PLANETS) if (houses[p] !== undefined) occ[houses[p]].push(p);
    const rel = input.relationships || null;
    const aspectsOf = {}; // house -> [{from, percent}] from OCCUPIED houses
    for (let h = 1; h <= 12; h++) aspectsOf[h] = [];
    for (const a of book.aspects) {
      if (occ[a.a].length) aspectsOf[a.b].push({ from: a.a, percent: a.percent });
      if (occ[a.b].length) aspectsOf[a.a].push({ from: a.b, percent: a.percent });
    }
    const relation = (a, b) => {
      if (!rel || !rel[a] || !rel[b]) return null;
      const enemy = rel[a].enemies.includes(b) || rel[b].enemies.includes(a);
      const friend = rel[a].friends.includes(b) || rel[b].friends.includes(a);
      return enemy && !friend ? 'enemy' : friend && !enemy ? 'friend' : enemy && friend ? 'mixed' : 'neutral';
    };
    return { book, houses, occ, aspectsOf, rel, relation, age: input.age };
  }

  function evalCond(c, ctx) {
    if (c.in) return ctx.houses[c.in[0]] !== undefined && c.in[1].includes(ctx.houses[c.in[0]]);
    if (c.empty) return c.empty.every(h => ctx.occ[h].length === 0);
    if (c.together) { const hs = c.together.map(p => ctx.houses[p]); return hs.every(h => h !== undefined) && hs.every(h => h === hs[0]); }
    if (c.cluster) return Object.values(ctx.occ).some(o => o.length >= c.cluster);
    if (c.cmp) { const [a, op, b] = c.cmp; return op === '>' && ctx.occ[a].length > ctx.occ[b].length; }
    if (c.all) return c.all.every(x => evalCond(x, ctx));
    if (c.any) return c.any.some(x => evalCond(x, ctx));
    throw new Error('Unknown condition');
  }

  const R = (status, detail, extra) => Object.assign({ status, detail: detail || null }, extra || {});
  const NA = detail => R('not-applicable', detail);

  const FN = {
    puccaGhar(ctx) {
      const hits = PLANETS.filter(p => ctx.houses[p] !== undefined && ctx.book.pucca[p].includes(ctx.houses[p]));
      return hits.length ? R('applies', hits.map(p => p + ' in house ' + ctx.houses[p]).join('; ') + ' (in its Pucca Ghar: generally good results).') : NA('No planet is in its Pucca Ghar.');
    },
    puccaEnemy(ctx) {
      if (!ctx.rel) return R('cannot-derive', 'Needs an enemy table, which this file does not supply.');
      const hits = [];
      for (const p of PLANETS) {
        const h = ctx.houses[p]; if (h === undefined || ctx.book.pucca[p].includes(h)) continue;
        for (const home of ctx.book.pucca[p]) for (const q of ctx.occ[home]) if (ctx.relation(p, q) === 'enemy') hits.push(p + ' sits in house ' + h + '; its Pucca Ghar (house ' + home + ') holds enemy ' + q);
      }
      return hits.length ? R('applies', hits.join('; ') + '. The rule says the enemy spoils the good results of the house where the displaced planet sits.', { usesUnverifiedInput: true })
        : NA('No displaced planet has an enemy in its Pucca Ghar (using the unverified enemy table).');
    },
    blindPlanet(ctx) {
      if (!ctx.rel) return R('cannot-derive', 'Needs an enemy table, which this file does not supply.');
      const hits = [];
      for (const p of PLANETS) {
        const h = ctx.houses[p]; if (h === undefined) continue;
        for (const home of ctx.book.pucca[p]) for (const q of ctx.occ[home]) if (q !== p && ctx.relation(p, q) === 'enemy') hits.push(p + ' (Pucca Ghar house ' + home + ' held by enemy ' + q + ')');
      }
      return hits.length ? R('applies', 'Blind planets: ' + hits.join('; '), { usesUnverifiedInput: true }) : NA('No planet has an enemy in its Pucca Ghar (unverified enemy table).');
    },
    eleven_vs_one(ctx) {
      if (!ctx.rel) return R('cannot-derive', 'Needs an enemy table, which this file does not supply.');
      const bad = [];
      for (const a of ctx.occ[11]) for (const b of ctx.occ[1]) if (ctx.relation(a, b) === 'enemy') bad.push(a + ' (11th) vs ' + b + ' (1st)');
      if (!ctx.occ[11].length || !ctx.occ[1].length) return NA('House 1 or 11 is empty.');
      return bad.length ? R('applies', bad.join('; ') + ': results of the 11th house (gains) are described as adversely affected.', { usesUnverifiedInput: true }) : NA('No inimical pairs between houses 11 and 1 (unverified enemy table).');
    },
    one_eight_friend(ctx) {
      if (!ctx.rel) return R('cannot-derive', 'Needs an enemy table, which this file does not supply.');
      if (!ctx.occ[1].length || !ctx.occ[8].length) return NA('House 1 or 8 is empty.');
      const rels = [];
      for (const a of ctx.occ[1]) for (const b of ctx.occ[8]) rels.push(ctx.relation(a, b));
      const verdict = rels.every(r => r === 'friend') ? 'friendly' : rels.includes('enemy') ? 'inimical (at least one pair)' : 'mixed / neutral';
      return R('applies', 'Planets of houses 1 and 8 are ' + verdict + '. Friendly: 7th-house planets are controlled well; inimical: 7th-house results become unpredictable.', { usesUnverifiedInput: true });
    },
    blindHouses(ctx) {
      const e = Object.keys(ctx.occ).filter(h => !ctx.occ[h].length).map(Number);
      return e.length ? R('applies', 'Empty (blind) houses: ' + e.join(', ') + '. They do not actively produce results on their own.') : NA('No empty houses.');
    },
    eleven_modifies_2(ctx) {
      if (!ctx.rel) return R('cannot-derive', 'Needs an enemy table, which this file does not supply.');
      if (!ctx.occ[8].length || !ctx.occ[11].length) return NA('House 8 or 11 is empty.');
      const rels = [];
      for (const a of ctx.occ[11]) for (const b of ctx.occ[8]) rels.push(ctx.relation(a, b));
      return R('applies', 'Planets of 11 and 8 are ' + (rels.every(r => r === 'friend') ? 'friendly (favourable)' : rels.includes('enemy') ? 'inimical in at least one pair (unfavourable)' : 'mixed / neutral') + '.', { usesUnverifiedInput: true });
    },
    eight_to_two(ctx) { return ctx.occ[8].length ? R('applies', ctx.occ[8].join(', ') + ' in house 8 aspect house 2 (' + (ctx.occ[2].join(', ') || 'empty') + '), affecting finance and family.') : NA('House 8 is empty.'); },
    two_to_six(ctx) { return ctx.occ[2].length ? R('applies', ctx.occ[2].join(', ') + ' in house 2 aspect house 6 (' + (ctx.occ[6].join(', ') || 'empty') + '), affecting enemies, debts and illness.') : NA('House 2 is empty.'); },
    one_to_seven(ctx) { return ctx.occ[1].length && ctx.occ[7].length ? R('applies', 'Planets of house 1 (' + ctx.occ[1].join(', ') + ') fully aspect house 7 (' + ctx.occ[7].join(', ') + '): this determines the quality of partnerships and marriage.') : NA('House 1 or 7 is empty.'); },
    fifthFrom(ctx) {
      const out = [];
      for (const x of PLANETS) for (const y of PLANETS) {
        if (x === y || ctx.houses[x] === undefined || ctx.houses[y] === undefined) continue;
        if (((ctx.houses[x] + 3) % 12) + 1 === ctx.houses[y]) out.push(y + ' (house ' + ctx.houses[y] + ') is 5th from ' + x + ' (house ' + ctx.houses[x] + ') and helps it');
      }
      return out.length ? R('applies', out.join('; '), { note: 'Direction of help read from "planet in the 5th house from another planet helps that other planet".' }) : NA('No planet sits 5th from another.');
    },
    inimicalTogether(ctx) { return pairsTogether(ctx, 'enemy', 'Inimical planets share a house but, per the rule, do not behave as enemies there: '); },
    friendlyTogether(ctx) { return pairsTogether(ctx, 'friend', 'Friendly planets share a house and help each other: '); },
    femaleSaturn(ctx) {
      const out = [];
      for (const f of ['Moon', 'Venus']) {
        const h = ctx.houses[f]; if (h === undefined || ctx.houses.Saturn !== h) continue;
        const aspecting = [];
        for (const a of ctx.aspectsOf[h]) for (const p of ctx.occ[a.from]) aspecting.push(p + ' (house ' + a.from + ')');
        if (aspecting.length) out.push(f + ' + Saturn in house ' + h + ' aspected from ' + aspecting.join(', '));
      }
      return out.length ? R('applies', out.join('; ') + ': the aspecting planet(s) become afflicted. "Afflicted" effects are not defined further.') : NA('No Moon/Venus + Saturn conjunction receiving an aspect.');
    },
    clusterBlind(ctx) {
      const e = Object.keys(ctx.occ).filter(h => !ctx.occ[h].length).length;
      return e ? R('partial', e + ' of 12 houses are empty. The rule says "many" empty houses unbalance life, but gives no threshold, so no verdict is made.') : NA('No empty houses.');
    },
    manyBlind(ctx) {
      const e = Object.keys(ctx.occ).filter(h => !ctx.occ[h].length).length;
      return e ? R('partial', e + ' empty houses. The rule applies to charts with "many", which is not quantified; consider lighting and ventilating all rooms if you treat this as many.') : NA('No empty houses.');
    },
    lonePlanet(ctx) {
      const out = PLANETS.filter(p => ctx.houses[p] !== undefined && ctx.occ[ctx.houses[p]].length === 1 && !ctx.aspectsOf[ctx.houses[p]].length);
      return out.length ? R('applies', out.map(p => p + ' (house ' + ctx.houses[p] + ')').join(', ') + ' act purely by their own nature and the house significations.') : NA('No planet is alone without aspect.');
    },
    sleeping(ctx) {
      const out = PLANETS.filter(p => {
        const h = ctx.houses[p]; if (h === undefined) return false;
        return !ctx.book.pucca[p].includes(h) && ctx.occ[h].length === 1 && !ctx.aspectsOf[h].length;
      });
      return out.length ? R('applies', 'Sleeping planets: ' + out.map(p => p + ' (house ' + ctx.houses[p] + ')').join(', ') + '. Produces neither good nor bad results until awakened.', { assumption: 'Treats "not in its Pucca Ghar" as "non-dominating house"; the file does not define that term.' }) : NA('No planet is sleeping under this reading.');
    },
    puccaNeverSleeping(ctx) {
      const out = PLANETS.filter(p => ctx.houses[p] !== undefined && ctx.book.pucca[p].includes(ctx.houses[p]));
      return out.length ? R('applies', out.join(', ') + ' in Pucca Ghar: never sleeping.') : NA('No planet is in its Pucca Ghar.');
    },
    aspectedNotSleeping(ctx) {
      const out = PLANETS.filter(p => ctx.houses[p] !== undefined && ctx.aspectsOf[ctx.houses[p]].length);
      return out.length ? R('applies', out.map(p => p + ' (house ' + ctx.houses[p] + ')').join(', ') + ' receive an aspect and are therefore active.') : NA('No planet receives an aspect.');
    },
    conjunctNotSleeping(ctx) {
      const out = PLANETS.filter(p => ctx.houses[p] !== undefined && ctx.occ[ctx.houses[p]].length > 1);
      return out.length ? R('applies', out.join(', ') + ' share a house with another planet and are therefore active.') : NA('No planet shares a house.');
    },
    allPlanetsPresent() { return R('advisory', 'All nine planets exist in every chart; a planet that seems missing is dormant.'); },
    leaveWellPlaced(ctx) {
      const out = PLANETS.filter(p => ctx.houses[p] !== undefined && ctx.book.pucca[p].includes(ctx.houses[p]));
      return out.length ? R('applies', 'Do not perform remedies for: ' + out.join(', ') + ' (in Pucca Ghar, i.e. well placed). Exalted planets cannot be identified because no exaltation table is supplied.') : NA('No planet is identifiable as well placed.');
    }
  };

  function pairsTogether(ctx, wanted, lead) {
    if (!ctx.rel) return R('cannot-derive', 'Needs an enemy/friend table, which this file does not supply.');
    const out = [];
    for (let h = 1; h <= 12; h++) { const o = ctx.occ[h]; for (let i = 0; i < o.length; i++) for (let j = i + 1; j < o.length; j++) if (ctx.relation(o[i], o[j]) === wanted) out.push(o[i] + ' + ' + o[j] + ' (house ' + h + ')'); }
    return out.length ? R('applies', lead + out.join('; '), { usesUnverifiedInput: true }) : NA('No such pairs (unverified relationship table).');
  }

  function evaluateRule(rule, ctx) {
    const base = { id: rule.id, number: rule.number, section: rule.section, sectionName: rule.sectionName, subsection: rule.subsection || null,
      text: rule.text, domain: rule.domain || null, sensitive: !!rule.sensitive, caution: rule.caution || null };
    let res;
    switch (rule.kind) {
      case 'advisory': res = R('advisory'); break;
      case 'catalogue': res = R('catalogue', 'Remedy for ' + rule.planet + ' with no stated trigger.', { planet: rule.planet }); break;
      case 'cannot': res = R('cannot-derive', rule.reason); break;
      case 'cond': {
        const missingPlanet = JSON.stringify(rule.when).match(/"(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)"/g);
        if ((missingPlanet || []).some(m => ctx.houses[m.replace(/"/g, '')] === undefined)) { res = R('cannot-derive', 'A required planet position is missing.'); break; }
        const met = evalCond(rule.when, ctx);
        res = met ? (rule.partialNote ? R('partial', 'Placement matches. ' + rule.partialNote) : R('applies', 'Condition met by this chart.')) : NA('Condition not met.');
        break;
      }
      case 'fn': res = FN[rule.fn](ctx); break;
      default: res = R('cannot-derive', 'Unknown rule kind.');
    }
    return Object.assign(base, res);
  }

  function evaluateAll(book, input) {
    const ctx = buildContext(book, input);
    const results = book.rules.map(r => evaluateRule(r, ctx));
    const counts = {};
    for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
    // Masnooi/artificial planets formed
    const artificial = [];
    for (let h = 1; h <= 12; h++) for (const a of book.artificialPlanets) if (a.pair.every(p => ctx.occ[h].includes(p))) artificial.push({ house: h, pair: a.pair, forms: a.forms, rule: a.rule });
    // aspect list between occupied houses
    const aspects = book.aspects.filter(a => ctx.occ[a.a].length && ctx.occ[a.b].length).map(a => ({ a: a.a, b: a.b, percent: a.percent, planetsA: ctx.occ[a.a], planetsB: ctx.occ[a.b] }));
    return { provenance: book.provenance, results, counts, artificial, aspects, occupancy: ctx.occ, inconsistencies: book.inconsistencies };
  }

  const api = { evaluateAll, evaluateRule, buildContext, evalCond };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LalKitabRules250 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
