# Lal Kitab Astrology App

Browser-based Lal Kitab astrology application. The implementation is designed to reuse the technique-neutral astronomical calculations from https://github.com/puneetnarayan/Parashari-Astrology- while keeping Lal Kitab rules and interpretations in a separate module layer.

## Principles

- Reuse the existing Swiss Ephemeris WebAssembly integration where practical.
- Keep birth data and calculations in the browser; no backend is required for the initial version.
- Do not import Parashari-only interpretations (graha drishti, yogas, dasha rules, or house interpretations) as Lal Kitab rules.
- Keep every interpretation rule traceable to a named source/reference and show the rule's reasoning in the UI.
- Clearly distinguish implemented rules from planned or unverified content.
- Preserve the upstream Swiss Ephemeris and WASM licensing notices. Review licensing before distributing or hosting the app as a service.

## Current implementation status (16 Oct 2026)

- The browser UI loads timezone conversion, a planet inventory, a provisional chart grid, and guarded rule-evaluation code.
- The source app's `astronomy.browser.min.js`, `ephemeris.js`, and `timezone.js` were reused. The upstream astronomy bundle retains its MIT header.
- Swiss Ephemeris wrapper and bridge are adapted from the [Parashari-Astrology source app](https://github.com/puneetnarayan/Parashari-Astrology-). The bridge uses the wrapper's `calc_ut()` array return and `houses()` result shape, applies Lahiri mode, and exposes an astronomy-engine fallback if initialization fails. Download `swisseph.wasm` and `swisseph.data` by running `scripts/Download-EphemerisAssets.ps1`; see [Swiss Ephemeris setup](docs/SWISSEPH_SETUP.md).
- The fixed natural-zodiac house mapping is explicitly provisional. Do not treat house-based readings as validated until the selected primary Lal Kitab edition establishes the convention.
- `data/lalkitab-rules.json` intentionally contains zero active rules. Research concepts are not prediction rules. The rule engine rejects records that lack eligible confidence and pinpoint source references.
- To test the current pure-JavaScript modules: `node tests/lalkitab-chart.test.js`, `node tests/lalkitab-engine.test.js`, and `node tests/swisseph-bridge.test.js`. GitHub Actions runs these tests on pushes and pull requests.

## Owner-supplied rulebook

`data/lalkitab-rulebook.json` encodes the rulebook in `docs/LAL_KITAB_SYSTEM_PROMPT.md` (fixed houses, Pacca Ghar, Grahfal/Rashiphal, chart types, aspects, Masnooi, activation ages, Qurbani, remedy-grammar rules). `js/lalkitab/rulebook.js` applies it deterministically and the **Rulebook Analysis** tab reports what could be derived and what could not. It is unsourced (no edition or page references) and is labelled that way everywhere. It has no planet-in-house result tables and no remedy content, so life-domain predictions and specific upayas are reported as not derivable. Own-sign dignity uses standard rulership, an assumption not in the rulebook.

## 250 rules and live updates

`data/lalkitab-250-rules.json` holds the owner-supplied "250 Rules of Lal Kitab" (`docs/LAL_KITAB_250_RULES.md`), each classified as chart-dependent (evaluated by `js/lalkitab/rules250.js`), general guidance, an untriggered remedy list, or not evaluable (the reason is stored). Terms the file never defines ("malefic", "afflicted", "weak") are never evaluated. It is an unverified secondary compilation and the **Native Interpretation** tab says so. Birth details recalculate everything automatically as they are edited (debounced); "Recalculate now" is optional.

## Proposed MVP modules

1. Birth details: date, local time, place/coordinates, and time zone.
2. Calculation engine: sidereal planetary longitudes and Ascendant from the existing Swiss Ephemeris WASM bridge.
3. Lal Kitab chart data: planet-to-house mapping and chart presentation using the selected Lal Kitab convention.
4. Lal Kitab rules: isolated, source-tagged rules for house placements and interpretations.
5. Remedies: rule-linked remedies, warnings, and explanatory notes; no unsupported remedy should be presented as established fact.
6. Report: birth details, chart, placements, rule explanations, and remedies.

## Reuse strategy

The source repository contains `ephemeris/src/swisseph.js`, `ephemeris/wasm/`, `js/swissephBridge.js`, `js/ephemeris.js`, `js/timezone.js`, and `js/astronomy.browser.min.js`. This app reuses the astronomy fallback, timezone utility, Swiss Ephemeris wrapper and bridge where applicable. Keep Lal Kitab interpretations isolated from Parashari interpretation functions.

Only the calculation primitives should be shared. Lal Kitab rules will live under js/lalkitab/ and will not call Parashari interpretation functions.

## Development

The first version is plain HTML/CSS/JavaScript to match the source app and avoid a build step. Serve the repository over HTTP during local development because browser ES modules and WebAssembly may not load correctly from a file URL.

Example (Python installed):
    python -m http.server 8000

Then open http://localhost:8000/.

## Receiving external code

See `docs/INTEGRATION.md` for destination folders, the engine interface contract and the acceptance checklist. Run `npm test` (or `node tests/run-all.js`).

## Status

Working scaffold with preliminary planetary inventory; not yet a validated astrology product. Swiss Ephemeris browser/WASM runtime verification, house-convention verification, and source-backed Lal Kitab rule ingestion remain outstanding.
