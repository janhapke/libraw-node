// T06: Processor (Napi::ObjectWrap<Processor>) -- the staged, synchronous
// object API around a single std::unique_ptr<LibRaw> instance.
//
// T07 adds the Promise-returning versions of the same stages (openBuffer,
// openFile, unpack, unpackThumb, process, image, thumb,
// adjustSizesInfoOnly), implemented as Napi::AsyncWorker subclasses in
// src/async_workers.h/.cc, plus the busy_ guard below: while an async call
// is in flight, every other method (sync or async) on the same Processor
// throws/rejects ERR_LIBRAW_BUSY instead of touching raw_ from two threads
// at once (LibRaw is reentrant *across* instances, per
// docs/explanation/what-is-libraw.md's threading model, but a single
// instance's imgdata is not safe to read/write concurrently with a worker
// thread decoding through it).
//
// State machine (guidance: "Track state (opened, unpacked, processed) and
// throw LIBRAW_OUT_OF_ORDER_CALL on misuse instead of relying on LibRaw's
// own checks alone"):
//   closed_          -- close() was called; every method throws afterward.
//   opened_          -- openBufferSync/openFileSync succeeded; required by
//                       everything that reads parsed metadata (thumbOK,
//                       decoderInfo, unpackFunctionName, the is*() traits,
//                       unpackSync, unpackThumbSync,
//                       adjustSizesInfoOnlySync).
//   unpacked_        -- unpackSync succeeded; required by processSync and
//                       color(row, col) (CFA layout is only meaningful once
//                       the raw mosaic is unpacked).
//   processed_       -- processSync succeeded; required by imageSync
//                       (copy_mem_image reads the postprocessed image that
//                       dcraw_process produces).
//   thumbUnpacked_   -- unpackThumbSync succeeded; required by thumbSync.
// recycle() resets every flag (matches LibRaw's own recycle() semantics:
// free everything, keep the object, ready to open() again).
//
// T09 adds one more flag, needsRecycle_: set when an async stage
// (unpack/unpackThumb/process/image/thumb/adjustSizesInfoOnly) is cancelled
// mid-flight (its worker's Run() returned LIBRAW_CANCELLED_BY_CALLBACK --
// see src/async_workers.h's ProcessorAsyncWorker::OnOK). LibRaw's own
// decoders/demosaic loops leave imgdata/rawdata partially allocated/
// mutated when interrupted this way (see src/cancel.h for exactly which
// stages actually get interrupted and how), so treating a cancelled
// Processor as still fully usable would risk calling into LibRaw on that
// half-finished state. While needsRecycle_ is set, RequireOpened -- and
// therefore every stage-advancing call that goes through it, directly or
// via RequireUnpacked/RequireProcessed/RequireThumbUnpacked, plus every
// zero-argument introspection getter that requires "opened" -- throws/
// rejects LIBRAW_OUT_OF_ORDER_CALL. recycle() and close() are exempt (they
// clear it); so is a fresh openBuffer()/openFile() call (RequireNotClosed
// does not check needsRecycle_, and ResetState() clears it), matching the
// task text's "the next stage call (other than recycle/close/open)".
#pragma once

#include <napi.h>

#include <libraw/libraw.h>

#include <atomic>
#include <memory>
#include <vector>

#include "events.h"
#include "params.h"

namespace libraw_node {

// Defined in src/async_workers.h; needs direct access to raw_, inputRef_,
// busy_ and the opened_/unpacked_/processed_/thumbUnpacked_ state flags
// (see the friend declaration below and that header's class comment).
class ProcessorAsyncWorker;

class Processor : public Napi::ObjectWrap<Processor> {
 public:
  static Napi::Function DefineClass(Napi::Env env);

  explicit Processor(const Napi::CallbackInfo& info);
  ~Processor() override = default;

 private:
  friend class ProcessorAsyncWorker;

  Napi::Value OpenBufferSync(const Napi::CallbackInfo& info);
  Napi::Value OpenFileSync(const Napi::CallbackInfo& info);
  Napi::Value UnpackSync(const Napi::CallbackInfo& info);
  Napi::Value UnpackThumbSync(const Napi::CallbackInfo& info);
  Napi::Value ProcessSync(const Napi::CallbackInfo& info);
  Napi::Value ImageSync(const Napi::CallbackInfo& info);
  Napi::Value ThumbSync(const Napi::CallbackInfo& info);
  Napi::Value AdjustSizesInfoOnlySync(const Napi::CallbackInfo& info);
  Napi::Value Recycle(const Napi::CallbackInfo& info);
  Napi::Value Close(const Napi::CallbackInfo& info);

  // T07: Promise-returning versions of the stages above (same underlying
  // LibRaw calls, run off the JS thread by src/async_workers.h). Exposed on
  // the JS side (lib/processor.cjs) under the same names, without "Sync".
  Napi::Value OpenBuffer(const Napi::CallbackInfo& info);
  Napi::Value OpenFile(const Napi::CallbackInfo& info);
  Napi::Value Unpack(const Napi::CallbackInfo& info);
  Napi::Value UnpackThumb(const Napi::CallbackInfo& info);
  Napi::Value Process(const Napi::CallbackInfo& info);
  Napi::Value Image(const Napi::CallbackInfo& info);
  Napi::Value Thumb(const Napi::CallbackInfo& info);
  Napi::Value AdjustSizesInfoOnly(const Napi::CallbackInfo& info);

