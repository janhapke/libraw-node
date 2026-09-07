'use strict';

// T24 Part C: the actual headless asar-packaging proof. Run against a
// packaged app's own Electron binary in Node mode:
//
//   ELECTRON_RUN_AS_NODE=1 out/<app>-linux-x64/<binary> test/forge-app/asar-check.cjs
//
// (scripts/forge-asar-check.sh does exactly this after `electron-forge
// package`.) ELECTRON_RUN_AS_NODE avoids needing a display -- see
// docs/plan/tasks.md's Common rules -- while still running as the real
// packaged binary, with process.resourcesPath pointing at the packaged
// app's resources/ directory exactly as it would for the full GUI app.
//
// Requires @janhapke/libraw from inside the packaged resources/app.asar
// (not from this script's own node_modules -- there is no ambient
// require() path to it otherwise, since this file is invoked directly by
// path, outside the app.asar's module graph), decodes the synthetic DNG
// that was packaged alongside main.js at the app root, and asserts the
// loaded .node file's resolved path contains "app.asar.unpacked" --
// proof that Forge's packagerConfig.asar.unpack actually pulled the
// native addon out of the (otherwise unreadable-by-dlopen) archive.
const path = require('path');
const fs = require('fs');

class CheckFailure extends Error {}

function resolveAddonPath() {
  for (const key of Object.keys(require.cache)) {
    if (key.endsWith('.node')) return key;
  }
  return null;
}

async function main() {
  const resourcesPath = process.resourcesPath;
  if (!resourcesPath) {
    throw new CheckFailure('process.resourcesPath is not set -- expected when running a packaged Electron app binary');
  }

  const pkgPath = path.join(resourcesPath, 'app.asar', 'node_modules', '@janhapke', 'libraw');
  const libraw = require(pkgPath);

  const dngPath = path.join(resourcesPath, 'app.asar', 'pm5544-768x576.dng');
  const buf = fs.readFileSync(dngPath);
  const img = await libraw.decode(buf);
  if (img.width !== 768 || img.height !== 576) {
    throw new CheckFailure(`decode size mismatch: ${img.width}x${img.height}, expected 768x576`);
  }

  const addonPath = resolveAddonPath();
  if (!addonPath) {
    throw new CheckFailure('could not find a loaded .node file in require.cache');
  }
  if (!addonPath.includes('app.asar.unpacked')) {
    throw new CheckFailure(`addon did not load from app.asar.unpacked: ${addonPath}`);
  }

  console.log(`PASS loadedFrom=${addonPath}`);
}

main().then(
  () => {
    process.exitCode = 0;
  },
  (err) => {
    const reason = err instanceof CheckFailure ? err.message : err && err.stack ? err.stack : String(err);
    console.error('FAIL', reason);
    process.exitCode = 1;
  },
);
