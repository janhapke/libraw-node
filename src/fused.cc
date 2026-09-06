#include "fused.h"

#include "errors.h"
#include "image_format.h"

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

// LIBRAW_WARN_* -> name, hand-written for now (docs/reference/
// libraw-raw-params-thumbnails-flags.md's "Warnings" table); T13 generates
// this from libraw_const.h the same way scripts/gen-errors.js generates the
// error table (src/errors.cc).
Napi::Array WarningsToArray(Napi::Env env, unsigned int warnings) {
  static const std::pair<unsigned int, const char*> kWarnings[] = {
      {LIBRAW_WARN_BAD_CAMERA_WB, "LIBRAW_WARN_BAD_CAMERA_WB"},
      {LIBRAW_WARN_NO_METADATA, "LIBRAW_WARN_NO_METADATA"},
      {LIBRAW_WARN_NO_JPEGLIB, "LIBRAW_WARN_NO_JPEGLIB"},
      {LIBRAW_WARN_NO_EMBEDDED_PROFILE, "LIBRAW_WARN_NO_EMBEDDED_PROFILE"},
      {LIBRAW_WARN_NO_INPUT_PROFILE, "LIBRAW_WARN_NO_INPUT_PROFILE"},
      {LIBRAW_WARN_BAD_OUTPUT_PROFILE, "LIBRAW_WARN_BAD_OUTPUT_PROFILE"},
      {LIBRAW_WARN_NO_BADPIXELMAP, "LIBRAW_WARN_NO_BADPIXELMAP"},
      {LIBRAW_WARN_BAD_DARKFRAME_FILE, "LIBRAW_WARN_BAD_DARKFRAME_FILE"},
      {LIBRAW_WARN_BAD_DARKFRAME_DIM, "LIBRAW_WARN_BAD_DARKFRAME_DIM"},
      {LIBRAW_WARN_RAWSPEED_PROBLEM, "LIBRAW_WARN_RAWSPEED_PROBLEM"},
      {LIBRAW_WARN_RAWSPEED_UNSUPPORTED, "LIBRAW_WARN_RAWSPEED_UNSUPPORTED"},
      {LIBRAW_WARN_RAWSPEED_PROCESSED, "LIBRAW_WARN_RAWSPEED_PROCESSED"},
      {LIBRAW_WARN_FALLBACK_TO_AHD, "LIBRAW_WARN_FALLBACK_TO_AHD"},
      {LIBRAW_WARN_PARSEFUJI_PROCESSED, "LIBRAW_WARN_PARSEFUJI_PROCESSED"},
      {LIBRAW_WARN_DNGSDK_PROCESSED, "LIBRAW_WARN_DNGSDK_PROCESSED"},
      {LIBRAW_WARN_DNG_IMAGES_REORDERED, "LIBRAW_WARN_DNG_IMAGES_REORDERED"},
      {LIBRAW_WARN_DNG_STAGE2_APPLIED, "LIBRAW_WARN_DNG_STAGE2_APPLIED"},
      {LIBRAW_WARN_DNG_STAGE3_APPLIED, "LIBRAW_WARN_DNG_STAGE3_APPLIED"},
      {LIBRAW_WARN_RAWSPEED3_PROBLEM, "LIBRAW_WARN_RAWSPEED3_PROBLEM"},
      {LIBRAW_WARN_RAWSPEED3_UNSUPPORTED, "LIBRAW_WARN_RAWSPEED3_UNSUPPORTED"},
      {LIBRAW_WARN_RAWSPEED3_PROCESSED, "LIBRAW_WARN_RAWSPEED3_PROCESSED"},
      {LIBRAW_WARN_RAWSPEED3_NOTLISTED, "LIBRAW_WARN_RAWSPEED3_NOTLISTED"},
      {LIBRAW_WARN_VENDOR_CROP_SUGGESTED, "LIBRAW_WARN_VENDOR_CROP_SUGGESTED"},
      {LIBRAW_WARN_DNG_NOT_PROCESSED, "LIBRAW_WARN_DNG_NOT_PROCESSED"},
      {LIBRAW_WARN_DNG_NOT_PARSED, "LIBRAW_WARN_DNG_NOT_PARSED"},
  };
  Napi::Array arr = Napi::Array::New(env);
  uint32_t idx = 0;
  for (const auto& entry : kWarnings) {
    if (warnings & entry.first) {
      arr.Set(idx++, Napi::String::New(env, entry.second));
    }
  }
  return arr;
}

