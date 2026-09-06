// T02 proved the Docker build pipeline, the Node-API-only (no node.h/v8.h/
// uv.h) include boundary, and the context-aware Napi::Addon<T> registration
// pattern (safe to load from multiple worker_threads / Electron contexts at
// once -- no static state).
//
// T03 adds the vendored, statically-linked LibRaw (+zlib +libjpeg-turbo
// +OpenMP) and exposes its module-level static surface: version(),
// versionNumber(), capabilities(), cameraCount(), cameraList(), and
// buildInfo (from the configure-time generated build_info.h). None of these
// need a LibRaw *instance* -- Processor (Napi::ObjectWrap around
// std::unique_ptr<LibRaw>) is T06 scope.
#include <napi.h>

// Must match the defines raw_r (LibRaw's static library target) was compiled
// with -- see CMakeLists.txt's comment on why these are PUBLIC on raw_r
// (struct layouts in libraw_types.h depend on USE_ZLIB/USE_JPEG/USE_JPEG8).
#include <libraw/libraw.h>

#include <memory>
#include <string>

#include "build_info.h"

namespace {

// Maps a LibRaw error code (enum LibRaw_errors, libraw_const.h) to its C
// enumerator name, for the thrown Error's `code` property. T06 replaces this
// with a table generated from libraw_const.h (scripts/gen-errors.js); T04
// only needs decodeSync's own three call sites covered, so the short list
// here is hand-written and only needs to include LibRaw_errors.
const char* LibRawErrorName(int code) {
  switch (code) {
    case LIBRAW_SUCCESS:
      return "LIBRAW_SUCCESS";
    case LIBRAW_UNSPECIFIED_ERROR:
      return "LIBRAW_UNSPECIFIED_ERROR";
    case LIBRAW_FILE_UNSUPPORTED:
      return "LIBRAW_FILE_UNSUPPORTED";
    case LIBRAW_REQUEST_FOR_NONEXISTENT_IMAGE:
      return "LIBRAW_REQUEST_FOR_NONEXISTENT_IMAGE";
    case LIBRAW_OUT_OF_ORDER_CALL:
      return "LIBRAW_OUT_OF_ORDER_CALL";
    case LIBRAW_NO_THUMBNAIL:
      return "LIBRAW_NO_THUMBNAIL";
    case LIBRAW_UNSUPPORTED_THUMBNAIL:
      return "LIBRAW_UNSUPPORTED_THUMBNAIL";
    case LIBRAW_INPUT_CLOSED:
      return "LIBRAW_INPUT_CLOSED";
    case LIBRAW_NOT_IMPLEMENTED:
      return "LIBRAW_NOT_IMPLEMENTED";
    case LIBRAW_REQUEST_FOR_NONEXISTENT_THUMBNAIL:
      return "LIBRAW_REQUEST_FOR_NONEXISTENT_THUMBNAIL";
    case LIBRAW_UNSUFFICIENT_MEMORY:
      return "LIBRAW_UNSUFFICIENT_MEMORY";
    case LIBRAW_DATA_ERROR:
      return "LIBRAW_DATA_ERROR";
    case LIBRAW_IO_ERROR:
      return "LIBRAW_IO_ERROR";
    case LIBRAW_CANCELLED_BY_CALLBACK:
      return "LIBRAW_CANCELLED_BY_CALLBACK";
    case LIBRAW_BAD_CROP:
      return "LIBRAW_BAD_CROP";
    case LIBRAW_TOO_BIG:
      return "LIBRAW_TOO_BIG";
    case LIBRAW_MEMPOOL_OVERFLOW:
      return "LIBRAW_MEMPOOL_OVERFLOW";
    default:
      return "LIBRAW_UNSPECIFIED_ERROR";
  }
}

// Throws a JS Error whose `message` is libraw_strerror(rc)'s text (prefixed
// with the failing stage name) and whose `code` property is the LIBRAW_*
// enum name, matching T04's task text ("Map LibRaw error codes to a thrown
// Error with code = the LibRaw error name").
void ThrowLibRawError(Napi::Env env, int rc, const char* stage) {
  std::string message = std::string(stage) + ": " + LibRaw::strerror(rc);
  Napi::Error err = Napi::Error::New(env, message);
  err.Set("code", Napi::String::New(env, LibRawErrorName(rc)));
  throw err;
}

void CheckLibRaw(Napi::Env env, int rc, const char* stage) {
  if (rc != LIBRAW_SUCCESS) {
    ThrowLibRawError(env, rc, stage);
  }
}

Napi::Object MakeBuildInfo(Napi::Env env) {
  namespace bi = libraw_node::build_info;
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("libraw", bi::kLibRawVersion);
  obj.Set("zlib", bi::kZlibVersion);
  obj.Set("libjpegTurbo", bi::kLibjpegTurboVersion);
  obj.Set("openmp", bi::kOpenmp);
  obj.Set("compiler", std::string(bi::kCompilerId) + " " + bi::kCompilerVersion);
  obj.Set("flags", bi::kFlags);
  obj.Set("buildDate", bi::kBuildDate);
  obj.Set("gitCommit", bi::kGitCommit);
  return obj;
}

class LibRawAddon : public Napi::Addon<LibRawAddon> {
 public:
  LibRawAddon(Napi::Env env, Napi::Object exports) {
    DefineAddon(exports,
                {
                    InstanceMethod("hello", &LibRawAddon::Hello),
                    // NAPI_VERSION is the Node-API target this addon was
                    // compiled against (set by CMakeLists.txt), not the
                    // host runtime's maximum supported version.
                    InstanceValue("napiVersion",
                                  Napi::Number::New(env, NAPI_VERSION)),
                    InstanceMethod("version", &LibRawAddon::Version),
                    InstanceMethod("versionNumber", &LibRawAddon::VersionNumber),
                    InstanceMethod("capabilities", &LibRawAddon::Capabilities),
                    InstanceMethod("cameraCount", &LibRawAddon::CameraCount),
                    InstanceMethod("cameraList", &LibRawAddon::CameraList),
                    InstanceValue("buildInfo", MakeBuildInfo(env)),
                    InstanceMethod("decodeSync", &LibRawAddon::DecodeSync),
                });
  }

