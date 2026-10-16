(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  window.LAL_KITAB_RULES = { rules: [] };
  window.LAL_KITAB_CANDIDATES = { rules: [] };
  window.LAL_KITAB_BOOK = null;
  window.LAL_KITAB_250 = null;
  const load = (url, apply) => fetch(url)
    .then(response => { if (!response.ok) throw new Error(url + ' unavailable'); return response.json(); })
    .then(apply)
    .catch(() => {});
  const dataReady = Promise.all([
    load('data/lalkitab-rules.json', d => { window.LAL_KITAB_RULES = d; }),
    load('data/lalkitab-rule-candidates.json', d => { window.LAL_KITAB_CANDIDATES = d; }),
    load('data/lalkitab-rulebook.json', d => { window.LAL_KITAB_BOOK = d; }),
    load('data/lalkitab-250-rules.json', d => { window.LAL_KITAB_250 = d; })
  ]);
  const state = { interp: null, rulebook: null, derivation: null, profile: null, chart: null, inventory: null, activeTab: 'overview', findings: [] };
  window.LAL_KITAB_APP_STATE = state;

  const signs = window.LalKitabChart.SIGNS;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
  const fmt = n => Number(n).toFixed(4) + '°';

  function table(headers, rows) {
    return '<div style="overflow:auto"><table><thead><tr>' + headers.map(h => '<th>' + esc(h) + '</th>').join('') +
      '</tr></thead><tbody>' + rows.map(row => '<tr>' + row.map(v => '<td>' + esc(v) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></div>';
  }

  function chartGrid() {
    const houses = window.LalKitabChart.groupByHouse(state.inventory);
    return '<div class="tiles" style="grid-template-columns:repeat(3,minmax(0,1fr))">' + houses.map(h =>
      '<div class="tile"><span>House ' + h.house + ' · ' + esc(signs[h.house - 1]) + '</span><strong>' +
      (h.planets.length ? h.planets.map(esc).join(', ') : 'No planets listed') + '</strong></div>'
    ).join('') + '</div><p class="hint">Mapping currently uses the provisional fixed natural-zodiac convention (Aries = House 1 through Pisces = House 12). Confirm this against the selected Lal Kitab primary edition before relying on house-specific interpretations.</p>';
  }

  function placements() {
    const rows = state.inventory.map(p => [
      p.planet,
      p.status === 'calculated' ? fmt(p.longitude) : 'Unavailable',
      p.sign || '—',
      p.signDegree ? p.signDegree.degree + '° ' + p.signDegree.minute + "' " + p.signDegree.second + '″' : '—',
      p.house || '—',
      p.mappingConfidence || '—'
    ]);
    return table(['Planet','Sidereal longitude','Sign','Within sign','Provisional house','Mapping status'], rows) +
      '<p class="hint">The astronomy fallback uses the source app’s Lahiri-ayanamsa / mean-node approach. This first integration is not yet benchmark-validated against Swiss Ephemeris WASM; review boundary cases.</p>';
  }

  const OUTCOME = {
    'condition-met': 'Condition met',
    'condition-not-met': 'Condition not met',
    informational: 'Placement read-out'
  };

  function detailHtml(r) {
    if (!r.detail) return '';
    if (r.module === 'pakka-ghar') {
      return table(['Planet','In house','Table lists','In permanent house?'],
        r.detail.map(d => [d.planet, d.house, d.pakkaHouses.join(', '), d.inPakkaGhar ? 'Yes' : 'No']));
    }
    if (r.module === 'planet-relationships') {
      const rows = r.detail.pairs.map(d => ['House ' + d.house, d.from + ' → ' + d.to, d.relation]);
      return (rows.length ? table(['Where','From → to','Relation (from that row)'], rows) : '<p class="hint">No planets share a house.</p>') +
        (r.detail.undetermined.length ? '<p class="hint">Not determinable: ' + r.detail.undetermined.map(d => esc(d.from + '→' + d.to + ' (' + d.why + ')')).join('; ') + '</p>' : '');
    }
    return '';
  }

  const STATUS_LABEL = { derived: 'Derived', partial: 'Partly derived', 'cannot-derive': 'Cannot be derived', 'not-applicable': 'Not applicable' };
  const chip = (status) => '<span class="status"><span class="dot"></span>' + esc(STATUS_LABEL[status] || status) + '</span>';
  const yn = v => v ? 'Present' : 'Not present';

  function pakkaComparison() {
    const book = window.LAL_KITAB_BOOK, cand = window.LAL_KITAB_CANDIDATES.rules;
    if (!book) return '';
    const a = cand.find(r => r.id === 'LK-CAND-PAKKA-GHAR-VARIANT-A'), b = cand.find(r => r.id === 'LK-CAND-PAKKA-GHAR-VARIANT-B');
    if (!a || !b) return '';
    const mine = {};
    Object.keys(book.pacca).forEach(h => book.pacca[h].forEach(p => (mine[p] = mine[p] || []).push(+h)));
    const rows = window.LalKitabChart.PLANETS.map(p => [p, (mine[p] || []).join(', ') || '—',
      (a.conditionsDraft.table[p] || []).join(', ') || '—', (b.conditionsDraft.table[p] || []).join(', ') || '—']);
    return '<h3>Where your rulebook differs from the earlier web-sourced Pakka Ghar tables</h3>' +
      table(['Planet','Your rulebook','Web variant A','Web variant B'], rows) +
      '<p class="hint">These disagree and none is verified. Your rulebook is used for the analysis above; the earlier tables remain on the Rules &amp; Analysis tab.</p>';
  }

  function rulebookSection(s) {
    let body = '';
    if (s.id === 'chart-types') {
      body = s.items.map(i => '<div class="tile" style="margin:8px 0"><strong>' + esc(i.name) + '</strong> · ' +
        (i.status === 'cannot-derive' ? chip('cannot-derive') + '<p>' + esc(i.reason) + '</p>' :
          chip('derived') + ' <strong>' + yn(i.present) + '</strong><p>' + esc(i.detail) + '</p>' +
          (i.interpretation ? '<p><em>' + esc(i.interpretation) + '</em></p>' : '') +
          (i.usesUnverifiedInput ? '<p class="hint">Uses an unverified web-sourced input.</p>' : '')) + '</div>').join('');
    } else if (s.id === 'dignity') {
      body = table(['Planet','House','Result','Why','Direct remedy'], s.rows.map(r => r.status === 'cannot-derive'
        ? [r.planet, '—', 'Cannot be derived', r.reason, '—']
        : [r.planet, r.house, r.result, r.reasons.join(', ') || 'None of the Grahfal conditions', r.remedyAllowed ? 'Allowed' : 'Not allowed']));
    } else if (s.id === 'aspects') {
      body = (s.aspects.length ? table(['From house','To house','Strength','By','Planets in target'], s.aspects.map(a =>
        [a.from, a.to, a.percent === null ? 'Not stated' : a.percent + '%', a.by.join(', '), a.targetOccupants.join(', ') || 'Empty'])) : '<p class="hint">No aspects from occupied houses.</p>') +
        '<p><strong>Soya Ghar (dormant houses):</strong> ' + esc(s.soyaGhar.length ? s.soyaGhar.join(', ') : 'none') + '</p>' +
        '<p><strong>Soya Grah (sleeping planets):</strong> ' + esc(s.soyaGrah.length ? s.soyaGrah.map(g => g.planet + ' (house ' + g.house + ')').join(', ') : 'none') + '</p>' +
        '<p class="hint">' + esc(s.incomplete) + '</p>';
    } else if (s.id === 'masnooi') {
      body = s.items.length ? table(['House','Planets','Forms','Meaning'], s.items.map(i => i.ambiguous
        ? [i.house, i.pair.join(' + '), 'Unresolved: ' + i.alt, i.note] : [i.house, i.pair.join(' + '), i.forms, i.meaning])) : '<p class="hint">No defined pairs share a house.</p>';
    } else if (s.id === 'timing') {
      body = table(['Planet','Activation age','Native\'s house','Phase','Domain named in rulebook'], s.rows.map(r => [r.planet, r.age, r.house === null ? '—' : r.house, r.phase, r.domain]));
    } else if (s.id === 'qurbani') {
      body = table(['Rule','Status','Note'], s.rows.map(r => [r.rule, STATUS_LABEL[r.status], r.reason]));
    }
    return '<h3>' + esc(s.title) + ' ' + chip(s.status) + '</h3><p class="hint">' + esc(s.summary) + '</p>' + body;
  }

  const IS_ACTION = r => r.sectionName === 'Remedies (upay / totka)' || r.sectionName === 'Prohibitions and precautions' || r.domain === 'remedy';
  const AS_BELIEF = 'Traditional belief reported by the source, not a prediction or advice.';

  function ruleCard(r) {
    const flags = [];
    if (r.sensitive) flags.push('<span class="hint">' + AS_BELIEF + '</span>');
    if (r.usesUnverifiedInput) flags.push('<span class="hint">Uses the unverified web-sourced friend/enemy table.</span>');
    if (r.assumption) flags.push('<span class="hint">Assumption: ' + esc(r.assumption) + '</span>');
    if (r.caution) flags.push('<span class="hint"><strong>Caution:</strong> ' + esc(r.caution) + '</span>');
    return '<div class="tile" style="margin:8px 0"><strong>Rule ' + r.number + '</strong> · ' + chip(r.status === 'applies' ? 'derived' : r.status === 'partial' ? 'partial' : r.status) +
      '<p>' + esc(r.text) + '</p>' + (r.detail ? '<p class="hint">' + esc(r.detail) + '</p>' : '') +
      (flags.length ? '<p>' + flags.join('<br>') + '</p>' : '') + '</div>';
  }

  function groupBySection(list) {
    const groups = {};
    list.forEach(r => { (groups[r.section] = groups[r.section] || { name: r.sectionName, items: [] }).items.push(r); });
    return Object.keys(groups).sort().map(k => '<h4>' + esc(groups[k].name) + ' (' + groups[k].items.length + ')</h4>' + groups[k].items.map(ruleCard).join('')).join('');
  }

  function puccaComparison() {
    const b250 = window.LAL_KITAB_250, own = window.LAL_KITAB_BOOK, cand = window.LAL_KITAB_CANDIDATES.rules;
    if (!b250) return '';
    const a = cand.find(r => r.id === 'LK-CAND-PAKKA-GHAR-VARIANT-A'), b = cand.find(r => r.id === 'LK-CAND-PAKKA-GHAR-VARIANT-B');
    const mine = {};
    if (own) Object.keys(own.pacca).forEach(h => own.pacca[h].forEach(p => (mine[p] = mine[p] || []).push(+h)));
    const rows = window.LalKitabChart.PLANETS.map(p => [p, b250.pucca[p].join(', '), (mine[p] || []).join(', ') || '—',
      a ? (a.conditionsDraft.table[p] || []).join(', ') : '—', b ? (b.conditionsDraft.table[p] || []).join(', ') : '—']);
    return '<h4>Permanent house (Pucca Ghar) in the four sources the app holds</h4>' +
      table(['Planet','250-rule file (used here)','Owner rulebook','Web variant A','Web variant B'], rows) +
      '<p class="hint">These disagree and none is verified against a primary edition.</p>';
  }

  function interpretationView() {
    const banner = '<div class="notice"><strong>Unverified compilation.</strong> The 250 rules are an owner-supplied secondary compilation. Its own disclaimer says rules vary across the 1939-1952 editions and must be checked against the original texts and reviewed by a qualified Lal Kitab scholar. Traditional claims are reported as beliefs, not predictions. The fixed house mapping (Aries = 1) is provisional, and nothing here is medical, legal or financial advice.</div>';
    if (!window.LAL_KITAB_250) return banner + empty('Rules not loaded', 'The 250-rule data file could not be loaded. Serve the app over HTTP and reload.');
    if (!state.interp) return banner + empty('Waiting for complete birth details', 'Enter a valid date, time, latitude, longitude and time zone. This view updates automatically.');
    const it = state.interp, c = it.counts;
    const tiles = '<div class="tiles"><div class="tile"><span>Apply to this chart</span><strong>' + (c.applies || 0) + '</strong></div>' +
      '<div class="tile"><span>Partly evaluable</span><strong>' + (c.partial || 0) + '</strong></div>' +
      '<div class="tile"><span>Cannot be evaluated</span><strong>' + (c['cannot-derive'] || 0) + '</strong></div>' +
      '<div class="tile"><span>Evaluated, not applicable</span><strong>' + (c['not-applicable'] || 0) + '</strong></div>' +
      '<div class="tile"><span>General principles</span><strong>' + (c.advisory || 0) + '</strong></div>' +
      '<div class="tile"><span>Untriggered remedy list</span><strong>' + (c.catalogue || 0) + '</strong></div></div>';
    const applies = it.results.filter(r => r.status === 'applies');
    const partial = it.results.filter(r => r.status === 'partial');
    const interp = applies.filter(r => !IS_ACTION(r)), actions = applies.filter(IS_ACTION);
    const occ = table(['House','Sign (fixed)','Planets'], Object.keys(it.occupancy).map(h => [h, signs[h - 1], it.occupancy[h].join(', ') || 'Empty']));
    const asp = it.aspects.length ? table(['Houses','Strength','Planets'], it.aspects.map(a => [a.a + ' ↔ ' + a.b, a.percent + '%', a.planetsA.join(', ') + ' with ' + a.planetsB.join(', ')])) : '<p class="hint">No aspect links between occupied houses.</p>';
    const art = it.artificial.length ? table(['House','Planets','Forms'], it.artificial.map(a => [a.house, a.pair.join(' + '), a.forms + ' (rule ' + a.rule + ')'])) : '<p class="hint">No defined pairs share a house.</p>';
    const cannot = it.results.filter(r => r.status === 'cannot-derive');
    const adv = it.results.filter(r => r.status === 'advisory');
    const cat = it.results.filter(r => r.status === 'catalogue');
    const na = it.results.filter(r => r.status === 'not-applicable').map(r => r.number);
    const wellPlaced = it.results.find(r => r.number === 249 && r.status === 'applies');
    return banner + tiles +
      '<h3>Interpretation: rules that apply (' + interp.length + ')</h3>' + (interp.length ? groupBySection(interp) : '<p class="hint">None.</p>') +
      '<h3>Remedies and precautions triggered by the placements (' + actions.length + ')</h3>' +
      '<div class="notice">Rules from the file for performing any remedy: one remedy at a time (rules 25, 188); daytime, 43 consecutive days, restart if broken (rules 24, 112, 113, 187); keep it private (rules 27, 189); no gemstones without a specific prescription (rules 26, 192). ' +
      (wellPlaced ? esc(wellPlaced.detail) : '') + ' The app does not choose a single planet for you, because the file does not say how.</div>' +
      (actions.length ? groupBySection(actions) : '<p class="hint">None.</p>') +
      (partial.length ? '<h3>Partly evaluable (' + partial.length + ')</h3><p class="hint">The placement part matches; the rest uses a term the file never defines, so no verdict is made.</p>' + partial.map(ruleCard).join('') : '') +
      '<h3>Chart facts used</h3><h4>Houses</h4>' + occ + '<h4>Aspect links (from the file)</h4>' + asp + '<h4>Artificial planets</h4>' + art +
      '<h3>Cannot be evaluated (' + cannot.length + ')</h3><details><summary>Show the rules and why</summary>' + cannot.map(r => '<div class="tile" style="margin:8px 0"><strong>Rule ' + r.number + '</strong><p>' + esc(r.text) + '</p><p class="hint">Why not: ' + esc(r.detail) + '</p></div>').join('') + '</details>' +
      '<h3>General principles and household guidance (' + adv.length + ')</h3><p class="hint">Not chart-dependent, so they are not matched against the chart.</p><details><summary>Show</summary>' + adv.map(r => '<p><strong>' + r.number + '.</strong> ' + esc(r.text) + (r.sensitive ? ' <span class="hint">(' + AS_BELIEF + ')</span>' : '') + '</p>').join('') + '</details>' +
      '<h3>Remedy list with no stated trigger (' + cat.length + ')</h3><p class="hint">The file lists these per planet without saying when to use them, and "afflicted" is undefined. They are not recommended automatically.</p><details><summary>Show</summary>' + cat.map(r => '<p><strong>' + r.number + '. [' + esc(r.planet) + ']</strong> ' + esc(r.text) + (r.caution ? ' <span class="hint"><strong>Caution:</strong> ' + esc(r.caution) + '</span>' : '') + '</p>').join('') + '</details>' +
      '<h3>Evaluated and not applicable (' + na.length + ')</h3><p class="hint">Rule numbers: ' + esc(na.join(', ')) + '</p>' +
      '<h3>Inconsistencies noticed in the file</h3><ul>' + it.inconsistencies.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' + puccaComparison();
  }

  function rulebookView() {
    const banner = '<div class="notice"><strong>Owner-supplied rulebook, not source-verified.</strong> These results apply the rulebook you supplied. It carries no edition or page references and has not been checked against a primary Lal Kitab text. House mapping is the fixed Aries=1 convention it prescribes. Anything the rulebook does not define is listed as not derivable instead of being guessed.</div>';
    if (!state.rulebook) return banner + empty('No chart yet', 'Prepare a chart to run the rulebook.');
    const r = state.rulebook;
    const rp = r.remedyPlan;
    const lookup = rp.nabalikLookup && rp.nabalikLookup.status === 'partial'
      ? '<p><strong>Nabalik remedy lookup (age ' + rp.nabalikLookup.age + '):</strong> house ' + rp.nabalikLookup.house + ' (' + esc(rp.nabalikLookup.lord) + '). ' + esc(rp.nabalikLookup.reason) + '</p>' : '';
    return banner + r.sections.map(rulebookSection).join('') +
      '<h3>Remedial plan ' + chip('cannot-derive') + '</h3><p>' + esc(rp.reason) + '</p>' + lookup +
      '<p><strong>Rules any remedy must follow (from the rulebook):</strong></p><ul>' + rp.rules.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
      '<h3>What cannot be derived from this rulebook</h3><ul>' + r.cannotDerive.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
      '<h3>Inconsistencies noticed in the rulebook</h3><ul>' + r.warnings.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
      pakkaComparison();
  }

  function rulesView() {
    const verified = window.LAL_KITAB_RULES.rules.length;
    const warn = '<div class="notice"><strong>Unverified research candidates.</strong> The results below apply rules collected from secondary web summaries. No primary Lal Kitab edition has been checked, sources disagree in places, and the house mapping is provisional. Treat them as what a reported rule would say, not as a validated reading. Verified rules available: ' + verified + '.</div>';
    if (!state.derivation) return warn + empty('No chart yet', 'Prepare a chart to see which candidate rules can be derived.');
    const d = state.derivation;
    const derived = d.derived.map(r =>
      '<div class="tile" style="margin:10px 0"><strong>' + esc(r.title) + '</strong> · <span class="status"><span class="dot"></span>' +
      esc(OUTCOME[r.outcome] || r.outcome) + ' · unverified</span><p>' + esc(r.reason) + '</p>' + detailHtml(r) +
      '<span class="hint">Source: ' + esc(r.source.title) + ' (' + esc(r.source.evidenceType) + '; no page reference)</span></div>').join('');
    const cannot = d.cannotDerive.map(r =>
      '<div class="tile" style="margin:10px 0"><strong>' + esc(r.title) + '</strong><p>Cannot be derived: ' + esc(r.reason) + '</p></div>').join('');
    return warn + '<h3>Derived from your chart (' + d.derived.length + ')</h3>' + (derived || '<p class="hint">None.</p>') +
      '<h3>Cannot be derived (' + d.cannotDerive.length + ')</h3>' + (cannot || '<p class="hint">None.</p>') +
      '<h3>Remedies</h3><p class="hint">' + esc(d.remedies) + '</p>';
  }

  function remediesView() {
    const findings = state.findings || [];
    const remedyItems = findings.flatMap(f => (f.remedies || []).map(r => ({...r, ruleTitle:f.title, source:f.source})));
    if (!remedyItems.length) return '<div class="empty"><div class="symbol">✿</div><h3>No source-linked remedies to show</h3><p>Remedies will appear only when linked to an eligible rule and accompanied by a source reference. No generic or unverified remedy is recommended.</p></div>';
    return table(['Remedy','Linked rule','Source'], remedyItems.map(r => [r.text || r.description || 'See rule record', r.ruleTitle, r.source.title + ' · ' + r.source.edition + ' · ' + r.source.pageOrSection]));
  }

  function reportView() {
    if (!state.chart) return '<div class="empty"><h3>No chart has been calculated</h3><p>Enter birth details and select Prepare chart.</p></div>';
    return '<h3>Birth profile</h3>' + table(['Field','Value'], [
      ['Label',state.profile.native || 'Not specified'],['Date',state.profile.date],['Local time',state.profile.time],
      ['Place',state.profile.place],['Time zone',state.profile.timezone],
      ['Coordinates',state.profile.latitude + ', ' + state.profile.longitude],
      ['UTC instant',state.chart.utc.toISOString()],['Ascendant',state.chart.ascendant.sign + ' · ' + fmt(state.chart.ascendant.longitude)],
      ['Astronomy engine',state.chart.engine],['House mapping',state.chart.mappingPolicy]
    ]) + '<h3>Placements</h3>' + placements() + '<h3>250-rule compilation (unverified)</h3>' + (state.interp ? '<p class="hint">Apply: ' + state.interp.counts.applies + '; partly evaluable: ' + (state.interp.counts.partial || 0) + '; cannot be evaluated: ' + state.interp.counts['cannot-derive'] + '.</p><ul>' + state.interp.results.filter(r => r.status === 'applies').map(r => '<li>Rule ' + r.number + ': ' + esc(r.text) + (r.sensitive ? ' (traditional belief, not a prediction)' : '') + '</li>').join('') + '</ul>' : '<p class="hint">Not run.</p>') + '<h3>Owner-supplied rulebook (unsourced)</h3>' + (state.rulebook ? '<ul>' + state.rulebook.sections.map(sx => '<li>' + esc(sx.title) + ': ' + esc(STATUS_LABEL[sx.status]) + '</li>').join('') + '<li>Remedial plan: ' + esc(STATUS_LABEL[state.rulebook.remedyPlan.status]) + '</li></ul><p class="hint">Cannot be derived: ' + state.rulebook.cannotDerive.map(esc).join(' ') + '</p>' : '<p class="hint">Not run.</p>') + '<h3>Candidate rules (unverified)</h3><p class="hint">Derived: ' + (state.derivation ? state.derivation.derived.map(r => esc(r.title) + ' – ' + esc(OUTCOME[r.outcome] || r.outcome)).join('; ') : 'none') + '. Cannot be derived: ' + (state.derivation ? state.derivation.cannotDerive.map(r => esc(r.title)).join('; ') : 'none') + '. These come from unverified secondary summaries.</p><p class="hint">Interpretations: ' + (state.findings || []).length + ' eligible source-backed findings. This report is generated from a traditional astrology framework and is not a scientific or medical assessment.</p><div class="btnrow"><button class="btn" type="button" id="printReport">Print / Save as PDF</button></div>';
  }

  function renderActiveTab() {
    const host = $('tabContent');
    if (!host) return;
    switch (state.activeTab) {
      case 'chart':
        host.innerHTML = state.inventory ? chartGrid() : empty('Chart not calculated yet','Enter birth details and prepare the chart first.');
        break;
      case 'placements':
        host.innerHTML = state.inventory ? placements() : empty('Planet table not ready','Calculate the chart first.');
        break;
      case 'interpretation':
        host.innerHTML = interpretationView();
        break;
      case 'rulebook':
        host.innerHTML = rulebookView();
        break;
      case 'rules':
        host.innerHTML = rulesView();
        break;
      case 'remedies':
        host.innerHTML = remediesView();
        break;
      case 'report':
        host.innerHTML = reportView();
        const print = $('printReport');
        if (print) print.addEventListener('click', () => window.print());
        break;
      default:
        host.innerHTML = overview();
    }
  }

  function empty(title, message) {
    return '<div class="empty"><div class="symbol">✧</div><h3>' + esc(title) + '</h3><p>' + esc(message) + '</p></div>';
  }
  function overview() {
    const ready = !!state.chart;
    return '<div class="tiles"><div class="tile"><span>Birth details</span><strong>' + (state.profile ? esc(state.profile.date + ' ' + state.profile.time) : 'Not entered') + '</strong></div>' +
      '<div class="tile"><span>Calculation engine</span><strong>' + (ready ? esc(state.chart.engine) : 'Ready to calculate') + '</strong></div>' +
      '<div class="tile"><span>Active source-backed rules</span><strong>' + window.LAL_KITAB_RULES.rules.filter(r => window.LalKitabRuleSchema.isEligibleForInterpretation(r)).length + '</strong></div></div>' +
      (ready ? '<div class="notice"><strong>Chart calculated.</strong><br>House mapping is provisional and the astronomy fallback has not yet been benchmark-validated. No traditional predictions are enabled without source-verified rules.</div>' :
      '<div class="empty"><div class="symbol">✧</div><h3>Ready to prepare a chart</h3><p>Enter date, time, place, timezone and coordinates. This version calculates a planetary inventory but intentionally does not invent Lal Kitab interpretations.</p></div>');
  }

  async function calculate(form, token) {
    if (window.SWISSEPH_INIT_PROMISE) await window.SWISSEPH_INIT_PROMISE;
    if (token !== seq) return false; // a newer edit superseded this calculation
    if (typeof window.computePlanetLongitudes !== 'function' ||
        typeof window.computeAscendant !== 'function' ||
        typeof window.zonedLocalToUtc !== 'function') {
      throw new Error('Calculation modules failed to load. Please reload the app.');
    }
    const date = form.elements.namedItem('birthDate').value;
    const time = form.elements.namedItem('birthTime').value;
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const utc = window.zonedLocalToUtc(year, month, day, hour, minute, form.elements.namedItem('timezone').value);
    const latitude = Number(form.elements.namedItem('latitude').value);
    const longitude = Number(form.elements.namedItem('longitude').value);
    const longitudes = window.computePlanetLongitudes(utc);
    const ascendantLongitude = window.computeAscendant(utc, latitude, longitude);
    const inventory = window.LalKitabChart.buildPlanetInventory(longitudes, {
      mappingPolicy: window.LalKitabChart.HOUSE_MAPPING_POLICIES.FIXED_NATURAL_ZODIAC
    });
    const ascSign = window.LalKitabChart.signFromLongitude(ascendantLongitude);
    state.profile = {
      native: form.elements.namedItem('native').value.trim(), date, time, place: form.elements.namedItem('place').value.trim(),
      timezone: form.timezone.value, latitude, longitude
    };
    state.inventory = inventory;
    state.chart = {
      utc, ascendant: { longitude: ascendantLongitude, sign: ascSign },
      engine: (window.SWISSEPH_READY ? 'Swiss Ephemeris WASM' + (window.SWISSEPH_VERSION && window.SWISSEPH_VERSION !== 'unknown' ? ' (' + window.SWISSEPH_VERSION + ')' : '') : 'Astronomy-engine fallback (not benchmark-validated)'),
      mappingPolicy: 'Fixed natural-zodiac mapping (provisional)'
    };
    const contexts = inventory.filter(p => p.status === 'calculated').map(p => ({
      planet: p.planet, house: p.house, sign: p.sign,
      housePlanets: inventory.filter(other => other.house === p.house && other.status === 'calculated').map(other => other.planet)
    }));
    state.rulebook = null;
    state.interp = null;
    const houses = {};
    inventory.forEach(p => { if (p.status === 'calculated') houses[p.planet] = p.house; });
    const rel = (window.LAL_KITAB_CANDIDATES.rules.find(r => r.id === 'LK-CAND-PLANET-RELATIONSHIPS') || {}).conditionsDraft;
    const now = new Date();
    let age = now.getUTCFullYear() - year;
    if (now.getUTCMonth() + 1 < month || (now.getUTCMonth() + 1 === month && now.getUTCDate() < day)) age -= 1;
    const analysisInput = { houses, age: age >= 0 ? age : null, relationships: rel ? rel.table : null };
    if (window.LAL_KITAB_BOOK) state.rulebook = window.LalKitabRulebook.analyze(window.LAL_KITAB_BOOK, analysisInput);
    if (window.LAL_KITAB_250) state.interp = window.LalKitabRules250.evaluateAll(window.LAL_KITAB_250, analysisInput);
    state.derivation = window.LalKitabDerivation.deriveCandidates(window.LAL_KITAB_CANDIDATES.rules, inventory);
    state.findings = window.LalKitabRuleEngine.evaluate(window.LAL_KITAB_RULES.rules, contexts);
    return true;
  }

  const form = $('birthForm');
  const REQUIRED = ['birthDate', 'birthTime', 'latitude', 'longitude', 'timezone'];
  let seq = 0, timer = null, firstResult = true;
  const formReady = () => REQUIRED.every(n => { const el = form.elements.namedItem(n); return el && el.value !== '' && el.checkValidity(); });

  function clearResults() {
    state.profile = state.chart = state.inventory = state.derivation = state.rulebook = state.interp = null;
    state.findings = [];
  }

  async function refresh() {
    const token = ++seq;
    if (!formReady()) {
      clearResults();
      $('message').textContent = 'Waiting for a valid date, time, latitude, longitude and time zone.';
      if ($('birthSummary')) $('birthSummary').textContent = 'Not entered';
      renderActiveTab();
      return;
    }
    try {
      await dataReady;
      const done = await calculate(form, token);
      if (done === false || token !== seq) return;
      $('message').textContent = 'Updated automatically using ' + state.chart.engine + '. House mapping is provisional; interpretations are from unverified sources.';
      if ($('birthSummary')) $('birthSummary').textContent = state.profile.date + ' ' + state.profile.time;
      if (firstResult) {
        firstResult = false;
        state.activeTab = 'interpretation';
        document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === 'interpretation')));
        const t = $('sectionTitle'); if (t) t.textContent = 'Native Interpretation';
        const hnt = $('sectionHint'); if (hnt) hnt.textContent = 'The 250-rule compilation applied to this chart.';
      } else {
        state.activeTab = document.querySelector('[data-tab][aria-selected="true"]')?.dataset.tab || 'overview';
      }
      renderActiveTab();
    } catch (error) {
      if (token === seq) $('message').textContent = 'Could not calculate chart: ' + error.message;
    }
  }

  function schedule() {
    clearTimeout(timer);
    $('message').textContent = 'Updating…';
    timer = setTimeout(refresh, 300);
  }

  form.addEventListener('input', schedule);
  form.addEventListener('change', schedule);
  form.addEventListener('submit', event => { event.preventDefault(); clearTimeout(timer); refresh(); });

  document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
    state.activeTab = button.dataset.tab;
    renderActiveTab();
  }));
  // "Clear" empties the fields (the browser default would restore the pre-filled values).
  form.addEventListener('reset', event => {
    event.preventDefault();
    clearTimeout(timer);
    ['native', 'birthDate', 'birthTime', 'place', 'latitude', 'longitude'].forEach(n => { form.elements.namedItem(n).value = ''; });
    refresh();
  });
  refresh(); // pre-filled details are calculated on load
  // If a calculation ran on the fallback engine before the WASM engine finished loading, redo it with WASM.
  document.addEventListener('swisseph-ready', () => {
    if (state.chart && !/Swiss Ephemeris/.test(state.chart.engine)) refresh();
  });
  window.addEventListener('beforeprint', () => { if (state.chart) renderActiveTab(); });
})();
