#include "processor.h"

#include "async_workers.h"
#include "cancel.h"
#include "errors.h"
#include "image_format.h"

#include <cstring>
#include <string>

namespace libraw_node {

namespace {

unsigned int ParseFlags(const Napi::CallbackInfo& info) {
  if (info.Length() > 0 && info[0].IsObject()) {
    Napi::Object opts = info[0].As<Napi::Object>();
    if (opts.Has("flags") && !opts.Get("flags").IsUndefined()) {
      return static_cast<unsigned int>(opts.Get("flags").ToNumber().Int64Value());
    }
  }
  return LIBRAW_OPTIONS_NONE;
}

// T10: `{ exifTags: true }` gates whether ProcessorAsyncWorker::Execute()
// (src/async_workers.h) installs the exif-tag callback at all -- see
// processor.h's exifTags_ comment.
bool ParseExifTags(const Napi::CallbackInfo& info) {
  if (info.Length() > 0 && info[0].IsObject()) {
    Napi::Object opts = info[0].As<Napi::Object>();
    if (opts.Has("exifTags") && !opts.Get("exifTags").IsUndefined()) {
      return opts.Get("exifTags").ToBoolean();
    }
  }
  return false;
}

// T09: every async stage method below takes its `{ signal? }` options object
// as its last argument (openBuffer(buffer, opts?), unpack(opts?),
// unpackThumb(index?, opts?), image({ into?, bgr?, stride?, signal? }), ...)
// -- this pulls it out (or an empty object if `value` isn't one), for
// RejectIfAborted (src/errors.h, shared with src/fused.cc) to check.
Napi::Object OptionsObjectOrEmpty(Napi::Env env, Napi::Value value) {
  if (!value.IsUndefined() && value.IsObject()) {
    return value.As<Napi::Object>();
  }
  return Napi::Object::New(env);
}

}  // namespace

Napi::Function Processor::DefineClass(Napi::Env env) {
  return ObjectWrap<Processor>::DefineClass(
      env, "Processor",
      {
          InstanceMethod("openBufferSync", &Processor::OpenBufferSync),
          InstanceMethod("openFileSync", &Processor::OpenFileSync),
          InstanceMethod("unpackSync", &Processor::UnpackSync),
          InstanceMethod("unpackThumbSync", &Processor::UnpackThumbSync),
          InstanceMethod("processSync", &Processor::ProcessSync),
          InstanceMethod("imageSync", &Processor::ImageSync),
          InstanceMethod("thumbSync", &Processor::ThumbSync),
          InstanceMethod("adjustSizesInfoOnlySync", &Processor::AdjustSizesInfoOnlySync),
          InstanceMethod("recycle", &Processor::Recycle),
          InstanceMethod("close", &Processor::Close),
          InstanceMethod("openBuffer", &Processor::OpenBuffer),
          InstanceMethod("openFile", &Processor::OpenFile),
          InstanceMethod("unpack", &Processor::Unpack),
          InstanceMethod("unpackThumb", &Processor::UnpackThumb),
          InstanceMethod("process", &Processor::Process),
          InstanceMethod("image", &Processor::Image),
          InstanceMethod("thumb", &Processor::Thumb),
          InstanceMethod("adjustSizesInfoOnly", &Processor::AdjustSizesInfoOnly),
          InstanceMethod("errorCount", &Processor::ErrorCount),
          InstanceMethod("decoderInfo", &Processor::DecoderInfo),
          InstanceMethod("unpackFunctionName", &Processor::UnpackFunctionName),
          InstanceMethod("isFujiRotated", &Processor::IsFujiRotated),
          InstanceMethod("isSraw", &Processor::IsSraw),
          InstanceMethod("isNikonSraw", &Processor::IsNikonSraw),
          InstanceMethod("isCoolscanNef", &Processor::IsCoolscanNef),
          InstanceMethod("isJpegThumb", &Processor::IsJpegThumb),
          InstanceMethod("isFloatingPoint", &Processor::IsFloatingPoint),
          InstanceMethod("haveFpData", &Processor::HaveFpData),
          InstanceMethod("srawMidpoint", &Processor::SrawMidpoint),
          InstanceMethod("color", &Processor::Color),
          InstanceMethod("thumbOK", &Processor::ThumbOK),
          // T12: generated parameter application -- see processor.h's
          // comment above these four declarations.
          InstanceMethod("setParams", &Processor::SetParams),
          InstanceMethod("setRawParams", &Processor::SetRawParams),
          InstanceMethod("getParams", &Processor::GetParams),
          InstanceMethod("getRawParams", &Processor::GetRawParams),
          // T10: internal-only, see processor.h's DrainEvents comment.
          InstanceMethod("_drainEvents", &Processor::DrainEvents),
      });
}

Processor::Processor(const Napi::CallbackInfo& info)
    : ObjectWrap<Processor>(info),
      raw_(std::make_unique<LibRaw>(ParseFlags(info))),
      exifTags_(ParseExifTags(info)) {}

void Processor::RequireNotBusy(Napi::Env env, const char* stage) {
  if (busy_.load()) {
    ThrowBusyError(env, stage);
  }
}

void Processor::RequireNotClosed(Napi::Env env, const char* stage) {
  RequireNotBusy(env, stage);
  if (closed_) {
    ThrowProcessorError(env, LIBRAW_OUT_OF_ORDER_CALL, stage);
  }
}

void Processor::RequireOpened(Napi::Env env, const char* stage) {
  RequireNotClosed(env, stage);
  if (!opened_) {
    ThrowProcessorError(env, LIBRAW_OUT_OF_ORDER_CALL, stage);
  }
  // T09: a cancelled stage leaves LibRaw's own internal state
  // (imgdata/rawdata) possibly half-mutated -- see processor.h's
  // needsRecycle_ comment. Blocks every stage-advancing call and
  // "opened"-requiring getter until recycle()/close()/a fresh open() call.
  if (needsRecycle_) {
    ThrowProcessorError(env, LIBRAW_OUT_OF_ORDER_CALL, stage);
  }
}

void Processor::RequireUnpacked(Napi::Env env, const char* stage) {
  RequireOpened(env, stage);
  if (!unpacked_) {
    ThrowProcessorError(env, LIBRAW_OUT_OF_ORDER_CALL, stage);
  }
}

void Processor::RequireProcessed(Napi::Env env, const char* stage) {
  RequireUnpacked(env, stage);
  if (!processed_) {
    ThrowProcessorError(env, LIBRAW_OUT_OF_ORDER_CALL, stage);
  }
}

void Processor::RequireThumbUnpacked(Napi::Env env, const char* stage) {
  RequireOpened(env, stage);
  if (!thumbUnpacked_) {
    ThrowProcessorError(env, LIBRAW_OUT_OF_ORDER_CALL, stage);
  }
}

void Processor::ResetState() {
  opened_ = false;
  unpacked_ = false;
  processed_ = false;
  thumbUnpacked_ = false;
  needsRecycle_ = false;  // T09
}

// --- Input -----------------------------------------------------------------

Napi::Value Processor::OpenBufferSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireNotClosed(env, "openBufferSync");
  if (info.Length() < 1 || !info[0].IsBuffer()) {
    throw Napi::TypeError::New(env, "openBufferSync(buffer): buffer must be a Buffer");
  }
  Napi::Buffer<uint8_t> input = info[0].As<Napi::Buffer<uint8_t>>();

