#include "processor.h"

#include "errors.h"

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
      });
}

Processor::Processor(const Napi::CallbackInfo& info)
    : ObjectWrap<Processor>(info), raw_(std::make_unique<LibRaw>(ParseFlags(info))) {}

void Processor::RequireNotClosed(Napi::Env env, const char* stage) {
  if (closed_) {
    ThrowProcessorError(env, LIBRAW_OUT_OF_ORDER_CALL, stage);
  }
}

void Processor::RequireOpened(Napi::Env env, const char* stage) {
  RequireNotClosed(env, stage);
  if (!opened_) {
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

namespace {
const char* ImageFormatName(int type) {
  switch (type) {
    case LIBRAW_IMAGE_JPEG:
      return "jpeg";
    case LIBRAW_IMAGE_BITMAP:
      return "bitmap";
    case LIBRAW_IMAGE_JPEGXL:
      return "jpegxl";
    case LIBRAW_IMAGE_H265:
      return "h265";
    default:
      return "unknown";
  }
}
}  // namespace

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

}  // namespace libraw_node
