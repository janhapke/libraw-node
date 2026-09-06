// GENERATED FILE -- do not edit by hand.
// Regenerate with `npm run gen:params-cc` (scripts/gen-params-cc.js).
// Source: api/params.json (LibRaw 0.22.2).
//
// Implements the four functions declared by src/params.h -- see that
// header's comments for the validation rules each field type gets and
// the ParamStrings/lifetime contract for the char*-pointer fields.
#include "../params.h"

#include <algorithm>
#include <cstring>
#include <initializer_list>
#include <string>
#include <utility>
#include <vector>

namespace libraw_node {

namespace {

[[noreturn]] void ThrowUnknownKey(Napi::Env env, const char* label, const std::string& key,
                                   const std::vector<std::string>& knownKeys) {
  std::string list;
  for (size_t i = 0; i < knownKeys.size(); i++) {
    if (i > 0) list += ", ";
    list += knownKeys[i];
  }
  throw Napi::TypeError::New(env, std::string(label) + ": unknown key '" + key + "'; supported keys are: " + list);
}

[[noreturn]] void ThrowUnsupportedField(Napi::Env env, const char* label, const char* key) {
  throw Napi::TypeError::New(
      env, std::string(label) + "." + key + ": not settable through this API (unsupported field, see api/params.json)");
}

[[noreturn]] void ThrowExpectedType(Napi::Env env, const char* label, const char* key, const char* expected) {
  throw Napi::TypeError::New(env, std::string(label) + "." + key + ": expected " + expected);
}

[[noreturn]] void ThrowArrayLength(Napi::Env env, const char* label, const char* key, uint32_t expected, uint32_t actual) {
  throw Napi::RangeError::New(env, std::string(label) + "." + key + ": expected an array of length " +
                                        std::to_string(expected) + ", got " + std::to_string(actual));
}

[[noreturn]] void ThrowRange(Napi::Env env, const char* label, const char* key, const std::string& detail) {
  throw Napi::RangeError::New(env, std::string(label) + "." + key + ": " + detail);
}

void ValidateKnownKeys(Napi::Env env, Napi::Object obj, const char* label, const std::vector<std::string>& knownKeys) {
  Napi::Array keys = obj.GetPropertyNames();
  for (uint32_t i = 0; i < keys.Length(); i++) {
    std::string key = keys.Get(i).As<Napi::String>().Utf8Value();
    if (std::find(knownKeys.begin(), knownKeys.end(), key) == knownKeys.end()) {
      ThrowUnknownKey(env, label, key, knownKeys);
    }
  }
}

bool AsBoolean(Napi::Env env, Napi::Value v, const char* label, const char* key) {
  if (!v.IsBoolean()) ThrowExpectedType(env, label, key, "boolean");
  return v.As<Napi::Boolean>().Value();
}

double AsNumber(Napi::Env env, Napi::Value v, const char* label, const char* key) {
  if (!v.IsNumber()) ThrowExpectedType(env, label, key, "number");
  return v.As<Napi::Number>().DoubleValue();
}

std::string AsString(Napi::Env env, Napi::Value v, const char* label, const char* key) {
  if (!v.IsString()) ThrowExpectedType(env, label, key, "string");
  return v.As<Napi::String>().Utf8Value();
}

Napi::Array AsArray(Napi::Env env, Napi::Value v, const char* label, const char* key, uint32_t expectedLen) {
  if (!v.IsArray()) ThrowExpectedType(env, label, key, "array");
  Napi::Array arr = v.As<Napi::Array>();
  if (arr.Length() != expectedLen) ThrowArrayLength(env, label, key, expectedLen, arr.Length());
  return arr;
}

void CheckRangeNum(Napi::Env env, const char* label, const char* key, double value, bool hasMin, double min,
                    bool hasMax, double max) {
  if (hasMin && value < min) {
    ThrowRange(env, label, key, "must be >= " + std::to_string(min) + " (got " + std::to_string(value) + ")");
  }
  if (hasMax && value > max) {
    ThrowRange(env, label, key, "must be <= " + std::to_string(max) + " (got " + std::to_string(value) + ")");
  }
}

// Enum-membership check. `allowed` is {name, value} pairs from the field's
// manifest `enum` map, in declaration order (used both for the membership
// test and to render the "allowed values" list on failure).
int CheckEnumMember(Napi::Env env, const char* label, const char* key, double value,
                     std::initializer_list<std::pair<const char*, long long>> allowed) {
  for (const auto& kv : allowed) {
    if (static_cast<double>(kv.second) == value) return static_cast<int>(kv.second);
  }
  std::string list;
  for (const auto& kv : allowed) {
    if (!list.empty()) list += ", ";
    list += std::to_string(kv.second) + " (" + kv.first + ")";
  }
  ThrowRange(env, label, key,
             "invalid value " + std::to_string(static_cast<long long>(value)) + "; allowed values: " + list);
}

// Flags: a plain number (used as-is, no membership check against `table`)
// or an array of flag-name strings (OR'd together; an unknown name throws
// Napi::RangeError listing the allowed names from `table`).
unsigned long long CheckFlagsValue(Napi::Env env, Napi::Value v, const char* label, const char* key,
                                    std::initializer_list<std::pair<const char*, unsigned long long>> table) {
  if (v.IsNumber()) {
    return static_cast<unsigned long long>(v.As<Napi::Number>().Int64Value());
  }
  if (v.IsArray()) {
    Napi::Array arr = v.As<Napi::Array>();
    unsigned long long result = 0;
    for (uint32_t i = 0; i < arr.Length(); i++) {
      Napi::Value el = arr.Get(i);
      if (!el.IsString()) ThrowExpectedType(env, label, key, "number or array of flag name strings");
      std::string name = el.As<Napi::String>().Utf8Value();
      bool found = false;
      for (const auto& kv : table) {
        if (name == kv.first) {
          result |= kv.second;
          found = true;
          break;
        }
      }
      if (!found) {
        std::string list;
        for (const auto& kv : table) {
          if (!list.empty()) list += ", ";
          list += kv.first;
        }
        ThrowRange(env, label, key, "unknown flag name '" + name + "'; allowed names: " + list);
      }
    }
    return result;
  }
  ThrowExpectedType(env, label, key, "number or array of flag name strings");
}

}  // namespace

void ApplyParams(Napi::Env env, Napi::Object obj, libraw_output_params_t& params, ParamStrings& strings) {
  static const char* kLabel = "params";
  static const std::vector<std::string> kKnownKeys = {"greybox", "cropbox", "aber", "gamm", "user_mul", "bright", "threshold", "half_size", "four_color_rgb", "highlight", "use_auto_wb", "use_camera_wb", "use_camera_matrix", "output_color", "output_profile", "camera_profile", "bad_pixels", "dark_frame", "output_bps", "output_tiff", "output_flags", "user_flip", "user_qual", "user_black", "user_cblack", "user_sat", "med_passes", "auto_bright_thr", "adjust_maximum_thr", "no_auto_bright", "use_fuji_rotate", "use_p1_correction", "green_matching", "dcb_iterations", "dcb_enhance_fl", "fbdd_noiserd", "exp_correc", "exp_shift", "exp_preser", "no_auto_scale", "no_interpolation"};
  ValidateKnownKeys(env, obj, kLabel, kKnownKeys);

  {  // greybox (uint[4])
    Napi::Value v = obj.Get("greybox");
    if (!v.IsUndefined()) {
      Napi::Array arr = AsArray(env, v, kLabel, "greybox", 4);
      for (uint32_t i = 0; i < 4; i++) {
        double num = AsNumber(env, arr.Get(i), kLabel, "greybox");
        params.greybox[i] = static_cast<unsigned int>(num);
      }
    }
  }

  {  // cropbox (uint[4])
    Napi::Value v = obj.Get("cropbox");
    if (!v.IsUndefined()) {
      Napi::Array arr = AsArray(env, v, kLabel, "cropbox", 4);
      for (uint32_t i = 0; i < 4; i++) {
        double num = AsNumber(env, arr.Get(i), kLabel, "cropbox");
        params.cropbox[i] = static_cast<unsigned int>(num);
      }
    }
  }

  {  // aber (float[4])
    Napi::Value v = obj.Get("aber");
    if (!v.IsUndefined()) {
      Napi::Array arr = AsArray(env, v, kLabel, "aber", 4);
      for (uint32_t i = 0; i < 4; i++) {
        double num = AsNumber(env, arr.Get(i), kLabel, "aber");
        params.aber[i] = static_cast<double>(num);
      }
    }
  }

  {  // gamm (float[6])
    Napi::Value v = obj.Get("gamm");
    if (!v.IsUndefined()) {
      Napi::Array arr = AsArray(env, v, kLabel, "gamm", 6);
      for (uint32_t i = 0; i < 6; i++) {
        double num = AsNumber(env, arr.Get(i), kLabel, "gamm");
        params.gamm[i] = static_cast<double>(num);
      }
    }
  }

  {  // user_mul (float[4])
    Napi::Value v = obj.Get("user_mul");
    if (!v.IsUndefined()) {
      Napi::Array arr = AsArray(env, v, kLabel, "user_mul", 4);
      for (uint32_t i = 0; i < 4; i++) {
        double num = AsNumber(env, arr.Get(i), kLabel, "user_mul");
        params.user_mul[i] = static_cast<float>(num);
      }
    }
  }

  {  // bright (float)
    Napi::Value v = obj.Get("bright");
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, "bright");
      CheckRangeNum(env, kLabel, "bright", num, false, 0, false, 0);
      params.bright = static_cast<float>(num);
    }
  }

  {  // threshold (float)
    Napi::Value v = obj.Get("threshold");
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, "threshold");
      CheckRangeNum(env, kLabel, "threshold", num, true, 0, false, 0);
      params.threshold = static_cast<float>(num);
    }
  }

  {  // half_size (bool)
    Napi::Value v = obj.Get("half_size");
    if (!v.IsUndefined()) {
      bool value = AsBoolean(env, v, kLabel, "half_size");
      params.half_size = value ? 1 : 0;
    }
  }

  {  // four_color_rgb (bool)
    Napi::Value v = obj.Get("four_color_rgb");
    if (!v.IsUndefined()) {
      bool value = AsBoolean(env, v, kLabel, "four_color_rgb");
      params.four_color_rgb = value ? 1 : 0;
    }
  }

  {  // highlight (int)
    Napi::Value v = obj.Get("highlight");
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, "highlight");
      CheckRangeNum(env, kLabel, "highlight", num, true, 0, true, 9);
      params.highlight = static_cast<int>(num);
    }
  }

  {  // use_auto_wb (bool)
    Napi::Value v = obj.Get("use_auto_wb");
    if (!v.IsUndefined()) {
      bool value = AsBoolean(env, v, kLabel, "use_auto_wb");
      params.use_auto_wb = value ? 1 : 0;
    }
  }

  {  // use_camera_wb (bool)
    Napi::Value v = obj.Get("use_camera_wb");
    if (!v.IsUndefined()) {
      bool value = AsBoolean(env, v, kLabel, "use_camera_wb");
      params.use_camera_wb = value ? 1 : 0;
    }
  }

  {  // use_camera_matrix (enum)
    Napi::Value v = obj.Get("use_camera_matrix");
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, "use_camera_matrix");
      int value = CheckEnumMember(env, kLabel, "use_camera_matrix", num, {{"NEVER", 0}, {"IF_CAMERA_WB", 1}, {"ALWAYS", 3}});
      params.use_camera_matrix = value;
    }
  }

  {  // output_color (enum)
    Napi::Value v = obj.Get("output_color");
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, "output_color");
      int value = CheckEnumMember(env, kLabel, "output_color", num, {{"RAW", 0}, {"SRGB", 1}, {"ADOBE", 2}, {"WIDE", 3}, {"PROPHOTO", 4}, {"XYZ", 5}, {"ACES", 6}, {"DCI_P3", 7}, {"REC2020", 8}});
      params.output_color = value;
    }
  }

  {  // output_profile (string, nullable)
    Napi::Value v = obj.Get("output_profile");
    if (!v.IsUndefined()) {
      if (v.IsNull()) {
        strings.output_profile.clear();
        params.output_profile = nullptr;
      } else {
        strings.output_profile = AsString(env, v, kLabel, "output_profile");
        params.output_profile = const_cast<char*>(strings.output_profile.c_str());
      }
    }
  }

  {  // camera_profile (string, nullable)
    Napi::Value v = obj.Get("camera_profile");
    if (!v.IsUndefined()) {
      if (v.IsNull()) {
        strings.camera_profile.clear();
        params.camera_profile = nullptr;
      } else {
        strings.camera_profile = AsString(env, v, kLabel, "camera_profile");
        params.camera_profile = const_cast<char*>(strings.camera_profile.c_str());
      }
    }
  }

  {  // bad_pixels (string, nullable)
    Napi::Value v = obj.Get("bad_pixels");
    if (!v.IsUndefined()) {
      if (v.IsNull()) {
        strings.bad_pixels.clear();
        params.bad_pixels = nullptr;
      } else {
        strings.bad_pixels = AsString(env, v, kLabel, "bad_pixels");
        params.bad_pixels = const_cast<char*>(strings.bad_pixels.c_str());
      }
    }
  }

  {  // dark_frame (string, nullable)
    Napi::Value v = obj.Get("dark_frame");
    if (!v.IsUndefined()) {
      if (v.IsNull()) {
        strings.dark_frame.clear();
        params.dark_frame = nullptr;
      } else {
        strings.dark_frame = AsString(env, v, kLabel, "dark_frame");
        params.dark_frame = const_cast<char*>(strings.dark_frame.c_str());
      }
    }
  }

  {  // output_bps (enum)
    Napi::Value v = obj.Get("output_bps");
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, "output_bps");
      int value = CheckEnumMember(env, kLabel, "output_bps", num, {{"8", 8}, {"16", 16}});
      params.output_bps = value;
    }
  }

  {  // output_tiff (bool)
    Napi::Value v = obj.Get("output_tiff");
    if (!v.IsUndefined()) {
      bool value = AsBoolean(env, v, kLabel, "output_tiff");
      params.output_tiff = value ? 1 : 0;
    }
  }

  {  // output_flags (flags)
    Napi::Value v = obj.Get("output_flags");
    if (!v.IsUndefined()) {
      unsigned long long value = CheckFlagsValue(env, v, kLabel, "output_flags", {{"LIBRAW_OUTPUT_FLAGS_NONE", 0ULL}, {"LIBRAW_OUTPUT_FLAGS_PPMMETA", 1ULL}});
      params.output_flags = static_cast<int>(value);
    }
  }

  {  // user_flip (int)
    Napi::Value v = obj.Get("user_flip");
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, "user_flip");
      CheckRangeNum(env, kLabel, "user_flip", num, true, -1, true, 7);
      params.user_flip = static_cast<int>(num);
    }
  }

  {  // user_qual (enum)
    Napi::Value v = obj.Get("user_qual");
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, "user_qual");
      int value = CheckEnumMember(env, kLabel, "user_qual", num, {{"LINEAR", 0}, {"VNG", 1}, {"PPG", 2}, {"AHD", 3}, {"DCB", 4}, {"MODIFIED_AHD_GPL2", 5}, {"AFD_GPL2", 6}, {"VCD_GPL2", 7}, {"VCD_MODIFIED_AHD_GPL2", 8}, {"LMMSE_GPL2", 9}, {"AMAZE_GPL3", 10}, {"DHT", 11}, {"AAHD", 12}});
      params.user_qual = value;
    }
  }

  {  // user_black (int)
    Napi::Value v = obj.Get("user_black");
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, "user_black");
      CheckRangeNum(env, kLabel, "user_black", num, false, 0, false, 0);
      params.user_black = static_cast<int>(num);
    }
  }

  {  // user_cblack (int[4])
    Napi::Value v = obj.Get("user_cblack");
    if (!v.IsUndefined()) {
      Napi::Array arr = AsArray(env, v, kLabel, "user_cblack", 4);
      for (uint32_t i = 0; i < 4; i++) {
        double num = AsNumber(env, arr.Get(i), kLabel, "user_cblack");
        params.user_cblack[i] = static_cast<int>(num);
      }
    }
  }

  {  // user_sat (int)
    Napi::Value v = obj.Get("user_sat");
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, "user_sat");
      CheckRangeNum(env, kLabel, "user_sat", num, false, 0, false, 0);
      params.user_sat = static_cast<int>(num);
    }
  }

  {  // med_passes (int)
    Napi::Value v = obj.Get("med_passes");
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, "med_passes");
      CheckRangeNum(env, kLabel, "med_passes", num, true, 0, false, 0);
      params.med_passes = static_cast<int>(num);
    }
  }

  {  // auto_bright_thr (float)
    Napi::Value v = obj.Get("auto_bright_thr");
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, "auto_bright_thr");
      CheckRangeNum(env, kLabel, "auto_bright_thr", num, true, 0, false, 0);
      params.auto_bright_thr = static_cast<float>(num);
    }
  }

  {  // adjust_maximum_thr (float)
    Napi::Value v = obj.Get("adjust_maximum_thr");
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, "adjust_maximum_thr");
      CheckRangeNum(env, kLabel, "adjust_maximum_thr", num, true, 0, true, 1);
      params.adjust_maximum_thr = static_cast<float>(num);
    }
  }

  {  // no_auto_bright (bool)
    Napi::Value v = obj.Get("no_auto_bright");
    if (!v.IsUndefined()) {
      bool value = AsBoolean(env, v, kLabel, "no_auto_bright");
      params.no_auto_bright = value ? 1 : 0;
    }
  }

  {  // use_fuji_rotate (bool)
    Napi::Value v = obj.Get("use_fuji_rotate");
    if (!v.IsUndefined()) {
      bool value = AsBoolean(env, v, kLabel, "use_fuji_rotate");
      params.use_fuji_rotate = value ? 1 : 0;
    }
  }

  {  // use_p1_correction (bool)
    Napi::Value v = obj.Get("use_p1_correction");
    if (!v.IsUndefined()) {
      bool value = AsBoolean(env, v, kLabel, "use_p1_correction");
      params.use_p1_correction = value ? 1 : 0;
    }
  }

  {  // green_matching (bool)
    Napi::Value v = obj.Get("green_matching");
    if (!v.IsUndefined()) {
      bool value = AsBoolean(env, v, kLabel, "green_matching");
      params.green_matching = value ? 1 : 0;
    }
  }

  {  // dcb_iterations (int)
    Napi::Value v = obj.Get("dcb_iterations");
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, "dcb_iterations");
      CheckRangeNum(env, kLabel, "dcb_iterations", num, false, 0, false, 0);
      params.dcb_iterations = static_cast<int>(num);
    }
  }

  {  // dcb_enhance_fl (bool)
    Napi::Value v = obj.Get("dcb_enhance_fl");
    if (!v.IsUndefined()) {
      bool value = AsBoolean(env, v, kLabel, "dcb_enhance_fl");
      params.dcb_enhance_fl = value ? 1 : 0;
    }
  }

  {  // fbdd_noiserd (int)
    Napi::Value v = obj.Get("fbdd_noiserd");
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, "fbdd_noiserd");
      CheckRangeNum(env, kLabel, "fbdd_noiserd", num, true, 0, false, 0);
      params.fbdd_noiserd = static_cast<int>(num);
    }
  }

  {  // exp_correc (bool)
    Napi::Value v = obj.Get("exp_correc");
    if (!v.IsUndefined()) {
      bool value = AsBoolean(env, v, kLabel, "exp_correc");
      params.exp_correc = value ? 1 : 0;
    }
  }

  {  // exp_shift (float)
    Napi::Value v = obj.Get("exp_shift");
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, "exp_shift");
      CheckRangeNum(env, kLabel, "exp_shift", num, true, 0.25, true, 8);
      params.exp_shift = static_cast<float>(num);
    }
  }

  {  // exp_preser (float)
    Napi::Value v = obj.Get("exp_preser");
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, "exp_preser");
      CheckRangeNum(env, kLabel, "exp_preser", num, true, 0, true, 1);
      params.exp_preser = static_cast<float>(num);
    }
  }

  {  // no_auto_scale (bool)
    Napi::Value v = obj.Get("no_auto_scale");
    if (!v.IsUndefined()) {
      bool value = AsBoolean(env, v, kLabel, "no_auto_scale");
      params.no_auto_scale = value ? 1 : 0;
    }
  }

  {  // no_interpolation (bool)
    Napi::Value v = obj.Get("no_interpolation");
    if (!v.IsUndefined()) {
      bool value = AsBoolean(env, v, kLabel, "no_interpolation");
      params.no_interpolation = value ? 1 : 0;
    }
  }
}

