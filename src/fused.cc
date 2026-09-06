#include "fused.h"

#include "cancel.h"
#include "enums.h"
#include "errors.h"
#include "events.h"
#include "image_format.h"
#include "params.h"

#include <libraw/libraw.h>

#include <algorithm>
#include <cstring>
#include <memory>
#include <string>
#include <utility>
#include <vector>

// T08: decode(), identify(), thumbnail() -- see src/fused.h's class comment
// for the "each call owns its own LibRaw instance" design. Every worker
// below follows the same three-phase shape:
//   1. JS thread (the module function, e.g. Decode()): validate arguments,
//      reject a pre-aborted `signal` without touching LibRaw at all
//      (RejectIfAborted), parse options into a plain-old-data struct, and
//      construct+Queue() the worker.
//   2. Execute() [threadpool thread]: construct the LibRaw instance, run the
//      LibRaw calls, store only plain data (ints, the imgdata bits actually
//      needed) on the worker -- never a Napi::* value.
//   3. OnOK() [JS thread]: turn the stored plain data into a JS result
//      (allocating any output Buffer here, since that must happen on the JS
//      thread), then recycle() the LibRaw instance and resolve/reject.
namespace libraw_node {

namespace {

// --- shared helpers --------------------------------------------------------

// T13: `warnings` result fields use libraw_node::WarningsToArray
// (src/enums.h/.cc, generated from libraw_const.h by scripts/gen-enums.js)
// instead of the hand-written LIBRAW_WARN_*->name table this file used to
// carry directly (T08) -- same rationale as src/errors.cc's generated error
// table. Note the short-name change: results now carry "FALLBACK_TO_AHD",
// not the old "LIBRAW_WARN_FALLBACK_TO_AHD".

// T09: RejectIfAborted (the pre-abort fast path) moved to src/errors.h/.cc
// so src/processor.cc can share it verbatim.

// T10: attaches this job's buffered progress/dataError events (src/events.h)
// to `value` (the resolved result object, or a rejected error's own
// `.Value()`) as an `events` array property. lib/fused.cjs reads it,
// invokes onProgress()/onDataError() from it, then deletes the property so
// it never becomes part of the package's public result/error shape (see
// src/fused.h's documented Promise<{...}> result types -- none of them
// mention `events`). Fused helpers never register the exif-tag callback
// (docs/plan/tasks.md's T10 "Do" list only asks fused helpers for
// onProgress/onDataError, not exifTag), so a kExifTag event never appears
// here in practice -- EventsToArray handles it anyway, for uniformity with
// Processor's `_drainEvents()`.
void AttachEvents(Napi::Env env, Napi::Object value, const std::shared_ptr<JobCancelState>& cancelState) {
  value.Set("events", EventsToArray(env, cancelState->events->Drain()));
}

Napi::Object OptionsObjectOrEmpty(Napi::Env env, const Napi::CallbackInfo& info, const char* stage) {
  if (info.Length() > 1 && !info[1].IsUndefined()) {
    if (!info[1].IsObject()) {
      throw Napi::TypeError::New(env, std::string(stage) + "(buffer, options?): options must be an object");
    }
    return info[1].As<Napi::Object>();
  }
  return Napi::Object::New(env);
}

Napi::Buffer<uint8_t> RequireBufferArg(Napi::Env env, const Napi::CallbackInfo& info, const char* stage) {
  if (info.Length() < 1 || !info[0].IsBuffer()) {
    throw Napi::TypeError::New(env, std::string(stage) + "(buffer, options?): buffer must be a Buffer");
  }
  return info[0].As<Napi::Buffer<uint8_t>>();
}

// --- decode() ----------------------------------------------------------

// T12: params/rawparams are applied directly onto `raw->imgdata` on the JS
// thread, before the worker is constructed (see Decode(), below) -- ApplyParams/
// ApplyRawParams (src/params.h/src/generated/params.gen.cc) do all the
// unknown-key/type/range/enum/flags validation there, where throwing a
// Napi::TypeError/RangeError is cheap and synchronous. Only the output-shape
// options (`output.layout`/`stride`/`into`) are still parsed into a
// plain-old-data struct for the worker: those don't touch imgdata, only how
// this call's own output Buffer is filled. No Napi::* members in this struct
// on purpose -- it is read from Execute() (threadpool thread), and a
// Napi::Value read from the wrong thread (or after the call that produced it
// returned) is undefined behaviour.
struct DecodeOutputOptions {
  bool bgr = false;  // output.layout === 'bgr'
  int stride = 0;    // output.stride override; 0 = default (width*colors*bps/8)
};

// Parses `opts.output` on the JS thread. `intoRefOut` receives a persistent
// reference to `output.into` immediately (if given) so no Napi::Value needs
// to be kept alive inside DecodeOutputOptions itself.
DecodeOutputOptions ParseDecodeOutputOptions(Napi::Env env, Napi::Object opts,
                                              Napi::Reference<Napi::Buffer<uint8_t>>& intoRefOut) {
  DecodeOutputOptions result;

  if (opts.Has("output") && !opts.Get("output").IsUndefined()) {
    Napi::Value ov = opts.Get("output");
    if (!ov.IsObject()) {
      throw Napi::TypeError::New(env, "decode({ output }): output must be an object");
    }
    Napi::Object out = ov.As<Napi::Object>();
    if (out.Has("layout") && !out.Get("layout").IsUndefined()) {
      std::string layout = out.Get("layout").ToString().Utf8Value();
      if (layout == "bgr") {
        result.bgr = true;
      } else if (layout != "rgb") {
        throw Napi::TypeError::New(env, "decode({ output.layout }): must be 'rgb' or 'bgr'");
      }
    }
    if (out.Has("stride") && !out.Get("stride").IsUndefined()) {
      result.stride = out.Get("stride").ToNumber().Int32Value();
    }
    if (out.Has("into") && !out.Get("into").IsUndefined()) {
      Napi::Value iv = out.Get("into");
      if (!iv.IsBuffer()) {
        throw Napi::TypeError::New(env, "decode({ output.into }): into must be a Buffer");
      }
      intoRefOut = Napi::Persistent(iv.As<Napi::Buffer<uint8_t>>());
    }
  }

  return result;
}

class DecodeWorker : public Napi::AsyncWorker {
 public:
  DecodeWorker(Napi::Env env, Napi::Buffer<uint8_t> input, DecodeOutputOptions opts,
               Napi::Reference<Napi::Buffer<uint8_t>>&& intoRef, Napi::Promise::Deferred deferred,
               std::shared_ptr<JobCancelState> cancelState, std::shared_ptr<LibRaw> raw,
               std::shared_ptr<ParamStrings> paramStrings)
      : Napi::AsyncWorker(env),
        bufRef_(Napi::Persistent(input)),
        data_(input.Data()),
        length_(input.Length()),
        opts_(opts),
        intoRef_(std::move(intoRef)),
        deferred_(deferred),
        cancelState_(std::move(cancelState)),
        raw_(std::move(raw)),
        paramStrings_(std::move(paramStrings)) {}