  int rc = raw_->open_buffer(input.Data(), input.Length());
  if (rc != LIBRAW_SUCCESS) {
    ThrowProcessorError(env, rc, "openBufferSync");
  }
  ResetState();
  opened_ = true;
  // Root the buffer against GC for as long as raw_ may read through it (see
  // processor.h's comment on inputRef_); replaces any previous reference.
  inputRef_ = Napi::Persistent(input);
  return env.Undefined();
}

Napi::Value Processor::OpenFileSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireNotClosed(env, "openFileSync");
  if (info.Length() < 1 || !info[0].IsString()) {
    throw Napi::TypeError::New(env, "openFileSync(path): path must be a string");
  }
  std::string path = info[0].As<Napi::String>().Utf8Value();

  int rc = raw_->open_file(path.c_str());
  if (rc != LIBRAW_SUCCESS) {
    ThrowProcessorError(env, rc, "openFileSync");
  }
  ResetState();
  opened_ = true;
  inputRef_.Reset();  // no in-process buffer to keep alive for a file open
  return env.Undefined();
}

// --- Decode ------------------------------------------------------------------

Napi::Value Processor::UnpackSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireOpened(env, "unpackSync");
  int rc = raw_->unpack();
  if (rc != LIBRAW_SUCCESS) {
    ThrowProcessorError(env, rc, "unpackSync");
  }
  unpacked_ = true;
  return env.Undefined();
}