void ApplyRawParams(Napi::Env env, Napi::Object obj, libraw_raw_unpack_params_t& rawparams) {
  static const char* kLabel = "rawparams";
  static const std::vector<std::string> kKnownKeys = {"use_rawspeed", "use_dngsdk", "options", "shot_select", "specials", "max_raw_memory_mb", "sony_arw2_posterization_thr", "coolscan_nef_gamma", "p4shot_order", "custom_camera_strings"};
  ValidateKnownKeys(env, obj, kLabel, kKnownKeys);

  {  // use_rawspeed (flags)
    Napi::Value v = obj.Get("use_rawspeed");
    if (!v.IsUndefined()) {
      unsigned long long value = CheckFlagsValue(env, v, kLabel, "use_rawspeed", {{"LIBRAW_RAWSPEEDV1_USE", 1ULL}, {"LIBRAW_RAWSPEEDV1_FAILONUNKNOWN", 2ULL}, {"LIBRAW_RAWSPEEDV1_IGNOREERRORS", 4ULL}, {"LIBRAW_RAWSPEEDV3_USE", 256ULL}, {"LIBRAW_RAWSPEEDV3_FAILONUNKNOWN", 512ULL}, {"LIBRAW_RAWSPEEDV3_IGNOREERRORS", 1024ULL}});
      rawparams.use_rawspeed = static_cast<int>(value);
    }
  }

  {  // use_dngsdk (flags)
    Napi::Value v = obj.Get("use_dngsdk");
    if (!v.IsUndefined()) {
      unsigned long long value = CheckFlagsValue(env, v, kLabel, "use_dngsdk", {{"LIBRAW_DNG_FLOAT", 1ULL}, {"LIBRAW_DNG_LINEAR", 2ULL}, {"LIBRAW_DNG_DEFLATE", 4ULL}, {"LIBRAW_DNG_XTRANS", 8ULL}, {"LIBRAW_DNG_OTHER", 16ULL}, {"LIBRAW_DNG_8BIT", 32ULL}});
      rawparams.use_dngsdk = static_cast<int>(value);
    }
  }

  {  // options (flags)
    Napi::Value v = obj.Get("options");
    if (!v.IsUndefined()) {
      unsigned long long value = CheckFlagsValue(env, v, kLabel, "options", {{"LIBRAW_RAWOPTIONS_PENTAX_PS_ALLFRAMES", 1ULL}, {"LIBRAW_RAWOPTIONS_CONVERTFLOAT_TO_INT", 2ULL}, {"LIBRAW_RAWOPTIONS_ARQ_SKIP_CHANNEL_SWAP", 4ULL}, {"LIBRAW_RAWOPTIONS_NO_ROTATE_FOR_KODAK_THUMBNAILS", 8ULL}, {"LIBRAW_RAWOPTIONS_USE_PPM16_THUMBS", 32ULL}, {"LIBRAW_RAWOPTIONS_DONT_CHECK_DNG_ILLUMINANT", 64ULL}, {"LIBRAW_RAWOPTIONS_DNGSDK_ZEROCOPY", 128ULL}, {"LIBRAW_RAWOPTIONS_ZEROFILTERS_FOR_MONOCHROMETIFFS", 256ULL}, {"LIBRAW_RAWOPTIONS_DNG_ADD_ENHANCED", 512ULL}, {"LIBRAW_RAWOPTIONS_DNG_ADD_PREVIEWS", 1024ULL}, {"LIBRAW_RAWOPTIONS_DNG_PREFER_LARGEST_IMAGE", 2048ULL}, {"LIBRAW_RAWOPTIONS_DNG_STAGE2", 4096ULL}, {"LIBRAW_RAWOPTIONS_DNG_STAGE3", 8192ULL}, {"LIBRAW_RAWOPTIONS_DNG_ALLOWSIZECHANGE", 16384ULL}, {"LIBRAW_RAWOPTIONS_DNG_DISABLEWBADJUST", 32768ULL}, {"LIBRAW_RAWOPTIONS_PROVIDE_NONSTANDARD_WB", 65536ULL}, {"LIBRAW_RAWOPTIONS_CAMERAWB_FALLBACK_TO_DAYLIGHT", 131072ULL}, {"LIBRAW_RAWOPTIONS_CHECK_THUMBNAILS_KNOWN_VENDORS", 262144ULL}, {"LIBRAW_RAWOPTIONS_CHECK_THUMBNAILS_ALL_VENDORS", 524288ULL}, {"LIBRAW_RAWOPTIONS_DNG_STAGE2_IFPRESENT", 1048576ULL}, {"LIBRAW_RAWOPTIONS_DNG_STAGE3_IFPRESENT", 2097152ULL}, {"LIBRAW_RAWOPTIONS_DNG_ADD_MASKS", 4194304ULL}, {"LIBRAW_RAWOPTIONS_CANON_IGNORE_MAKERNOTES_ROTATION", 8388608ULL}, {"LIBRAW_RAWOPTIONS_ALLOW_JPEGXL_PREVIEWS", 16777216ULL}, {"LIBRAW_RAWOPTIONS_CANON_CHECK_CAMERA_AUTO_ROTATION_MODE", 67108864ULL}, {"LIBRAW_RAWOPTIONS_DNG_STAGE23_IFPRESENT_JPGJXL", 134217728ULL}});
      rawparams.options = static_cast<unsigned int>(value);
    }
  }

  {  // shot_select (uint)
    Napi::Value v = obj.Get("shot_select");
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, "shot_select");
      CheckRangeNum(env, kLabel, "shot_select", num, false, 0, false, 0);
      rawparams.shot_select = static_cast<unsigned int>(num);
    }
  }

  {  // specials (flags)
    Napi::Value v = obj.Get("specials");
    if (!v.IsUndefined()) {
      unsigned long long value = CheckFlagsValue(env, v, kLabel, "specials", {{"LIBRAW_RAWSPECIAL_SONYARW2_NONE", 0ULL}, {"LIBRAW_RAWSPECIAL_SONYARW2_BASEONLY", 1ULL}, {"LIBRAW_RAWSPECIAL_SONYARW2_DELTAONLY", 2ULL}, {"LIBRAW_RAWSPECIAL_SONYARW2_DELTAZEROBASE", 4ULL}, {"LIBRAW_RAWSPECIAL_SONYARW2_DELTATOVALUE", 8ULL}, {"LIBRAW_RAWSPECIAL_NODP2Q_INTERPOLATERG", 16ULL}, {"LIBRAW_RAWSPECIAL_NODP2Q_INTERPOLATEAF", 32ULL}, {"LIBRAW_RAWSPECIAL_SRAW_NO_RGB", 64ULL}, {"LIBRAW_RAWSPECIAL_SRAW_NO_INTERPOLATE", 128ULL}});
      rawparams.specials = static_cast<unsigned int>(value);
    }
  }

  {  // max_raw_memory_mb (uint)
    Napi::Value v = obj.Get("max_raw_memory_mb");
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, "max_raw_memory_mb");
      CheckRangeNum(env, kLabel, "max_raw_memory_mb", num, false, 0, false, 0);
      rawparams.max_raw_memory_mb = static_cast<unsigned int>(num);
    }
  }

  {  // sony_arw2_posterization_thr (int)
    Napi::Value v = obj.Get("sony_arw2_posterization_thr");
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, "sony_arw2_posterization_thr");
      CheckRangeNum(env, kLabel, "sony_arw2_posterization_thr", num, false, 0, false, 0);
      rawparams.sony_arw2_posterization_thr = static_cast<int>(num);
    }
  }

  {  // coolscan_nef_gamma (float)
    Napi::Value v = obj.Get("coolscan_nef_gamma");
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, "coolscan_nef_gamma");
      CheckRangeNum(env, kLabel, "coolscan_nef_gamma", num, false, 0, false, 0);
      rawparams.coolscan_nef_gamma = static_cast<float>(num);
    }
  }

  {  // p4shot_order (fixed string[5])
    Napi::Value v = obj.Get("p4shot_order");
    if (!v.IsUndefined()) {
      std::string s = AsString(env, v, kLabel, "p4shot_order");
      if (s.size() > 4) {
        ThrowRange(env, kLabel, "p4shot_order", "string too long (max 4 characters)");
      }
      std::memset(rawparams.p4shot_order, 0, 5);
      std::memcpy(rawparams.p4shot_order, s.data(), s.size());
    }
  }

  {  // custom_camera_strings (unsupported)
    Napi::Value v = obj.Get("custom_camera_strings");
    if (!v.IsUndefined()) {
      ThrowUnsupportedField(env, kLabel, "custom_camera_strings");
    }
  }
}

