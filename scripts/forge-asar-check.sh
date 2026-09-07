#!/usr/bin/env bash
# scripts/forge-asar-check.sh
#
# T24 Part C: proves the packaged (asar) form of @janhapke/libraw actually
# loads and decodes -- the one thing test/electron-smoke.cjs and
# test/electron-workers-smoke.cjs cannot catch (they require the package
# straight out of the repo/node_modules, never through an asar archive).
#
# Steps:
#   1. `npm pack` at the repo root -- produces janhapke-libraw-<version>.tgz
#      (version read from package.json), the exact tarball a real consumer
#      would install. Step 1b rewrites test/forge-app/package.json's `file:`
#      dependency to match, so a release version bump does not go stale.
#   2. Copy the synthetic DNG fixture into test/forge-app/ so Forge packages
#      it alongside main.js (test/forge-app/main.js and asar-check.cjs both
#      read it from the app root).
#   3. `npm install` inside test/forge-app/ -- installs @electron-forge/cli,
#      electron, and @janhapke/libraw via the versioned `file:` dependency
#      step 1b just wrote (so this exercises the real packed tarball, not a
#      symlinked/live source tree).
#   4. `electron-forge package --platform linux --arch x64` -- packages the
#      app into test/forge-app/out/. This does not need a display (unlike
#      `make`, `start`, or `launch`).
#   5. Run the headless check: `ELECTRON_RUN_AS_NODE=1 <packaged binary>
#      test/forge-app/asar-check.cjs`, which requires @janhapke/libraw from
#      inside resources/app.asar, decodes, and asserts the loaded .node
#      file's path contains "app.asar.unpacked".
#
# Prints the `PASS loadedFrom=...` line on success; exits non-zero on any
# failure (npm pack, npm install, electron-forge package, or the check
# script itself failing).
set -euo pipefail

cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"
FORGE_APP_DIR="${REPO_ROOT}/test/forge-app"

echo "== 1. npm pack (repo root) =="
PKG_VERSION="$(node -p "require('./package.json').version")"
TARBALL="${REPO_ROOT}/janhapke-libraw-${PKG_VERSION}.tgz"
npm pack
if [ ! -f "$TARBALL" ]; then
  echo "forge-asar-check: expected tarball not found: ${TARBALL}" >&2
  exit 1
fi
echo "tarball: ${TARBALL}"
echo

echo "== 1b. Point test/forge-app/package.json at this version's tarball =="
# The dependency name is versioned (npm pack's own naming), so a release
# version bump must be reflected here too, or step 3's npm install would
# silently keep resolving the previous release's (or 0.0.0's) tarball name.
node -e "
  const fs = require('fs');
  const p = '${FORGE_APP_DIR}/package.json';
  const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
  pkg.dependencies['@janhapke/libraw'] = 'file:../../janhapke-libraw-${PKG_VERSION}.tgz';
  fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
"
echo

echo "== 2. Copy synthetic DNG fixture into test/forge-app/ =="
cp test/fixtures/pm5544-768x576.dng "${FORGE_APP_DIR}/pm5544-768x576.dng"
echo

echo "== 3. npm install (test/forge-app) =="
# npm's file: dependency resolution can skip re-extracting the tarball if
# it does not detect a change: package-lock.json pins an "integrity" hash
# for the file: dependency from the *previous* run's tarball, and with an
# unchanged version number (0.0.0) npm reuses that cached extraction even
# though the tarball's contents differ on disk (observed empirically:
# removing only node_modules/@janhapke/libraw was not enough -- the stale
# lockfile entry still won). Remove both so a code change since the last
# run of this script is always picked up, without a full node_modules wipe
# of Forge CLI/electron and their transitive deps on every run.
rm -rf "${FORGE_APP_DIR}/node_modules/@janhapke/libraw" "${FORGE_APP_DIR}/package-lock.json"
(cd "$FORGE_APP_DIR" && npm install)
echo

echo "== 4. electron-forge package --platform linux --arch x64 =="
(cd "$FORGE_APP_DIR" && npx electron-forge package --platform linux --arch x64)
echo

echo "== 5. Headless asar-packaging check =="
OUT_DIR="$(find "${FORGE_APP_DIR}/out" -maxdepth 1 -type d -name 'libraw-forge-app-check-linux-x64' | head -1)"
if [ -z "$OUT_DIR" ]; then
  echo "forge-asar-check: packaged output directory not found under ${FORGE_APP_DIR}/out" >&2
  find "${FORGE_APP_DIR}/out" >&2 || true
  exit 1
fi
BINARY="${OUT_DIR}/libraw-forge-app-check"
if [ ! -x "$BINARY" ]; then
  echo "forge-asar-check: packaged binary not found or not executable: ${BINARY}" >&2
  ls -la "$OUT_DIR" >&2 || true
  exit 1
fi

# Also verify (belt-and-suspenders, matching how-to row 10's acceptance
# check) that the .node file is a real, physical file under
# app.asar.unpacked on disk -- not just something asar's own file listing
# claims exists (asar list includes unpacked files too; see the knowledge
# base's electron-native-modules.md note on this exact gotcha).
UNPACKED_NODE="$(find "${OUT_DIR}/resources/app.asar.unpacked" -name '*.node' 2>/dev/null | head -1)"
if [ -z "$UNPACKED_NODE" ]; then
  echo "forge-asar-check: no .node file found under resources/app.asar.unpacked" >&2
  exit 1
fi
echo "found unpacked .node: ${UNPACKED_NODE}"

ELECTRON_RUN_AS_NODE=1 "$BINARY" "${REPO_ROOT}/test/forge-app/asar-check.cjs"
