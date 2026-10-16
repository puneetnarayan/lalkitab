(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = { profile: null, chart: null, inventory: null, activeTab: 'overview' };
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

  function rulesView() {
    const ruleCount = window.LAL_KITAB_RULES.rules.length;
    return '<div class="empty"><div class="symbol">≋</div><h3>' +
      (ruleCount ? 'Source-verified rules available' : 'No active source-verified rules yet') +
      '</h3><p>' + (ruleCount
        ? ruleCount + ' rules are in the data file. Only rules marked active and verified/cross-checked with pinpoint references can produce findings.'
        : 'This is intentional. The concept catalogue is research-only. No prediction or remedy will be generated until a rule has a source edition, page/section, conditions, and review status.') +
      '</p><p class="hint">Research catalogue concepts: Teva, Pakka Ghar, planet-in-house results, empty houses, planetary states, Rin and Varshaphal.</p></div>';
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
    ]) + '<h3>Placements</h3>' + placements() + '<p class="hint">Interpretations: ' + (state.findings || []).length + ' eligible source-backed findings. This report is generated from a traditional astrology framework and is not a scientific or medical assessment.</p><div class="btnrow"><button class="btn" type="button" id="printReport">Print / Save as PDF</button></div>';
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
      '<div class="tile"><span>Calculation engine</span><strong>' + (ready ? 'Fallback calculation ready' : 'Ready to calculate') + '</strong></div>' +
      '<div class="tile"><span>Active source-backed rules</span><strong>' + window.LAL_KITAB_RULES.rules.filter(r => window.LalKitabRuleSchema.isEligibleForInterpretation(r)).length + '</strong></div></div>' +
      (ready ? '<div class="notice"><strong>Chart calculated.</strong><br>House mapping is provisional and the astronomy fallback has not yet been benchmark-validated. No traditional predictions are enabled without source-verified rules.</div>' :
      '<div class="empty"><div class="symbol">✧</div><h3>Ready to prepare a chart</h3><p>Enter date, time, place, timezone and coordinates. This version calculates a planetary inventory but intentionally does not invent Lal Kitab interpretations.</p></div>');
  }

  function calculate(form) {
    if (typeof window.computePlanetLongitudes !== 'function' ||
        typeof window.computeAscendant !== 'function' ||
        typeof window.zonedLocalToUtc !== 'function') {
      throw new Error('Calculation modules failed to load. Please reload the app.');
    }
    const date = form.birthDate.value;
    const time = form.birthTime.value;
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const utc = window.zonedLocalToUtc(year, month, day, hour, minute, form.timezone.value);
    const latitude = Number(form.latitude.value);
    const longitude = Number(form.longitude.value);
    const longitudes = window.computePlanetLongitudes(utc);
    const ascendantLongitude = window.computeAscendant(utc, latitude, longitude);
    const inventory = window.LalKitabChart.buildPlanetInventory(longitudes, {
      mappingPolicy: window.LalKitabChart.HOUSE_MAPPING_POLICIES.FIXED_NATURAL_ZODIAC
    });
    const ascSign = window.LalKitabChart.signFromLongitude(ascendantLongitude);
    state.profile = {
      native: form.native.value.trim(), date, time, place: form.place.value.trim(),
      timezone: form.timezone.value, latitude, longitude
    };
    state.inventory = inventory;
    state.chart = {
      utc, ascendant: { longitude: ascendantLongitude, sign: ascSign },
      engine: (window.SWISSEPH_READY ? 'Swiss Ephemeris WASM' : 'Astronomy-engine fallback (not benchmark-validated)'),
      mappingPolicy: 'Fixed natural-zodiac mapping (provisional)'
    };
    const contexts = inventory.filter(p => p.status === 'calculated').map(p => ({
      planet: p.planet, house: p.house, sign: p.sign,
      housePlanets: inventory.filter(other => other.house === p.house && other.status === 'calculated').map(other => other.planet)
    }));
    state.findings = window.LalKitabRuleEngine.evaluate(window.LAL_KITAB_RULES.rules, contexts);
  }

  const form = $('birthForm');
  form.addEventListener('submit', event => {
    try {
      calculate(form);
      $('message').textContent = 'Planetary inventory calculated. House mapping is provisional; source-verified interpretations are not enabled.';
      $('birthSummary').textContent = state.profile.date + ' ' + state.profile.time;
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
    state.activeTab = 'overview';
    setTimeout(renderActiveTab, 0);
  });
  document.addEventListener('swisseph-ready', () => {
    if ($('message').textContent.includes('fallback')) $('message').textContent = 'Swiss Ephemeris WASM is ready for subsequent calculations.';
  });
  window.addEventListener('beforeprint', () => { if (state.chart) renderActiveTab(); });
})();
