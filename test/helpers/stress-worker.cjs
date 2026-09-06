'use strict';

// Helper for test/stress.test.ts (T17): runs inside a worker_thread, reads
// the RAW file from disk itself (workerData carries the *path*, not the
// buffer -- passing a 28 MB buffer through structured clone per worker
// would itself skew the RSS-growth measurement the test is trying to take),
// then performs `iterations` decode() calls, alternating through
// `qualities` round-robin, and posts back the sha1 checksum of every
// result's `data` buffer so the test can compare each against its
// single-threaded reference checksum for that quality.
const { parentPort, workerData } = require('node:worker_threads');
const fs = require('node:fs');
const crypto = require('node:crypto');
const libraw = require('../../lib/index.cjs');

const { id, filePath, qualities, iterations } = workerData;

function sha1(buf) {
  return crypto.createHash('sha1').update(buf).digest('hex');
}

(async () => {
  const buf = fs.readFileSync(filePath);
  const results = [];
  for (let i = 0; i < iterations; i++) {
    const quality = qualities[i % qualities.length];
    const img = await libraw.decode(buf, { params: { user_qual: quality } });
    results.push({ quality, checksum: sha1(img.data) });
  }
  parentPort.postMessage({ id, results });
})().catch((err) => {
  parentPort.postMessage({ id, error: String((err && err.stack) || err) });
});
