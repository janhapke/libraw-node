#include "cancel.h"

namespace libraw_node {

int CancelAwareProgressCallback(void* data, enum LibRaw_progress /*stage*/, int /*iteration*/,
                                 int /*expected*/) {
  auto* state = static_cast<JobCancelState*>(data);
  // Relaxed: this only needs to observe a `true` written by cancel() (JS
  // thread) at some point after it happened, not any particular ordering
  // with other memory -- the actual interruption still routes through
  // LibRaw's own `_exitflag` (setCancelFlag()/checkCancel(), sequentially
  // consistent by default) for the checkCancel()-polling decoders; this
  // flag only needs to make LibRaw's progress callback return non-zero.
  return state->flag->load(std::memory_order_relaxed) ? 1 : 0;
}

Napi::Object WrapPromiseWithCancel(Napi::Env env, Napi::Promise promise, Napi::Function cancel) {
  Napi::Object result = Napi::Object::New(env);
  result.Set("promise", promise);
  result.Set("cancel", cancel);
  return result;
}

Napi::Function NoopCancel(Napi::Env env) {
  return Napi::Function::New(
      env, [](const Napi::CallbackInfo& info) -> void { (void)info; }, "cancel");
}

Napi::Function MakeLibRawCancelFunction(Napi::Env env, std::shared_ptr<JobCancelState> state,
                                         std::shared_ptr<LibRaw> raw) {
  return Napi::Function::New(
      env,
      [state, raw](const Napi::CallbackInfo& info) -> void {
        (void)info;
        if (state->active->load()) {
          state->flag->store(true);
          // Called from the JS thread while Execute() may be running
          // concurrently on a threadpool thread -- safe: LibRaw documents
          // setCancelFlag() as callable from another thread to interrupt an
          // in-progress operation (it is a single atomic increment of
          // LibRaw's own `_exitflag`, see src/utils/utils_libraw.cpp).
          raw->setCancelFlag();
        }
      },
      "cancel");
}

}  // namespace libraw_node
