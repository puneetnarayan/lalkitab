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

- The browser UI now loads an offline astronomy fallback, timezone conversion, a planet inventory, a provisional chart grid, and guarded rule-evaluation code.
- The source app's `astronomy.browser.min.js`, `ephemeris.js`, and `timezone.js` were reused. The upstream astronomy bundle retains its MIT header.
- **Swiss Ephemeris WASM is not bundled in this repository yet.** Current results use the Astronomy Engine fallback and have not been benchmark-validated against Swiss Ephemeris.
- The fixed natural-zodiac house mapping is explicitly provisional. Do not treat house-based readings as validated until the selected primary Lal Kitab edition establishes the convention.
- `data/lalkitab-rules.json` intentionally contains zero active rules. Research concepts are not prediction rules. The rule engine rejects records that lack eligible confidence and pinpoint source references.
- To test the current pure-JavaScript modules: `node tests/lalkitab-chart.test.js` and `node tests/lalkitab-engine.test.js`.

## Proposed MVP modules

1. Birth details: date, local time, place/coordinates, and time zone.
2. Calculation engine: sidereal planetary longitudes and Ascendant from the existing Swiss Ephemeris WASM bridge.
3. Lal Kitab chart data: planet-to-house mapping and chart presentation using the selected Lal Kitab convention.
4. Lal Kitab rules: isolated, source-tagged rules for house placements and interpretations.
5. Remedies: rule-linked remedies, warnings, and explanatory notes; no unsupported remedy should be presented as established fact.
6. Report: birth details, chart, placements, rule explanations, and remedies.

## Reuse strategy

The source repository contains `ephemeris/src/swisseph.js`, `ephemeris/wasm/`, `js/swissephBridge.js`, `js/ephemeris.js`, `js/timezone.js`, and `js/astronomy.browser.min.js`. This app currently reuses the astronomy fallback and timezone utilities only. Integrate Swiss Ephemeris WASM in a later step after preserving the expected relative asset paths and carrying forward all required license notices.

Only the calculation primitives should be shared. Lal Kitab rules will live under js/lalkitab/ and will not call Parashari interpretation functions.

## Development

The first version is plain HTML/CSS/JavaScript to match the source app and avoid a build step. Serve the repository over HTTP during local development because browser ES modules and WebAssembly may not load correctly from a file URL.

Example (Python installed):
    python -m http.server 8000

Then open http://localhost:8000/.

## Status

Working scaffold with preliminary planetary inventory; not yet a validated astrology product. Swiss Ephemeris WASM integration, house-convention verification, source-backed rule ingestion, and end-to-end/browser testing remain outstanding.
