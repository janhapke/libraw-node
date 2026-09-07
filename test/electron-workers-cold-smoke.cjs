#!/usr/bin/env node
'use strict';

// T24 Part A: reproduction script for the "Open item from T22" in
// docs/plan/tasks.md (2026-09-07): on windows-2022 under Electron 42/44,
// three worker_threads doing their *first* require() of the addon
// concurrently produced no output at all (job step died silently, twice).
// test/electron-workers-smoke.cjs worked around this with a single
// -threaded warm-up require() on the main thread before spawning workers.
// That warm-up masks the real bug -- photoview's DecodeWorkerPool spawns
// workers that each require the addon without any main-thread warm-up, so
// this script exists to reproduce the failure with NO warm-up at all, then
// stays in CI permanently (all five platforms, no continue-on-error) as a
// regression guard for whatever fix T24 lands.
//
// Deliberate differences from electron-workers-smoke.cjs:
//   - No `require(LIB_PATH)` on the main thread before spawning workers.
//   - Worker count is configurable via argv[2] (default 3; the Windows job
//     runs this script with 3 *and* 6 to see whether the failure scales
//     with concurrency).
//   - Every worker writes its own progress lines with
//     `process.stderr.write` (synchronous on every platform, including
//     Windows pipes -- unlike `console.error`, which on Windows goes
//     through libuv's async pipe write path and can be lost if the
//     process dies before the write reaches the OS; see
//     test/electron-smoke.cjs's header comment for the same Windows-pipe
//     gotcha applied to process.exit()). The point is to have *something*
//     in the log even if the process crashes with no PASS/FAIL line.
//   - Final line on success: `PASS workers=<N> cold=true electron=<v>`.
//   - process.exitCode only, never process.exit(), for the same
//     truncation reason.
//
// Usage:
//   node test/electron-workers-cold-smoke.cjs [workerCount]
//   ELECTRON_RUN_AS_NODE=1 npx electron test/electron-workers-cold-smoke.cjs [workerCount]

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Worker, isMainThread, parentPort, threadId, workerData } = require('worker_threads');

const DNG_PATH = path.join(__dirname, 'fixtures', 'pm5544-768x576.dng');
const LIB_PATH = path.join(__dirname, '..', 'lib', 'index.cjs');
const WORKER_COUNT = Math.max(1, parseInt(process.argv[2] || (workerData && workerData.workerCount) || '3', 10));

class SmokeTestFailure extends Error {}

function fail(reason) {
  throw new SmokeTestFailure(reason);
}

function log(prefix, msg) {
  process.stderr.write(`[${prefix}] ${msg}\n`);
}

function reportUncaught(prefix, err) {
  const reason = err && err.stack ? err.stack : String(err);
  process.stderr.write(`FAIL ${prefix}: ${reason}\n`);
  process.exitCode = 1;
}

process.on('uncaughtException', (err) => reportUncaught(`uncaughtException (thread ${threadId})`, err));
process.on('unhandledRejection', (err) => reportUncaught(`unhandledRejection (thread ${threadId})`, err));

async function workerMain() {
  log(`worker ${threadId}`, 'starting, about to require() addon (cold, no main-thread warm-up)');
  const libraw = require(LIB_PATH);
  log(`worker ${threadId}`, 'required addon, reading fixture');
  const buf = fs.readFileSync(DNG_PATH);
  log(`worker ${threadId}`, 'decoding');
  const img = await libraw.decode(buf);
  log(`worker ${threadId}`, `decoded ${img.width}x${img.height}, hashing`);
  const checksum = crypto.createHash('sha256').update(img.data).digest('hex');
  log(`worker ${threadId}`, 'done, posting result');
  parentPort.postMessage({ ok: true, checksum, width: img.width, height: img.height });
}

function runWorker(index) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, { workerData: { index, workerCount: WORKER_COUNT } });
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

  log('main', `spawning ${WORKER_COUNT} workers simultaneously (cold: no main-thread require first)`);
  const results = await Promise.all(Array.from({ length: WORKER_COUNT }, (_unused, i) => runWorker(i)));
  log('main', 'all workers reported back');

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

  console.log(`PASS workers=${WORKER_COUNT} cold=true electron=${electronVersion}`);
}

if (isMainThread) {
  mainThread().then(
    () => {
      process.exitCode = 0;
    },
    (err) => {
      const reason = err instanceof SmokeTestFailure ? err.message : err && err.stack ? err.stack : String(err);
      process.stderr.write(`FAIL ${reason}\n`);
      process.exitCode = 1;
    },
  );
} else {
  workerMain().catch((err) => {
    if (parentPort) {
      parentPort.postMessage({ ok: false, error: err && err.stack ? err.stack : String(err) });
    } else {
      process.stderr.write(`FAIL ${err && err.stack ? err.stack : String(err)}\n`);
      process.exitCode = 1;
    }
  });
}