Napi::Value Processor::UnpackThumbSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireOpened(env, "unpackThumbSync");
  int rc;
  if (info.Length() > 0 && !info[0].IsUndefined()) {
    int index = info[0].As<Napi::Number>().Int32Value();
    rc = raw_->unpack_thumb_ex(index);
  } else {
    rc = raw_->unpack_thumb();
  }
  if (rc != LIBRAW_SUCCESS) {
    ThrowProcessorError(env, rc, "unpackThumbSync");
  }
  thumbUnpacked_ = true;
  return env.Undefined();
}

Napi::Value Processor::ProcessSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireUnpacked(env, "processSync");
  int rc = raw_->dcraw_process();
  if (rc != LIBRAW_SUCCESS) {
    ThrowProcessorError(env, rc, "processSync");
  }
  processed_ = true;
  return env.Undefined();
}

Napi::Value Processor::AdjustSizesInfoOnlySync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireOpened(env, "adjustSizesInfoOnlySync");
  int rc = raw_->adjust_sizes_info_only();
  if (rc != LIBRAW_SUCCESS) {
    ThrowProcessorError(env, rc, "adjustSizesInfoOnlySync");
  }
  return env.Undefined();
}

// --- Output ------------------------------------------------------------------

// imageSync({ into?, bgr?, stride? }) -> { width, height, colors, bits, data }
Napi::Value Processor::ImageSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireProcessed(env, "imageSync");

  bool bgr = false;
  int strideOverride = 0;
  Napi::Value intoValue;

  if (info.Length() > 0 && info[0].IsObject()) {
    Napi::Object opts = info[0].As<Napi::Object>();
    if (opts.Has("bgr") && !opts.Get("bgr").IsUndefined()) {
      bgr = opts.Get("bgr").ToBoolean();
    }
    if (opts.Has("stride") && !opts.Get("stride").IsUndefined()) {
      strideOverride = opts.Get("stride").ToNumber().Int32Value();
    }
    if (opts.Has("into") && !opts.Get("into").IsUndefined()) {
      intoValue = opts.Get("into");
    }
  }

  int width = 0, height = 0, colors = 0, bps = 0;
  raw_->get_mem_image_format(&width, &height, &colors, &bps);
  size_t defaultStride = static_cast<size_t>(width) * static_cast<size_t>(colors) * static_cast<size_t>(bps / 8);
  size_t stride = strideOverride > 0 ? static_cast<size_t>(strideOverride) : defaultStride;
  size_t need = stride * static_cast<size_t>(height);

  Napi::Buffer<uint8_t> out;
  if (!intoValue.IsEmpty()) {
    if (!intoValue.IsBuffer()) {
      throw Napi::TypeError::New(env, "imageSync({ into }): into must be a Buffer");
    }
    out = intoValue.As<Napi::Buffer<uint8_t>>();
    if (out.Length() < need) {
      throw Napi::RangeError::New(
          env, "imageSync({ into }): into buffer (" + std::to_string(out.Length()) +
                   " bytes) is smaller than the required " + std::to_string(need) + " bytes");
    }
  } else {
    out = Napi::Buffer<uint8_t>::New(env, need);
  }

  int rc = raw_->copy_mem_image(out.Data(), static_cast<int>(stride), bgr ? 1 : 0);
  if (rc != LIBRAW_SUCCESS) {
    ThrowProcessorError(env, rc, "imageSync");
  }

  Napi::Object result = Napi::Object::New(env);
  result.Set("width", width);
  result.Set("height", height);
  result.Set("colors", colors);
  result.Set("bits", bps);
  result.Set("data", out);
  return result;
}

