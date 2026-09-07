<#
.SYNOPSIS
    scripts/build-native.ps1 -Target win32-x64

    Windows native build entry point (T21), the counterpart of
    scripts/build-native.sh (macOS, T20) and scripts/build-linux.sh (Linux,
    Docker). Always runs on a GitHub Actions windows-2022 runner inside a
    Developer Command Prompt environment (the workflow uses
    ilammy/msvc-dev-cmd@v1 so cl.exe/lib.exe/dumpbin.exe/nmake.exe are on
    PATH before this script starts) -- see docs/reference/build-matrix.md.
    This script cannot be exercised on this repo's Linux host at all; every
    change to it is verified through `gh run watch` on CI, never locally
    (docs/plan/tasks.md, T21, same rule T20 documented for build-native.sh).

    Two things this script does that the Unix build scripts don't need to:

    1. Synthesize build/<target>/node.lib -- the import library the addon
       links against for napi_*/node_api_* symbols. node-gyp's usual approach
       downloads the pinned Node version's prebuilt node.lib from
       nodejs.org; this project instead merges node-api-headers' two .def
       files (node_api.def + js_native_api.def, shipped specifically "for
       windows import lib" per that package's changelog) into one combined
       .def and runs `lib.exe /def:... /out:node.lib` on it. This avoids an
       extra pinned download and keeps the import library in sync with
       whatever node-api-headers version package.json already pins.

    2. Use a single-config Ninja build (CMAKE_BUILD_TYPE=Release) instead of
       the default multi-config "Visual Studio 17 2022" generator, so build
       output paths are flat (build/<target>/node.napi.node, no per-config
       Release/ subdirectory to special-case) -- the same shape
       build-native.sh/build-linux.sh already produce on the other
       platforms. Ninja also builds faster than MSBuild for this project's
       ~80 LibRaw translation units. Requires ninja.exe on PATH (installed by
       the workflow via `choco install ninja` before this script runs) in
       addition to the MSVC toolchain and nasm.exe (libjpeg-turbo's x64 SIMD,
       via ilammy/setup-nasm@v1).
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('win32-x64')]
    [string]$Target
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$ArgList
    )
    Write-Host "== $FilePath $($ArgList -join ' ') =="
    & $FilePath @ArgList
    if ($LASTEXITCODE -ne 0) {
        throw "$FilePath exited with code $LASTEXITCODE"
    }
}

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$BuildDir = Join-Path 'build' $Target
$OutDir = Join-Path 'prebuilds' $Target
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$BuildDirAbs = (Resolve-Path $BuildDir).Path

# ---------------------------------------------------------------------------
# Step 1: node.lib, synthesized from node-api-headers' .def files (see the
# header comment above). Both .def files start with a `NAME NODE.EXE`
# statement (declaring the module the exports belong to) and their EXPORTS
# lists overlap (js_native_api.def's symbols are a subset repeated in
# node_api.def) -- merging into one de-duplicated .def and running lib.exe
# once avoids linking against two import libraries that would otherwise both
# claim to define some of the same symbols.
# ---------------------------------------------------------------------------
Write-Host "== resolving node-api-headers .def paths =="
$nodeApiDef = (& node -p "require('node-api-headers').def_paths.node_api_def").Trim()
$jsNativeApiDef = (& node -p "require('node-api-headers').def_paths.js_native_api_def").Trim()
if (-not (Test-Path $nodeApiDef) -or -not (Test-Path $jsNativeApiDef)) {
    throw "could not resolve node-api-headers .def files (node_api_def='$nodeApiDef' js_native_api_def='$jsNativeApiDef')"
}
Write-Host "  node_api.def:      $nodeApiDef"
Write-Host "  js_native_api.def: $jsNativeApiDef"

$symbols = [System.Collections.Generic.SortedSet[string]]::new([System.StringComparer]::Ordinal)
foreach ($defFile in @($nodeApiDef, $jsNativeApiDef)) {
    foreach ($rawLine in Get-Content -Path $defFile) {
        $line = $rawLine.Trim()
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        if ($line -match '^(NAME|LIBRARY|EXPORTS)\b') { continue }
        [void]$symbols.Add($line)
    }
}
if ($symbols.Count -eq 0) {
    throw "merged zero symbols out of node-api-headers' .def files"
}
Write-Host "  merged $($symbols.Count) unique exported symbols"

$mergedDef = Join-Path $BuildDirAbs 'node-api-merged.def'
$defLines = @('LIBRARY NODE.EXE', 'EXPORTS') + $symbols
Set-Content -Path $mergedDef -Value $defLines -Encoding ascii

$nodeLib = Join-Path $BuildDirAbs 'node.lib'
$libArgs = @("/def:$mergedDef", '/machine:x64', "/out:$nodeLib", '/nologo')
Invoke-Checked -FilePath 'lib.exe' -ArgList $libArgs
if (-not (Test-Path $nodeLib)) {
    throw "lib.exe reported success but $nodeLib does not exist"
}

# ---------------------------------------------------------------------------
# Step 2: configure + build. LIBRAW_NODE_OPENMP/LIBRAW_NODE_OPENMP can be
# forced from the environment the same way build-native.sh honors them on
# macOS (documented CI fallback if MSVC /openmp turns out not to work; see
# docs/plan/tasks.md's T21 section).
# ---------------------------------------------------------------------------
$cmakeExtraArgs = @()
if ($env:LIBRAW_NODE_OPENMP) {
    $cmakeExtraArgs += "-DLIBRAW_NODE_OPENMP=$($env:LIBRAW_NODE_OPENMP)"
}

Write-Host "== configuring ($Target, Ninja, Release) =="
$configureArgs = @(
    '-S', '.', '-B', $BuildDir,
    '-G', 'Ninja',
    '-DCMAKE_BUILD_TYPE=Release',
    "-DLIBRAW_NODE_NODE_LIB=$nodeLib"
) + $cmakeExtraArgs
Invoke-Checked -FilePath 'cmake' -ArgList $configureArgs

Write-Host "== building =="
$jobs = if ($env:NUMBER_OF_PROCESSORS) { $env:NUMBER_OF_PROCESSORS } else { '2' }
$buildArgs = @('--build', $BuildDir, '--config', 'Release', '-j', $jobs)
Invoke-Checked -FilePath 'cmake' -ArgList $buildArgs

$builtNode = Join-Path $BuildDir 'node.napi.node'
if (-not (Test-Path $builtNode)) {
    throw "build finished but $builtNode does not exist"
}
Copy-Item -Path $builtNode -Destination (Join-Path $OutDir 'node.napi.node') -Force

Write-Host "== done =="
Get-Item (Join-Path $OutDir 'node.napi.node') | Format-List Name, Length, FullName
