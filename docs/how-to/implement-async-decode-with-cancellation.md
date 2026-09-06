# How to implement asynchronous decoding with cancellation

Uses node-addon-api's `Napi::AsyncWorker` (libuv threadpool via Node-API, no libuv headers). Pattern
applies to `identify`, `thumbnail`, `unpack`, `process`, `image`, and the fused `decode`.

## 1. Keep the LibRaw object off the JS thread while a worker runs

```cpp
class Processor : public Napi::ObjectWrap<Processor> {
  std::unique_ptr<LibRaw> raw_;            // heap: ~1 MB per instance
  std::atomic<bool> busy_{false};
  Napi::Reference<Napi::Buffer<uint8_t>> input_;   // keeps open_buffer's memory alive
  ...
};
```

Every async method: if `busy_.exchange(true)` was already true, throw `ERR_LIBRAW_BUSY`; the worker's
`OnOK`/`OnError` reset it. Synchronous accessors (`metadata`, `thumbs`) read `imgdata` only when not busy.

## 2. The fused decode worker

```cpp
class DecodeWorker : public Napi::AsyncWorker {
 public:
  DecodeWorker(Napi::Env env, Processor* p, DecodeOptions opts, Napi::Buffer<uint8_t> out)
    : AsyncWorker(env), p_(p), opts_(opts), out_(Napi::Persistent(out)), deferred_(env) {}
  Napi::Promise Promise() { return deferred_.Promise(); }

  void Execute() override {                       // runs on a threadpool thread; no N-API calls here
    LibRaw& r = *p_->raw_;
    apply(opts_.rawparams, r.imgdata.rawparams);   // before open
    check(r.open_buffer(p_->inputData(), p_->inputLength()));
    apply(opts_.params, r.imgdata.params);
    r.set_progress_handler(&DecodeWorker::progress, this);
    check(r.unpack());
    check(r.dcraw_process());
    int w, h, c, bps; r.get_mem_image_format(&w, &h, &c, &bps);
    size_t need = size_t(w) * h * c * (bps / 8);
    if (need > outLen_) { SetError("output buffer too small"); return; }
    check(r.copy_mem_image(outPtr_, opts_.stride ? opts_.stride : w * c * (bps/8), opts_.bgr));
    result_ = {w, h, c, bps, r.imgdata.sizes.flip, r.imgdata.process_warnings};
    r.recycle();
  }
  void OnOK() override    { p_->busy_ = false; deferred_.Resolve(makeResult(Env(), result_, out_.Value())); }
  void OnError(const Napi::Error& e) override { p_->busy_ = false; deferred_.Reject(e.Value()); }

 private:
  static int progress(void* data, enum LibRaw_progress stage, int iter, int expected) {
    auto* self = static_cast<DecodeWorker*>(data);
    self->stages_.push_back({stage, iter, expected});           // report after completion, or via TSFN
    return self->p_->cancelRequested_.load() ? 1 : 0;           // non-zero cancels
  }
  void check(int rc) { if (rc != LIBRAW_SUCCESS) throw LibRawFailure(rc); }  // caught by AsyncWorker → SetError
  ...
};
```

Notes:

- `outPtr_`/`outLen_` are captured from the `Napi::Buffer` **on the JS thread** in the constructor;
  `Persistent` keeps it alive. V8 does not move Buffer backing stores, so the raw pointer is stable.
- Allocate `out` with `Napi::Buffer<uint8_t>::New(env, size)` computed from `adjust_sizes_info_only()` after
  `open` (or oversize by `iwidth*iheight*3*2` if `output_bps` unknown). This is the single copy.
- Never touch `Napi::*` in `Execute()`; use `SetError` or throw a C++ exception (AsyncWorker converts it).
- `recycle()` in `Execute` frees the large buffers before returning to JS.

## 3. Cancellation

Two mechanisms, use both:

- `setCancelFlag()`, called directly from the JS thread when the caller cancels. It flips LibRaw's own
  atomic `_exitflag`, which most raw decoders poll via `checkCancel()` (throwing
  `LIBRAW_EXCEPTION_CANCELLED_BY_CALLBACK` internally; the current stage returns
  `LIBRAW_CANCELLED_BY_CALLBACK`, -100010, not -8 -- see the T06 correction below). This is the *only*
  mechanism that interrupts `unpack()` mid-decode: LibRaw's progress callback for `unpack()` fires just
  once at the very start and once at the very end (`LIBRAW_PROGRESS_LOAD_RAW` 0/2 and 1/2), never while
  the per-row/per-tile decode loop itself is running.