// thumbSync() -> { type, width, height, colors, bits, data }
Napi::Value Processor::ThumbSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireThumbUnpacked(env, "thumbSync");

  int errcode = 0;
  libraw_processed_image_t* img = raw_->dcraw_make_mem_thumb(&errcode);
  if (img == nullptr) {
    ThrowProcessorError(env, errcode != LIBRAW_SUCCESS ? errcode : LIBRAW_UNSPECIFIED_ERROR, "thumbSync");
  }

  Napi::Buffer<uint8_t> out = Napi::Buffer<uint8_t>::New(env, img->data_size);
  std::memcpy(out.Data(), img->data, img->data_size);

  Napi::Object result = Napi::Object::New(env);
  result.Set("type", ImageFormatName(img->type));
  result.Set("width", img->width);
  result.Set("height", img->height);
  result.Set("colors", img->colors);
  result.Set("bits", img->bits);
  result.Set("data", out);

  LibRaw::dcraw_clear_mem(img);
  return result;
}

// --- Lifecycle -----------------------------------------------------------

Napi::Value Processor::Recycle(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireNotClosed(env, "recycle");
  raw_->recycle();
  ResetState();
  inputRef_.Reset();
  return env.Undefined();
}

Napi::Value Processor::Close(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireNotBusy(env, "close");  // close() is otherwise idempotent/unguarded (see below)
  if (!closed_) {
    if (raw_) {
      raw_->recycle();
    }
    raw_.reset();
    inputRef_.Reset();
    ResetState();
    closed_ = true;
  }
  return env.Undefined();
}

// --- Async (Promise-returning) stage methods (T07) --------------------------
//
// Common shape for all eight methods below: create the Napi::Promise::
// Deferred first, run every synchronous validation/state check (argument
// types, RequireOpened/RequireUnpacked/RequireProcessed/RequireThumbUnpacked
// -- which, via RequireNotClosed, also cover RequireNotBusy) inside a
// try/catch, and reject the *same* deferred instead of letting a Napi::Error
// propagate as a synchronous JS exception. This is what makes the busy-guard
// (and every other precondition failure) surface as "a rejected promise, not
// a throw" per the task's acceptance requirement -- callers can always
// `await processor.unpack()` / `.catch()` it, never need a try/catch around
// the call itself. Only once every check passes does busy_ get set to true
// and the corresponding AsyncWorker (src/async_workers.h) get queued; that
// worker's OnOK/OnError always clears busy_ again.
//
// T09: every method below now returns `{ promise, cancel }`
// (src/cancel.h's WrapPromiseWithCancel) instead of a bare Promise, and
// accepts a trailing `{ signal? }` options object (an existing options
// object, for image()) checked via the shared RejectIfAborted (src/errors.h)
// for the pre-aborted fast path. lib/processor.cjs unwraps the result,
// wires `cancel` to `signal` itself, and returns a plain Promise -- every
// JS-visible signature is unchanged from T07's.

Napi::Value Processor::OpenBuffer(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);
  try {
    RequireNotClosed(env, "openBuffer");
    if (info.Length() < 1 || !info[0].IsBuffer()) {
      throw Napi::TypeError::New(env, "openBuffer(buffer): buffer must be a Buffer");
    }
    Napi::Buffer<uint8_t> input = info[0].As<Napi::Buffer<uint8_t>>();
    Napi::Object opts = OptionsObjectOrEmpty(env, info.Length() > 1 ? info[1] : env.Undefined());
    if (RejectIfAborted(env, opts, "openBuffer", deferred)) {
      return WrapPromiseWithCancel(env, deferred.Promise(), NoopCancel(env));
    }
    busy_ = true;
    auto* worker = new OpenBufferWorker(env, this, info.This().As<Napi::Object>(), input, deferred);
    Napi::Function cancel = worker->MakeCancel(env);
    worker->Queue();
    return WrapPromiseWithCancel(env, deferred.Promise(), cancel);
  } catch (const Napi::Error& e) {
    deferred.Reject(e.Value());
    return WrapPromiseWithCancel(env, deferred.Promise(), NoopCancel(env));
  }
}

