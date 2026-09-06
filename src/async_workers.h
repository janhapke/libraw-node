// T07: Napi::AsyncWorker machinery backing Processor's Promise-returning
// stage methods (openBuffer, openFile, unpack, unpackThumb, process, image,
// thumb, adjustSizesInfoOnly -- see src/processor.h/.cc and
// docs/how-to/implement-async-decode-with-cancellation.md §1, §5, §6).
//
// Design (one generic AsyncWorker base + one small subclass per stage kind,
// per the task's "either is fine" guidance):
//
//   ProcessorAsyncWorker (this file)
//     - Execute() [threadpool thread, no Napi::* calls allowed here] calls
//       the subclass's Run(LibRaw&), which does the actual LibRaw call(s)
//       and returns a LIBRAW_* return code.
//     - OnOK()/OnError() [JS thread] reset Processor::busy_ unconditionally,
//       then either reject with a LibRawError-shaped error built from the
//       stored return code and stage name (src/errors.h's
//       MakeProcessorError -- same shape ThrowProcessorError uses for the
//       *Sync methods, so lib/errors.cjs's LibRawError.fromNative wraps
//       either identically) or resolve with the subclass's BuildResult().
//     - Holds a strong Napi::ObjectReference to the JS Processor object for
//       the worker's lifetime, so the Processor (and its raw_) cannot be
//       garbage-collected out from under a worker thread that is mid-
//       Execute() even if the caller drops every JS reference to it.
//
// Every subclass here is declared `friend class ProcessorAsyncWorker;`-only
// through inheriting *protected* Mark*() helpers defined on the base --
// friendship in C++ is not inherited, so ProcessorAsyncWorker (declared
// `friend` in processor.h) is the *only* class here allowed to touch
// Processor's private raw_/inputRef_/opened_/unpacked_/processed_/
// thumbUnpacked_ fields directly; subclasses reach them only through the
// base class's protected helper methods.
#pragma once

#include <napi.h>

#include <libraw/libraw.h>

#include <cstring>
#include <functional>
#include <string>
#include <utility>

#include "cancel.h"
#include "errors.h"
#include "events.h"
#include "image_format.h"
#include "processor.h"

namespace libraw_node {

// T09: see src/cancel.h for the two-mechanism cancellation design and
// docs/plan/tasks.md's T09. Each ProcessorAsyncWorker gets its own fresh
// JobCancelState (default-constructed below) -- "clear the flag before each
// new job" falls out of that for free, since a new worker (and therefore a
// new JobCancelState) is constructed for every call.
class ProcessorAsyncWorker : public Napi::AsyncWorker {
 public:
  ProcessorAsyncWorker(Napi::Env env, Processor* processor, Napi::Object jsThis, std::string stage,
                        Napi::Promise::Deferred deferred)
      : Napi::AsyncWorker(env),
        processor_(processor),
        stage_(std::move(stage)),
        deferred_(deferred),
        selfRef_(Napi::Persistent(jsThis)) {}

  // Builds this job's `cancel` closure (src/processor.cc calls this after
  // constructing the worker but before Queue()-ing it, to build the
  // `{ promise, cancel }` result -- see src/cancel.h's WrapPromiseWithCancel).
  // Captures `processor_` as a raw pointer -- safe because `active` (checked
  // first, below) is only true while this worker is still alive, and this
  // worker holds `selfRef_`, a strong reference to the JS Processor object,
  // for exactly its own lifetime; the JS thread is single-threaded, so there
  // is no window where a cancel() call can observe active==true after this
  // worker (and therefore selfRef_, and therefore the Processor it keeps
  // alive) has already been destroyed. Unlike the fused workers (src/
  // fused.cc), Processor's raw_ is not per-job -- it must NOT be wrapped in
  // its own shared_ptr captured by this closure, or a stray cancel() call
  // arriving after this job settles could call setCancelFlag() on the *next*
  // job's still-in-flight LibRaw call (busy_ guarantees jobs on one
  // Processor never overlap, but cancel() calls against past jobs are only
  // prevented from mattering by the `active` check below, not by pointer
  // lifetime).
  Napi::Function MakeCancel(Napi::Env env) {
    Processor* processor = processor_;
    auto state = cancelState_;
    return Napi::Function::New(
        env,
        [processor, state](const Napi::CallbackInfo&) {
          if (state->active->load()) {
            state->flag->store(true);
            processor->raw_->setCancelFlag();
          }
        },
        "cancel");
  }