  Napi::Value ErrorCount(const Napi::CallbackInfo& info);
  Napi::Value DecoderInfo(const Napi::CallbackInfo& info);
  Napi::Value UnpackFunctionName(const Napi::CallbackInfo& info);
  Napi::Value IsFujiRotated(const Napi::CallbackInfo& info);
  Napi::Value IsSraw(const Napi::CallbackInfo& info);
  Napi::Value IsNikonSraw(const Napi::CallbackInfo& info);
  Napi::Value IsCoolscanNef(const Napi::CallbackInfo& info);
  Napi::Value IsJpegThumb(const Napi::CallbackInfo& info);
  Napi::Value IsFloatingPoint(const Napi::CallbackInfo& info);
  Napi::Value HaveFpData(const Napi::CallbackInfo& info);
  Napi::Value SrawMidpoint(const Napi::CallbackInfo& info);
  Napi::Value Color(const Napi::CallbackInfo& info);
  Napi::Value ThumbOK(const Napi::CallbackInfo& info);

  // T12: generated parameter application (src/params.h,
  // src/generated/params.gen.cc). setRawParams/setParams are synchronous
  // (validation is cheap and never touches LibRaw's decode path) and gated
  // by the state machine -- see src/params.h's header comment and the
  // implementations in src/processor.cc for exactly which flag each one
  // checks and why:
  //   setRawParams(obj) -- throws LIBRAW_OUT_OF_ORDER_CALL once opened_.
  //   setParams(obj)    -- throws LIBRAW_OUT_OF_ORDER_CALL once processed_.
  // getParams()/getRawParams() have no state restriction beyond "not
  // closed" -- imgdata.params/imgdata.rawparams are valid to read in every
  // other state, including right after construction.
  Napi::Value SetParams(const Napi::CallbackInfo& info);
  Napi::Value SetRawParams(const Napi::CallbackInfo& info);
  Napi::Value GetParams(const Napi::CallbackInfo& info);
  Napi::Value GetRawParams(const Napi::CallbackInfo& info);

  // T10: not exposed as public API (no wrapper in lib/processor.cjs's
  // METHODS/ASYNC_METHODS lists) -- called internally, as `_drainEvents()`,
  // by lib/processor.cjs right after each async stage method's promise
  // settles, to pull that job's buffered progress/dataError/exifTag events
  // (src/events.h) and emit them on the Processor (an EventEmitter) before
  // resolving/rejecting. Trivial: just converts pendingEvents_ (already
  // populated by that job's worker, see src/async_workers.h's
  // SettleCancelState) and clears it -- safe to call in any state, including
  // closed_.
  Napi::Value DrainEvents(const Napi::CallbackInfo& info);

  void RequireNotBusy(Napi::Env env, const char* stage);
  void RequireNotClosed(Napi::Env env, const char* stage);
  void RequireOpened(Napi::Env env, const char* stage);
  void RequireUnpacked(Napi::Env env, const char* stage);
  void RequireProcessed(Napi::Env env, const char* stage);
  void RequireThumbUnpacked(Napi::Env env, const char* stage);
  void ResetState();

  std::unique_ptr<LibRaw> raw_;

  // T07: set synchronously (JS thread) right before an async worker is
  // queued, cleared in that worker's OnOK/OnError (also JS thread, after
  // Execute() has returned) -- see src/async_workers.h. Plain bool would be
  // fine too (every read/write already happens on the JS thread only; the
  // worker's *Execute()* thread never touches it), but atomic documents the
  // "read from JS thread while a threadpool thread is mid-Execute" property
  // this flag exists to guard against, and costs nothing.
  std::atomic<bool> busy_{false};

  // Keeps the input Buffer's V8 backing store alive for as long as raw_ may
  // still read through the LibRaw_buffer_datastream open_buffer() built over
  // it (open_buffer does not copy, see vendor/LibRaw/src/utils/open.cpp) --
  // i.e. until recycle()/close() or the next openBufferSync/openFileSync.
  Napi::Reference<Napi::Buffer<uint8_t>> inputRef_;

  bool closed_ = false;
  bool opened_ = false;
  bool unpacked_ = false;
  bool processed_ = false;
  bool thumbUnpacked_ = false;

  // T09: see the state-machine comment above. Set by
  // ProcessorAsyncWorker::OnOK (src/async_workers.h) when a job's Run()
  // returned LIBRAW_CANCELLED_BY_CALLBACK; cleared by ResetState() (i.e. by
  // recycle() and by a fresh openBuffer()/openFile()).
  bool needsRecycle_ = false;

  // T10: true when this Processor was constructed with `{ exifTags: true }`
  // -- gates whether ProcessorAsyncWorker::Execute() (src/async_workers.h)
  // installs the exif-tag callback at all (set once, in the constructor;
  // read-only afterward, so no synchronization needed even though it is
  // read from a worker's Execute() -- see that method for why that read is
  // safe: it happens-before via the same JS-thread Queue() call that
  // publishes every other per-job state this class reads there too).
  bool exifTags_ = false;

  // T10: this job's buffered events (src/events.h), moved out of the async
  // worker's JobCancelState (src/cancel.h) once the job has settled --
  // see src/async_workers.h's SettleCancelState. Drained (and cleared) by
  // DrainEvents()/`_drainEvents()`, called once per job by
  // lib/processor.cjs right after each async stage method's promise
  // settles. Not populated by the *Sync methods (T10 scopes event recording
  // to the async path only, matching T09's cancellation support, since only
  // async jobs get a JobCancelState/progress-callback installation at all).
  std::vector<JobEvent> pendingEvents_;

  // T12: backing storage for imgdata.params' char* fields (output_profile,
  // camera_profile, bad_pixels, dark_frame) -- see src/params.h's
  // ParamStrings comment for why this has to outlive every dcraw_process()
  // call made through raw_. Lives for the whole Processor lifetime (not
  // reset by recycle()/ResetState(): LibRaw's own recycle() already resets
  // imgdata.params.{output_profile,...} to nullptr, so stale strings here
  // are simply unreferenced, not dangling).
  ParamStrings paramStrings_;
};

}  // namespace libraw_node
