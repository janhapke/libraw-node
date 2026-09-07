#!/usr/bin/env node
'use strict';

// T22: cross-platform launcher for the Electron smoke tests
// (test/electron-smoke.cjs, test/electron-workers-smoke.cjs -- see
// docs/how-to/test-under-electron.md). Resolves the locally installed
// `electron` package's binary path and spawns it in Node mode
// (ELECTRON_RUN_AS_NODE=1) against each script given on the command line.
//
// Exists instead of a plain `ELECTRON_RUN_AS_NODE=1 npx electron <script>`
// npm-script entry because `FOO=1 cmd` env-var-prefix syntax is bash-only
// and does not work under Windows' cmd.exe/PowerShell (npm run scripts use
// the OS shell) -- this file sets the env var in Node itself, so it is the
// same on every platform. `electron` is intentionally not a package.json
// dependency (a ~100 MB per-version download); install it first, e.g.
// `npm i --no-save electron@42`.
const { spawnSync } = require('child_process');

const scripts = process.argv.slice(2);
if (scripts.length === 0) {
  console.error('usage: node scripts/run-electron.cjs <script.cjs> [<script2.cjs> ...]');
  process.exit(1);
}

let electronPath;
try {
  // The `electron` package's main export is the absolute path to its
  // platform binary (electron/index.js reads electron/path.txt).
  electronPath = require('electron');
} catch (err) {
  console.error('The "electron" package is not installed. Run e.g. `npm i --no-save electron@42` first.');
  process.exit(1);
}

for (const script of scripts) {
  const result = spawnSync(electronPath, [script], {
    stdio: 'inherit',
    env: Object.assign({}, process.env, { ELECTRON_RUN_AS_NODE: '1' }),
  });
  if (result.error) {
    console.error(result.error.stack || String(result.error));
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status === null ? 1 : result.status);
  }
}
