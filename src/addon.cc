// T02 hello-world addon: proves the Docker build pipeline, the Node-API-only
// (no node.h/v8.h/uv.h) include boundary, and the context-aware
// Napi::Addon<T> registration pattern (safe to load from multiple
// worker_threads / Electron contexts at once -- no static state).
//
// LibRaw itself is wired in starting T03; this file intentionally has no
// LibRaw includes.
#include <napi.h>

namespace {

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
                });
  }

 private:
  Napi::Value Hello(const Napi::CallbackInfo& info) {
    return Napi::String::New(info.Env(), "ok");
  }
};

}  // namespace

NODE_API_ADDON(LibRawAddon)