Napi::Object ParamsToObject(Napi::Env env, const libraw_output_params_t& params) {
  Napi::Object obj = Napi::Object::New(env);
  {
    Napi::Array arr = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(params.greybox[i])));
    }
    obj.Set("greybox", arr);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(params.cropbox[i])));
    }
    obj.Set("cropbox", arr);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(params.aber[i])));
    }
    obj.Set("aber", arr);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 6);
    for (uint32_t i = 0; i < 6; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(params.gamm[i])));
    }
    obj.Set("gamm", arr);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(params.user_mul[i])));
    }
    obj.Set("user_mul", arr);
  }
  obj.Set("bright", Napi::Number::New(env, static_cast<double>(params.bright)));
  obj.Set("threshold", Napi::Number::New(env, static_cast<double>(params.threshold)));
  obj.Set("half_size", Napi::Boolean::New(env, params.half_size != 0));
  obj.Set("four_color_rgb", Napi::Boolean::New(env, params.four_color_rgb != 0));
  obj.Set("highlight", Napi::Number::New(env, static_cast<double>(params.highlight)));
  obj.Set("use_auto_wb", Napi::Boolean::New(env, params.use_auto_wb != 0));
  obj.Set("use_camera_wb", Napi::Boolean::New(env, params.use_camera_wb != 0));
  obj.Set("use_camera_matrix", Napi::Number::New(env, static_cast<double>(params.use_camera_matrix)));
  obj.Set("output_color", Napi::Number::New(env, static_cast<double>(params.output_color)));
  obj.Set("output_profile", params.output_profile ? Napi::Value::From(env, std::string(params.output_profile)) : env.Null());
  obj.Set("camera_profile", params.camera_profile ? Napi::Value::From(env, std::string(params.camera_profile)) : env.Null());
  obj.Set("bad_pixels", params.bad_pixels ? Napi::Value::From(env, std::string(params.bad_pixels)) : env.Null());
  obj.Set("dark_frame", params.dark_frame ? Napi::Value::From(env, std::string(params.dark_frame)) : env.Null());
  obj.Set("output_bps", Napi::Number::New(env, static_cast<double>(params.output_bps)));
  obj.Set("output_tiff", Napi::Boolean::New(env, params.output_tiff != 0));
  obj.Set("output_flags", Napi::Number::New(env, static_cast<double>(params.output_flags)));
  obj.Set("user_flip", Napi::Number::New(env, static_cast<double>(params.user_flip)));
  obj.Set("user_qual", Napi::Number::New(env, static_cast<double>(params.user_qual)));
  obj.Set("user_black", Napi::Number::New(env, static_cast<double>(params.user_black)));
  {
    Napi::Array arr = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(params.user_cblack[i])));
    }
    obj.Set("user_cblack", arr);
  }
  obj.Set("user_sat", Napi::Number::New(env, static_cast<double>(params.user_sat)));
  obj.Set("med_passes", Napi::Number::New(env, static_cast<double>(params.med_passes)));
  obj.Set("auto_bright_thr", Napi::Number::New(env, static_cast<double>(params.auto_bright_thr)));
  obj.Set("adjust_maximum_thr", Napi::Number::New(env, static_cast<double>(params.adjust_maximum_thr)));
  obj.Set("no_auto_bright", Napi::Boolean::New(env, params.no_auto_bright != 0));
  obj.Set("use_fuji_rotate", Napi::Boolean::New(env, params.use_fuji_rotate != 0));
  obj.Set("use_p1_correction", Napi::Boolean::New(env, params.use_p1_correction != 0));
  obj.Set("green_matching", Napi::Boolean::New(env, params.green_matching != 0));
  obj.Set("dcb_iterations", Napi::Number::New(env, static_cast<double>(params.dcb_iterations)));
  obj.Set("dcb_enhance_fl", Napi::Boolean::New(env, params.dcb_enhance_fl != 0));
  obj.Set("fbdd_noiserd", Napi::Number::New(env, static_cast<double>(params.fbdd_noiserd)));
  obj.Set("exp_correc", Napi::Boolean::New(env, params.exp_correc != 0));
  obj.Set("exp_shift", Napi::Number::New(env, static_cast<double>(params.exp_shift)));
  obj.Set("exp_preser", Napi::Number::New(env, static_cast<double>(params.exp_preser)));
  obj.Set("no_auto_scale", Napi::Boolean::New(env, params.no_auto_scale != 0));
  obj.Set("no_interpolation", Napi::Boolean::New(env, params.no_interpolation != 0));
  return obj;
}

