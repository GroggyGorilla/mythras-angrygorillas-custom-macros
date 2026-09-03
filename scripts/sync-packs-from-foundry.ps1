<#
.SYNOPSIS
    Copies item compendium pack data from the deployed Foundry VTT module install into this repo.
.DESCRIPTION
    Foundry must be fully closed before running this - otherwise the LevelDB pack files may be
    locked or not yet compacted/flushed to disk, resulting in a partial or stale copy.

    The Foundry User Data path defaults to the standard Windows location, but can be overridden
    per-machine (without editing this script) by creating a "scripts/.foundry-data-path.local"
    file containing the path on its own line - useful if a machine's Foundry install uses a
    custom User Data directory. That file is gitignored since it's machine-specific.
.PARAMETER Packs
    Names of the packs to sync. Defaults to all compendiums in the module.
.PARAMETER FoundryDataPath
    Overrides the Foundry User Data directory for this run only, taking priority over both the
    local config file and the default.
#>
param(
    [string[]]$Packs = @("macros", "tools", "weapons", "armour", "clothing", "vehicles", "storage", "currency"),
    [string]$FoundryDataPath
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path $PSScriptRoot -Parent
$repoPacksPath = Join-Path $repoRoot "packs"
$localConfigPath = Join-Path $PSScriptRoot ".foundry-data-path.local"

if (-not $FoundryDataPath) {
    if (Test-Path $localConfigPath) {
        $FoundryDataPath = (Get-Content $localConfigPath -TotalCount 1).Trim()
    } else {
        $FoundryDataPath = "$env:LOCALAPPDATA\FoundryVTT\Data"
    }
}

$deployedPacksPath = Join-Path $FoundryDataPath "modules\mythras-angrygorillas-custom-macros\packs"

if (Get-Process -Name "Foundry*" -ErrorAction SilentlyContinue) {
    Write-Error "Foundry Virtual Tabletop is still running. Fully quit it so pack data is flushed/compacted to disk, then re-run this script."
    exit 1
}

foreach ($pack in $Packs) {
    $source = Join-Path $deployedPacksPath $pack
    $destination = Join-Path $repoPacksPath $pack

    if (-not (Test-Path $source)) {
        Write-Warning "Skipping '$pack' - not found at $source"
        continue
    }

    Write-Host "Syncing '$pack'..."
    Remove-Item -Path $destination -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item -Path $source -Destination $destination -Recurse -Force
}

Write-Host "`nDone. Review the changes below, then stage/commit what you want to keep:`n"
Push-Location $repoRoot
git status --short packs/
Pop-Location