 protected:
  // Threadpool thread: open -> unpack -> process (params/rawparams were
  // already applied onto raw_->imgdata on the JS thread, before this worker
  // was constructed -- see this file's header comment above
  // DecodeOutputOptions). No Napi::* calls here (see this file's top-of-file
  // header comment on the three-phase worker shape).
  void Execute() override {
    // T09: cancelled between Queue() (JS thread) and this method actually
    // starting -- bail without touching raw_ any further than the progress
    // handler installed below (see src/cancel.h's class comment for why
    // open_buffer/unpack/dcraw_process each need that handler regardless).
    if (cancelState_->flag->load()) {
      rc_ = LIBRAW_CANCELLED_BY_CALLBACK;
      return;
    }
    raw_->set_progress_handler(&CancelAwareProgressCallback, cancelState_.get());
    raw_->set_dataerror_handler(&RecordDataErrorEvent, cancelState_.get());
    rc_ = raw_->open_buffer(data_, length_);
    if (rc_ != LIBRAW_SUCCESS) return;

    rc_ = raw_->unpack();
    if (rc_ != LIBRAW_SUCCESS) return;
    rc_ = raw_->dcraw_process();
    if (rc_ != LIBRAW_SUCCESS) return;

    raw_->get_mem_image_format(&width_, &height_, &colors_, &bps_);
    flip_ = raw_->imgdata.sizes.flip;
    warnings_ = raw_->imgdata.process_warnings;
  }

