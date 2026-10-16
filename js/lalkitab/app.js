(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  window.LAL_KITAB_RULES = { rules: [] };
  fetch('data/lalkitab-rules.json')
    .then(response => { if (!response.ok) throw new Error('Rule registry unavailable'); return response.json(); })
    .then(data => { window.LAL_KITAB_RULES = data; })
    .catch(() => { window.LAL_KITAB_RULES = { rules: [] }; });
  window.LAL_KITAB_CANDIDATES = { rules: [] };
  fetch('data/lalkitab-rule-candidates.json')
    .then(response => { if (!response.ok) throw new Error('Candidates unavailable'); return response.json(); })
    .then(data => { window.LAL_KITAB_CANDIDATES = data; })
    .catch(() => { window.LAL_KITAB_CANDIDATES = { rules: [] }; });
  window.LAL_KITAB_BOOK = null;
  fetch('data/lalkitab-rulebook.json')
    .then(response => { if (!response.ok) throw new Error('Rulebook unavailable'); return response.json(); })
    .then(data => { window.LAL_KITAB_BOOK = data; })
    .catch(() => { window.LAL_KITAB_BOOK = null; });
  const state = { rulebook: null, derivation: null, profile: null, chart: null, inventory: null, activeTab: 'overview', findings: [] };
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
    ]) + '<h3>Placements</h3>' + placements() + '<h3>Owner-supplied rulebook (unsourced)</h3>' + (state.rulebook ? '<ul>' + state.rulebook.sections.map(sx => '<li>' + esc(sx.title) + ': ' + esc(STATUS_LABEL[sx.status]) + '</li>').join('') + '<li>Remedial plan: ' + esc(STATUS_LABEL[state.rulebook.remedyPlan.status]) + '</li></ul><p class="hint">Cannot be derived: ' + state.rulebook.cannotDerive.map(esc).join(' ') + '</p>' : '<p class="hint">Not run.</p>') + '<h3>Candidate rules (unverified)</h3><p class="hint">Derived: ' + (state.derivation ? state.derivation.derived.map(r => esc(r.title) + ' – ' + esc(OUTCOME[r.outcome] || r.outcome)).join('; ') : 'none') + '. Cannot be derived: ' + (state.derivation ? state.derivation.cannotDerive.map(r => esc(r.title)).join('; ') : 'none') + '. These come from unverified secondary summaries.</p><p class="hint">Interpretations: ' + (state.findings || []).length + ' eligible source-backed findings. This report is generated from a traditional astrology framework and is not a scientific or medical assessment.</p><div class="btnrow"><button class="btn" type="button" id="printReport">Print / Save as PDF</button></div>';
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

  async function calculate(form) {
    if (window.SWISSEPH_INIT_PROMISE) await window.SWISSEPH_INIT_PROMISE;
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
    if (window.LAL_KITAB_BOOK) {
      const houses = {};
      inventory.forEach(p => { if (p.status === 'calculated') houses[p.planet] = p.house; });
      const rel = (window.LAL_KITAB_CANDIDATES.rules.find(r => r.id === 'LK-CAND-PLANET-RELATIONSHIPS') || {}).conditionsDraft;
      const born = new Date(Date.UTC(year, month - 1, day)), now = new Date();
      let age = now.getUTCFullYear() - year;
      if (now.getUTCMonth() + 1 < month || (now.getUTCMonth() + 1 === month && now.getUTCDate() < day)) age -= 1;
      state.rulebook = window.LalKitabRulebook.analyze(window.LAL_KITAB_BOOK, {
        houses, age: age >= 0 ? age : null, relationships: rel ? rel.table : null
      });
    }
    state.derivation = window.LalKitabDerivation.deriveCandidates(window.LAL_KITAB_CANDIDATES.rules, inventory);
    state.findings = window.LalKitabRuleEngine.evaluate(window.LAL_KITAB_RULES.rules, contexts);
  }

  const form = $('birthForm');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      await calculate(form);
      $('message').textContent = 'Planetary inventory calculated using ' + state.chart.engine + '. House mapping is provisional; source-verified interpretations are not enabled.';
      if ($('birthSummary')) $('birthSummary').textContent = state.profile.date + ' ' + state.profile.time;
      state.activeTab = document.querySelector('[data-tab][aria-selected="true"]')?.dataset.tab || 'overview';
      renderActiveTab();
    } catch (error) {
      $('message').textContent = 'Could not calculate chart: ' + error.message;
    }
  });

  document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
    state.activeTab = button.dataset.tab;
    renderActiveTab();
  }));
  const originalReset = form.reset.bind(form);
  form.addEventListener('reset', () => {
    state.profile = state.chart = state.inventory = null;
    state.findings = [];
    state.derivation = null;
    state.rulebook = null;
    state.activeTab = 'overview';
    setTimeout(renderActiveTab, 0);
  });
  document.addEventListener('swisseph-ready', () => {
    if ($('message').textContent.includes('fallback')) $('message').textContent = 'Swiss Ephemeris WASM is ready for subsequent calculations.';
  });
  window.addEventListener('beforeprint', () => { if (state.chart) renderActiveTab(); });
})();
