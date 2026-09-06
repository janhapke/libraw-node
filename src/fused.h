// T08: module-level, stateless "fused" helpers -- decode(), identify(),
// thumbnail() -- exported from lib/index.cjs alongside Processor.
//
// Unlike Processor (src/processor.h/.cc, T06/T07), each of these three JS
// functions owns *no* persistent native object: every call constructs its
// own std::unique_ptr<LibRaw>, uses it for the duration of exactly one
// Napi::AsyncWorker (src/fused.cc), and destroys it before the call
// resolves. That means fused calls never contend with a Processor's busy_
// guard and any number of them can run concurrently on the libuv threadpool
// (bounded only by UV_THREADPOOL_SIZE) -- see
// docs/reference/proposed-binding-api.md's "fused, stateless helpers"
// section and docs/how-to/implement-async-decode-with-cancellation.md.
#pragma once

#include <napi.h>

namespace libraw_node {

// decode(buffer, { params?, rawparams?, output?, signal? }) ->
// Promise<{ width, height, colors, bits, stride, data, flip, warnings }>.
Napi::Value Decode(const Napi::CallbackInfo& info);

// identify(buffer, { rawparams? }) ->
// Promise<{ sizes, idata, thumbs, decoder, warnings, metadata }>.
Napi::Value Identify(const Napi::CallbackInfo& info);

// thumbnail(buffer, { index?, signal? }) ->
// Promise<{ format, width, height, flip, colors, bits, data }>.
Napi::Value Thumbnail(const Napi::CallbackInfo& info);

}  // namespace libraw_node