  // JS thread: allocate/validate the output Buffer (sizes are only known
  // now, after Execute() ran get_mem_image_format -- unlike Processor::Image,
  // which already knows sizes before queueing its worker), copy the image
  // into it, then recycle.
  void OnOK() override {
    Napi::Env env = Env();
    // T09: once this settles, `cancel()` (src/cancel.cc's
    // MakeLibRawCancelFunction) becomes a no-op even if the caller's signal
    // fires late or lib/fused.cjs somehow failed to remove its listener.
    cancelState_->active->store(false);
    if (rc_ != LIBRAW_SUCCESS) {
      if (raw_) raw_->recycle();
      Napi::Object err = MakeStageError(env, rc_, "decode").Value();
      AttachEvents(env, err, cancelState_);
      deferred_.Reject(err);
      return;
    }
    try {
      size_t defaultStride =
          static_cast<size_t>(width_) * static_cast<size_t>(colors_) * static_cast<size_t>(bps_ / 8);
      size_t stride = opts_.stride > 0 ? static_cast<size_t>(opts_.stride) : defaultStride;
      size_t need = stride * static_cast<size_t>(height_);

      Napi::Buffer<uint8_t> out;
      if (!intoRef_.IsEmpty()) {
        out = intoRef_.Value();
        if (out.Length() < need) {
          throw Napi::RangeError::New(env, "decode({ output.into }): into buffer (" +
                                               std::to_string(out.Length()) +
                                               " bytes) is smaller than the required " + std::to_string(need) +
                                               " bytes");
        }
      } else {
        out = Napi::Buffer<uint8_t>::New(env, need);
      }

      // Known cost (T17/T25 may revisit): copy_mem_image is a memcpy-class
      // operation over the whole decoded image -- about 50 ms for a 48 MB
      // full-resolution 16-bit image -- and it has to run here, on the JS
      // thread, because `out` is a V8-managed Buffer that Execute() (the
      // threadpool thread) is not allowed to touch.
      int rc2 = raw_->copy_mem_image(out.Data(), static_cast<int>(stride), opts_.bgr ? 1 : 0);
      if (rc2 != LIBRAW_SUCCESS) {
        throw MakeProcessorError(env, rc2, "decode");
      }

      Napi::Object result = Napi::Object::New(env);
      result.Set("width", width_);
      result.Set("height", height_);
      result.Set("colors", colors_);
      result.Set("bits", bps_);
      result.Set("stride", static_cast<double>(stride));
      result.Set("data", out);
      result.Set("flip", flip_);
      result.Set("warnings", WarningsToArray(env, warnings_));
      AttachEvents(env, result, cancelState_);

      raw_->recycle();
      deferred_.Resolve(result);
    } catch (const Napi::Error& e) {
      if (raw_) raw_->recycle();
      deferred_.Reject(e.Value());
    }
  }

  void OnError(const Napi::Error&) override {
    cancelState_->active->store(false);
    if (raw_) raw_->recycle();
    Napi::Object err = MakeProcessorError(Env(), LIBRAW_UNSUFFICIENT_MEMORY, "decode").Value();
    AttachEvents(Env(), err, cancelState_);
    deferred_.Reject(err);
  }

 private:
  Napi::Reference<Napi::Buffer<uint8_t>> bufRef_;
  uint8_t* data_;
  size_t length_;
  DecodeOutputOptions opts_;
  Napi::Reference<Napi::Buffer<uint8_t>> intoRef_;
  Napi::Promise::Deferred deferred_;
  std::shared_ptr<JobCancelState> cancelState_;

  // T09: constructed on the JS thread (Decode(), before Queue()) rather
  // than here in Execute(), specifically so MakeLibRawCancelFunction's
  // closure can hold its own shared_ptr copy -- see src/cancel.h's
  // MakeLibRawCancelFunction comment for why that matters.
  std::shared_ptr<LibRaw> raw_;
  // T12: keeps ApplyParams' char*-pointer-field backing storage
  // (output_profile/camera_profile/bad_pixels/dark_frame) alive through
  // Execute()'s dcraw_process() call -- see src/params.h's ParamStrings
  // comment. Applied to before this worker was constructed (Decode(),
  // below); never read here directly, only kept alive.
  std::shared_ptr<ParamStrings> paramStrings_;
  int rc_ = LIBRAW_SUCCESS;
  int width_ = 0, height_ = 0, colors_ = 0, bps_ = 0, flip_ = 0;
  unsigned int warnings_ = 0;
};

// --- identify() ----------------------------------------------------------

class IdentifyWorker : public Napi::AsyncWorker {
 public:
  IdentifyWorker(Napi::Env env, Napi::Buffer<uint8_t> input, Napi::Promise::Deferred deferred,
                  std::shared_ptr<JobCancelState> cancelState, std::shared_ptr<LibRaw> raw)
      : Napi::AsyncWorker(env),
        bufRef_(Napi::Persistent(input)),
        data_(input.Data()),
        length_(input.Length()),
        deferred_(deferred),
        cancelState_(std::move(cancelState)),
        raw_(std::move(raw)) {}