Napi::Value Processor::OpenFile(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);
  try {
    RequireNotClosed(env, "openFile");
    if (info.Length() < 1 || !info[0].IsString()) {
      throw Napi::TypeError::New(env, "openFile(path): path must be a string");
    }
    std::string path = info[0].As<Napi::String>().Utf8Value();
    Napi::Object opts = OptionsObjectOrEmpty(env, info.Length() > 1 ? info[1] : env.Undefined());
    if (RejectIfAborted(env, opts, "openFile", deferred)) {
      return WrapPromiseWithCancel(env, deferred.Promise(), NoopCancel(env));
    }
    busy_ = true;
    auto* worker = new OpenFileWorker(env, this, info.This().As<Napi::Object>(), path, deferred);
    Napi::Function cancel = worker->MakeCancel(env);
    worker->Queue();
    return WrapPromiseWithCancel(env, deferred.Promise(), cancel);
  } catch (const Napi::Error& e) {
    deferred.Reject(e.Value());
    return WrapPromiseWithCancel(env, deferred.Promise(), NoopCancel(env));
  }
}

Napi::Value Processor::Unpack(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);
  try {
    RequireOpened(env, "unpack");
    Napi::Object opts = OptionsObjectOrEmpty(env, info.Length() > 0 ? info[0] : env.Undefined());
    if (RejectIfAborted(env, opts, "unpack", deferred)) {
      return WrapPromiseWithCancel(env, deferred.Promise(), NoopCancel(env));
    }
    busy_ = true;
    auto run = [](LibRaw& raw) { return raw.unpack(); };
    auto* worker = new SimpleStageWorker(env, this, info.This().As<Napi::Object>(), "unpack", run,
                                          SimpleStageWorker::Mark::kUnpacked, deferred);
    Napi::Function cancel = worker->MakeCancel(env);
    worker->Queue();
    return WrapPromiseWithCancel(env, deferred.Promise(), cancel);
  } catch (const Napi::Error& e) {
    deferred.Reject(e.Value());
    return WrapPromiseWithCancel(env, deferred.Promise(), NoopCancel(env));
  }
}

Napi::Value Processor::UnpackThumb(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);
  try {
    RequireOpened(env, "unpackThumb");
    // unpackThumb(), unpackThumb(index), unpackThumb(opts) and
    // unpackThumb(index, opts) all need to work -- only a number in
    // position 0 is an index (T09 adds the opts-without-index shape; T07's
    // callers only ever used unpackThumb() or unpackThumb(index)).
    bool hasIndex = info.Length() > 0 && info[0].IsNumber();
    int index = hasIndex ? info[0].As<Napi::Number>().Int32Value() : 0;
    Napi::Value optsArg = hasIndex ? (info.Length() > 1 ? info[1] : env.Undefined())
                                    : (info.Length() > 0 ? info[0] : env.Undefined());
    Napi::Object opts = OptionsObjectOrEmpty(env, optsArg);
    if (RejectIfAborted(env, opts, "unpackThumb", deferred)) {
      return WrapPromiseWithCancel(env, deferred.Promise(), NoopCancel(env));
    }
    busy_ = true;
    auto run = [hasIndex, index](LibRaw& raw) {
      return hasIndex ? raw.unpack_thumb_ex(index) : raw.unpack_thumb();
    };
    auto* worker = new SimpleStageWorker(env, this, info.This().As<Napi::Object>(), "unpackThumb", run,
                                          SimpleStageWorker::Mark::kThumbUnpacked, deferred);
    Napi::Function cancel = worker->MakeCancel(env);
    worker->Queue();
    return WrapPromiseWithCancel(env, deferred.Promise(), cancel);
  } catch (const Napi::Error& e) {
    deferred.Reject(e.Value());
    return WrapPromiseWithCancel(env, deferred.Promise(), NoopCancel(env));
  }
}

