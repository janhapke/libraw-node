#!/usr/bin/env node
'use strict';

// T22: Electron worker_threads smoke test (docs/how-to/test-under-electron.md
// §"Worker-thread variant", docs/explanation/electron-compatibility.md §4
// "Context-aware and worker_threads-safe"). Spawns 3 worker_threads -- each
// requires the addon independently and does one decode() of the synthetic
// fixture, posting its checksum back -- and the main thread asserts all
// three checksums match. Proves the addon is genuinely context-aware
// (Napi::Addon, no process-global mutable state) under Electron, not just
// under plain Node.
//
// The main thread also requires the addon once itself (see WARM_UP_MAIN
// below) before spawning any worker. This is a real fix, not just
// diagnostics: on Windows, the very first N-API call from *any* thread
// resolves this addon's delay-load import of node.exe's exports
// (src/win_delay_load_hook.cc, docs/explanation/electron-compatibility.md
// §3) by patching a process-wide IAT slot -- doing that once, single
// -threaded, before 3 worker_threads all attempt their own first N-API call
// within milliseconds of each other, avoids depending on the delay-load
// runtime's (and this addon's own static initializers') behaviour under
// concurrent first use, which is not something either is documented to
// guarantee. Each worker still independently requires the module and runs
// its own decode() -- the thing this test actually exists to prove.
//
// Runs equally under `ELECTRON_RUN_AS_NODE=1 npx electron test/electron-workers-smoke.cjs`
// and plain `node test/electron-workers-smoke.cjs`.
//
// On success: prints `PASS workers=3 electron=<version>`. On failure:
// prints `FAIL <reason>`. Either way the exit code is set via
// `process.exitCode`, never `process.exit()` -- see test/electron-smoke.cjs's
// header comment for why (Windows async-pipe stdout truncation on a forced
// exit). Letting the event loop drain naturally (all workers terminated)
// guarantees the PASS/FAIL line is flushed before the process exits.
//
// Also installs process-level uncaughtException/unhandledRejection handlers
// so that if something throws outside the promise chains below (which would
// otherwise kill the process silently, with no PASS/FAIL line at all -- the
// failure mode CI round 1 hit before this file had the process.exitCode
// fix above), it is still reported instead of just vanishing.

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Worker, isMainThread, parentPort, threadId } = require('worker_threads');

const DNG_PATH = path.join(__dirname, 'fixtures', 'pm5544-768x576.dng');
const WORKER_COUNT = 3;
const LIB_PATH = path.join(__dirname, '..', 'lib', 'index.cjs');

class SmokeTestFailure extends Error {}

function fail(reason) {
  throw new SmokeTestFailure(reason);
}

function reportUncaught(prefix, err) {
  const reason = err && err.stack ? err.stack : String(err);
  console.error('FAIL', `${prefix}: ${reason}`);
  process.exitCode = 1;
}

process.on('uncaughtException', (err) => reportUncaught(`uncaughtException (thread ${threadId})`, err));
process.on('unhandledRejection', (err) => reportUncaught(`unhandledRejection (thread ${threadId})`, err));

async function workerMain() {
  console.error(`[worker ${threadId}] requiring addon`);
  const libraw = require(LIB_PATH);
  console.error(`[worker ${threadId}] decoding`);
  const buf = fs.readFileSync(DNG_PATH);
  const img = await libraw.decode(buf);
  console.error(`[worker ${threadId}] decoded ${img.width}x${img.height}, hashing`);
  const checksum = crypto.createHash('sha256').update(img.data).digest('hex');
  parentPort.postMessage({ ok: true, checksum, width: img.width, height: img.height });
}

function runWorker(index) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, { workerData: { index } });
    let settled = false;
    worker.once('message', (msg) => {
      settled = true;
      worker.terminate();
      if (msg && msg.ok) {
        resolve(msg);
      } else {
        reject(new Error(`worker ${index} reported an error: ${msg && msg.error}`));
      }
    });
    worker.once('error', (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
    worker.once('exit', (code) => {
      if (!settled) {
        reject(new Error(`worker ${index} exited with code ${code} before posting a message`));
      }
    });
  });
}

async function mainThread() {
  const electronVersion = process.versions.electron || 'none';

  // See the header comment: a single-threaded warm-up require before any
  // worker starts, not part of the correctness assertion itself.
  console.error('[main] warm-up require of addon before spawning workers');
  require(LIB_PATH);

  console.error(`[main] spawning ${WORKER_COUNT} workers`);
  const results = await Promise.all(Array.from({ length: WORKER_COUNT }, (_unused, i) => runWorker(i)));
  console.error('[main] all workers reported back');

  for (const result of results) {
    if (result.width !== 768 || result.height !== 576) {
      fail(`worker decode size mismatch: ${result.width}x${result.height}, expected 768x576`);
    }
  }

  const checksums = results.map((r) => r.checksum);
  const reference = checksums[0];
  for (let i = 1; i < checksums.length; i++) {
    if (checksums[i] !== reference) {
      fail(`checksum mismatch: worker 0 = ${reference}, worker ${i} = ${checksums[i]}`);
    }
  }

  console.log(`PASS workers=${WORKER_COUNT} electron=${electronVersion}`);
}

if (isMainThread) {
  mainThread().then(
    () => {
      process.exitCode = 0;
    },
    (err) => {
      const reason = err instanceof SmokeTestFailure ? err.message : err && err.stack ? err.stack : String(err);
      console.error('FAIL', reason);
      process.exitCode = 1;
    },
  );
} else {
  workerMain().catch((err) => {
    if (parentPort) {
      parentPort.postMessage({ ok: false, error: err && err.stack ? err.stack : String(err) });
    } else {
      console.error('FAIL', err && err.stack ? err.stack : String(err));
      process.exitCode = 1;
    }
  });
}