 protected:
  // Runs entirely off the JS thread (the libuv threadpool). Must not touch
  // any Napi::* type or call back into JS -- see the class comment and
  // docs/how-to/implement-async-decode-with-cancellation.md §2's "Never
  // touch Napi::* in Execute()". Returns a LIBRAW_* code; LIBRAW_SUCCESS
  // means BuildResult() runs next, anything else rejects the promise.
  virtual int Run(LibRaw& raw) = 0;

  // JS thread, only called when Run() returned LIBRAW_SUCCESS. Mutates
  // Processor's state flags (via the Mark*() helpers below) and returns the
  // value the promise resolves with.
  virtual Napi::Value BuildResult(Napi::Env env) = 0;

  // --- helpers for subclasses (protected: Processor's fields themselves
  // stay reachable only from this base class's own member functions, which
  // is what the `friend class ProcessorAsyncWorker;` in processor.h grants).
  void MarkOpened() {
    processor_->ResetState();
    processor_->opened_ = true;
    processor_->inputRef_.Reset();
  }
  void MarkOpenedWithBuffer(Napi::Reference<Napi::Buffer<uint8_t>>&& ref) {
    processor_->ResetState();
    processor_->opened_ = true;
    processor_->inputRef_ = std::move(ref);
  }
  void MarkUnpacked() { processor_->unpacked_ = true; }
  void MarkThumbUnpacked() { processor_->thumbUnpacked_ = true; }
  void MarkProcessed() { processor_->processed_ = true; }

  Processor* processor_;

 private:
  // T09: install the progress callback (checked by dcraw_process()/
  // identify()-class stages -- see src/cancel.h) before Run() does any real
  // work, then check whether cancel() already landed between Queue() (JS
  // thread) and this method starting (threadpool thread) -- if so, skip
  // Run() entirely rather than starting a doomed pipeline. Real mid-Run()
  // cancellation for the checkCancel()-polling decoders (mainly relevant to
  // unpack(), see src/cancel.h) instead relies on cancel() having already
  // called processor_->raw_->setCancelFlag() directly, from the JS thread,
  // by the time the running decode loop next polls it -- nothing more is
  // needed here for that path.
  void Execute() override {
    processor_->raw_->set_progress_handler(&CancelAwareProgressCallback, cancelState_.get());
    // T10: dataError events on every job; exifTag events only when this
    // Processor was constructed with `{ exifTags: true }` (processor.h's
    // exifTags_ comment) -- "the exif callback is registered only then" per
    // docs/plan/tasks.md's T10 section. Both callbacks only ever push plain
    // data into cancelState_->events (src/events.cc) -- never touch Napi::*
    // -- so installing them unconditionally here (data error) or
    // conditionally (exif) is as safe as the progress handler above.
    processor_->raw_->set_dataerror_handler(&RecordDataErrorEvent, cancelState_.get());
    if (processor_->exifTags_) {
      processor_->raw_->set_exifparser_handler(&RecordExifTagEvent, cancelState_.get());
    }
    if (cancelState_->flag->load()) {
      rc_ = LIBRAW_CANCELLED_BY_CALLBACK;
      return;
    }
    rc_ = Run(*processor_->raw_);
  }

  // Shared OnOK()/OnError() cleanup: stop cancel() (see MakeCancel above)
  // from doing anything once this job has settled, stop processor_->raw_
  // from invoking a progress callback that points at a JobCancelState this
  // worker (and whatever holds the last shared_ptr to it) may go on to
  // release, and -- per the how-to doc's "clear the flag ... before the
  // next job" -- clearCancelFlag() unconditionally. This closes a real race:
  // LibRaw's own `_exitflag` (setCancelFlag()/checkCancel()) is only ever
  // cleared by checkCancel() consuming it, and not every stage polls
  // checkCancel() at all (src/cancel.h's class comment); a cancel() call
  // that lands just as a job is finishing successfully (rc_ ==
  // LIBRAW_SUCCESS, needsRecycle_ never set) would otherwise leave
  // `_exitflag` stuck at 1 -- silently cancelling the *next* job on this
  // Processor the moment it next polls checkCancel(), with no cancel() call
  // of its own.
  void SettleCancelState() {
    cancelState_->active->store(false);
    processor_->raw_->set_progress_handler(nullptr, nullptr);
    processor_->raw_->set_dataerror_handler(nullptr, nullptr);
    processor_->raw_->set_exifparser_handler(nullptr, nullptr);
    processor_->raw_->clearCancelFlag();
    // T10: hand this job's buffered events off to the Processor
    // (processor.h's pendingEvents_) for lib/processor.cjs to pull via
    // `_drainEvents()` right after the promise this worker settles --
    // called from both OnOK() and OnError() below, so every job's events
    // (successful, rejected, or cancelled) are delivered exactly once.
    processor_->pendingEvents_ = cancelState_->events->Drain();
  }

