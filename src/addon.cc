// T02 proved the Docker build pipeline, the Node-API-only (no node.h/v8.h/
// uv.h) include boundary, and the context-aware Napi::Addon<T> registration
// pattern (safe to load from multiple worker_threads / Electron contexts at
// once -- no static state).
//
// T03 adds the vendored, statically-linked LibRaw (+zlib +libjpeg-turbo
// +OpenMP) and exposes its module-level static surface: version(),
// versionNumber(), capabilities(), cameraCount(), cameraList(), and
// buildInfo (from the configure-time generated build_info.h). None of these
// need a LibRaw *instance*.
//
// T06 adds Processor (Napi::ObjectWrap around std::unique_ptr<LibRaw>,
// src/processor.cc) and a shared error-name table generated from
// libraw_const.h (scripts/gen-errors.js, src/errors.cc); decodeSync below
// now sources its error names from that generated table via
// libraw_node::ThrowLegacyLibRawError/CheckLegacyLibRaw instead of the
// hand-written switch T04 added, but keeps its JS-visible error shape
// unchanged (a plain Error with a string `code` property) since
// test/decode-sync.test.ts already asserts that shape and decodeSync isn't
// rebuilt on the new Processor/LibRawError model until T08.
#include <napi.h>

// Must match the defines raw_r (LibRaw's static library target) was compiled
// with -- see CMakeLists.txt's comment on why these are PUBLIC on raw_r
// (struct layouts in libraw_types.h depend on USE_ZLIB/USE_JPEG/USE_JPEG8).
#include <libraw/libraw.h>

#include <chrono>
#include <memory>
#include <string>

#include "build_info.h"
#include "errors.h"
#include "processor.h"

namespace {

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
    // Processor's constructor Function is created once per Env (LibRawAddon
    // itself is per-Env instance data under Napi::Addon<T> -- see
    // NODE_API_ADDON(LibRawAddon) below), then exported as "Processor" and
    // also kept alive here as a member Napi::FunctionReference so a future
    // task (T08's fused helpers) can construct Processor instances from C++
    // without going through JS. This is deliberately a per-instance member,
    // not a `static Napi::FunctionReference`: a static/global reference
    // would be shared across every Env this addon is loaded into (multiple
    // worker_threads, multiple Electron renderer/utility contexts), which
    // either crashes or leaks across isolates. Napi::Addon<T> already gives
    // every Env its own LibRawAddon instance, so a plain member field here
    // is already context-aware for free.
    Napi::Function processorCtor = libraw_node::Processor::DefineClass(env);
    processorCtor_ = Napi::Persistent(processorCtor);
    processorCtor_.SuppressDestruct();

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
                    InstanceValue("Processor", processorCtor),
                });
  }

 private:
  Napi::FunctionReference processorCtor_;

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

  // decodeSync(buffer, { half_size?, user_qual?, use_camera_wb?, stages? }) ->
  // { width, height, colors, bits, data, stages? }. One LibRaw instance per
  // call (T06 introduces the long-lived Processor wrapper); pipeline is
  // open_buffer -> unpack -> dcraw_process -> get_mem_image_format ->
  // V8-allocated Buffer -> copy_mem_image -> recycle, per the tutorial and
  // T04's task text. The output buffer is always a fresh V8 allocation
  // (never LibRaw's own memory / an external buffer), which is what keeps
  // this Electron-safe under NODE_API_NO_EXTERNAL_BUFFERS_ALLOWED.
  //
  // T05: when `stages: true` is passed, each of the four pipeline calls is
  // timed individually with std::chrono::steady_clock (monotonic, immune to
  // wall-clock adjustments -- matters for a benchmarking tool) and the result
  // gains a `stages: { open, unpack, process, copy }` object of millisecond
  // durations (double, sub-millisecond precision kept for the fast stages).
  // get_mem_image_format is not separately timed: it does no decoding work
  // (just reads sizes already computed by dcraw_process) and the task's
  // stage list is open/unpack/process/copy.
  Napi::Value DecodeSync(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsBuffer()) {
      throw Napi::TypeError::New(env, "decodeSync(buffer, options?): buffer must be a Buffer");
    }
    Napi::Buffer<uint8_t> input = info[0].As<Napi::Buffer<uint8_t>>();

    bool halfSize = false;
    int userQual = -1;      // -1 means "leave LibRaw's default"
    bool useCameraWb = true;  // matches the tutorial's default
    bool wantStages = false;

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
      if (opts.Has("stages") && !opts.Get("stages").IsUndefined()) {
        wantStages = opts.Get("stages").ToBoolean();
      }
    }

    auto raw = std::make_unique<LibRaw>();
    raw->imgdata.params.half_size = halfSize ? 1 : 0;
    raw->imgdata.params.use_camera_wb = useCameraWb ? 1 : 0;
    if (userQual >= 0) {
      raw->imgdata.params.user_qual = userQual;
    }

    using clock = std::chrono::steady_clock;
    auto t0 = clock::now();
    libraw_node::CheckLegacyLibRaw(env, raw->open_buffer(input.Data(), input.Length()), "open_buffer");
    auto t1 = clock::now();
    libraw_node::CheckLegacyLibRaw(env, raw->unpack(), "unpack");
    auto t2 = clock::now();
    libraw_node::CheckLegacyLibRaw(env, raw->dcraw_process(), "dcraw_process");
    auto t3 = clock::now();

    int width = 0, height = 0, colors = 0, bps = 0;
    raw->get_mem_image_format(&width, &height, &colors, &bps);
    size_t stride = static_cast<size_t>(width) * static_cast<size_t>(colors) *
                     static_cast<size_t>(bps / 8);
    size_t size = stride * static_cast<size_t>(height);

    Napi::Buffer<uint8_t> out = Napi::Buffer<uint8_t>::New(env, size);
    int copyRc = raw->copy_mem_image(out.Data(), static_cast<int>(stride), 0);
    auto t4 = clock::now();
    if (copyRc != LIBRAW_SUCCESS) {
      raw->recycle();
      libraw_node::ThrowLegacyLibRawError(env, copyRc, "copy_mem_image");
    }

    raw->recycle();

    Napi::Object result = Napi::Object::New(env);
    result.Set("width", width);
    result.Set("height", height);
    result.Set("colors", colors);
    result.Set("bits", bps);
    result.Set("data", out);

    if (wantStages) {
      auto ms = [](clock::time_point a, clock::time_point b) {
        return std::chrono::duration<double, std::milli>(b - a).count();
      };
      Napi::Object stages = Napi::Object::New(env);
      stages.Set("open", Napi::Number::New(env, ms(t0, t1)));
      stages.Set("unpack", Napi::Number::New(env, ms(t1, t2)));
      stages.Set("process", Napi::Number::New(env, ms(t2, t3)));
      stages.Set("copy", Napi::Number::New(env, ms(t3, t4)));
      result.Set("stages", stages);
    }

    return result;
  }
};

}  // namespace

NODE_API_ADDON(LibRawAddon)
