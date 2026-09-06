// T06: Processor (Napi::ObjectWrap<Processor>) -- the staged, synchronous
// object API around a single std::unique_ptr<LibRaw> instance. Async
// (Promise-returning) versions of these methods are T07 scope; this class
// only needs to exist in a form T07 can add AsyncWorkers around later
// (same raw_ member, same busy/state tracking).
//
// State machine (guidance: "Track state (opened, unpacked, processed) and
// throw LIBRAW_OUT_OF_ORDER_CALL on misuse instead of relying on LibRaw's
// own checks alone"):
//   closed_          -- close() was called; every method throws afterward.
//   opened_          -- openBufferSync/openFileSync succeeded; required by
//                       everything that reads parsed metadata (thumbOK,
//                       decoderInfo, unpackFunctionName, the is*() traits,
//                       unpackSync, unpackThumbSync,
//                       adjustSizesInfoOnlySync).
//   unpacked_        -- unpackSync succeeded; required by processSync and
//                       color(row, col) (CFA layout is only meaningful once
//                       the raw mosaic is unpacked).
//   processed_       -- processSync succeeded; required by imageSync
//                       (copy_mem_image reads the postprocessed image that
//                       dcraw_process produces).
//   thumbUnpacked_   -- unpackThumbSync succeeded; required by thumbSync.
// recycle() resets every flag (matches LibRaw's own recycle() semantics:
// free everything, keep the object, ready to open() again).
#pragma once

#include <napi.h>

#include <libraw/libraw.h>

#include <memory>

namespace libraw_node {

class Processor : public Napi::ObjectWrap<Processor> {
 public:
  static Napi::Function DefineClass(Napi::Env env);

  explicit Processor(const Napi::CallbackInfo& info);
  ~Processor() override = default;

 private:
  Napi::Value OpenBufferSync(const Napi::CallbackInfo& info);
  Napi::Value OpenFileSync(const Napi::CallbackInfo& info);
  Napi::Value UnpackSync(const Napi::CallbackInfo& info);
  Napi::Value UnpackThumbSync(const Napi::CallbackInfo& info);
  Napi::Value ProcessSync(const Napi::CallbackInfo& info);
  Napi::Value ImageSync(const Napi::CallbackInfo& info);
  Napi::Value ThumbSync(const Napi::CallbackInfo& info);
  Napi::Value AdjustSizesInfoOnlySync(const Napi::CallbackInfo& info);
  Napi::Value Recycle(const Napi::CallbackInfo& info);
  Napi::Value Close(const Napi::CallbackInfo& info);

  Napi::Value ErrorCount(const Napi::CallbackInfo& info);
  Napi::Value DecoderInfo(const Napi::CallbackInfo& info);
  Napi::Value UnpackFunctionName(const Napi::CallbackInfo& info);
  Napi::Value IsFujiRotated(const Napi::CallbackInfo& info);
  Napi::Value IsSraw(const Napi::CallbackInfo& info);
  Napi::Value IsNikonSraw(const Napi::CallbackInfo& info);
  Napi::Value IsCoolscanNef(const Napi::CallbackInfo& info);
  Napi::Value IsJpegThumb(const Napi::CallbackInfo& info);
  Napi::Value IsFloatingPoint(const Napi::CallbackInfo& info);
  Napi::Value HaveFpData(const Napi::CallbackInfo& info);
  Napi::Value SrawMidpoint(const Napi::CallbackInfo& info);
  Napi::Value Color(const Napi::CallbackInfo& info);
  Napi::Value ThumbOK(const Napi::CallbackInfo& info);

  void RequireNotClosed(Napi::Env env, const char* stage);
  void RequireOpened(Napi::Env env, const char* stage);
  void RequireUnpacked(Napi::Env env, const char* stage);
  void RequireProcessed(Napi::Env env, const char* stage);
  void RequireThumbUnpacked(Napi::Env env, const char* stage);
  void ResetState();

  std::unique_ptr<LibRaw> raw_;

  // Keeps the input Buffer's V8 backing store alive for as long as raw_ may
  // still read through the LibRaw_buffer_datastream open_buffer() built over
  // it (open_buffer does not copy, see vendor/LibRaw/src/utils/open.cpp) --
  // i.e. until recycle()/close() or the next openBufferSync/openFileSync.
  Napi::Reference<Napi::Buffer<uint8_t>> inputRef_;

  bool closed_ = false;
  bool opened_ = false;
  bool unpacked_ = false;
  bool processed_ = false;
  bool thumbUnpacked_ = false;
};

}  // namespace libraw_node