  void OnOK() override {
    processor_->busy_.store(false);
    SettleCancelState();
    if (rc_ != LIBRAW_SUCCESS) {
      // T09: a cancelled stage leaves LibRaw's internal state possibly
      // half-mutated -- processor.h's needsRecycle_ comment explains why the
      // next stage-advancing call must be refused until recycle()/close()/
      // a fresh open(). MakeStageError picks the MakeCancelledError shape
      // (`aborted: true`) for LIBRAW_CANCELLED_BY_CALLBACK, same as the
      // pre-abort fast path (RejectIfAborted) -- a caller should not have to
      // distinguish "aborted before we started" from "aborted mid-flight" by
      // anything other than that flag.
      if (rc_ == LIBRAW_CANCELLED_BY_CALLBACK) {
        processor_->needsRecycle_ = true;
      }
      deferred_.Reject(MakeStageError(Env(), rc_, stage_.c_str()).Value());
      return;
    }
    deferred_.Resolve(BuildResult(Env()));
  }

  // Only reached if Run() let a C++ exception escape instead of returning a
  // non-success LIBRAW_* code (the convention every subclass below follows);
  // defensive (e.g. std::bad_alloc from LibRaw's own allocations) rather
  // than a path any subclass here is expected to exercise normally.
  void OnError(const Napi::Error&) override {
    processor_->busy_.store(false);
    SettleCancelState();
    deferred_.Reject(MakeProcessorError(Env(), LIBRAW_UNSUFFICIENT_MEMORY, stage_.c_str()).Value());
  }

  int rc_ = LIBRAW_SUCCESS;
  std::string stage_;
  Napi::Promise::Deferred deferred_;
  Napi::ObjectReference selfRef_;
  std::shared_ptr<JobCancelState> cancelState_ = std::make_shared<JobCancelState>();
};

// --- openBuffer ---------------------------------------------------------
// Captures the input Buffer's pointer/length on the JS thread (constructor)
// and pins the Buffer itself (bufRef_) for Execute()'s duration; on success,
// hands that pin off to Processor::inputRef_ (MarkOpenedWithBuffer) so it
// outlives this worker for as long as the open session does -- same
// lifetime rule as OpenBufferSync (processor.h's inputRef_ comment), just
// established from the async path instead.
class OpenBufferWorker : public ProcessorAsyncWorker {
 public:
  OpenBufferWorker(Napi::Env env, Processor* processor, Napi::Object jsThis, Napi::Buffer<uint8_t> input,
                    Napi::Promise::Deferred deferred)
      : ProcessorAsyncWorker(env, processor, jsThis, "openBuffer", deferred),
        bufRef_(Napi::Persistent(input)),
        data_(input.Data()),
        length_(input.Length()) {}

 protected:
  int Run(LibRaw& raw) override { return raw.open_buffer(data_, length_); }
  Napi::Value BuildResult(Napi::Env env) override {
    MarkOpenedWithBuffer(std::move(bufRef_));
    return env.Undefined();
  }

 private:
  Napi::Reference<Napi::Buffer<uint8_t>> bufRef_;
  uint8_t* data_;
  size_t length_;
};

// --- openFile ------------------------------------------------------------
class OpenFileWorker : public ProcessorAsyncWorker {
 public:
  OpenFileWorker(Napi::Env env, Processor* processor, Napi::Object jsThis, std::string path,
                 Napi::Promise::Deferred deferred)
      : ProcessorAsyncWorker(env, processor, jsThis, "openFile", deferred), path_(std::move(path)) {}

 protected:
  int Run(LibRaw& raw) override { return raw.open_file(path_.c_str()); }
  Napi::Value BuildResult(Napi::Env env) override {
    MarkOpened();
    return env.Undefined();
  }

 private:
  std::string path_;
};

// --- unpack / unpackThumb / process / adjustSizesInfoOnly -----------------
// These four stages take a single LibRaw call and, on success, set at most
// one state flag (or none, for adjustSizesInfoOnly, matching
// AdjustSizesInfoOnlySync) and resolve with `undefined` -- generic enough
// for one worker parametrised by a std::function<int(LibRaw&)> plus which
// flag (if any) to set, per the task's "or a single worker taking a
// std::function<int(LibRaw&)>" alternative.
class SimpleStageWorker : public ProcessorAsyncWorker {
 public:
  enum class Mark { kNone, kUnpacked, kThumbUnpacked, kProcessed };