Napi::Value Processor::Process(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);
  try {
    RequireUnpacked(env, "process");
    Napi::Object opts = OptionsObjectOrEmpty(env, info.Length() > 0 ? info[0] : env.Undefined());
    if (RejectIfAborted(env, opts, "process", deferred)) {
      return WrapPromiseWithCancel(env, deferred.Promise(), NoopCancel(env));
    }
    busy_ = true;
    auto run = [](LibRaw& raw) { return raw.dcraw_process(); };
    auto* worker = new SimpleStageWorker(env, this, info.This().As<Napi::Object>(), "process", run,
                                          SimpleStageWorker::Mark::kProcessed, deferred);
    Napi::Function cancel = worker->MakeCancel(env);
    worker->Queue();
    return WrapPromiseWithCancel(env, deferred.Promise(), cancel);
  } catch (const Napi::Error& e) {
    deferred.Reject(e.Value());
    return WrapPromiseWithCancel(env, deferred.Promise(), NoopCancel(env));
  }
}

Napi::Value Processor::AdjustSizesInfoOnly(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);
  try {
    RequireOpened(env, "adjustSizesInfoOnly");
    Napi::Object opts = OptionsObjectOrEmpty(env, info.Length() > 0 ? info[0] : env.Undefined());
    if (RejectIfAborted(env, opts, "adjustSizesInfoOnly", deferred)) {
      return WrapPromiseWithCancel(env, deferred.Promise(), NoopCancel(env));
    }
    busy_ = true;
    auto run = [](LibRaw& raw) { return raw.adjust_sizes_info_only(); };
    auto* worker = new SimpleStageWorker(env, this, info.This().As<Napi::Object>(), "adjustSizesInfoOnly", run,
                                          SimpleStageWorker::Mark::kNone, deferred);
    Napi::Function cancel = worker->MakeCancel(env);
    worker->Queue();
    return WrapPromiseWithCancel(env, deferred.Promise(), cancel);
  } catch (const Napi::Error& e) {
    deferred.Reject(e.Value());
    return WrapPromiseWithCancel(env, deferred.Promise(), NoopCancel(env));
  }
}

// image({ into?, bgr?, stride?, signal? }) -> Promise<{ width, height, colors, bits, data }>.
// The output Buffer is allocated (or the caller-supplied `into` validated) on
// the JS thread here, from get_mem_image_format -- exactly like ImageSync --
// *before* the worker is constructed; the worker itself only runs
// copy_mem_image off-thread. See src/async_workers.h's ImageWorker comment.
Napi::Value Processor::Image(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);
  try {
    RequireProcessed(env, "image");

    bool bgr = false;
    int strideOverride = 0;
    Napi::Value intoValue;

    Napi::Object opts = OptionsObjectOrEmpty(env, info.Length() > 0 ? info[0] : env.Undefined());
    if (opts.Has("bgr") && !opts.Get("bgr").IsUndefined()) {
      bgr = opts.Get("bgr").ToBoolean();
    }
    if (opts.Has("stride") && !opts.Get("stride").IsUndefined()) {
      strideOverride = opts.Get("stride").ToNumber().Int32Value();
    }
    if (opts.Has("into") && !opts.Get("into").IsUndefined()) {
      intoValue = opts.Get("into");
    }

    if (RejectIfAborted(env, opts, "image", deferred)) {
      return WrapPromiseWithCancel(env, deferred.Promise(), NoopCancel(env));
    }

    int width = 0, height = 0, colors = 0, bps = 0;
    raw_->get_mem_image_format(&width, &height, &colors, &bps);
    size_t defaultStride = static_cast<size_t>(width) * static_cast<size_t>(colors) * static_cast<size_t>(bps / 8);
    size_t stride = strideOverride > 0 ? static_cast<size_t>(strideOverride) : defaultStride;
    size_t need = stride * static_cast<size_t>(height);

    Napi::Buffer<uint8_t> out;
    if (!intoValue.IsEmpty()) {
      if (!intoValue.IsBuffer()) {
        throw Napi::TypeError::New(env, "image({ into }): into must be a Buffer");
      }
      out = intoValue.As<Napi::Buffer<uint8_t>>();
      if (out.Length() < need) {
        throw Napi::RangeError::New(
            env, "image({ into }): into buffer (" + std::to_string(out.Length()) +
                     " bytes) is smaller than the required " + std::to_string(need) + " bytes");
      }
    } else {
      out = Napi::Buffer<uint8_t>::New(env, need);
    }

    busy_ = true;
    auto* worker = new ImageWorker(env, this, info.This().As<Napi::Object>(), out, static_cast<int>(stride), bgr,
                                    width, height, colors, bps, deferred);
    Napi::Function cancel = worker->MakeCancel(env);
    worker->Queue();
    return WrapPromiseWithCancel(env, deferred.Promise(), cancel);
  } catch (const Napi::Error& e) {
    deferred.Reject(e.Value());
    return WrapPromiseWithCancel(env, deferred.Promise(), NoopCancel(env));
  }
}