- LibRaw's progress callback, made to return non-zero once cancellation is requested. This is the *only*
  mechanism `dcraw_process()`/`identify()` check at all -- `checkCancel()`/`_exitflag` is never polled
  anywhere in `src/postprocessing/`, `src/preprocessing/` or `src/metadata/identify.cpp` (0.22.2). One
  partial exception: `ahd_demosaic()` polls the progress callback itself once per tile-row inside its own
  (possibly OpenMP-parallel) loop, so the AHD demosaic algorithm specifically is interrupted promptly;
  other demosaic algorithms (VNG/PPG/DHT/AAHD/xtrans variants) are only interrupted at the coarse
  checkpoints between named substages (`CONVERT_RGB`, `SCALE_COLORS`, `HIGHLIGHTS`, ...).

`open_buffer()`/`open_file()` call `identify()` internally, which only checks the progress callback once,
near the very end of parsing (`RUN_CALLBACK(LIBRAW_PROGRESS_IDENTIFY, 1, 2)`) -- for practical purposes
open/parse of a raw file's header is not interruptible mid-parse by either mechanism. This only affects
latency, not correctness: header parsing is single-digit milliseconds.

> **T09 update:** this repo's actual implementation (`src/cancel.h`/`.cc`, `src/async_workers.h`,
> `src/fused.cc`) does not add a persistent `Processor::abort()`/`native.abort()` method as sketched
> above and in `docs/reference/proposed-binding-api.md`'s `raw.abort();` line. Instead every
> Promise-returning method (fused `decode`/`identify`/`thumbnail` and every `Processor` async stage
> method) returns `{ promise, cancel }` from the native side; `lib/fused.cjs`/`lib/processor.cjs` call
> `cancel()` internally from the caller's `signal`'s `'abort'` listener and hand back a plain Promise, so
> the public JS API is unchanged from T07/T08's. `cancel()` sets a per-job atomic flag (polled by the
> installed progress callback, per the second bullet above) **and** calls `setCancelFlag()` directly (the
> first bullet) in the same call -- both mechanisms fire from one `cancel()` invocation, there is no
> separate "map AbortSignal to abort()" step. See `proposed-binding-api.md`'s own correction note for the
> rejection shape (no `'ABORT_ERR'` string code -- `code` is the numeric `-100010`, `name` is
> `'LIBRAW_CANCELLED_BY_CALLBACK'`, plus `aborted: true`) and the `needsRecycle_` state-machine rule for
> `Processor`.

> **Correction (T06):** `LIBRAW_CANCELLED_BY_CALLBACK` is **-100010** in the vendored 0.22.2
> `libraw/libraw_const.h` (`enum LibRaw_errors`), not -8 (-8 is `LIBRAW_NOT_IMPLEMENTED`). This doc's two
> mentions of "-8" above were wrong; `docs/plan/tasks.md`'s T09 acceptance text already says `-100010`, not
> `-8` (re-checked while implementing T09 -- nothing left to correct there).
> `scripts/gen-errors.js` (T06, `src/errors.cc` / `lib/generated/libraw-errors.cjs`) generates the
> authoritative code/name table from that header, so this is not just a one-off typo fix -- any future
> hand-written `LIBRAW_*` numeric literal in this repo's docs or code should be checked against it.

Latency: LibRaw checks the flag per row/tile in most decoders; expect abort to land within tens of
milliseconds during `unpack`/`dcraw_process`, longer inside a single stage that does not poll (e.g. some
tables setup). Measured on this development machine (`test/cancel.test.ts`, `IMGP5127.DNG`, unpack ~420 ms):
abort-to-rejection latency well under 1 ms for both `decode()` and `Processor.unpack()` -- `checkCancel()`
is polled far more often than "per row" for this decoder.

## 4. Progress and events

LibRaw's progress callback fires between stages, and `set_exifparser_handler` fires per tag during
`open`. Do not call into JS from `Execute()`; either buffer events and emit after completion (simple,
matches lightdrift's `drainEvents`) or use `Napi::ThreadSafeFunction` for live delivery (needed only if a
progress bar is wanted; the stage list is coarse anyway).

## 5. Thread pool sizing

AsyncWorkers share the libuv threadpool (default 4 threads per process, `UV_THREADPOOL_SIZE` up to 1024, must
be set before the pool starts). In photoview each `worker_threads` Worker has its own event loop but the
threadpool is per process; with a 6-worker decode pool, set `UV_THREADPOOL_SIZE=8` in the utility
process before loading anything that uses it (fs, dns, zlib also use it).

## 6. Staged API on the same machinery

`open`, `unpackThumb`, `unpack`, `process`, `image` are each a small AsyncWorker that performs one LibRaw
call on the same `raw_` and does not `recycle()`. `params` assignments between them are synchronous JS-thread
writes into `imgdata.params` guarded by `busy_`.

## 7. Tests

- Abort during `unpack` of a 16 MP file resolves within 100 ms with `LIBRAW_CANCELLED_BY_CALLBACK`
  (`code: -100010`, `aborted: true` -- see the T09 update above).
- Concurrent `decode` on 6 instances in 6 worker_threads for 50 iterations: no crash, no leak
  (watch RSS), results identical to sequential.
- Busy guard: second call rejects immediately.
