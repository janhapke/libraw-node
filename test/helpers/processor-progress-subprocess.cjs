'use strict';

// Helper for test/events.test.ts's "same progress sequence through Processor
// events" case. Run as a fresh `node` subprocess (never in-process) with
// OMP_NUM_THREADS=1 set in its environment *before this process starts* --
// see that test's comment for why: LibRaw's default demosaic choice for the
// synthetic DNG (AHD fallback, since Processor has no parameter-setting API
// until T12) only calls its progress callback from whichever OpenMP thread
// happens to be thread 0 for a given loop iteration
// (vendor/LibRaw/src/demosaic/ahd_demosaic.cpp); on a many-core machine,
// thread 0 reliably gets none of this tiny image's ~3 tile-row iterations,
// so INTERPOLATE never fires under the default thread count. Forcing a
// single OpenMP thread for the whole process makes that thread thread 0 for
// every iteration, so the callback fires deterministically. Once libgomp's
// thread pool exists, changing `process.env.OMP_NUM_THREADS` no longer has
// any effect (confirmed empirically) -- it must be set in the environment
// this process is spawned with, hence a subprocess rather than an in-process
// env mutation.
//
// Usage: node processor-progress-subprocess.cjs <dngPath>
// Prints a JSON array of this Processor's 'progress' event stage names (in
// order, across openBuffer -> unpack -> process) to stdout.
const fs = require('node:fs');
const path = require('node:path');
const libraw = require(path.join(__dirname, '..', '..', 'lib', 'index.cjs'));

const dngPath = process.argv[2];

(async () => {
  const p = new libraw.Processor();
  const stages = [];
  p.on('progress', (e) => stages.push(e.stage));
  await p.openBuffer(fs.readFileSync(dngPath));
  await p.unpack();
  await p.process();
  p.close();
  process.stdout.write(JSON.stringify(stages));
})().catch((err) => {
  process.stderr.write(String((err && err.stack) || err));
  process.exitCode = 1;
});