Napi::Value Processor::Thumb(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);
  try {
    RequireThumbUnpacked(env, "thumb");
    Napi::Object opts = OptionsObjectOrEmpty(env, info.Length() > 0 ? info[0] : env.Undefined());
    if (RejectIfAborted(env, opts, "thumb", deferred)) {
      return WrapPromiseWithCancel(env, deferred.Promise(), NoopCancel(env));
    }
    busy_ = true;
    auto* worker = new ThumbWorker(env, this, info.This().As<Napi::Object>(), deferred);
    Napi::Function cancel = worker->MakeCancel(env);
    worker->Queue();
    return WrapPromiseWithCancel(env, deferred.Promise(), cancel);
  } catch (const Napi::Error& e) {
    deferred.Reject(e.Value());
    return WrapPromiseWithCancel(env, deferred.Promise(), NoopCancel(env));
  }
}

// --- Introspection ---------------------------------------------------------

Napi::Value Processor::ErrorCount(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireOpened(env, "errorCount");
  return Napi::Number::New(env, raw_->error_count());
}

Napi::Value Processor::DecoderInfo(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireOpened(env, "decoderInfo");
  libraw_decoder_info_t decoderInfo{};
  int rc = raw_->get_decoder_info(&decoderInfo);
  if (rc != LIBRAW_SUCCESS) {
    ThrowProcessorError(env, rc, "decoderInfo");
  }
  Napi::Object result = Napi::Object::New(env);
  result.Set("decoder_name", decoderInfo.decoder_name ? Napi::Value::From(env, decoderInfo.decoder_name)
                                                        : env.Null());
  result.Set("decoder_flags", Napi::Number::New(env, decoderInfo.decoder_flags));
  return result;
}

Napi::Value Processor::UnpackFunctionName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireOpened(env, "unpackFunctionName");
  const char* name = raw_->unpack_function_name();
  return name ? Napi::Value::From(env, name) : env.Null();
}

Napi::Value Processor::IsFujiRotated(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireOpened(env, "isFujiRotated");
  return Napi::Boolean::New(env, raw_->is_fuji_rotated() != 0);
}

Napi::Value Processor::IsSraw(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireOpened(env, "isSraw");
  return Napi::Boolean::New(env, raw_->is_sraw() != 0);
}

Napi::Value Processor::IsNikonSraw(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireOpened(env, "isNikonSraw");
  return Napi::Boolean::New(env, raw_->is_nikon_sraw() != 0);
}

Napi::Value Processor::IsCoolscanNef(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireOpened(env, "isCoolscanNef");
  return Napi::Boolean::New(env, raw_->is_coolscan_nef() != 0);
}

Napi::Value Processor::IsJpegThumb(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireOpened(env, "isJpegThumb");
  return Napi::Boolean::New(env, raw_->is_jpeg_thumb() != 0);
}

Napi::Value Processor::IsFloatingPoint(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireOpened(env, "isFloatingPoint");
  return Napi::Boolean::New(env, raw_->is_floating_point() != 0);
}

Napi::Value Processor::HaveFpData(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireOpened(env, "haveFpData");
  return Napi::Boolean::New(env, raw_->have_fpdata() != 0);
}

Napi::Value Processor::SrawMidpoint(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireOpened(env, "srawMidpoint");
  return Napi::Number::New(env, raw_->sraw_midpoint());
}

Napi::Value Processor::Color(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireUnpacked(env, "color");
  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
    throw Napi::TypeError::New(env, "color(row, col): both arguments must be numbers");
  }
  int row = info[0].As<Napi::Number>().Int32Value();
  int col = info[1].As<Napi::Number>().Int32Value();
  return Napi::Number::New(env, raw_->COLOR(row, col));
}

