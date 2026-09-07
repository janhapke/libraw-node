'use strict';

// Loads the platform/arch-specific prebuild from prebuilds/<platform>-<arch>/
// via node-gyp-build's standard resolution (falls back to build/Release for
// local `cmake --build` development trees). See
// docs/how-to/build-from-source.md for how prebuilds/ is produced.
//
// Split out of lib/index.cjs in T06 so lib/index.cjs can compose the raw
// native exports with the JS-side Processor wrapper (lib/processor.cjs) and
// LibRawError (lib/errors.cjs) without every consumer of "the native
// binding" (lib/processor.cjs included) re-implementing binding resolution.
const fs = require('fs');
const path = require('path');
const nodeGypBuild = require('node-gyp-build');

const PACKAGE_ROOT = path.join(__dirname, '..');

// T24 Part C: node-gyp-build (node_modules/node-gyp-build/node-gyp-build.js)
// does a plain fs.readdirSync() + require(), with no asar-specific handling
// at all -- confirmed empirically while building the Electron Forge
// packaging test (test/forge-app/, scripts/forge-asar-check.sh). Its
// resolved path always points *inside* app.asar (e.g.
// ".../app.asar/node_modules/@janhapke/libraw/prebuilds/linux-x64/
// node.napi.node"), even when Forge's packagerConfig.asar.unpack
// ('**/*.node') has genuinely moved the physical file out to the sibling
// app.asar.unpacked tree. Electron's own require()/process.dlopen patch
// transparently redirects that path to the real app.asar.unpacked file
// when it actually calls dlopen -- the addon loads and runs correctly
// under Electron with no changes here at all (confirmed: decode()
// succeeds even without this rewrite) -- but the path Node reports back
// (module.filename, require.cache's key) stays the pre-redirect app.asar
// path, which is useless for anything that wants to know where the addon
// really lives on disk (diagnostics, and this package's own asar
// -packaging test, which needs to assert the real path).
//
// Do the same app.asar -> app.asar.unpacked rewrite explicitly, and
// require() the rewritten physical path when a real file exists there,
// instead of depending on Electron's implicit redirect. This is also
// defense-in-depth beyond Electron's main-process require patch: dlopen
// cannot open a path inside a virtual asar archive at all, so any consumer
// or process type where that implicit redirect does not apply would
// otherwise fail outright (docs/how-to/make-the-addon-electron-safe.md row
// 10; knowledge base electron-native-modules.md).
function resolveAddonPath() {
  if (typeof nodeGypBuild.path !== 'function') {
    // Non-Node/Electron runtimes (e.g. Bare) route through
    // `require.addon` instead of node-gyp-build.js and don't expose
    // `.path()` -- fall back to the plain resolve+require this package has
    // always used rather than assuming asar awareness that isn't there.
    return null;
  }

  const resolved = nodeGypBuild.path(PACKAGE_ROOT);
  const asarSep = `.asar${path.sep}`;
  const idx = resolved.indexOf(asarSep);
  if (idx === -1) return resolved; // not inside an asar archive at all

  if (resolved.includes(`.asar.unpacked${path.sep}`)) return resolved; // already unpacked

  const rewritten = resolved.slice(0, idx) + '.asar.unpacked' + path.sep + resolved.slice(idx + asarSep.length);
  try {
    fs.accessSync(rewritten, fs.constants.R_OK);
    return rewritten;
  } catch (err) {
    // No unpacked copy on disk -- not actually packaged this way, or the
    // asar-marker match above was a false positive (e.g. a path segment
    // that happens to contain ".asar" for an unrelated reason). Fall back
    // to the original resolution and let require() (and Electron's own
    // redirect, if applicable) handle it as before.
    return resolved;
  }
}

// Deliberately not exposed as a package-level export (would need to be
// threaded through lib/index.cjs/index.mjs's export lists, types/index.d.ts,
// and README.md for one narrow diagnostic use) -- requiring the rewritten
// physical path directly, right here, is what matters: it makes
// require.cache's key (module.filename) for this addon the real
// app.asar.unpacked path whenever that rewrite applied, which is exactly
// what test/forge-app/asar-check.cjs (T24 Part C) inspects to prove the
// unpack actually happened, with no extra API surface needed for it.
const ADDON_PATH = resolveAddonPath();
let binding;
try {
  binding = ADDON_PATH ? require(ADDON_PATH) : nodeGypBuild(PACKAGE_ROOT);
} catch (err) {
  // Linux prebuilds link GCC's OpenMP runtime dynamically (decision 2026-09-07,
  // docs/plan/tasks.md T28): name the distro package in the load error.
  if (err && typeof err.message === 'string' && err.message.includes('libgomp.so.1')) {
    err.message += '\n@janhapke/libraw: the Linux prebuild needs the GCC OpenMP runtime: ' +
      'install "libgomp1" (Debian/Ubuntu) or "libgomp" (Fedora/RHEL) and retry.';
  }
  throw err;
}

module.exports = binding;