Napi::Object RawParamsToObject(Napi::Env env, const libraw_raw_unpack_params_t& rawparams) {
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("use_rawspeed", Napi::Number::New(env, static_cast<double>(rawparams.use_rawspeed)));
  obj.Set("use_dngsdk", Napi::Number::New(env, static_cast<double>(rawparams.use_dngsdk)));
  obj.Set("options", Napi::Number::New(env, static_cast<double>(rawparams.options)));
  obj.Set("shot_select", Napi::Number::New(env, static_cast<double>(rawparams.shot_select)));
  obj.Set("specials", Napi::Number::New(env, static_cast<double>(rawparams.specials)));
  obj.Set("max_raw_memory_mb", Napi::Number::New(env, static_cast<double>(rawparams.max_raw_memory_mb)));
  obj.Set("sony_arw2_posterization_thr", Napi::Number::New(env, static_cast<double>(rawparams.sony_arw2_posterization_thr)));
  obj.Set("coolscan_nef_gamma", Napi::Number::New(env, static_cast<double>(rawparams.coolscan_nef_gamma)));
  obj.Set("p4shot_order", Napi::String::New(env, std::string(rawparams.p4shot_order, strnlen(rawparams.p4shot_order, 5))));
  return obj;
}

}  // namespace libraw_node