 protected:
  // open_buffer + adjust_sizes_info_only -- no unpack, no decode. See
  // src/cancel.h's class comment: neither call polls LibRaw's progress
  // callback more than once or twice each, so cancellation here is mostly
  // the pre-abort fast path in practice (Identify(), below) -- wired anyway
  // for consistency ("every async method and helper", docs/plan/tasks.md
  // T09) and because adjust_sizes_info_only can still be slow for some
  // decoders (get_decoder_info-class introspection).
  void Execute() override {
    if (cancelState_->flag->load()) {
      rc_ = LIBRAW_CANCELLED_BY_CALLBACK;
      return;
    }
    raw_->set_progress_handler(&CancelAwareProgressCallback, cancelState_.get());
    raw_->set_dataerror_handler(&RecordDataErrorEvent, cancelState_.get());
    // T12: the caller's own rawparams (applied via ApplyRawParams in
    // Identify(), below, before this worker was constructed -- defaults to
    // all-zero/default-initialized if no rawparams option was given) OR'd
    // with CHECK_THUMBNAILS_KNOWN_VENDORS, which fixes 0-sized/unknown
    // thumbs_list entries for known vendors (see docs/reference/
    // libraw-raw-params-thumbnails-flags.md's "Thumbnails" section). Plain
    // bitwise-OR on an already-applied struct member, safe to do here on the
    // threadpool thread (no Napi::* calls).
    raw_->imgdata.rawparams.options |= LIBRAW_RAWOPTIONS_CHECK_THUMBNAILS_KNOWN_VENDORS;
    rc_ = raw_->open_buffer(data_, length_);
    if (rc_ != LIBRAW_SUCCESS) return;
    rc_ = raw_->adjust_sizes_info_only();
  }

  void OnOK() override {
    Napi::Env env = Env();
    cancelState_->active->store(false);
    if (rc_ != LIBRAW_SUCCESS) {
      if (raw_) raw_->recycle();
      Napi::Object err = MakeStageError(env, rc_, "identify").Value();
      AttachEvents(env, err, cancelState_);
      deferred_.Reject(err);
      return;
    }

    auto& d = raw_->imgdata;

    Napi::Object sizes = Napi::Object::New(env);
    sizes.Set("raw_width", d.sizes.raw_width);
    sizes.Set("raw_height", d.sizes.raw_height);
    sizes.Set("width", d.sizes.width);
    sizes.Set("height", d.sizes.height);
    sizes.Set("top_margin", d.sizes.top_margin);
    sizes.Set("left_margin", d.sizes.left_margin);
    sizes.Set("iwidth", d.sizes.iwidth);
    sizes.Set("iheight", d.sizes.iheight);
    sizes.Set("flip", d.sizes.flip);
    sizes.Set("pixel_aspect", d.sizes.pixel_aspect);

    Napi::Object idata = Napi::Object::New(env);
    idata.Set("make", d.idata.make);
    idata.Set("model", d.idata.model);
    idata.Set("normalized_make", d.idata.normalized_make);
    idata.Set("normalized_model", d.idata.normalized_model);
    idata.Set("maker_index", d.idata.maker_index);
    idata.Set("software", d.idata.software);
    idata.Set("raw_count", d.idata.raw_count);
    idata.Set("dng_version", d.idata.dng_version);
    idata.Set("is_foveon", d.idata.is_foveon);
    idata.Set("colors", d.idata.colors);
    idata.Set("filters", static_cast<double>(d.idata.filters));
    idata.Set("cdesc", d.idata.cdesc);

    Napi::Array thumbs = Napi::Array::New(env, static_cast<size_t>(d.thumbs_list.thumbcount));
    for (int i = 0; i < d.thumbs_list.thumbcount; i++) {
      const auto& t = d.thumbs_list.thumblist[i];
      Napi::Object o = Napi::Object::New(env);
      o.Set("tformat", InternalThumbnailFormatName(static_cast<int>(t.tformat)));
      o.Set("twidth", t.twidth);
      o.Set("theight", t.theight);
      o.Set("tflip", t.tflip);
      o.Set("tlength", t.tlength);
      o.Set("tmisc", t.tmisc);
      thumbs[static_cast<uint32_t>(i)] = o;
    }

    libraw_decoder_info_t decoderInfo{};
    raw_->get_decoder_info(&decoderInfo);
    Napi::Object decoder = Napi::Object::New(env);
    decoder.Set("name", decoderInfo.decoder_name ? Napi::Value::From(env, decoderInfo.decoder_name) : env.Null());
    decoder.Set("flags", decoderInfo.decoder_flags);

    Napi::Object result = Napi::Object::New(env);
    result.Set("sizes", sizes);
    result.Set("idata", idata);
    result.Set("thumbs", thumbs);
    result.Set("decoder", decoder);
    result.Set("warnings", WarningsToArray(env, d.process_warnings));
    result.Set("metadata", Napi::Object::New(env));  // T14 fills this in fully
    AttachEvents(env, result, cancelState_);

    raw_->recycle();
    deferred_.Resolve(result);
  }

