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

- `Processor::abort()` (JS thread) sets `cancelRequested_ = true` **and** calls `raw_->setCancelFlag()`.
  `setCancelFlag()` flips an atomic that LibRaw's decoders and demosaic loops poll via `checkCancel()`,
  throwing `LIBRAW_EXCEPTION_CANCELLED_BY_CALLBACK` internally; the current stage returns
  `LIBRAW_CANCELLED_BY_CALLBACK` (-8).
- The progress callback's return value cancels between stages for code paths that don't poll the flag.

Map `AbortSignal`: in JS, `signal.addEventListener('abort', () => native.abort(), { once: true })`; reject
with an `AbortError`-compatible `LibRawError` (`code: 'ABORT_ERR'`, LibRaw code -8). Clear the flag
(`clearCancelFlag()`) in `OnOK`/`OnError` before the next job.

Latency: LibRaw checks the flag per row/tile in most decoders; expect abort to land within tens of
milliseconds during `unpack`/`dcraw_process`, longer inside a single stage that does not poll (e.g. some
tables setup).

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

- Abort during `unpack` of a 16 MP file resolves within 100 ms with `ABORT_ERR`.
- Concurrent `decode` on 6 instances in 6 worker_threads for 50 iterations: no crash, no leak
  (watch RSS), results identical to sequential.
- Busy guard: second call rejects immediately.
