#!/usr/bin/env node
'use strict';

// T24b round-1 diagnostics. This is a single main+worker script (like
// test/electron-workers-cold-smoke.cjs) driven entirely by CLI flags so that
// test/helpers/run-variants.cjs can spawn it as a fresh `node` child process
// once per lettered variant (a)-(h) from docs/plan/tasks.md's T24b section,
// each answering a different question about the Windows "PASS, then exit
// code 1 about 0.3s later" failure (run 34136306293, job test-windows):
//
//   --workers=N     worker count (default 3)
//   --mode=decode|require|version
//                   decode:  require the addon, read the fixture, decode(),
//                            hash the result (today's cold-smoke behaviour)
//                   require: require the addon only, no LibRaw call at all
//                   version: require the addon, call libraw.version() only
//                            (no AsyncWorker, no libuv threadpool involved)
//   --warmup        main thread requires the addon once before spawning any
//                   worker (the old T22 warm-up, removed in T24)
//   --wait=MS       main thread waits MS ms after every worker has reported
//                   back, before letting the process exit naturally
//   --no-terminate  do not call worker.terminate() when a worker's result
//                   message arrives; let the worker exit on its own instead
//                   (isolates whether forced termination is implicated)
//   --direct        no worker_threads at all -- run --mode's work directly
//                   on the main thread (isolates whether worker_threads
//                   involvement matters at all)
//
// Diagnostics (kept deliberately verbose -- every CI round here costs
// 15-20 minutes, so this prints everything a single round could need):
//   - process.on('exit', ...) on both the main thread and every worker
//     thread, reporting the OS exit code Node is about to use and the
//     current process.exitCode at that moment.
//   - process.on('uncaughtException') / process.on('unhandledRejection')
//     (main and worker; unlike the plain cold-smoke script, always logs
//     even after the relevant promise has already settled).
//   - worker.on('error') / worker.on('exit') / worker.on('messageerror')
//     -- always logged from the main thread, not only when !settled.
//   - --trace-exit --trace-uncaught --trace-warnings are expected to be set
//     by the caller (run_variants.cjs sets them via NODE_OPTIONS so every
//     variant gets them uniformly).
//
// Usage: node test/helpers/cold-variant.cjs [--workers=N] [--mode=decode]
//        [--warmup] [--wait=MS] [--no-terminate]

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Worker, isMainThread, parentPort, threadId, workerData } = require('worker_threads');

const DNG_PATH = path.join(__dirname, '..', 'fixtures', 'pm5544-768x576.dng');
const LIB_PATH = path.join(__dirname, '..', '..', 'lib', 'index.cjs');

function parseFlags(argv) {
  const flags = { workers: 3, mode: 'decode', warmup: false, wait: 0, terminate: true, direct: false };
  for (const arg of argv) {
    if (arg === '--warmup') flags.warmup = true;
    else if (arg === '--no-terminate') flags.terminate = false;
    else if (arg === '--direct') flags.direct = true;
    else if (arg.startsWith('--workers=')) flags.workers = Math.max(1, parseInt(arg.slice('--workers='.length), 10));
    else if (arg.startsWith('--mode=')) flags.mode = arg.slice('--mode='.length);
    else if (arg.startsWith('--wait=')) flags.wait = Math.max(0, parseInt(arg.slice('--wait='.length), 10));
  }
  return flags;
}

const FLAGS = isMainThread ? parseFlags(process.argv.slice(2)) : workerData.flags;

function log(prefix, msg) {
  process.stderr.write(`[${prefix}] ${msg}\n`);
}

function reportUncaught(prefix, err) {
  const reason = err && err.stack ? err.stack : String(err);
  process.stderr.write(`DIAG ${prefix}: ${reason}\n`);
  process.exitCode = 1;
}

process.on('uncaughtException', (err) => reportUncaught(`uncaughtException (thread ${threadId})`, err));
process.on('unhandledRejection', (err) => reportUncaught(`unhandledRejection (thread ${threadId})`, err));
process.on('exit', (code) => {
  process.stderr.write(`DIAG exit thread=${threadId} main=${isMainThread} exitCode=${code} process.exitCode=${process.exitCode}\n`);
});
process.on('warning', (warning) => {
  process.stderr.write(`DIAG warning (thread ${threadId}): ${warning && warning.stack ? warning.stack : String(warning)}\n`);
});

