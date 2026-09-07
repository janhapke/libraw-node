#!/usr/bin/env node
'use strict';

// T22: Electron smoke test (docs/how-to/test-under-electron.md,
// docs/explanation/electron-compatibility.md). Runs the real package entry
// point (`lib/index.cjs`) through a full round trip -- identify, thumbnail,
// decode (default and half_size params), and the Processor staged async
// pipeline with AbortSignal cancellation -- and asserts every output buffer
// is genuine V8 memory (never `napi_create_external_buffer`, which crashes
// under Electron's V8 memory cage: electron-compatibility.md §2).
//
// Runs equally under `ELECTRON_RUN_AS_NODE=1 npx electron test/electron-smoke.cjs`
// and plain `node test/electron-smoke.cjs` (process.versions.electron is
// undefined under plain Node; the PASS line then reads `electron=none`), so
// this file can be exercised without Electron installed.
//
// On success: prints `PASS electron=<version> arch=<arch> openmp=<bool>`.
// On failure: prints `FAIL <reason>`. Either way the exit code is set via
// `process.exitCode` (0 or 1) and the process is left to exit on its own --
// never `process.exit()` -- because on Windows, stdout to a non-TTY pipe
// (exactly CI's case) is written asynchronously, and process.exit() can
// terminate the process before that last write reaches the pipe, silently
// truncating the PASS/FAIL line from the log (a well-known Node-on-Windows
// gotcha, https://github.com/nodejs/node/issues/6456 and similar). Letting
// the event loop drain naturally guarantees the line is flushed.

const path = require('path');
const fs = require('fs');
const { types } = require('util');

class SmokeTestFailure extends Error {}

function fail(reason) {
  throw new SmokeTestFailure(reason);
}

function checkPlainBuffer(data, label) {
  if (!Buffer.isBuffer(data)) {
    fail(`${label} is not a Buffer (got ${Object.prototype.toString.call(data)})`);
  }
  if (!(data.buffer instanceof ArrayBuffer)) {
    fail(`${label}.buffer is not an ArrayBuffer (got ${Object.prototype.toString.call(data.buffer)})`);
  }
  // Guards against a regression to napi_create_external_buffer /
  // napi_create_external_arraybuffer, which Electron's V8 memory cage
  // forbids (electron-compatibility.md §2) -- the addon is built with
  // -DNODE_API_NO_EXTERNAL_BUFFERS_ALLOWED specifically so node-addon-api
  // refuses that path at build time, but this checks the JS-visible result
  // too. util.types.isExternal() reports on native External values
  // (Napi::External), not on external ArrayBuffers directly, but must
  // still read false here: a buffer built the intended way (V8-allocated,
  // filled via copy_mem_image) is never wrapped as one.
  if (types.isExternal(data.buffer)) {
    fail(`${label}.buffer is external (util.types.isExternal === true) -- V8 memory cage violation`);
  }
}

async function main() {
  const electronVersion = process.versions.electron || 'none';
  console.log(
    'electron=' + electronVersion,
    'node=' + process.versions.node,
    'napi=' + process.versions.napi,
    'arch=' + process.arch,
  );

  const libraw = require(path.join(__dirname, '..', 'lib', 'index.cjs'));
  console.log('buildInfo', JSON.stringify(libraw.buildInfo));

  const dngPath = path.join(__dirname, 'fixtures', 'pm5544-768x576.dng');
  const buf = fs.readFileSync(dngPath);

  // identify()
  const info = await libraw.identify(buf);
  if (info.sizes.width !== 768 || info.sizes.height !== 576) {
    fail(`identify() size mismatch: ${info.sizes.width}x${info.sizes.height}, expected 768x576`);
  }

  // thumbnail()
  const thumb = await libraw.thumbnail(buf);
  if (thumb.format !== 'jpeg' || thumb.data[0] !== 0xff || thumb.data[1] !== 0xd8) {
    fail(`thumbnail() did not return a JPEG (format=${thumb.format})`);
  }
  checkPlainBuffer(thumb.data, 'thumbnail().data');

  // decode() -- default params
  const full = await libraw.decode(buf);
  if (full.width !== 768 || full.height !== 576) {
    fail(`decode() default size mismatch: ${full.width}x${full.height}, expected 768x576`);
  }
  checkPlainBuffer(full.data, 'decode().data');

  // decode() -- half_size
  const half = await libraw.decode(buf, { params: { half_size: true } });
  if (half.width !== 384 || half.height !== 288) {
    fail(`decode({half_size}) size mismatch: ${half.width}x${half.height}, expected 384x288`);
  }
  checkPlainBuffer(half.data, 'decode({half_size}).data');

  // Processor staged async pipeline
  const proc = new libraw.Processor();
  await proc.openBuffer(buf);
  await proc.unpack();
  await proc.process();
  const staged = await proc.image({});
  if (staged.width !== 768 || staged.height !== 576) {
    fail(`Processor staged pipeline size mismatch: ${staged.width}x${staged.height}, expected 768x576`);
  }
  checkPlainBuffer(staged.data, 'Processor.image().data');
  proc.close();

  // AbortSignal cancellation: abort a fresh decode() immediately and check
  // it rejects with LibRawError.aborted === true.
  const controller = new AbortController();
  const abortingDecode = libraw.decode(buf, { signal: controller.signal });
  controller.abort();
  try {
    await abortingDecode;
    fail('aborted decode() resolved instead of rejecting');
  } catch (err) {
    if (err instanceof SmokeTestFailure) throw err;
    if (!err || err.aborted !== true) {
      fail(`aborted decode() rejected without aborted===true (got: ${err && err.message})`);
    }
  }

  // A second decode() after the abort must still work (no leaked cancel
  // state -- see docs/plan/tasks.md T09).
  const afterAbort = await libraw.decode(buf);
  if (afterAbort.width !== 768 || afterAbort.height !== 576) {
    fail(`decode() after abort failed: ${afterAbort.width}x${afterAbort.height}`);
  }
  checkPlainBuffer(afterAbort.data, 'decode() after abort .data');

  const openmp = !!(libraw.buildInfo && libraw.buildInfo.openmp);
  console.log(`PASS electron=${electronVersion} arch=${process.arch} openmp=${openmp}`);
}

main().then(
  () => {
    process.exitCode = 0;
  },
  (err) => {
    const reason = err instanceof SmokeTestFailure ? err.message : err && err.stack ? err.stack : String(err);
    console.error('FAIL', reason);
    process.exitCode = 1;
  },
);
