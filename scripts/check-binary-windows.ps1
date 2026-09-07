<#
.SYNOPSIS
    scripts/check-binary-windows.ps1 <file>

    Windows counterpart of scripts/check-binary.sh (Linux) and
    scripts/check-binary-macos.sh (macOS), for the T21 win32-x64 prebuild.
    Uses dumpbin.exe (ships with the MSVC toolchain, on PATH via
    ilammy/msvc-dev-cmd@v1 in the workflow) -- read-only PE inspection, never
    compiles anything.

    Prints:
      - dumpbin /DEPENDENTS (load-time DLL dependencies)
      - dumpbin /IMPORTS (full import table, including the delay-load section)
      - dumpbin /EXPORTS (the addon's own exported symbols)

    Exits non-zero if:
      - /DEPENDENTS lists anything other than KERNEL32.dll,
        VCRUNTIME140*.dll, MSVCP140*.dll, api-ms-win-crt-*.dll,
        ADVAPI32.dll/USER32.dll (allowed -- win_delay_load_hook.cc's
        GetModuleHandle calls can pull these in) and VCOMP140.dll (allowed
        only when the build has OpenMP on, MSVC's /openmp -- the one
        documented sidecar exception on Windows; see CMakeLists.txt's WIN32
        OpenMP branch and docs/plan/tasks.md's T21 section).
      - node.exe does not appear strictly inside the delay-load imports
        section of /IMPORTS (T21's whole point: node.exe must never be a
        normal/eager import, or the addon fails to load under Electron,
        where the running executable is electron.exe, not node.exe -- see
        docs/how-to/make-the-addon-electron-safe.md row 3).
      - /EXPORTS lists anything other than napi_register_module_v1 and
        node_api_module_get_api_version_v1.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$FilePath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not (Test-Path $FilePath)) {
    Write-Error "check-binary-windows: no such file: $FilePath"
    exit 1
}

$status = 0

# --- /DEPENDENTS -------------------------------------------------------
Write-Host "== dumpbin /DEPENDENTS =="
$dependentsOut = & dumpbin /DEPENDENTS $FilePath /nologo
$dependentsOut | ForEach-Object { Write-Host $_ }
if ($LASTEXITCODE -ne 0) { throw "dumpbin /DEPENDENTS failed with exit code $LASTEXITCODE" }

$dllLines = $dependentsOut |
    Where-Object { $_ -match '^\s+\S+\.dll\s*$' } |
    ForEach-Object { $_.Trim() }

# api-ms-win-crt-*.dll: the Universal CRT's "API set" forwarder DLLs (one per
# CRT subsystem -- heap, stdio, math, ...), always pulled in alongside
# VCRUNTIME/MSVCP on a /MD build; not a hand-picked sidecar, every MSVC /MD
# binary has these.
# WS2_32.dll: LibRaw's own libraw_datastream.h includes <winsock2.h> on
# _WIN32 purely for the htonl()/ntohl() byte-swap macros several decoders use
# (grep for winsock2/htonl/ntohl under vendor/LibRaw/src -- e.g.
# decoders_dcraw.cpp, sony.cpp, read_utils.cpp); LibRaw's own
# Makefile.msvc links every sample against ws2_32.lib for the same reason.
# WS2_32.dll ships with every Windows install since XP (a core OS component,
# not a redistributable sidecar), same category as KERNEL32/ADVAPI32/USER32
# below.
# (PowerShell's -match/-notmatch/-contains are case-insensitive by default,
# so this also covers dumpbin printing some entries in all caps, e.g.
# "VCOMP140.DLL".)
$allowedDependentsRe = '^(KERNEL32\.dll|VCRUNTIME140(_1)?\.dll|MSVCP140(_\d+|_atomic_wait|_codecvt_ids)?\.dll|api-ms-win-crt-[a-z0-9\-]+\.dll|ADVAPI32\.dll|USER32\.dll|WS2_32\.dll|VCOMP140\.dll)$'
$badDependents = $dllLines | Where-Object { $_ -notmatch $allowedDependentsRe }
if ($badDependents) {
    Write-Host "FAIL: unexpected DEPENDENTS entries (only KERNEL32/VCRUNTIME140*/MSVCP140*/api-ms-win-crt-*/ADVAPI32/USER32/WS2_32/VCOMP140 allowed):" -ForegroundColor Red
    $badDependents | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    $status = 1
}
if ($dllLines -contains 'VCOMP140.dll') {
    Write-Host "NOTE: VCOMP140.dll present -- MSVC /openmp runtime, documented in README.md / docs/reference/build-matrix.md (T21)."
}

# --- /IMPORTS (delay-load section must contain node.exe; the regular
#     import table must not) ------------------------------------------
Write-Host ""
Write-Host "== dumpbin /IMPORTS =="
$importsOut = & dumpbin /IMPORTS $FilePath /nologo
$importsOut | ForEach-Object { Write-Host $_ }
if ($LASTEXITCODE -ne 0) { throw "dumpbin /IMPORTS failed with exit code $LASTEXITCODE" }

$importsText = ($importsOut -join "`n")
$delayMarker = [System.Text.RegularExpressions.Regex]::Match(
    $importsText, 'delay load import', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
if (-not $delayMarker.Success) {
    Write-Host "FAIL: no delay-load imports section found in /IMPORTS output" -ForegroundColor Red
    $status = 1
} else {
    $beforeDelay = $importsText.Substring(0, $delayMarker.Index)
    $fromDelay = $importsText.Substring($delayMarker.Index)
    if ($beforeDelay -match '(?im)^\s*node\.exe\s*$') {
        Write-Host "FAIL: node.exe appears as a normal (non-delay-load) import" -ForegroundColor Red
        $status = 1
    }
    if ($fromDelay -notmatch '(?im)^\s*node\.exe\s*$') {
        Write-Host "FAIL: node.exe not found under the delay-load imports section" -ForegroundColor Red
        $status = 1
    } else {
        Write-Host "OK: node.exe is delay-loaded (found only under the delay-load imports section)"
    }
}

# --- /EXPORTS ------------------------------------------------------------
Write-Host ""
Write-Host "== dumpbin /EXPORTS =="
$exportsOut = & dumpbin /EXPORTS $FilePath /nologo
$exportsOut | ForEach-Object { Write-Host $_ }
if ($LASTEXITCODE -ne 0) { throw "dumpbin /EXPORTS failed with exit code $LASTEXITCODE" }

$exportedNames = $exportsOut | ForEach-Object {
    if ($_ -match '^\s*\d+\s+[0-9A-Fa-f]+\s+[0-9A-Fa-f]+\s+(\S+)\s*$') { $matches[1] }
} | Where-Object { $_ }

$allowedExports = @('napi_register_module_v1', 'node_api_module_get_api_version_v1')
$badExports = $exportedNames | Where-Object { $allowedExports -notcontains $_ }
$missingExports = $allowedExports | Where-Object { $exportedNames -notcontains $_ }
if ($badExports) {
    Write-Host "FAIL: unexpected exported symbols (only the two napi entry points allowed):" -ForegroundColor Red
    $badExports | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    $status = 1
}
if ($missingExports) {
    Write-Host "FAIL: missing expected exported symbols:" -ForegroundColor Red
    $missingExports | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    $status = 1
}

Write-Host ""
if ($status -eq 0) {
    Write-Host "check-binary-windows: OK ($FilePath)"
} else {
    Write-Host "check-binary-windows: FAILED ($FilePath)" -ForegroundColor Red
}
exit $status