  void OnError(const Napi::Error&) override {
    cancelState_->active->store(false);
    if (raw_) raw_->recycle();
    Napi::Object err = MakeProcessorError(Env(), LIBRAW_UNSUFFICIENT_MEMORY, "identify").Value();
    AttachEvents(Env(), err, cancelState_);
    deferred_.Reject(err);
  }

 private:
  Napi::Reference<Napi::Buffer<uint8_t>> bufRef_;
  uint8_t* data_;
  size_t length_;
  Napi::Promise::Deferred deferred_;
  std::shared_ptr<JobCancelState> cancelState_;
  std::shared_ptr<LibRaw> raw_;
  int rc_ = LIBRAW_SUCCESS;
};

// --- thumbnail() ---------------------------------------------------------

struct ThumbnailOptions {
  bool has_index = false;
  int index = 0;
};

ThumbnailOptions ParseThumbnailOptions(Napi::Env env, Napi::Object opts) {
  (void)env;
  ThumbnailOptions result;
  if (opts.Has("index") && !opts.Get("index").IsUndefined()) {
    result.has_index = true;
    result.index = opts.Get("index").ToNumber().Int32Value();
  }
  return result;
}

class ThumbnailWorker : public Napi::AsyncWorker {
 public:
  ThumbnailWorker(Napi::Env env, Napi::Buffer<uint8_t> input, ThumbnailOptions opts,
                   Napi::Promise::Deferred deferred, std::shared_ptr<JobCancelState> cancelState,
                   std::shared_ptr<LibRaw> raw)
      : Napi::AsyncWorker(env),
        bufRef_(Napi::Persistent(input)),
        data_(input.Data()),
        length_(input.Length()),
        opts_(opts),
        deferred_(deferred),
        cancelState_(std::move(cancelState)),
        raw_(std::move(raw)) {}

 protected:
  void Execute() override {
    if (cancelState_->flag->load()) {
      rc_ = LIBRAW_CANCELLED_BY_CALLBACK;
      return;
    }
    raw_->set_progress_handler(&CancelAwareProgressCallback, cancelState_.get());
    raw_->set_dataerror_handler(&RecordDataErrorEvent, cancelState_.get());
    // Same "fix 0-sized/unknown entries" rationale as identify() (see
    // IdentifyWorker::Execute) -- must be set before open_buffer.
    raw_->imgdata.rawparams.options |= LIBRAW_RAWOPTIONS_CHECK_THUMBNAILS_KNOWN_VENDORS;
    rc_ = raw_->open_buffer(data_, length_);
    if (rc_ != LIBRAW_SUCCESS) return;
    rc_ = opts_.has_index ? raw_->unpack_thumb_ex(opts_.index) : raw_->unpack_thumb();
    if (rc_ != LIBRAW_SUCCESS) return;

    // libraw_processed_image_t's own width/height (used below) are only
    // filled in for the LIBRAW_IMAGE_BITMAP branch of dcraw_make_mem_thumb
    // (vendor/LibRaw/src/postprocessing/mem_image.cpp) -- for JPEG/H265/
    // JPEGXL thumbs (the common case) they are left 0, because LibRaw does
    // not decode those formats just to report their size. imgdata.thumbnail.
    // {twidth,theight} are set from the parsed thumbs_list entry as part of
    // unpack_thumb_ex/unpack_thumb (vendor/LibRaw/src/decoders/
    // unpack_thumb.cpp) regardless of format, so use those instead.
    width_ = raw_->imgdata.thumbnail.twidth;
    height_ = raw_->imgdata.thumbnail.theight;

    // libraw_processed_image_t (below) carries no orientation field of its
    // own -- see src/image_format.h's ThumbnailResultFormatName comment for
    // the analogous format-enum note. imgdata.sizes.flip is the file's own
    // orientation (set during open_buffer/parse, still valid here since we
    // never called adjust_sizes_info_only or unpack()), which is the best
    // available answer for "how should this embedded thumbnail be rotated"
    // absent a per-thumbnail flip from LibRaw itself.
    flip_ = raw_->imgdata.sizes.flip;

    int errcode = LIBRAW_SUCCESS;
    img_ = raw_->dcraw_make_mem_thumb(&errcode);
    if (img_ == nullptr) {
      rc_ = errcode != LIBRAW_SUCCESS ? errcode : LIBRAW_UNSPECIFIED_ERROR;
    }
  }

