# Swiss Ephemeris setup

The browser bridge and JavaScript wrapper are checked in. The two compiled binary assets are downloaded separately because the GitHub text-file integration cannot safely write binary files.

From the repository root, run in PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\Download-EphemerisAssets.ps1
python -m http.server 8000
```

Open `http://localhost:8000/`. Use a local HTTP server; do not open `index.html` directly from a `file://` URL because browser ES modules and WebAssembly need correct origin/path handling.

The bridge sets the Lahiri sidereal mode and calculates the mean lunar node, matching the astronomy convention used in the Parashari source app. The current house mapper is separate and remains provisional.

If the binary assets are unavailable or the browser blocks WebAssembly, the app attempts to use the offline Astronomy Engine fallback. The status message identifies which engine produced the inventory.

**Licensing:** the bundled Swiss Ephemeris JavaScript wrapper carries GPL-3.0-or-later and Swiss Ephemeris dual-licensing notices. Before distributing, hosting as a service, or using commercially, review the included license and the Swiss Ephemeris licensing terms. This setup does not grant a commercial license.
