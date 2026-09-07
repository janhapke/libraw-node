'use strict';

// T24 Part C: main process entry point for the packaged-app check. This is
// the "normal app" path (packagerConfig requires a real main entry to
// package at all); it is never actually launched in CI, because this host
// has no display (see docs/plan/tasks.md's Common rules: "never launch an
// Electron window"). The path CI actually exercises is
// test/forge-app/asar-check.cjs, run headlessly with
// `ELECTRON_RUN_AS_NODE=1 <packaged binary> asar-check.cjs` -- see that
// file's header comment. This file exists so the app is a legitimate,
// launchable Electron app (and so a human with a display can run
// `npx electron-forge start` here and see the same PASS line for
// themselves), not because CI exercises it.
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const libraw = require('@janhapke/libraw');

function resolveAddonPath() {
  for (const key of Object.keys(require.cache)) {
    if (key.endsWith('.node')) return key;
  }
  return null;
}

app.whenReady().then(async () => {
  try {
    const dngPath = path.join(__dirname, 'pm5544-768x576.dng');
    const buf = fs.readFileSync(dngPath);
    const img = await libraw.decode(buf);
    if (img.width !== 768 || img.height !== 576) {
      throw new Error(`decode size mismatch: ${img.width}x${img.height}, expected 768x576`);
    }
    console.log(`PASS loadedFrom=${resolveAddonPath()}`);
    app.exit(0);
  } catch (err) {
    console.error('FAIL', err && err.stack ? err.stack : String(err));
    app.exit(1);
  }
});
