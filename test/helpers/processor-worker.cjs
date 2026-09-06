'use strict';

// Helper for test/processor-sync.test.ts's "context-aware loading" case and
// for the standalone `node -e` acceptance check in T06: loads the addon and
// constructs + drives a Processor inside a worker_thread, proving the
// Napi::Addon<T> per-Env registration (no static FunctionReference) works
// when the addon is loaded into several isolates in the same process at
// once.
const { parentPort, workerData } = require('node:worker_threads');
const fs = require('node:fs');
const libraw = require('../../lib/index.cjs');

const { id, dngPath } = workerData;

const p = new libraw.Processor();
p.openBufferSync(fs.readFileSync(dngPath));
p.unpackSync();
p.processSync();
const img = p.imageSync({});
if (img.width !== 768 || img.height !== 576) {
  throw new Error(`worker ${id}: unexpected dimensions ${img.width}x${img.height}`);
}
p.close();

parentPort.postMessage(`ok:${id}`);
