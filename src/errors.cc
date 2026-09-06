#include "errors.h"

#include <libraw/libraw.h>

#include <string>
#include <utility>

namespace libraw_node {

namespace {

struct ErrorEntry {
  int value;
  const char* name;
};

#define LIBRAW_NODE_ERROR_ENTRY(name) {name, #name},
const ErrorEntry kErrorTable[] = {
#include "generated/libraw_errors.inc"
};
#undef LIBRAW_NODE_ERROR_ENTRY

constexpr size_t kErrorTableSize = sizeof(kErrorTable) / sizeof(kErrorTable[0]);

}  // namespace

const char* LibRawErrorName(int code) {
  for (size_t i = 0; i < kErrorTableSize; i++) {
    if (kErrorTable[i].value == code) {
      return kErrorTable[i].name;
    }
  }
  return "LIBRAW_UNSPECIFIED_ERROR";
}

void ThrowLegacyLibRawError(Napi::Env env, int code, const char* stage) {
  std::string message = std::string(stage) + ": " + LibRaw::strerror(code);
  Napi::Error err = Napi::Error::New(env, message);
  err.Set("code", Napi::String::New(env, LibRawErrorName(code)));
  throw err;
}

void CheckLegacyLibRaw(Napi::Env env, int code, const char* stage) {
  if (code != LIBRAW_SUCCESS) {
    ThrowLegacyLibRawError(env, code, stage);
  }
}

Napi::Error MakeProcessorError(Napi::Env env, int code, const char* stage) {
  std::string message = std::string(stage) + ": " + LibRaw::strerror(code);
  Napi::Error err = Napi::Error::New(env, message);
  err.Set("code", Napi::Number::New(env, code));
  err.Set("librawName", Napi::String::New(env, LibRawErrorName(code)));
  err.Set("stage", Napi::String::New(env, stage));
  return err;
}

void ThrowProcessorError(Napi::Env env, int code, const char* stage) {
  throw MakeProcessorError(env, code, stage);
}

void CheckProcessorError(Napi::Env env, int code, const char* stage) {
  if (code != LIBRAW_SUCCESS) {
    ThrowProcessorError(env, code, stage);
  }
}

Napi::Error MakeBusyError(Napi::Env env, const char* stage) {
  std::string message =
      std::string(stage) + ": a LibRaw operation is already in progress on this Processor";
  Napi::Error err = Napi::Error::New(env, message);
  err.Set("code", Napi::Number::New(env, kErrLibRawBusyCode));
  err.Set("librawName", Napi::String::New(env, kErrLibRawBusyName));
  err.Set("stage", Napi::String::New(env, stage));
  return err;
}

void ThrowBusyError(Napi::Env env, const char* stage) {
  throw MakeBusyError(env, stage);
}

}  // namespace libraw_node
