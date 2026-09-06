// T12: hand-written declarations for the generated parameter-application
// table (src/generated/params.gen.cc, built by scripts/gen-params-cc.js from
// api/params.json). See docs/how-to/expose-libraw-options.md and
// docs/reference/libraw-output-params.md for the design.
//
// Replaces T08's hand-written subset (half_size, user_qual, use_camera_wb,
// output_bps, rawparams.shot_select) in src/fused.cc, and adds
// Processor::setParams/setRawParams/getParams/getRawParams
// (src/processor.h/.cc).
//
// State-machine rule (also documented on Processor::SetParams/SetRawParams
// in src/processor.cc and in docs/reference/proposed-binding-api.md):
//   - rawparams affects raw parsing that happens at open_buffer()/open_file()
//     time (e.g. imgdata.rawparams.options's thumbnail/DNG-stage bits) or at
//     unpack() time (shot_select) -- once a Processor is opened_, LibRaw has
//     already consumed (or is about to consume, at the next unpack()) the
//     rawparams it read at open time, so changing rawparams afterward would
//     be silently ignored by LibRaw. Processor::SetRawParams therefore
//     throws LIBRAW_OUT_OF_ORDER_CALL once opened_ is true, until
//     recycle()/close()/a fresh open*() call.
//   - params (libraw_output_params_t) is only read by dcraw_process()
//     (plus raw2image*/adjust_sizes_info_only for half_size/cropbox), so it
//     can be set any time up to that call; once processed_ is true, LibRaw
//     has already consumed the params it read for that dcraw_process() call,
//     so changing them afterward would be silently ignored until process()
//     is (hypothetically) invoked again -- T12 does not support that
//     re-process flow, so Processor::SetParams throws
//     LIBRAW_OUT_OF_ORDER_CALL once processed_ is true, matching rawparams'
//     rule and the acceptance text ("rawparams before open*, params before
//     process").
#pragma once

#include <napi.h>

#include <libraw/libraw.h>

#include <string>

namespace libraw_node {

// Addon/JS-owned string storage for libraw_output_params_t's char* fields
// (output_profile, camera_profile, bad_pixels, dark_frame). LibRaw does not
// own or copy these strings (docs/how-to/expose-libraw-options.md's
// "Assignment rules"), so whoever calls ApplyParams must keep the
// ParamStrings it passes in alive for as long as the corresponding LibRaw
// instance may still read imgdata.params.{output_profile,camera_profile,
// bad_pixels,dark_frame} -- i.e. through dcraw_process(). Processor owns one
// as a member (paramStrings_, src/processor.h) for its whole lifetime; the
// fused decode() helper (src/fused.cc) keeps one alive via a shared_ptr held
// by its DecodeWorker.
struct ParamStrings {
  std::string output_profile;
  std::string camera_profile;
  std::string bad_pixels;
  std::string dark_frame;
};

// Table-driven (generated from api/params.json's "params" struct by
// scripts/gen-params-cc.js; src/generated/params.gen.cc). Applies every own
// key present on `obj` onto `params`:
//   - Unknown keys throw Napi::TypeError naming the key (and listing the
//     supported keys).
//   - A field annotated "unsupported" in api/params.json (currently none in
//     "params" -- see ApplyRawParams for the one example, rawparams.
//     custom_camera_strings) throws Napi::TypeError naming the field.
//   - Wrong JS type for a field throws Napi::TypeError naming the field and
//     the expected type.
//   - Wrong array length throws Napi::RangeError.
//   - An enum value outside its allowed set, or a number outside its
//     min/max, throws Napi::RangeError listing the allowed values/range.
//   - A `flags`-typed field accepts either a plain number (used as the raw
//     bitmask, no membership check) or an array of `LIBRAW_*` flag-name
//     strings (OR'd together; an unknown name throws Napi::RangeError
//     listing the allowed names).
// `strings` receives the char* fields' backing storage -- see ParamStrings
// above for its lifetime requirement.
void ApplyParams(Napi::Env env, Napi::Object obj, libraw_output_params_t& params, ParamStrings& strings);

// Same as ApplyParams, for api/params.json's "rawparams" struct
// (libraw_raw_unpack_params_t / imgdata.rawparams). rawparams has no
// char*-pointer fields needing external storage: p4shot_order is a fixed
// char[5] buffer copied directly into the struct (length-checked: at most 4
// characters plus the implicit NUL), and custom_camera_strings (char**) is
// annotated "unsupported" in api/params.json, so setting it always throws
// Napi::TypeError.
void ApplyRawParams(Napi::Env env, Napi::Object obj, libraw_raw_unpack_params_t& rawparams);

// Returns every "params"/"rawparams" manifest field (per api/params.json)
// with its current value from `params`/`rawparams`: bools as JS booleans,
// enums/flags as JS numbers, C arrays as JS arrays, strings as JS strings or
// null (for an unset char* field). Fields annotated "unsupported" (currently
// only rawparams.custom_camera_strings) are omitted -- there is no safe way
// to read an application-owned char** back into a JS value, and they can
// never have been set through ApplyRawParams in the first place.
Napi::Object ParamsToObject(Napi::Env env, const libraw_output_params_t& params);
Napi::Object RawParamsToObject(Napi::Env env, const libraw_raw_unpack_params_t& rawparams);

}  // namespace libraw_node