  void OnOK() override {
    Napi::Env env = Env();
    cancelState_->active->store(false);
    if (rc_ != LIBRAW_SUCCESS) {
      if (raw_) raw_->recycle();
      Napi::Object err = MakeStageError(env, rc_, "thumbnail").Value();
      AttachEvents(env, err, cancelState_);
      deferred_.Reject(err);
      return;
    }

    Napi::Buffer<uint8_t> out = Napi::Buffer<uint8_t>::New(env, img_->data_size);
    std::memcpy(out.Data(), img_->data, img_->data_size);

    Napi::Object result = Napi::Object::New(env);
    result.Set("format", ThumbnailResultFormatName(img_->type, img_->bits));
    result.Set("width", width_);
    result.Set("height", height_);
    result.Set("flip", flip_);
    result.Set("colors", img_->colors);
    result.Set("bits", img_->bits);
    result.Set("data", out);
    AttachEvents(env, result, cancelState_);

    LibRaw::dcraw_clear_mem(img_);
    img_ = nullptr;
    raw_->recycle();
    deferred_.Resolve(result);
  }

  void OnError(const Napi::Error&) override {
    cancelState_->active->store(false);
    if (img_) {
      LibRaw::dcraw_clear_mem(img_);
      img_ = nullptr;
    }
    if (raw_) raw_->recycle();
    Napi::Object err = MakeProcessorError(Env(), LIBRAW_UNSUFFICIENT_MEMORY, "thumbnail").Value();
    AttachEvents(Env(), err, cancelState_);
    deferred_.Reject(err);
  }

 private:
  Napi::Reference<Napi::Buffer<uint8_t>> bufRef_;
  uint8_t* data_;
  size_t length_;
  ThumbnailOptions opts_;
  Napi::Promise::Deferred deferred_;
  std::shared_ptr<JobCancelState> cancelState_;