 private:
  Napi::Value Hello(const Napi::CallbackInfo& info) {
    return Napi::String::New(info.Env(), "ok");
  }

  // LibRaw::version()/versionNumber()/capabilities()/cameraList()/
  // cameraCount() are static: no LibRaw instance is constructed here.
  Napi::Value Version(const Napi::CallbackInfo& info) {
    return Napi::String::New(info.Env(), LibRaw::version());
  }

  Napi::Value VersionNumber(const Napi::CallbackInfo& info) {
    return Napi::Number::New(info.Env(), LibRaw::versionNumber());
  }

  Napi::Value Capabilities(const Napi::CallbackInfo& info) {
    return Napi::Number::New(info.Env(), LibRaw::capabilities());
  }

  Napi::Value CameraCount(const Napi::CallbackInfo& info) {
    return Napi::Number::New(info.Env(), LibRaw::cameraCount());
  }

  Napi::Value CameraList(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    const char** list = LibRaw::cameraList();
    int count = LibRaw::cameraCount();
    Napi::Array arr = Napi::Array::New(env, static_cast<size_t>(count));
    for (int i = 0; i < count; i++) {
      arr[static_cast<uint32_t>(i)] = Napi::String::New(env, list[i]);
    }
    return arr;
  }

  // decodeSync(buffer, { half_size?, user_qual?, use_camera_wb? }) ->
  // { width, height, colors, bits, data }. One LibRaw instance per call
  // (T06 introduces the long-lived Processor wrapper); pipeline is
  // open_buffer -> unpack -> dcraw_process -> get_mem_image_format ->
  // V8-allocated Buffer -> copy_mem_image -> recycle, per the tutorial and
  // T04's task text. The output buffer is always a fresh V8 allocation
  // (never LibRaw's own memory / an external buffer), which is what keeps
  // this Electron-safe under NODE_API_NO_EXTERNAL_BUFFERS_ALLOWED.
  Napi::Value DecodeSync(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsBuffer()) {
      throw Napi::TypeError::New(env, "decodeSync(buffer, options?): buffer must be a Buffer");
    }
    Napi::Buffer<uint8_t> input = info[0].As<Napi::Buffer<uint8_t>>();

    bool halfSize = false;
    int userQual = -1;      // -1 means "leave LibRaw's default"
    bool useCameraWb = true;  // matches the tutorial's default

    if (info.Length() > 1 && info[1].IsObject()) {
      Napi::Object opts = info[1].As<Napi::Object>();
      if (opts.Has("half_size") && !opts.Get("half_size").IsUndefined()) {
        halfSize = opts.Get("half_size").ToBoolean();
      }
      if (opts.Has("user_qual") && !opts.Get("user_qual").IsUndefined()) {
        userQual = opts.Get("user_qual").ToNumber().Int32Value();
      }
      if (opts.Has("use_camera_wb") && !opts.Get("use_camera_wb").IsUndefined()) {
        useCameraWb = opts.Get("use_camera_wb").ToBoolean();
      }
    }

    auto raw = std::make_unique<LibRaw>();
    raw->imgdata.params.half_size = halfSize ? 1 : 0;
    raw->imgdata.params.use_camera_wb = useCameraWb ? 1 : 0;
    if (userQual >= 0) {
      raw->imgdata.params.user_qual = userQual;
    }

    CheckLibRaw(env, raw->open_buffer(input.Data(), input.Length()), "open_buffer");
    CheckLibRaw(env, raw->unpack(), "unpack");
    CheckLibRaw(env, raw->dcraw_process(), "dcraw_process");

    int width = 0, height = 0, colors = 0, bps = 0;
    raw->get_mem_image_format(&width, &height, &colors, &bps);
    size_t stride = static_cast<size_t>(width) * static_cast<size_t>(colors) *
                     static_cast<size_t>(bps / 8);
    size_t size = stride * static_cast<size_t>(height);

    Napi::Buffer<uint8_t> out = Napi::Buffer<uint8_t>::New(env, size);
    int copyRc = raw->copy_mem_image(out.Data(), static_cast<int>(stride), 0);
    if (copyRc != LIBRAW_SUCCESS) {
      raw->recycle();
      ThrowLibRawError(env, copyRc, "copy_mem_image");
    }

    raw->recycle();

    Napi::Object result = Napi::Object::New(env);
    result.Set("width", width);
    result.Set("height", height);
    result.Set("colors", colors);
    result.Set("bits", bps);
    result.Set("data", out);
    return result;
  }
};

}  // namespace

NODE_API_ADDON(LibRawAddon)