async function doWork(prefix) {
  log(prefix, `starting mode=${FLAGS.mode}`);
  const libraw = require(LIB_PATH);
  log(prefix, 'required addon');
  if (FLAGS.mode === 'require') {
    return { ok: true, mode: 'require' };
  }
  if (FLAGS.mode === 'version') {
    const version = libraw.version();
    log(prefix, `version() -> ${version}`);
    return { ok: true, mode: 'version', version };
  }
  const buf = fs.readFileSync(DNG_PATH);
  log(prefix, 'decoding');
  const img = await libraw.decode(buf);
  log(prefix, `decoded ${img.width}x${img.height}, hashing`);
  const checksum = crypto.createHash('sha256').update(img.data).digest('hex');
  log(prefix, 'done');
  return { ok: true, mode: 'decode', checksum, width: img.width, height: img.height };
}

async function workerMain() {
  const result = await doWork(`worker ${threadId}`);
  log(`worker ${threadId}`, 'posting result');
  parentPort.postMessage(result);
}

function runWorker(index) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, { workerData: { index, flags: FLAGS } });
    let settled = false;
    worker.once('message', (msg) => {
      settled = true;
      log('main', `worker ${index} (thread ${worker.threadId}) message: ${JSON.stringify(msg)}`);
      if (FLAGS.terminate) {
        worker.terminate().then(
          (code) => log('main', `worker ${index} terminate() resolved code=${code}`),
          (err) => reportUncaught(`worker ${index} terminate() rejected`, err),
        );
      }
      if (msg && msg.ok) {
        resolve(msg);
      } else {
        reject(new Error(`worker ${index} reported an error: ${msg && msg.error}`));
      }
    });
    worker.on('error', (err) => {
      log('main', `worker ${index} 'error' event: ${err && err.stack ? err.stack : String(err)}`);
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
    worker.on('exit', (code) => {
      log('main', `worker ${index} (thread ${worker.threadId}) 'exit' event code=${code} settled=${settled}`);
      if (!settled) {
        settled = true;
        reject(new Error(`worker ${index} exited with code ${code} before posting a message`));
      }
    });
    worker.on('messageerror', (err) => {
      log('main', `worker ${index} 'messageerror' event: ${err && err.stack ? err.stack : String(err)}`);
    });
  });
}

async function mainThread() {
  const electronVersion = process.versions.electron || 'none';

  if (FLAGS.direct) {
    log('main', `direct mode: running mode=${FLAGS.mode} on the main thread, no worker_threads at all`);
    const result = await doWork('main');
    console.log(
      `PASS workers=0 mode=${FLAGS.mode} direct=true cold=true electron=${electronVersion}`,
    );
    return;
  }

  if (FLAGS.warmup) {
    log('main', 'warm-up: requiring addon on main thread before spawning workers');
    require(LIB_PATH);
  }

  log(
    'main',
    `spawning ${FLAGS.workers} workers mode=${FLAGS.mode} warmup=${FLAGS.warmup} terminate=${FLAGS.terminate} wait=${FLAGS.wait}`,
  );
  const results = await Promise.all(Array.from({ length: FLAGS.workers }, (_unused, i) => runWorker(i)));
  log('main', 'all workers reported back');

  if (FLAGS.mode === 'decode') {
    for (const result of results) {
      if (result.width !== 768 || result.height !== 576) {
        throw new Error(`worker decode size mismatch: ${result.width}x${result.height}, expected 768x576`);
      }
    }
    const checksums = results.map((r) => r.checksum);
    const reference = checksums[0];
    for (let i = 1; i < checksums.length; i++) {
      if (checksums[i] !== reference) {
        throw new Error(`checksum mismatch: worker 0 = ${reference}, worker ${i} = ${checksums[i]}`);
      }
    }
  }

  console.log(
    `PASS workers=${FLAGS.workers} mode=${FLAGS.mode} warmup=${FLAGS.warmup} terminate=${FLAGS.terminate} wait=${FLAGS.wait} cold=true electron=${electronVersion}`,
  );

  if (FLAGS.wait > 0) {
    log('main', `waiting ${FLAGS.wait}ms before letting the process exit naturally`);
    await new Promise((resolve) => setTimeout(resolve, FLAGS.wait));
    log('main', 'wait done');
  }
}

if (isMainThread) {
  mainThread().then(
    () => {
      process.exitCode = 0;
      log('main', `mainThread() resolved, process.exitCode=${process.exitCode}`);
    },
    (err) => {
      const reason = err && err.stack ? err.stack : String(err);
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