  SimpleStageWorker(Napi::Env env, Processor* processor, Napi::Object jsThis, const char* stage,
                     std::function<int(LibRaw&)> run, Mark mark, Napi::Promise::Deferred deferred)
      : ProcessorAsyncWorker(env, processor, jsThis, stage, deferred), run_(std::move(run)), mark_(mark) {}

 protected:
  int Run(LibRaw& raw) override { return run_(raw); }
  Napi::Value BuildResult(Napi::Env env) override {
    switch (mark_) {
      case Mark::kUnpacked:
        MarkUnpacked();
        break;
      case Mark::kThumbUnpacked:
        MarkThumbUnpacked();
        break;
      case Mark::kProcessed:
        MarkProcessed();
        break;
      case Mark::kNone:
        break;
    }
    return env.Undefined();
  }

 private:
  std::function<int(LibRaw&)> run_;
  Mark mark_;
};

// --- image -----------------------------------------------------------------
// Processor::Image() (processor.cc) allocates/validates the output Buffer on
// the JS thread *before* constructing this worker (from get_mem_image_format,
// already available after process()/adjustSizesInfoOnly -- see the task's
// "image() allocates the output Buffer on the JS thread" requirement); this
// worker's Run() only calls copy_mem_image into that pre-allocated pointer.
class ImageWorker : public ProcessorAsyncWorker {
 public:
  ImageWorker(Napi::Env env, Processor* processor, Napi::Object jsThis, Napi::Buffer<uint8_t> out, int stride,
              bool bgr, int width, int height, int colors, int bits, Napi::Promise::Deferred deferred)
      : ProcessorAsyncWorker(env, processor, jsThis, "image", deferred),
        outRef_(Napi::Persistent(out)),
        data_(out.Data()),
        stride_(stride),
        bgr_(bgr),
        width_(width),
        height_(height),
        colors_(colors),
        bits_(bits) {}

 protected:
  int Run(LibRaw& raw) override { return raw.copy_mem_image(data_, stride_, bgr_ ? 1 : 0); }
  Napi::Value BuildResult(Napi::Env env) override {
    Napi::Object result = Napi::Object::New(env);
    result.Set("width", width_);
    result.Set("height", height_);
    result.Set("colors", colors_);
    result.Set("bits", bits_);
    result.Set("data", outRef_.Value());
    return result;
  }

 private:
  Napi::Reference<Napi::Buffer<uint8_t>> outRef_;
  uint8_t* data_;
  int stride_;
  bool bgr_;
  int width_, height_, colors_, bits_;
};

// --- thumb -------------------------------------------------------------
// Mirrors ThumbSync (processor.cc): dcraw_make_mem_thumb (Run(), off-thread)
// allocates a libraw_processed_image_t* via LibRaw's own allocator -- plain
// malloc'd memory, not a Napi type, so holding the raw pointer across the
// Execute()->OnOK() handoff is safe. BuildResult() (JS thread) copies it into
// a fresh V8 Buffer and frees LibRaw's copy with dcraw_clear_mem, exactly as
// the task's "copy into a fresh Buffer in OnOK and dcraw_clear_mem" says.
class ThumbWorker : public ProcessorAsyncWorker {
 public:
  ThumbWorker(Napi::Env env, Processor* processor, Napi::Object jsThis, Napi::Promise::Deferred deferred)
      : ProcessorAsyncWorker(env, processor, jsThis, "thumb", deferred) {}

 protected:
  int Run(LibRaw& raw) override {
    int errcode = LIBRAW_SUCCESS;
    img_ = raw.dcraw_make_mem_thumb(&errcode);
    if (img_ == nullptr) {
      return errcode != LIBRAW_SUCCESS ? errcode : LIBRAW_UNSPECIFIED_ERROR;
    }
    return LIBRAW_SUCCESS;
  }

  Napi::Value BuildResult(Napi::Env env) override {
    Napi::Buffer<uint8_t> out = Napi::Buffer<uint8_t>::New(env, img_->data_size);
    std::memcpy(out.Data(), img_->data, img_->data_size);

    Napi::Object result = Napi::Object::New(env);
    result.Set("type", ImageFormatName(img_->type));
    result.Set("width", img_->width);
    result.Set("height", img_->height);
    result.Set("colors", img_->colors);
    result.Set("bits", img_->bits);
    result.Set("data", out);

    LibRaw::dcraw_clear_mem(img_);
    img_ = nullptr;
    return result;
  }

 private:
  libraw_processed_image_t* img_ = nullptr;
};

}  // namespace libraw_node
