#!/usr/bin/env node
'use strict';

// T24b round-1 diagnostic driver. Runs test/helpers/cold-variant.cjs as a
// fresh `node` child process once per lettered variant below (docs/plan/
// tasks.md's T24b section, variants (a)-(h), plus two extra ones (i)/(j)
// this investigation added to get more signal out of one CI round), and
// prints a compact `VARIANT <letter> exit=<code>` table so the Windows job
// log answers several questions about the "PASS, then exit code 1 about
// 0.3s later, no further output" failure (run 34136306293, job
// test-windows) in one round:
//
//   a  3 workers cold, decode, worker.terminate() on message  (today's repro)
//   b  1 worker cold, decode
//   c  3 workers cold, require() the addon only, no decode
//   d  3 workers cold, decode, main waits 2s after PASS before exiting
//   e  3 workers cold, each calls libraw.version() only (no AsyncWorker)
//   f  same as (a) with OMP_NUM_THREADS=1
//   g  same as (a) with UV_THREADPOOL_SIZE=1
//   h  same as (a) but the main thread requires the addon first (warm-up)
//   i  same as (a) but worker.terminate() is never called (natural exit)
//   j  no worker_threads at all -- decode directly on the main thread
//
// This driver always exits 0 (each variant's real exit code is what
// matters, and is captured/printed here) -- the caller (the Windows CI
// job) does not need continue-on-error while this runs, and this script is
// meant to stay in CI permanently once T24b lands a fix, so a developer can
// rerun the exact same table locally against a Windows checkout to compare.
//
// Usage: node test/helpers/run-variants.cjs

const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, 'cold-variant.cjs');

const VARIANTS = [
  { letter: 'a', args: ['--workers=3', '--mode=decode'], env: {} },
  { letter: 'b', args: ['--workers=1', '--mode=decode'], env: {} },
  { letter: 'c', args: ['--workers=3', '--mode=require'], env: {} },
  { letter: 'd', args: ['--workers=3', '--mode=decode', '--wait=2000'], env: {} },
  { letter: 'e', args: ['--workers=3', '--mode=version'], env: {} },
  { letter: 'f', args: ['--workers=3', '--mode=decode'], env: { OMP_NUM_THREADS: '1' } },
  { letter: 'g', args: ['--workers=3', '--mode=decode'], env: { UV_THREADPOOL_SIZE: '1' } },
  { letter: 'h', args: ['--workers=3', '--mode=decode', '--warmup'], env: {} },
  { letter: 'i', args: ['--workers=3', '--mode=decode', '--no-terminate'], env: {} },
  { letter: 'j', args: ['--mode=decode', '--direct'], env: {} },
];

const BASE_NODE_OPTIONS = '--trace-exit --trace-uncaught --trace-warnings';

function runVariant(v) {
  const env = {
    ...process.env,
    ...v.env,
    // Append to any NODE_OPTIONS the caller already set rather than
    // clobbering it.
    NODE_OPTIONS: [process.env.NODE_OPTIONS, BASE_NODE_OPTIONS].filter(Boolean).join(' '),
  };
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, [SCRIPT, ...v.args], {
    env,
    encoding: 'utf8',
    // 60s per variant is generous (each variant decodes the tiny synthetic
    // fixture 1-3 times) -- if a variant hangs instead of exiting, that is
    // itself important diagnostic information, not a driver bug, so it
    // must show up as a timeout in the table rather than wedge the job.
    timeout: 60_000,
  });
  const elapsedMs = Date.now() - startedAt;
  const exitCode = result.status === null ? `signal:${result.signal}` : result.status;
  console.log(`\n=== VARIANT ${v.letter}: node ${v.args.join(' ')} env=${JSON.stringify(v.env)} ===`);
  if (result.error) {
    console.log(`spawn error: ${result.error.stack || result.error}`);
  }
  const prefixLines = (text, prefix) =>
    text
      .split('\n')
      .filter((l, i, arr) => l !== '' || i !== arr.length - 1)
      .map((l) => `  ${prefix}| ${l}`)
      .join('\n') + '\n';
  if (result.stdout) {
    process.stdout.write(prefixLines(result.stdout, 'out'));
  }
  if (result.stderr) {
    process.stderr.write(prefixLines(result.stderr, 'err'));
  }
  console.log(`VARIANT ${v.letter} exit=${exitCode} elapsedMs=${elapsedMs}`);
  return { letter: v.letter, exitCode };
}

function main() {
  const summary = [];
  for (const v of VARIANTS) {
    summary.push(runVariant(v));
  }
  console.log('\n=== VARIANT SUMMARY ===');
  for (const s of summary) {
    console.log(`VARIANT ${s.letter} exit=${s.exitCode}`);
  }
  // Always exit 0 -- see header comment. The table above is the payload;
  // this driver never fails the CI step on its own.
  process.exitCode = 0;
}

main();
