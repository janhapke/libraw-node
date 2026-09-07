# How to cancel a decode and track its progress

Every asynchronous entry point in `@janhapke/libraw` — the module-level `decode()`/`identify()`/
`thumbnail()` helpers and every `Processor` async stage method (`openBuffer`, `openFile`, `unpack`,
`unpackThumb`, `process`, `image`, `thumb`, `adjustSizesInfoOnly`) — accepts a standard `AbortSignal` and,
for `Processor`, emits progress and data-error events. This page covers both.

## Cancelling with `AbortSignal`

Pass `{ signal }` as the last argument (part of the `options` object for the module-level helpers, its own
options object for `Processor` stage methods):

```js
const { decode, LibRawError } = require('@janhapke/libraw');

const controller = new AbortController();
const promise = decode(buffer, { signal: controller.signal });

setTimeout(() => controller.abort(), 50);

try {
  await promise;
} catch (err) {
  if (err instanceof LibRawError && err.aborted) {
    console.log('cancelled:', err.name, err.code); // 'LIBRAW_CANCELLED_BY_CALLBACK', -100010
  } else {
    throw err;
  }
}
```

Two things distinguish a cancellation from any other `LibRawError`:

- `err.aborted === true` (never `false` — it is simply absent on a non-cancellation error, so
  `'aborted' in err` also works as the check).
- `err.name === 'LIBRAW_CANCELLED_BY_CALLBACK'` and `err.code === -100010`, LibRaw's own numeric code for
  this condition (not a DOMException, not `'ABORT_ERR'` — every rejection from this package that reaches
  your `catch` is a `LibRawError`).

An already-aborted `signal` at call time rejects immediately (well under 1 ms in practice — see
`test/cancel.test.ts`), without ever touching LibRaw.

### `Processor`: cancellation mid-flight requires `recycle()` or a fresh `open*`

A `Processor` stage cancelled while it was actually running (not pre-aborted) leaves LibRaw's internal
buffers in a partially-mutated state, so the `Processor` refuses every further stage-advancing call —
including read-only introspection getters — with `LibRawError` (`name: 'LIBRAW_OUT_OF_ORDER_CALL'`) until
you call `recycle()` (back to a fresh, unopened state) or start over with `openBuffer()`/`openFile()`
(which resets the same flag as part of opening). `close()` also clears it, since it frees the instance
outright. There is nothing to do differently for a *pre-aborted* signal — that path never reaches LibRaw at
all, so the `Processor` is untouched and usable immediately:

```js
const proc = new Processor();
await proc.openBuffer(buffer);
const controller = new AbortController();
const unpacking = proc.unpack({ signal: controller.signal });
controller.abort(); // cancelled mid-flight (a real decode is slow enough to have a window to land in)
await unpacking.catch(() => {});

// proc.metadata / proc.processSync() / another unpack() etc. would all
// throw LIBRAW_OUT_OF_ORDER_CALL here -- recycle first:
proc.recycle();
await proc.openBuffer(buffer); // ready again
```

### Latency

LibRaw checks its cancellation flag from inside the per-row/per-tile decode loop of most decoders and from
inside the AHD demosaic algorithm's own per-tile-row loop, so an abort typically lands within a few
milliseconds of `controller.abort()` once a job is actually running. What it does **not** interrupt promptly:
other demosaic algorithms (VNG/PPG/DHT/AAHD/X-Trans variants) only check between named substages, and header
parsing during `open_buffer`/`open_file` is effectively not interruptible mid-parse (it only checks once,
near the end) — this only affects latency, not correctness, since header parsing is single-digit
milliseconds regardless.

### Busy guard: one job at a time per `Processor`

A `Processor` runs one async stage at a time. Calling a second async method (or a synchronous accessor)
while one is already in flight rejects/throws immediately with `LibRawError` (`name: 'ERR_LIBRAW_BUSY'`) —
it does not queue. Use the stateless `decode`/`identify`/`thumbnail` helpers (each opens and owns its own
LibRaw instance) or a separate `Processor` instance for concurrent work; see
[Use with sharp and worker_threads](use-with-sharp-and-worker-threads.md) for `UV_THREADPOOL_SIZE` and
`OMP_NUM_THREADS` guidance once you are running several decodes side by side.

## Progress and data-error events

`Processor` extends `EventEmitter`. Every async stage method buffers `'progress'` and `'dataError'` events
natively while it runs and emits them, in order, right before its promise settles (not delivered live —
LibRaw's own progress callback only fires between named stages, so a live feed would be coarse anyway):

```js
const proc = new Processor({ exifTags: true }); // exifTags: true also enables the 'exifTag' event
proc.on('progress', ({ stage, iteration, expected }) => {
  console.log(stage, iteration, '/', expected); // e.g. 'LOAD_RAW', 0, 2 then 'LOAD_RAW', 1, 2
});
proc.on('dataError', ({ offset, message }) => {
  console.warn('data error at', offset, message);
});
proc.on('exifTag', ({ tag, type, len, ordering }) => {
  // fires once per EXIF/MakerNote tag seen during open(); only with { exifTags: true }
});

await proc.openBuffer(buffer);
await proc.unpack();   // emits 'progress' events for this stage once it settles
```

`stage` is the short name of a `LibRaw_progress` enumerator with the `LIBRAW_PROGRESS_` prefix stripped
(e.g. `'LOAD_RAW'`, `'IDENTIFY'`, `'INTERPOLATE'`). Compare it against the exported `progressStages` object
(name → LibRaw's own numeric code) rather than hardcoding numbers:

```js
const { progressStages } = require('@janhapke/libraw');
if (event.stage === 'LOAD_RAW') { /* ... */ }
progressStages.LOAD_RAW; // LibRaw's numeric LIBRAW_PROGRESS_LOAD_RAW code, if you need it
```

The synchronous `*Sync` methods (`unpackSync`, `processSync`, ...) do not emit events at all — events are
scoped to the async path, the same one that supports cancellation.

## Threadpool sizing

Async calls run on libuv's threadpool (default size 4, `UV_THREADPOOL_SIZE` up to 1024). It must be set in
the environment before Node's first threadpool use — see
[Use with sharp and worker_threads](use-with-sharp-and-worker-threads.md) for the full guidance, including
why this matters more once several decodes run side by side.