void ValidateKeys(Napi::Env env, Napi::Object obj, const std::vector<std::string>& allowed,
                   const std::string& label) {
  Napi::Array keys = obj.GetPropertyNames();
  for (uint32_t i = 0; i < keys.Length(); i++) {
    std::string key = keys.Get(i).As<Napi::String>().Utf8Value();
    if (std::find(allowed.begin(), allowed.end(), key) == allowed.end()) {
      std::string list;
      for (size_t j = 0; j < allowed.size(); j++) {
        if (j > 0) list += ", ";
        list += allowed[j];
      }
      throw Napi::TypeError::New(env, label + ": unknown key '" + key + "'; supported keys are: " + list);
    }
  }
}

// Returns true if `opts.signal` is already aborted -- in that case
// `deferred` has already been rejected with the LIBRAW_CANCELLED_BY_CALLBACK
// shape (docs/plan/tasks.md T08) and the caller must return the promise
// immediately without touching LibRaw at all. Throws a TypeError if
// `signal` is present but does not look like an AbortSignal. Real
// cancellation (aborting mid-call) is wired in T09; this is only the
// already-aborted-before-we-start fast path.
bool RejectIfAborted(Napi::Env env, Napi::Object opts, const char* stage, Napi::Promise::Deferred deferred) {
  if (!opts.Has("signal")) return false;
  Napi::Value sig = opts.Get("signal");
  if (sig.IsUndefined() || sig.IsNull()) return false;
  if (!sig.IsObject()) {
    throw Napi::TypeError::New(env, std::string(stage) + "({ signal }): signal must be an AbortSignal");
  }
  Napi::Object sigObj = sig.As<Napi::Object>();
  if (!sigObj.Has("aborted")) {
    throw Napi::TypeError::New(env,
                                std::string(stage) + "({ signal }): signal must be an AbortSignal (missing .aborted)");
  }
  if (sigObj.Get("aborted").ToBoolean()) {
    deferred.Reject(MakeCancelledError(env, stage).Value());
    return true;
  }
  return false;
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

// Plain-old-data: the hand-written subset of libraw_output_params_t /
// libraw_raw_unpack_params_t this task applies (T12/T13 replace this with
// the generated table). No Napi::* members here on purpose -- this struct
// is read from Execute() (threadpool thread), and a Napi::Value read from
// the wrong thread (or after the call that produced it returned) is
// undefined behaviour.
struct DecodeOptions {
  bool has_half_size = false;
  bool half_size = false;
  bool has_user_qual = false;
  int user_qual = 0;
  bool has_use_camera_wb = false;
  bool use_camera_wb = false;
  bool has_output_bps = false;
  int output_bps = 0;
  bool has_shot_select = false;
  unsigned int shot_select = 0;
  bool bgr = false;  // output.layout === 'bgr'
  int stride = 0;    // output.stride override; 0 = default (width*colors*bps/8)
};

// Parses `opts` on the JS thread. `intoRefOut` receives a persistent
// reference to `output.into` immediately (if given) so no Napi::Value needs
// to be kept alive inside DecodeOptions itself.
DecodeOptions ParseDecodeOptions(Napi::Env env, Napi::Object opts,
                                  Napi::Reference<Napi::Buffer<uint8_t>>& intoRefOut) {
  DecodeOptions result;

  if (opts.Has("params") && !opts.Get("params").IsUndefined()) {
    Napi::Value pv = opts.Get("params");
    if (!pv.IsObject()) {
      throw Napi::TypeError::New(env, "decode({ params }): params must be an object");
    }
    Napi::Object p = pv.As<Napi::Object>();
    ValidateKeys(env, p, {"half_size", "user_qual", "use_camera_wb", "output_bps"}, "decode({ params })");
    if (p.Has("half_size") && !p.Get("half_size").IsUndefined()) {
      result.has_half_size = true;
      result.half_size = p.Get("half_size").ToBoolean();
    }
    if (p.Has("user_qual") && !p.Get("user_qual").IsUndefined()) {
      result.has_user_qual = true;
      result.user_qual = p.Get("user_qual").ToNumber().Int32Value();
    }
    if (p.Has("use_camera_wb") && !p.Get("use_camera_wb").IsUndefined()) {
      result.has_use_camera_wb = true;
      result.use_camera_wb = p.Get("use_camera_wb").ToBoolean();
    }
    if (p.Has("output_bps") && !p.Get("output_bps").IsUndefined()) {
      result.has_output_bps = true;
      result.output_bps = p.Get("output_bps").ToNumber().Int32Value();
    }
  }

  if (opts.Has("rawparams") && !opts.Get("rawparams").IsUndefined()) {
    Napi::Value rv = opts.Get("rawparams");
    if (!rv.IsObject()) {
      throw Napi::TypeError::New(env, "decode({ rawparams }): rawparams must be an object");
    }
    Napi::Object r = rv.As<Napi::Object>();
    ValidateKeys(env, r, {"shot_select"}, "decode({ rawparams })");
    if (r.Has("shot_select") && !r.Get("shot_select").IsUndefined()) {
      result.has_shot_select = true;
      result.shot_select = r.Get("shot_select").ToNumber().Uint32Value();
    }
  }

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
  DecodeWorker(Napi::Env env, Napi::Buffer<uint8_t> input, DecodeOptions opts,
               Napi::Reference<Napi::Buffer<uint8_t>>&& intoRef, Napi::Promise::Deferred deferred)
      : Napi::AsyncWorker(env),
        bufRef_(Napi::Persistent(input)),
        data_(input.Data()),
        length_(input.Length()),
        opts_(opts),
        intoRef_(std::move(intoRef)),
        deferred_(deferred) {}

 protected:
  // Threadpool thread: open -> apply params -> unpack -> process. No
  // Napi::* calls here (see this file's header comment).
  void Execute() override {
    raw_ = std::make_unique<LibRaw>();
    if (opts_.has_shot_select) {
      raw_->imgdata.rawparams.shot_select = opts_.shot_select;
    }
    rc_ = raw_->open_buffer(data_, length_);
    if (rc_ != LIBRAW_SUCCESS) return;

    if (opts_.has_half_size) raw_->imgdata.params.half_size = opts_.half_size ? 1 : 0;
    if (opts_.has_use_camera_wb) raw_->imgdata.params.use_camera_wb = opts_.use_camera_wb ? 1 : 0;
    if (opts_.has_user_qual) raw_->imgdata.params.user_qual = opts_.user_qual;
    if (opts_.has_output_bps) raw_->imgdata.params.output_bps = opts_.output_bps;

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
    if (rc_ != LIBRAW_SUCCESS) {
      if (raw_) raw_->recycle();
      deferred_.Reject(MakeProcessorError(env, rc_, "decode").Value());
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

      raw_->recycle();
      deferred_.Resolve(result);
    } catch (const Napi::Error& e) {
      if (raw_) raw_->recycle();
      deferred_.Reject(e.Value());
    }
  }

  void OnError(const Napi::Error&) override {
    if (raw_) raw_->recycle();
    deferred_.Reject(MakeProcessorError(Env(), LIBRAW_UNSUFFICIENT_MEMORY, "decode").Value());
  }

 private:
  Napi::Reference<Napi::Buffer<uint8_t>> bufRef_;
  uint8_t* data_;
  size_t length_;
  DecodeOptions opts_;
  Napi::Reference<Napi::Buffer<uint8_t>> intoRef_;
  Napi::Promise::Deferred deferred_;

  std::unique_ptr<LibRaw> raw_;
  int rc_ = LIBRAW_SUCCESS;
  int width_ = 0, height_ = 0, colors_ = 0, bps_ = 0, flip_ = 0;
  unsigned int warnings_ = 0;
};

// --- identify() ----------------------------------------------------------

struct IdentifyOptions {
  unsigned int options = 0;
  bool has_shot_select = false;
  unsigned int shot_select = 0;
};

IdentifyOptions ParseIdentifyOptions(Napi::Env env, Napi::Object opts) {
  IdentifyOptions result;
  if (opts.Has("rawparams") && !opts.Get("rawparams").IsUndefined()) {
    Napi::Value rv = opts.Get("rawparams");
    if (!rv.IsObject()) {
      throw Napi::TypeError::New(env, "identify({ rawparams }): rawparams must be an object");
    }
    Napi::Object r = rv.As<Napi::Object>();
    ValidateKeys(env, r, {"options", "shot_select"}, "identify({ rawparams })");
    if (r.Has("options") && !r.Get("options").IsUndefined()) {
      result.options = r.Get("options").ToNumber().Uint32Value();
    }
    if (r.Has("shot_select") && !r.Get("shot_select").IsUndefined()) {
      result.has_shot_select = true;
      result.shot_select = r.Get("shot_select").ToNumber().Uint32Value();
    }
  }
  return result;
}

class IdentifyWorker : public Napi::AsyncWorker {
 public:
  IdentifyWorker(Napi::Env env, Napi::Buffer<uint8_t> input, IdentifyOptions opts, Napi::Promise::Deferred deferred)
      : Napi::AsyncWorker(env),
        bufRef_(Napi::Persistent(input)),
        data_(input.Data()),
        length_(input.Length()),
        opts_(opts),
        deferred_(deferred) {}

 protected:
  // open_buffer + adjust_sizes_info_only -- no unpack, no decode.
  void Execute() override {
    raw_ = std::make_unique<LibRaw>();
    // "OR it into the existing default" (docs/plan/tasks.md T08): the
    // caller's own rawparams.options (0 if not given) plus
    // CHECK_THUMBNAILS_KNOWN_VENDORS, which fixes 0-sized/unknown thumbs_list
    // entries for known vendors (see docs/reference/
    // libraw-raw-params-thumbnails-flags.md's "Thumbnails" section).
    raw_->imgdata.rawparams.options = opts_.options | LIBRAW_RAWOPTIONS_CHECK_THUMBNAILS_KNOWN_VENDORS;
    if (opts_.has_shot_select) {
      raw_->imgdata.rawparams.shot_select = opts_.shot_select;
    }
    rc_ = raw_->open_buffer(data_, length_);
    if (rc_ != LIBRAW_SUCCESS) return;
    rc_ = raw_->adjust_sizes_info_only();
  }

  void OnOK() override {
    Napi::Env env = Env();
    if (rc_ != LIBRAW_SUCCESS) {
      if (raw_) raw_->recycle();
      deferred_.Reject(MakeProcessorError(env, rc_, "identify").Value());
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

    raw_->recycle();
    deferred_.Resolve(result);
  }

  void OnError(const Napi::Error&) override {
    if (raw_) raw_->recycle();
    deferred_.Reject(MakeProcessorError(Env(), LIBRAW_UNSUFFICIENT_MEMORY, "identify").Value());
  }

 private:
  Napi::Reference<Napi::Buffer<uint8_t>> bufRef_;
  uint8_t* data_;
  size_t length_;
  IdentifyOptions opts_;
  Napi::Promise::Deferred deferred_;

  std::unique_ptr<LibRaw> raw_;
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
                   Napi::Promise::Deferred deferred)
      : Napi::AsyncWorker(env),
        bufRef_(Napi::Persistent(input)),
        data_(input.Data()),
        length_(input.Length()),
        opts_(opts),
        deferred_(deferred) {}

 protected:
  void Execute() override {
    raw_ = std::make_unique<LibRaw>();
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
    if (rc_ != LIBRAW_SUCCESS) {
      if (raw_) raw_->recycle();
      deferred_.Reject(MakeProcessorError(env, rc_, "thumbnail").Value());
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

    LibRaw::dcraw_clear_mem(img_);
    img_ = nullptr;
    raw_->recycle();
    deferred_.Resolve(result);
  }

  void OnError(const Napi::Error&) override {
    if (img_) {
      LibRaw::dcraw_clear_mem(img_);
      img_ = nullptr;
    }
    if (raw_) raw_->recycle();
    deferred_.Reject(MakeProcessorError(Env(), LIBRAW_UNSUFFICIENT_MEMORY, "thumbnail").Value());
  }

 private:
  Napi::Reference<Napi::Buffer<uint8_t>> bufRef_;
  uint8_t* data_;
  size_t length_;
  ThumbnailOptions opts_;
  Napi::Promise::Deferred deferred_;

  std::unique_ptr<LibRaw> raw_;
  int rc_ = LIBRAW_SUCCESS;
  int flip_ = 0;
  int width_ = 0, height_ = 0;
  libraw_processed_image_t* img_ = nullptr;
};

}  // namespace

Napi::Value Decode(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);
  try {
    Napi::Buffer<uint8_t> input = RequireBufferArg(env, info, "decode");
    Napi::Object opts = OptionsObjectOrEmpty(env, info, "decode");

    if (RejectIfAborted(env, opts, "decode", deferred)) {
      return deferred.Promise();
    }

    Napi::Reference<Napi::Buffer<uint8_t>> intoRef;  // stays empty unless output.into is given
    DecodeOptions parsed = ParseDecodeOptions(env, opts, intoRef);
    (new DecodeWorker(env, input, parsed, std::move(intoRef), deferred))->Queue();
  } catch (const Napi::Error& e) {
    deferred.Reject(e.Value());
  }
  return deferred.Promise();
}

Napi::Value Identify(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);
  try {
    Napi::Buffer<uint8_t> input = RequireBufferArg(env, info, "identify");
    Napi::Object opts = OptionsObjectOrEmpty(env, info, "identify");
    IdentifyOptions parsed = ParseIdentifyOptions(env, opts);
    (new IdentifyWorker(env, input, parsed, deferred))->Queue();
  } catch (const Napi::Error& e) {
    deferred.Reject(e.Value());
  }
  return deferred.Promise();
}

Napi::Value Thumbnail(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);
  try {
    Napi::Buffer<uint8_t> input = RequireBufferArg(env, info, "thumbnail");
    Napi::Object opts = OptionsObjectOrEmpty(env, info, "thumbnail");

    if (RejectIfAborted(env, opts, "thumbnail", deferred)) {
      return deferred.Promise();
    }

    ThumbnailOptions parsed = ParseThumbnailOptions(env, opts);
    (new ThumbnailWorker(env, input, parsed, deferred))->Queue();
  } catch (const Napi::Error& e) {
    deferred.Reject(e.Value());
  }
  return deferred.Promise();
}

}  // namespace libraw_node
