# Run from the Lal Kitab repository root in PowerShell.
# Downloads the exact upstream binary assets required by the Swiss Ephemeris WASM wrapper.
# Review ephemeris/LICENSE-swisseph-wasm.txt before redistribution or commercial use.
$ErrorActionPreference = 'Stop'
$Base = 'https://raw.githubusercontent.com/puneetnarayan/Parashari-Astrology-/main'
$Files = @(
  @{ Url = "$Base/ephemeris/wasm/swisseph.wasm"; Path = 'ephemeris/wasm/swisseph.wasm' },
  @{ Url = "$Base/ephemeris/wasm/swisseph.data"; Path = 'ephemeris/wasm/swisseph.data' }
)
foreach ($File in $Files) {
  $Parent = Split-Path -Parent $File.Path
  New-Item -ItemType Directory -Force -Path $Parent | Out-Null
  Write-Host "Downloading $($File.Path)..."
  Invoke-WebRequest -Uri $File.Url -OutFile $File.Path
  if ((Get-Item $File.Path).Length -lt 10000) {
    throw "Downloaded file looks too small: $($File.Path)"
  }
}
Write-Host 'Binary assets downloaded. Start a local HTTP server from the repository root.'
Write-Host 'Example: python -m http.server 8000'
