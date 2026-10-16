# Integrating externally generated code

Use this checklist when code arrives from ChatGPT Go or any other tool.

## Where things go
| Incoming code | Destination |
|---|---|
| Swiss Ephemeris JS glue + license files | `ephemeris/src/` |
| WASM/data assets + license files | `ephemeris/wasm/` |
| Bridge, ephemeris wrapper, time zone code | `js/engine/` |
| Teva/house mapping, rule evaluation | `js/lalkitab/` |
| Rule data (JSON) | `data/rules/` |
| Tests | `tests/*.test.js` (picked up by `npm test`) |

## Interface
The engine must return the object described in `js/lalkitab/contract.js` (nine sidereal longitudes in [0, 360) plus a calculation passport). Check it with `validateCalculationResult`. `LalKitabChart.buildPlanetInventory(result.longitudes)` then produces the placements.

## Acceptance checklist
1. `npm test` passes.
2. No Parashari interpretation code (drishti, yogas, dasha, house meanings) was imported.
3. Upstream license/notice files were carried along.
4. WASM paths resolve when served over HTTP (`npm run serve`).
5. Calculated longitudes were compared with an independent source for at least one known chart.
6. New rules pass `validateRule`, carry a source and pinpoint reference, and are not `active` without both.
7. The house mapping policy remains explicit; no silent change to the provisional convention.
8. No hard-coded or invented planetary positions, rules or remedies.
