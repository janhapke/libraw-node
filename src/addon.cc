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

#include "build_info.h"

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
};

}  // namespace

NODE_API_ADDON(LibRawAddon)
