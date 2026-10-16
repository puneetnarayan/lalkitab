# Swiss Ephemeris setup

The browser bridge and JavaScript wrapper are checked in. The two compiled binary assets are downloaded separately because the GitHub text-file integration cannot safely write binary files.

From the repository root, run in PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\Download-EphemerisAssets.ps1
python -m http.server 8000
```

Open `http://localhost:8000/`. Use a local HTTP server; do not open `index.html` directly from a `file://` URL because browser ES modules and WebAssembly need correct origin/path handling.

The bridge adapts the same Swiss Ephemeris wrapper used by the Parashari source app, sets Lahiri sidereal mode, uses the mean lunar node for Rahu (Ketu = Rahu + 180°), and derives the sidereal Ascendant from the wrapper's `houses()` and `get_ayanamsa()` methods. The Lal Kitab house mapper is separate and remains provisional. A mock-based API regression test is in `tests/swisseph-bridge.test.js`; this is not a substitute for testing with the downloaded WASM/data assets and checking sample birth charts against an independent reference.

If the binary assets are unavailable or the browser blocks WebAssembly, the app uses the offline Astronomy Engine fallback. The status message identifies the engine used for each calculation.

**Licensing:** the bundled Swiss Ephemeris JavaScript wrapper carries GPL-3.0-or-later and Swiss Ephemeris dual-licensing notices. Before distributing, hosting as a service, or using commercially, review the included license and the Swiss Ephemeris licensing terms. This setup does not grant a commercial license.
