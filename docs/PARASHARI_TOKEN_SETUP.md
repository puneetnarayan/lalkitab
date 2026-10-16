# Swiss Ephemeris asset workflow

The GitHub Actions workflow copies the Swiss Ephemeris runtime assets from the
public `puneetnarayan/Parashari-Astrology-` repository into this repository's
feature branch. No personal access token or repository secret is required for
reading the public source repository.

## Run or inspect the workflow

1. Open the [Vendor Swiss Ephemeris runtime assets workflow](../actions/workflows/vendor-swisseph-assets.yml).
2. A change to the workflow file on `feat/bundle-swisseph-assets` starts it automatically. It can also be run manually using **Run workflow**.
3. Confirm the asset-copy job succeeds and that the four files are committed to `feat/bundle-swisseph-assets`.

The workflow validates the expected file sizes and SHA-1 hashes of the JavaScript
wrapper, WASM binary, and data package before committing assets.

## Validation boundary

A successful asset-copy job confirms that the copied files match the expected
sizes and hashes. The browser/WASM runtime and chart calculations still need
independent testing against a trusted reference chart before the app should be
treated as calculation-validated.
