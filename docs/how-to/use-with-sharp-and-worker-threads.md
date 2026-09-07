# How to use this package with sharp and worker_threads

This package decodes RAW files to raw pixel buffers; it does not encode JPEG/PNG or resize. Pairing it with
[`sharp`](https://sharp.pixelplumbing.com/) for the encode/resize step, and running decodes off the main
thread with `worker_threads`, is the shape most consumers (including photoview) use in production.

## Sharp interop

`sharp`'s prebuilt `libvips` has no LibRaw loader, so a result object's `toSharp(sharpModule)` method hands
sharp the already-decoded pixel buffer directly instead — the same thing sharp does internally for raw
input, no extra copy:

```js
const sharp = require('sharp');
const { decode } = require('@janhapke/libraw');

const image = await decode(buffer, { params: { use_camera_wb: true } });
const pipeline = image.toSharp(sharp); // === sharp(image.data, { raw: { width, height, channels: colors } })
const jpeg = await pipeline
  .resize({ width: 1620, height: 1620, fit: 'inside', withoutEnlargement: true })
  .jpeg({ quality: 90 })
  .toBuffer();
```

Available on `decode()` results, `Processor#imageSync()`/`#image()` results, and thumbnail results
(`thumbnail()`, `Processor#thumbSync()`/`#thumb()`), regardless of thumbnail format: for a bitmap thumbnail
it wraps the raw pixel buffer the same way (a `Uint16Array` view, still no copy, when `bits === 16`); for a
JPEG-format thumbnail it hands the JPEG bytes straight to `sharpModule(data)`, letting sharp decode them
itself.

This package never `require`s `sharp` — it is an optional peer dependency
(`peerDependenciesMeta.sharp.optional: true`), and `toSharp`'s type is a structural
`<S extends (input, options?) => any>(sharp: S) => ReturnType<S>`, not sharp's own types. Bring whatever
`sharp`-compatible module your app already uses (a vanilla `sharp` install, or an Electron-packaged
alternative) and pass it in — the binding never assumes which one.

There is still exactly one copy in the whole pipeline: LibRaw's internal buffer into the V8 `Buffer` this
package hands back, then sharp reads that buffer in place (no further copy on sharp's side for raw input).

### Orientation

`decode()`/`Processor#process()` honor `params.user_flip` (default `-1`, "use the file's own orientation")
inside LibRaw itself — the pixel buffer you get back is already rotated. An embedded JPEG thumbnail
extracted via `thumbnail()`/`Processor#thumb()` keeps its *own* EXIF orientation tag instead (LibRaw does
not rotate embedded thumbnails), so if you resize a thumbnail with sharp, call `.rotate()` (with no
arguments, sharp reads the EXIF tag itself) before `.resize()`.

## Running decodes off the main thread

`decode`, `identify`, and `thumbnail` each run one `Napi::AsyncWorker` job on libuv's threadpool; every call
opens and owns its own LibRaw instance for the call's duration, so any number of calls can run truly
concurrently with no shared state between them — this is exercised directly by `test/stress.test.ts` (T17):
6 `worker_threads`, each firing 50 concurrent `decode()` calls, every result's checksum verified against a
single-threaded reference.

A typical shape: a small pool of `worker_threads`, each with its own `require('@janhapke/libraw')`, each
running `decode`/`identify`/`thumbnail` calls dispatched from the main thread:

```js
// worker.js
const { parentPort } = require('node:worker_threads');
const { decode } = require('@janhapke/libraw');

parentPort.on('message', async ({ id, buffer, options }) => {
  try {
    const image = await decode(buffer, options);
    parentPort.postMessage({ id, ok: true, image }, [image.data.buffer]); // transfer, not copy
  } catch (err) {
    parentPort.postMessage({ id, ok: false, error: { message: err.message, name: err.name, code: err.code } });
  }
});
```

Pass an `{ signal }` per call (see [Cancel a decode and track progress](cancel-and-track-progress.md)) if a
task might be superseded before it finishes — the worker's JS thread stays free while the native call runs,
so a cancel message is handled immediately.

### `UV_THREADPOOL_SIZE`

Node's libuv threadpool defaults to **4** threads process-wide (shared with `fs`, `dns`, `zlib`, and every
other threadpool consumer, up to 1024). More than 4 concurrent `decode`/`identify`/`thumbnail` calls (or
`Processor` async calls) queue behind that limit rather than truly overlapping. It must be set **before**
Node's first threadpool use — `process.env.UV_THREADPOOL_SIZE` set from JS after startup has no effect,
since libuv reads it once when the pool is first created:

```js
process.env.UV_THREADPOOL_SIZE = '8'; // must run before any fs/dns/zlib/decode call, at the very top of your entry point
```

Under Electron, set it before `app.whenReady()` in the main process, or before the addon is first used in a
`utilityProcess`/worker.

### `OMP_NUM_THREADS`

Independently of libuv, LibRaw's own demosaic step parallelizes with OpenMP when the build has it
(`buildInfo.openmp`). By default each concurrent decode spins up its own OpenMP thread pool sized to the
host's core count — running several decodes in parallel therefore **multiplies** thread count: total OS
threads in flight ≈ (concurrency) × `OMP_NUM_THREADS` (host core count if unset). On a 16-core host, 4
concurrent decodes at the OpenMP default already means up to 64 threads contending for 16 cores —
oversubscription that slows every individual decode down without raising throughput. Set `OMP_NUM_THREADS`
explicitly (e.g. `cores / concurrency`, or `1` to let your own worker-level concurrency be the only
parallelism) before the addon's first decode — like `UV_THREADPOOL_SIZE`, it has no effect once libgomp's
pool already exists.

### Memory budget

Each concurrent `decode()`/`Processor` pipeline holds the still-packed RAW buffer, LibRaw's internal
unpacked sensor data, and the processed output buffer simultaneously at points during the pipeline —
roughly **3–4× the final output buffer's size** per job. Budget concurrency accordingly:
`RAM ≈ concurrency × 4 × expected_output_bytes`, plus per-thread OpenMP overhead. `test/stress.test.ts`
measures RSS growth across 300 decodes (6 workers × 50 each, `npm run test:stress`) directly.

## Using this package from photoview

See [Using this package from photoview](integrate-into-photoview.md) for the parts specific to that
consumer (its `LibRawPlugin`, cancellation through its worker pool, packaging).