Napi::Value Processor::ThumbOK(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireOpened(env, "thumbOK");
  INT64 maxsz = -1;
  if (info.Length() > 0 && !info[0].IsUndefined()) {
    maxsz = static_cast<INT64>(info[0].As<Napi::Number>().Int64Value());
  }
  return Napi::Number::New(env, raw_->thumbOK(maxsz));
}

// --- T12: parameter application ---------------------------------------------

// setParams(obj) -> undefined. Applies `obj` onto imgdata.params via the
// generated ApplyParams (src/params.h/src/generated/params.gen.cc) --
// unknown keys, wrong types, wrong array lengths, out-of-enum/out-of-range
// values all throw (TypeError or RangeError) without mutating raw_ at all
// (ApplyParams validates every field before assigning any of them... see
// src/generated/params.gen.cc: each field's own `if` block validates then
// assigns immediately, so a failure partway through can leave earlier fields
// in this same call already applied -- matching how the rest of this file's
// argument validation works, e.g. imageSync's into-buffer size check, and
// acceptable here since a throw means the caller's whole options object was
// rejected and it is expected to inspect/fix and retry, not rely on
// partial-application semantics).
//
// State rule (src/params.h's header comment): allowed any time up to
// dcraw_process() -- once processed_ is true, LibRaw has already consumed
// the params it read for that call, so further changes would be silently
// ignored until process() ran again, which T12 does not support re-running
// with new params. Throws LIBRAW_OUT_OF_ORDER_CALL in that case.
Napi::Value Processor::SetParams(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireNotClosed(env, "setParams");
  if (processed_) {
    ThrowProcessorError(env, LIBRAW_OUT_OF_ORDER_CALL, "setParams");
  }
  if (info.Length() < 1 || !info[0].IsObject()) {
    throw Napi::TypeError::New(env, "setParams(params): params must be an object");
  }
  ApplyParams(env, info[0].As<Napi::Object>(), raw_->imgdata.params, paramStrings_);
  return env.Undefined();
}

// setRawParams(obj) -> undefined. Same shape as setParams, for
// imgdata.rawparams (ApplyRawParams).
//
// State rule: allowed only before the Processor has been opened -- rawparams
// affects raw parsing LibRaw does at open_buffer()/open_file() time (e.g.
// imgdata.rawparams.options' thumbnail/DNG-stage bits) or at unpack() time
// (shot_select); once opened_ is true those reads have already happened (or,
// for shot_select, are about to happen at the very next unpack() using
// whatever was set before open), so a change here would be silently ignored
// by LibRaw. Throws LIBRAW_OUT_OF_ORDER_CALL once opened_.
Napi::Value Processor::SetRawParams(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireNotClosed(env, "setRawParams");
  if (opened_) {
    ThrowProcessorError(env, LIBRAW_OUT_OF_ORDER_CALL, "setRawParams");
  }
  if (info.Length() < 1 || !info[0].IsObject()) {
    throw Napi::TypeError::New(env, "setRawParams(rawparams): rawparams must be an object");
  }
  ApplyRawParams(env, info[0].As<Napi::Object>(), raw_->imgdata.rawparams);
  return env.Undefined();
}

// getParams()/getRawParams() -> object. Returns every api/params.json field
// of the corresponding struct with its current value (ParamsToObject/
// RawParamsToObject, src/generated/params.gen.cc) -- readable in any state
// short of closed_, including right after construction (imgdata.params/
// imgdata.rawparams are zero-/default-initialised by LibRaw's own
// constructor, not lazily allocated).
Napi::Value Processor::GetParams(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireNotClosed(env, "getParams");
  return ParamsToObject(env, raw_->imgdata.params);
}

Napi::Value Processor::GetRawParams(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  RequireNotClosed(env, "getRawParams");
  return RawParamsToObject(env, raw_->imgdata.rawparams);
}

// T10: see processor.h's DrainEvents comment.
Napi::Value Processor::DrainEvents(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Array arr = EventsToArray(env, pendingEvents_);
  pendingEvents_.clear();
  return arr;
}

}  // namespace libraw_node
