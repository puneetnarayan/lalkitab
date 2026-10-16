# Configure the private Parashari source token

The Swiss Ephemeris asset workflow reads files from the private
`puneetnarayan/Parashari-Astrology-` repository. GitHub Actions' automatic
`GITHUB_TOKEN` for the Lal Kitab repository cannot read another private
repository, so a separate read-only token is required.

## One-time GitHub setup

1. Open GitHub **Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
2. Create a token with access limited to **Only select repositories** and select
   `Parashari-Astrology-`.
3. Grant **Contents: Read-only** permission. No write permission is needed on the
   source repository.
4. In `puneetnarayan/lalkitab`, open **Settings → Secrets and variables → Actions**.
5. Select **New repository secret**:
   - Name: `PARASHARI_REPO_TOKEN`
   - Secret: paste the token created above.
6. Return to the [asset workflow](../actions/workflows/vendor-swisseph-assets.yml)
   and rerun it, or push a change to the workflow on branch
   `feat/bundle-swisseph-assets`.

Do not paste the token into source code, issues, pull-request comments, or chat.
The workflow validates the downloaded WASM/data sizes and Git blob hashes before
committing assets to the feature branch.

## Validation boundary

A successful asset-copy job only confirms that the files were copied and match
the expected hashes. The browser/WASM runtime and chart calculations still need
independent testing before the app should be treated as calculation-validated.
