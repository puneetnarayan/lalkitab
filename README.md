# Lal Kitab Astrology App

Browser-based Lal Kitab astrology application. The implementation is designed to reuse the technique-neutral astronomical calculations from https://github.com/puneetnarayan/Parashari-Astrology- while keeping Lal Kitab rules and interpretations in a separate module layer.

## Principles

- Reuse the existing Swiss Ephemeris WebAssembly integration where practical.
- Keep birth data and calculations in the browser; no backend is required for the initial version.
- Do not import Parashari-only interpretations (graha drishti, yogas, dasha rules, or house interpretations) as Lal Kitab rules.
- Keep every interpretation rule traceable to a named source/reference and show the rule's reasoning in the UI.
- Clearly distinguish implemented rules from planned or unverified content.
- Preserve the upstream Swiss Ephemeris and WASM licensing notices. Review licensing before distributing or hosting the app as a service.

## Proposed MVP modules

1. Birth details: date, local time, place/coordinates, and time zone.
2. Calculation engine: sidereal planetary longitudes and Ascendant from the existing Swiss Ephemeris WASM bridge.
3. Lal Kitab chart data: planet-to-house mapping and chart presentation using the selected Lal Kitab convention.
4. Lal Kitab rules: isolated, source-tagged rules for house placements and interpretations.
5. Remedies: rule-linked remedies, warnings, and explanatory notes; no unsupported remedy should be presented as established fact.
6. Report: birth details, chart, placements, rule explanations, and remedies.

## Reuse strategy

The source repository currently contains ephemeris/src/swisseph.js, ephemeris/wasm/, js/swissephBridge.js, js/ephemeris.js, js/timezone.js, and general longitude/sign utility code. Before copying, verify the current source paths and required relative paths. The WASM assets must remain at paths expected by the bridge, and their license files must be carried along.

Only the calculation primitives should be shared. Lal Kitab rules will live under js/lalkitab/ and will not call Parashari interpretation functions.

## Development

The first version is plain HTML/CSS/JavaScript to match the source app and avoid a build step. Serve the repository over HTTP during local development because browser ES modules and WebAssembly may not load correctly from a file URL.

Example (Python installed):
    python -m http.server 8000

Then open http://localhost:8000/.

## Status

Project scaffold / planning stage. Do not consider the calculation engine integrated until the upstream bridge and WASM files have been copied and tested together.