  std::shared_ptr<LibRaw> raw_;
  int rc_ = LIBRAW_SUCCESS;
  int flip_ = 0;
  int width_ = 0, height_ = 0;
  libraw_processed_image_t* img_ = nullptr;
};

}  // namespace

// T09: every fused helper below now returns `{ promise, cancel }`
// (src/cancel.h's WrapPromiseWithCancel) instead of a bare Promise --
// lib/fused.cjs unwraps it, wires `cancel` to the caller's `signal`
// internally, and returns a plain Promise from decode()/identify()/
// thumbnail() as before. `raw` is constructed here, on the JS thread,
// specifically so the `cancel` closure (MakeLibRawCancelFunction) can hold
// its own shared_ptr to it before Execute() -- which runs later, on a
// threadpool thread -- ever gets a chance to touch it.

Napi::Value Decode(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);
  try {
    Napi::Buffer<uint8_t> input = RequireBufferArg(env, info, "decode");
    Napi::Object opts = OptionsObjectOrEmpty(env, info, "decode");

    if (RejectIfAborted(env, opts, "decode", deferred)) {
      return WrapPromiseWithCancel(env, deferred.Promise(), NoopCancel(env));
    }

    // T12: raw + strings are constructed here, on the JS thread, so
    // params/rawparams can be validated and applied synchronously (throwing
    // a Napi::TypeError/RangeError right here, before any worker exists, on
    // an invalid options object) -- see this file's header comment above
    // DecodeOutputOptions. rawparams first: it affects open_buffer()/
    // unpack(), which run before dcraw_process() reads params.
    auto raw = std::make_shared<LibRaw>();
    auto paramStrings = std::make_shared<ParamStrings>();

    if (opts.Has("rawparams") && !opts.Get("rawparams").IsUndefined()) {
      Napi::Value rv = opts.Get("rawparams");
      if (!rv.IsObject()) {
        throw Napi::TypeError::New(env, "decode({ rawparams }): rawparams must be an object");
      }
      ApplyRawParams(env, rv.As<Napi::Object>(), raw->imgdata.rawparams);
    }
    if (opts.Has("params") && !opts.Get("params").IsUndefined()) {
      Napi::Value pv = opts.Get("params");
      if (!pv.IsObject()) {
        throw Napi::TypeError::New(env, "decode({ params }): params must be an object");
      }
      ApplyParams(env, pv.As<Napi::Object>(), raw->imgdata.params, *paramStrings);
    }

    Napi::Reference<Napi::Buffer<uint8_t>> intoRef;  // stays empty unless output.into is given
    DecodeOutputOptions parsed = ParseDecodeOutputOptions(env, opts, intoRef);
    auto cancelState = std::make_shared<JobCancelState>();
    (new DecodeWorker(env, input, parsed, std::move(intoRef), deferred, cancelState, raw, paramStrings))->Queue();
    return WrapPromiseWithCancel(env, deferred.Promise(), MakeLibRawCancelFunction(env, cancelState, raw));
  } catch (const Napi::Error& e) {
    deferred.Reject(e.Value());
    return WrapPromiseWithCancel(env, deferred.Promise(), NoopCancel(env));
  }
}

Napi::Value Identify(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);
  try {
    Napi::Buffer<uint8_t> input = RequireBufferArg(env, info, "identify");
    Napi::Object opts = OptionsObjectOrEmpty(env, info, "identify");

    if (RejectIfAborted(env, opts, "identify", deferred)) {
      return WrapPromiseWithCancel(env, deferred.Promise(), NoopCancel(env));
    }

    // T12: rawparams applied on the JS thread, same rationale as Decode()
    // above (no "params" for identify() -- it never calls dcraw_process()).
    auto raw = std::make_shared<LibRaw>();
    if (opts.Has("rawparams") && !opts.Get("rawparams").IsUndefined()) {
      Napi::Value rv = opts.Get("rawparams");
      if (!rv.IsObject()) {
        throw Napi::TypeError::New(env, "identify({ rawparams }): rawparams must be an object");
      }
      ApplyRawParams(env, rv.As<Napi::Object>(), raw->imgdata.rawparams);
    }
    auto cancelState = std::make_shared<JobCancelState>();
    (new IdentifyWorker(env, input, deferred, cancelState, raw))->Queue();
    return WrapPromiseWithCancel(env, deferred.Promise(), MakeLibRawCancelFunction(env, cancelState, raw));
  } catch (const Napi::Error& e) {
    deferred.Reject(e.Value());
    return WrapPromiseWithCancel(env, deferred.Promise(), NoopCancel(env));
  }
}

Napi::Value Thumbnail(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);
  try {
    Napi::Buffer<uint8_t> input = RequireBufferArg(env, info, "thumbnail");
    Napi::Object opts = OptionsObjectOrEmpty(env, info, "thumbnail");

    if (RejectIfAborted(env, opts, "thumbnail", deferred)) {
      return WrapPromiseWithCancel(env, deferred.Promise(), NoopCancel(env));
    }

    ThumbnailOptions parsed = ParseThumbnailOptions(env, opts);
    auto cancelState = std::make_shared<JobCancelState>();
    auto raw = std::make_shared<LibRaw>();
    (new ThumbnailWorker(env, input, parsed, deferred, cancelState, raw))->Queue();
    return WrapPromiseWithCancel(env, deferred.Promise(), MakeLibRawCancelFunction(env, cancelState, raw));
  } catch (const Napi::Error& e) {
    deferred.Reject(e.Value());
    return WrapPromiseWithCancel(env, deferred.Promise(), NoopCancel(env));
  }
}

}  // namespace libraw_node
