#!/usr/bin/env bash
# scripts/electron-safety.sh
#
# T24 Part B: single entry point that runs every Electron-safety check from
# docs/how-to/make-the-addon-electron-safe.md in one go, for the *current*
# host platform. Reuses the pieces T18-T23 already built rather than
# reimplementing them:
#
#   1. The platform binary check (scripts/check-binary.sh on Linux,
#      scripts/check-binary-macos.sh on macOS, scripts/check-binary-windows.ps1
#      on Windows) against prebuilds/<platform>-<arch>/node.napi.node.
#   2. A source grep for forbidden includes (row 1 of the how-to table):
#      only napi.h / node_api.h / js_native_api.h may appear under src/
#      (excluding node_modules); node.h, v8.h, uv.h, node_buffer.h and
#      node_object_wrap.h are all Node-internals headers that break
#      Electron's separate V8/libuv builds.
#   3. buildInfo.flags contains NODE_API_NO_EXTERNAL_BUFFERS_ALLOWED (row 2:
#      the V8 memory cage guard) and buildInfo.openmp is a boolean (sanity
#      check that build_info.h's generated constant round-trips through
#      N-API as the right JS type, not e.g. a string "true").
#   4. test/electron-smoke.cjs, test/electron-workers-smoke.cjs and
#      test/electron-workers-cold-smoke.cjs (T24 Part A) under the locally
#      installed `electron` package if node_modules/electron exists, else
#      under plain `node` with a warning (so this script still runs
#      somewhere `npm i --no-save electron@42` hasn't been done, e.g. a
#      fresh clone, at the cost of not actually exercising Electron).
#
# Exits non-zero (after printing a PASS/FAIL summary) if any check fails.
set -uo pipefail

cd "$(dirname "$0")/.."

status=0
declare -a SUMMARY=()

pass() { SUMMARY+=("PASS: $1"); }
fail() { SUMMARY+=("FAIL: $1"); status=1; }

# --- 1. Platform binary check ----------------------------------------------
NODE_PLATFORM="$(node -p 'process.platform')"
NODE_ARCH="$(node -p 'process.arch')"
PLATFORM_DIR="${NODE_PLATFORM}-${NODE_ARCH}"
ADDON_PATH="prebuilds/${PLATFORM_DIR}/node.napi.node"

echo "== 1. Platform binary check (${PLATFORM_DIR}) =="
if [ ! -f "$ADDON_PATH" ]; then
  fail "binary check: no prebuild at ${ADDON_PATH}"
else
  case "$NODE_PLATFORM" in
    linux)
      if ./scripts/check-binary.sh "$ADDON_PATH"; then
        pass "check-binary.sh ${ADDON_PATH}"
      else
        fail "check-binary.sh ${ADDON_PATH}"
      fi
      ;;
    darwin)
      if ./scripts/check-binary-macos.sh "$ADDON_PATH"; then
        pass "check-binary-macos.sh ${ADDON_PATH}"
      else
        fail "check-binary-macos.sh ${ADDON_PATH}"
      fi
      ;;
    win32)
      if pwsh -File ./scripts/check-binary-windows.ps1 -FilePath "$ADDON_PATH"; then
        pass "check-binary-windows.ps1 ${ADDON_PATH}"
      else
        fail "check-binary-windows.ps1 ${ADDON_PATH}"
      fi
      ;;
    *)
      fail "unknown platform '${NODE_PLATFORM}' -- no binary check available"
      ;;
  esac
fi
echo

# --- 2. Forbidden include grep ----------------------------------------------
echo "== 2. Forbidden Node-internals includes under src/ =="
# Excludes node_modules (there is none under src/, but stay consistent with
# the task text) and src/generated (generated .cc files, same rule applies
# but nothing there includes anything besides the generated tables' own
# headers -- grepped anyway for belt-and-suspenders).
FORBIDDEN_RE='#include[[:space:]]*[<"](node|v8|uv|node_buffer|node_object_wrap)\.h[>"]'
BAD_INCLUDES="$(grep -rnE "$FORBIDDEN_RE" src/ --include='*.cc' --include='*.h' --include='*.hpp' --exclude-dir=node_modules 2>/dev/null || true)"
if [ -n "$BAD_INCLUDES" ]; then
  echo "$BAD_INCLUDES"
  fail "forbidden Node-internals include(s) found under src/ (only napi.h/node_api.h/js_native_api.h allowed)"
else
  echo "(none found)"
  pass "no forbidden includes under src/"
fi
echo

# --- 3. buildInfo.flags / buildInfo.openmp ----------------------------------
echo "== 3. buildInfo.flags / buildInfo.openmp =="
BUILD_INFO_CHECK="$(node -e "
try {
  const lib = require('./lib/index.cjs');
  const bi = lib.buildInfo || {};
  const flags = String(bi.flags || '');
  const hasFlag = flags.includes('NODE_API_NO_EXTERNAL_BUFFERS_ALLOWED');
  const openmpIsBool = typeof bi.openmp === 'boolean';
  console.log(JSON.stringify({ hasFlag, openmpIsBool, flags, openmp: bi.openmp }));
} catch (err) {
  console.log(JSON.stringify({ error: String(err && err.stack || err) }));
}
")"
echo "$BUILD_INFO_CHECK"
HAS_FLAG="$(node -e "const r=$BUILD_INFO_CHECK; process.stdout.write(r.hasFlag ? 'yes' : 'no')" 2>/dev/null || echo no)"
OPENMP_BOOL="$(node -e "const r=$BUILD_INFO_CHECK; process.stdout.write(r.openmpIsBool ? 'yes' : 'no')" 2>/dev/null || echo no)"
if [ "$HAS_FLAG" = "yes" ]; then
  pass "buildInfo.flags contains NODE_API_NO_EXTERNAL_BUFFERS_ALLOWED"
else
  fail "buildInfo.flags does not contain NODE_API_NO_EXTERNAL_BUFFERS_ALLOWED"
fi
if [ "$OPENMP_BOOL" = "yes" ]; then
  pass "buildInfo.openmp is a boolean"
else
  fail "buildInfo.openmp is not a boolean"
fi
echo

# --- 4. Electron smoke scripts ----------------------------------------------
echo "== 4. Electron smoke scripts =="
SMOKE_SCRIPTS=(
  test/electron-smoke.cjs
  test/electron-workers-smoke.cjs
  test/electron-workers-cold-smoke.cjs
)

if [ -d node_modules/electron ]; then
  echo "electron package found under node_modules/electron -- running under Electron (ELECTRON_RUN_AS_NODE=1)"
  for script in "${SMOKE_SCRIPTS[@]}"; do
    if node scripts/run-electron.cjs "$script"; then
      pass "$script (electron)"
    else
      fail "$script (electron)"
    fi
  done
else
  echo "WARNING: node_modules/electron not found -- running under plain node instead." >&2
  echo "WARNING: this does NOT exercise Electron's V8 memory cage, worker_threads under Electron, or the Windows delay-load path. Run 'npm i --no-save electron@42' first for a real check." >&2
  for script in "${SMOKE_SCRIPTS[@]}"; do
    if node "$script"; then
      pass "$script (node, no electron installed)"
    else
      fail "$script (node, no electron installed)"
    fi
  done
fi
echo

# --- Summary -----------------------------------------------------------------
echo "== electron-safety.sh summary =="
for line in "${SUMMARY[@]}"; do
  echo "$line"
done
echo
if [ "$status" -eq 0 ]; then
  echo "electron-safety: OK"
else
  echo "electron-safety: FAILED" >&2
fi

exit "$status"
