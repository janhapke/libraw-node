// GENERATED FILE -- do not edit by hand.
// Regenerate with `npm run gen:metadata-cc` (scripts/gen-metadata-cc.js).
// Source: api/metadata.json (LibRaw 0.22.2).
//
// Implements MetadataToObject, declared by src/metadata.h -- see that
// header's comment and this generator's own header comment for the
// per-field type rules and the three LibRaw-specific special cases
// (color.profile, color.WB_Coeffs/WBCT_Coeffs, makernotes.common.afdata).
#include "../metadata.h"

#include <cstdint>
#include <cstring>
#include <limits>
#include <string>

namespace libraw_node {

namespace {

Napi::Object ToObject_libraw_iparams_t(Napi::Env env, const libraw_iparams_t& s);
Napi::Object ToObject_libraw_image_sizes_t(Napi::Env env, const libraw_image_sizes_t& s);
Napi::Object ToObject_libraw_raw_inset_crop_t(Napi::Env env, const libraw_raw_inset_crop_t& s);
Napi::Object ToObject_libraw_imgother_t(Napi::Env env, const libraw_imgother_t& s);
Napi::Object ToObject_libraw_gps_info_t(Napi::Env env, const libraw_gps_info_t& s);
Napi::Object ToObject_libraw_lensinfo_t(Napi::Env env, const libraw_lensinfo_t& s);
Napi::Object ToObject_libraw_nikonlens_t(Napi::Env env, const libraw_nikonlens_t& s);
Napi::Object ToObject_libraw_dnglens_t(Napi::Env env, const libraw_dnglens_t& s);
Napi::Object ToObject_libraw_makernotes_lens_t(Napi::Env env, const libraw_makernotes_lens_t& s);
Napi::Object ToObject_libraw_colordata_t(Napi::Env env, const libraw_colordata_t& s);
Napi::Object ToObject_struct_ph1_t(Napi::Env env, const ph1_t& s);
Napi::Object ToObject_libraw_dng_color_t(Napi::Env env, const libraw_dng_color_t& s);
Napi::Object ToObject_libraw_dng_levels_t(Napi::Env env, const libraw_dng_levels_t& s);
Napi::Object ToObject_libraw_dng_rawopcode_t(Napi::Env env, const libraw_dng_rawopcode_t& s);
Napi::Object ToObject_libraw_P1_color_t(Napi::Env env, const libraw_P1_color_t& s);
Napi::Object ToObject_libraw_metadata_common_t(Napi::Env env, const libraw_metadata_common_t& s);
Napi::Object ToObject_libraw_afinfo_item_t(Napi::Env env, const libraw_afinfo_item_t& s);
Napi::Object ToObject_libraw_canon_makernotes_t(Napi::Env env, const libraw_canon_makernotes_t& s);
Napi::Object ToObject_libraw_area_t(Napi::Env env, const libraw_area_t& s);
Napi::Object ToObject_libraw_nikon_makernotes_t(Napi::Env env, const libraw_nikon_makernotes_t& s);
Napi::Object ToObject_libraw_sensor_highspeed_crop_t(Napi::Env env, const libraw_sensor_highspeed_crop_t& s);
Napi::Object ToObject_libraw_sony_info_t(Napi::Env env, const libraw_sony_info_t& s);
Napi::Object ToObject_libraw_fuji_info_t(Napi::Env env, const libraw_fuji_info_t& s);
Napi::Object ToObject_libraw_olympus_makernotes_t(Napi::Env env, const libraw_olympus_makernotes_t& s);
Napi::Object ToObject_libraw_panasonic_makernotes_t(Napi::Env env, const libraw_panasonic_makernotes_t& s);
Napi::Object ToObject_libraw_pentax_makernotes_t(Napi::Env env, const libraw_pentax_makernotes_t& s);
Napi::Object ToObject_libraw_samsung_makernotes_t(Napi::Env env, const libraw_samsung_makernotes_t& s);
Napi::Object ToObject_libraw_kodak_makernotes_t(Napi::Env env, const libraw_kodak_makernotes_t& s);
Napi::Object ToObject_libraw_p1_makernotes_t(Napi::Env env, const libraw_p1_makernotes_t& s);
Napi::Object ToObject_libraw_hasselblad_makernotes_t(Napi::Env env, const libraw_hasselblad_makernotes_t& s);
Napi::Object ToObject_libraw_ricoh_makernotes_t(Napi::Env env, const libraw_ricoh_makernotes_t& s);

Napi::Object ToObject_libraw_iparams_t(Napi::Env env, const libraw_iparams_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  {
    std::string str(s.make, strnlen(s.make, 64));
    if (!str.empty()) obj.Set("make", str);
  }
  {
    std::string str(s.model, strnlen(s.model, 64));
    if (!str.empty()) obj.Set("model", str);
  }
  {
    std::string str(s.software, strnlen(s.software, 64));
    if (!str.empty()) obj.Set("software", str);
  }
  {
    std::string str(s.normalized_make, strnlen(s.normalized_make, 64));
    if (!str.empty()) obj.Set("normalized_make", str);
  }
  {
    std::string str(s.normalized_model, strnlen(s.normalized_model, 64));
    if (!str.empty()) obj.Set("normalized_model", str);
  }
  obj.Set("maker_index", Napi::Number::New(env, static_cast<double>(s.maker_index)));
  obj.Set("raw_count", Napi::Number::New(env, static_cast<double>(s.raw_count)));
  if (s.dng_version != 0) {
    obj.Set("dng_version", Napi::Number::New(env, static_cast<double>(s.dng_version)));
  }
  obj.Set("is_foveon", Napi::Number::New(env, static_cast<double>(s.is_foveon)));
  obj.Set("colors", Napi::Number::New(env, static_cast<double>(s.colors)));
  obj.Set("filters", Napi::Number::New(env, static_cast<double>(s.filters)));
  {
    Napi::Array rows = Napi::Array::New(env, 6);
    for (uint32_t i = 0; i < 6; i++) {
      Napi::Array cols = Napi::Array::New(env, 6);
      for (uint32_t j = 0; j < 6; j++) {
        cols.Set(j, Napi::Number::New(env, static_cast<double>(s.xtrans[i][j])));
      }
      rows.Set(i, cols);
    }
    obj.Set("xtrans", rows);
  }
  {
    Napi::Array rows = Napi::Array::New(env, 6);
    for (uint32_t i = 0; i < 6; i++) {
      Napi::Array cols = Napi::Array::New(env, 6);
      for (uint32_t j = 0; j < 6; j++) {
        cols.Set(j, Napi::Number::New(env, static_cast<double>(s.xtrans_abs[i][j])));
      }
      rows.Set(i, cols);
    }
    obj.Set("xtrans_abs", rows);
  }
  {
    std::string str(s.cdesc, strnlen(s.cdesc, 5));
    if (!str.empty()) obj.Set("cdesc", str);
  }
  if (s.xmplen != 0) {
    obj.Set("xmplen", Napi::Number::New(env, static_cast<double>(s.xmplen)));
  }
  return obj;
}

Napi::Object ToObject_libraw_image_sizes_t(Napi::Env env, const libraw_image_sizes_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("raw_height", Napi::Number::New(env, static_cast<double>(s.raw_height)));
  obj.Set("raw_width", Napi::Number::New(env, static_cast<double>(s.raw_width)));
  obj.Set("height", Napi::Number::New(env, static_cast<double>(s.height)));
  obj.Set("width", Napi::Number::New(env, static_cast<double>(s.width)));
  obj.Set("top_margin", Napi::Number::New(env, static_cast<double>(s.top_margin)));
  obj.Set("left_margin", Napi::Number::New(env, static_cast<double>(s.left_margin)));
  obj.Set("iheight", Napi::Number::New(env, static_cast<double>(s.iheight)));
  obj.Set("iwidth", Napi::Number::New(env, static_cast<double>(s.iwidth)));
  obj.Set("raw_pitch", Napi::Number::New(env, static_cast<double>(s.raw_pitch)));
  obj.Set("pixel_aspect", Napi::Number::New(env, static_cast<double>(s.pixel_aspect)));
  obj.Set("flip", Napi::Number::New(env, static_cast<double>(s.flip)));
  {
    Napi::Array rows = Napi::Array::New(env, 8);
    for (uint32_t i = 0; i < 8; i++) {
      Napi::Array cols = Napi::Array::New(env, 4);
      for (uint32_t j = 0; j < 4; j++) {
        cols.Set(j, Napi::Number::New(env, static_cast<double>(s.mask[i][j])));
      }
      rows.Set(i, cols);
    }
    obj.Set("mask", rows);
  }
  if (s.raw_aspect != 0) {
    obj.Set("raw_aspect", Napi::Number::New(env, static_cast<double>(s.raw_aspect)));
  }
  {
    Napi::Array arr = Napi::Array::New(env, 2);
    for (uint32_t i = 0; i < 2; i++) {
      arr.Set(i, ToObject_libraw_raw_inset_crop_t(env, s.raw_inset_crops[i]));
    }
    obj.Set("raw_inset_crops", arr);
  }
  return obj;
}

Napi::Object ToObject_libraw_raw_inset_crop_t(Napi::Env env, const libraw_raw_inset_crop_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  if (s.cleft != 65535) {
    obj.Set("cleft", Napi::Number::New(env, static_cast<double>(s.cleft)));
  }
  if (s.ctop != 65535) {
    obj.Set("ctop", Napi::Number::New(env, static_cast<double>(s.ctop)));
  }
  obj.Set("cwidth", Napi::Number::New(env, static_cast<double>(s.cwidth)));
  obj.Set("cheight", Napi::Number::New(env, static_cast<double>(s.cheight)));
  return obj;
}

Napi::Object ToObject_libraw_imgother_t(Napi::Env env, const libraw_imgother_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("iso_speed", Napi::Number::New(env, static_cast<double>(s.iso_speed)));
  obj.Set("shutter", Napi::Number::New(env, static_cast<double>(s.shutter)));
  obj.Set("aperture", Napi::Number::New(env, static_cast<double>(s.aperture)));
  obj.Set("focal_len", Napi::Number::New(env, static_cast<double>(s.focal_len)));
  obj.Set("timestamp", Napi::Number::New(env, static_cast<double>(s.timestamp)));
  obj.Set("shot_order", Napi::Number::New(env, static_cast<double>(s.shot_order)));
  obj.Set("parsed_gps", ToObject_libraw_gps_info_t(env, s.parsed_gps));
  {
    std::string str(s.desc, strnlen(s.desc, 512));
    if (!str.empty()) obj.Set("desc", str);
  }
  {
    std::string str(s.artist, strnlen(s.artist, 64));
    if (!str.empty()) obj.Set("artist", str);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.analogbalance[i])));
    }
    obj.Set("analogbalance", arr);
  }
  return obj;
}

Napi::Object ToObject_libraw_gps_info_t(Napi::Env env, const libraw_gps_info_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  {
    Napi::Array arr = Napi::Array::New(env, 3);
    for (uint32_t i = 0; i < 3; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.latitude[i])));
    }
    obj.Set("latitude", arr);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 3);
    for (uint32_t i = 0; i < 3; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.longitude[i])));
    }
    obj.Set("longitude", arr);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 3);
    for (uint32_t i = 0; i < 3; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.gpstimestamp[i])));
    }
    obj.Set("gpstimestamp", arr);
  }
  obj.Set("altitude", Napi::Number::New(env, static_cast<double>(s.altitude)));
  if (s.altref != 0) {
    obj.Set("altref", std::string(1, s.altref));
  }
  if (s.latref != 0) {
    obj.Set("latref", std::string(1, s.latref));
  }
  if (s.longref != 0) {
    obj.Set("longref", std::string(1, s.longref));
  }
  if (s.gpsstatus != 0) {
    obj.Set("gpsstatus", std::string(1, s.gpsstatus));
  }
  obj.Set("gpsparsed", Napi::Number::New(env, static_cast<double>(s.gpsparsed)));
  return obj;
}

Napi::Object ToObject_libraw_lensinfo_t(Napi::Env env, const libraw_lensinfo_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  if (s.MinFocal != 0) {
    obj.Set("MinFocal", Napi::Number::New(env, static_cast<double>(s.MinFocal)));
  }
  if (s.MaxFocal != 0) {
    obj.Set("MaxFocal", Napi::Number::New(env, static_cast<double>(s.MaxFocal)));
  }
  if (s.MaxAp4MinFocal != 0) {
    obj.Set("MaxAp4MinFocal", Napi::Number::New(env, static_cast<double>(s.MaxAp4MinFocal)));
  }
  if (s.MaxAp4MaxFocal != 0) {
    obj.Set("MaxAp4MaxFocal", Napi::Number::New(env, static_cast<double>(s.MaxAp4MaxFocal)));
  }
  if (s.EXIF_MaxAp != 0) {
    obj.Set("EXIF_MaxAp", Napi::Number::New(env, static_cast<double>(s.EXIF_MaxAp)));
  }
  {
    std::string str(s.LensMake, strnlen(s.LensMake, 128));
    if (!str.empty()) obj.Set("LensMake", str);
  }
  {
    std::string str(s.Lens, strnlen(s.Lens, 128));
    if (!str.empty()) obj.Set("Lens", str);
  }
  {
    std::string str(s.LensSerial, strnlen(s.LensSerial, 128));
    if (!str.empty()) obj.Set("LensSerial", str);
  }
  {
    std::string str(s.InternalLensSerial, strnlen(s.InternalLensSerial, 128));
    if (!str.empty()) obj.Set("InternalLensSerial", str);
  }
  if (s.FocalLengthIn35mmFormat != 0) {
    obj.Set("FocalLengthIn35mmFormat", Napi::Number::New(env, static_cast<double>(s.FocalLengthIn35mmFormat)));
  }
  obj.Set("nikon", ToObject_libraw_nikonlens_t(env, s.nikon));
  obj.Set("dng", ToObject_libraw_dnglens_t(env, s.dng));
  obj.Set("makernotes", ToObject_libraw_makernotes_lens_t(env, s.makernotes));
  return obj;
}

Napi::Object ToObject_libraw_nikonlens_t(Napi::Env env, const libraw_nikonlens_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  if (s.EffectiveMaxAp != 0) {
    obj.Set("EffectiveMaxAp", Napi::Number::New(env, static_cast<double>(s.EffectiveMaxAp)));
  }
  if (s.LensIDNumber != 0) {
    obj.Set("LensIDNumber", Napi::Number::New(env, static_cast<double>(s.LensIDNumber)));
  }
  if (s.LensFStops != 0) {
    obj.Set("LensFStops", Napi::Number::New(env, static_cast<double>(s.LensFStops)));
  }
  if (s.MCUVersion != 0) {
    obj.Set("MCUVersion", Napi::Number::New(env, static_cast<double>(s.MCUVersion)));
  }
  if (s.LensType != 0) {
    obj.Set("LensType", Napi::Number::New(env, static_cast<double>(s.LensType)));
  }
  return obj;
}

Napi::Object ToObject_libraw_dnglens_t(Napi::Env env, const libraw_dnglens_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  if (s.MinFocal != 0) {
    obj.Set("MinFocal", Napi::Number::New(env, static_cast<double>(s.MinFocal)));
  }
  if (s.MaxFocal != 0) {
    obj.Set("MaxFocal", Napi::Number::New(env, static_cast<double>(s.MaxFocal)));
  }
  if (s.MaxAp4MinFocal != 0) {
    obj.Set("MaxAp4MinFocal", Napi::Number::New(env, static_cast<double>(s.MaxAp4MinFocal)));
  }
  if (s.MaxAp4MaxFocal != 0) {
    obj.Set("MaxAp4MaxFocal", Napi::Number::New(env, static_cast<double>(s.MaxAp4MaxFocal)));
  }
  return obj;
}

Napi::Object ToObject_libraw_makernotes_lens_t(Napi::Env env, const libraw_makernotes_lens_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  {
    uint64_t raw64 = static_cast<uint64_t>(s.LensID);
    if (raw64 != std::numeric_limits<uint64_t>::max()) {
      if (raw64 <= 9007199254740991ULL) {  // Number.MAX_SAFE_INTEGER (2^53 - 1)
        obj.Set("LensID", Napi::Number::New(env, static_cast<double>(raw64)));
      } else {
        obj.Set("LensID", Napi::BigInt::New(env, raw64));
      }
    }
  }
  {
    std::string str(s.Lens, strnlen(s.Lens, 128));
    if (!str.empty()) obj.Set("Lens", str);
  }
  if (s.LensFormat != 0) {
    obj.Set("LensFormat", Napi::Number::New(env, static_cast<double>(s.LensFormat)));
  }
  if (s.LensMount != 0) {
    obj.Set("LensMount", Napi::Number::New(env, static_cast<double>(s.LensMount)));
  }
  {
    uint64_t raw64 = static_cast<uint64_t>(s.CamID);
    if (raw64 != std::numeric_limits<uint64_t>::max()) {
      if (raw64 <= 9007199254740991ULL) {  // Number.MAX_SAFE_INTEGER (2^53 - 1)
        obj.Set("CamID", Napi::Number::New(env, static_cast<double>(raw64)));
      } else {
        obj.Set("CamID", Napi::BigInt::New(env, raw64));
      }
    }
  }
  if (s.CameraFormat != 0) {
    obj.Set("CameraFormat", Napi::Number::New(env, static_cast<double>(s.CameraFormat)));
  }
  if (s.CameraMount != 0) {
    obj.Set("CameraMount", Napi::Number::New(env, static_cast<double>(s.CameraMount)));
  }
  {
    std::string str(s.body, strnlen(s.body, 64));
    if (!str.empty()) obj.Set("body", str);
  }
  obj.Set("FocalType", Napi::Number::New(env, static_cast<double>(s.FocalType)));
  {
    std::string str(s.LensFeatures_pre, strnlen(s.LensFeatures_pre, 16));
    if (!str.empty()) obj.Set("LensFeatures_pre", str);
  }
  {
    std::string str(s.LensFeatures_suf, strnlen(s.LensFeatures_suf, 16));
    if (!str.empty()) obj.Set("LensFeatures_suf", str);
  }
  if (s.MinFocal != 0) {
    obj.Set("MinFocal", Napi::Number::New(env, static_cast<double>(s.MinFocal)));
  }
  if (s.MaxFocal != 0) {
    obj.Set("MaxFocal", Napi::Number::New(env, static_cast<double>(s.MaxFocal)));
  }
  if (s.MaxAp4MinFocal != 0) {
    obj.Set("MaxAp4MinFocal", Napi::Number::New(env, static_cast<double>(s.MaxAp4MinFocal)));
  }
  if (s.MaxAp4MaxFocal != 0) {
    obj.Set("MaxAp4MaxFocal", Napi::Number::New(env, static_cast<double>(s.MaxAp4MaxFocal)));
  }
  if (s.MinAp4MinFocal != 0) {
    obj.Set("MinAp4MinFocal", Napi::Number::New(env, static_cast<double>(s.MinAp4MinFocal)));
  }
  if (s.MinAp4MaxFocal != 0) {
    obj.Set("MinAp4MaxFocal", Napi::Number::New(env, static_cast<double>(s.MinAp4MaxFocal)));
  }
  if (s.MaxAp != 0) {
    obj.Set("MaxAp", Napi::Number::New(env, static_cast<double>(s.MaxAp)));
  }
  if (s.MinAp != 0) {
    obj.Set("MinAp", Napi::Number::New(env, static_cast<double>(s.MinAp)));
  }
  if (s.CurFocal != 0) {
    obj.Set("CurFocal", Napi::Number::New(env, static_cast<double>(s.CurFocal)));
  }
  if (s.CurAp != 0) {
    obj.Set("CurAp", Napi::Number::New(env, static_cast<double>(s.CurAp)));
  }
  if (s.MaxAp4CurFocal != 0) {
    obj.Set("MaxAp4CurFocal", Napi::Number::New(env, static_cast<double>(s.MaxAp4CurFocal)));
  }
  if (s.MinAp4CurFocal != 0) {
    obj.Set("MinAp4CurFocal", Napi::Number::New(env, static_cast<double>(s.MinAp4CurFocal)));
  }
  if (s.MinFocusDistance != 0) {
    obj.Set("MinFocusDistance", Napi::Number::New(env, static_cast<double>(s.MinFocusDistance)));
  }
  if (s.FocusRangeIndex != 0) {
    obj.Set("FocusRangeIndex", Napi::Number::New(env, static_cast<double>(s.FocusRangeIndex)));
  }
  if (s.LensFStops != 0) {
    obj.Set("LensFStops", Napi::Number::New(env, static_cast<double>(s.LensFStops)));
  }
  {
    uint64_t raw64 = static_cast<uint64_t>(s.TeleconverterID);
    if (raw64 != std::numeric_limits<uint64_t>::max()) {
      if (raw64 <= 9007199254740991ULL) {  // Number.MAX_SAFE_INTEGER (2^53 - 1)
        obj.Set("TeleconverterID", Napi::Number::New(env, static_cast<double>(raw64)));
      } else {
        obj.Set("TeleconverterID", Napi::BigInt::New(env, raw64));
      }
    }
  }
  {
    std::string str(s.Teleconverter, strnlen(s.Teleconverter, 128));
    if (!str.empty()) obj.Set("Teleconverter", str);
  }
  {
    uint64_t raw64 = static_cast<uint64_t>(s.AdapterID);
    if (raw64 != std::numeric_limits<uint64_t>::max()) {
      if (raw64 <= 9007199254740991ULL) {  // Number.MAX_SAFE_INTEGER (2^53 - 1)
        obj.Set("AdapterID", Napi::Number::New(env, static_cast<double>(raw64)));
      } else {
        obj.Set("AdapterID", Napi::BigInt::New(env, raw64));
      }
    }
  }
  {
    std::string str(s.Adapter, strnlen(s.Adapter, 128));
    if (!str.empty()) obj.Set("Adapter", str);
  }
  {
    uint64_t raw64 = static_cast<uint64_t>(s.AttachmentID);
    if (raw64 != std::numeric_limits<uint64_t>::max()) {
      if (raw64 <= 9007199254740991ULL) {  // Number.MAX_SAFE_INTEGER (2^53 - 1)
        obj.Set("AttachmentID", Napi::Number::New(env, static_cast<double>(raw64)));
      } else {
        obj.Set("AttachmentID", Napi::BigInt::New(env, raw64));
      }
    }
  }
  {
    std::string str(s.Attachment, strnlen(s.Attachment, 128));
    if (!str.empty()) obj.Set("Attachment", str);
  }
  if (s.FocalUnits != 0) {
    obj.Set("FocalUnits", Napi::Number::New(env, static_cast<double>(s.FocalUnits)));
  }
  if (s.FocalLengthIn35mmFormat != 0) {
    obj.Set("FocalLengthIn35mmFormat", Napi::Number::New(env, static_cast<double>(s.FocalLengthIn35mmFormat)));
  }
  return obj;
}

Napi::Object ToObject_libraw_colordata_t(Napi::Env env, const libraw_colordata_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("black", Napi::Number::New(env, static_cast<double>(s.black)));
  obj.Set("data_maximum", Napi::Number::New(env, static_cast<double>(s.data_maximum)));
  obj.Set("maximum", Napi::Number::New(env, static_cast<double>(s.maximum)));
  {
    Napi::Array arr = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.linear_max[i])));
    }
    obj.Set("linear_max", arr);
  }
  obj.Set("fmaximum", Napi::Number::New(env, static_cast<double>(s.fmaximum)));
  obj.Set("fnorm", Napi::Number::New(env, static_cast<double>(s.fnorm)));
  {
    Napi::Array arr = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.cam_mul[i])));
    }
    obj.Set("cam_mul", arr);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.pre_mul[i])));
    }
    obj.Set("pre_mul", arr);
  }
  {
    Napi::Array rows = Napi::Array::New(env, 3);
    for (uint32_t i = 0; i < 3; i++) {
      Napi::Array cols = Napi::Array::New(env, 4);
      for (uint32_t j = 0; j < 4; j++) {
        cols.Set(j, Napi::Number::New(env, static_cast<double>(s.cmatrix[i][j])));
      }
      rows.Set(i, cols);
    }
    obj.Set("cmatrix", rows);
  }
  {
    Napi::Array rows = Napi::Array::New(env, 3);
    for (uint32_t i = 0; i < 3; i++) {
      Napi::Array cols = Napi::Array::New(env, 4);
      for (uint32_t j = 0; j < 4; j++) {
        cols.Set(j, Napi::Number::New(env, static_cast<double>(s.ccm[i][j])));
      }
      rows.Set(i, cols);
    }
    obj.Set("ccm", rows);
  }
  {
    Napi::Array rows = Napi::Array::New(env, 3);
    for (uint32_t i = 0; i < 3; i++) {
      Napi::Array cols = Napi::Array::New(env, 4);
      for (uint32_t j = 0; j < 4; j++) {
        cols.Set(j, Napi::Number::New(env, static_cast<double>(s.rgb_cam[i][j])));
      }
      rows.Set(i, cols);
    }
    obj.Set("rgb_cam", rows);
  }
  {
    Napi::Array rows = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      Napi::Array cols = Napi::Array::New(env, 3);
      for (uint32_t j = 0; j < 3; j++) {
        cols.Set(j, Napi::Number::New(env, static_cast<double>(s.cam_xyz[i][j])));
      }
      rows.Set(i, cols);
    }
    obj.Set("cam_xyz", rows);
  }
  obj.Set("phase_one_data", ToObject_struct_ph1_t(env, s.phase_one_data));
  obj.Set("flash_used", Napi::Number::New(env, static_cast<double>(s.flash_used)));
  obj.Set("canon_ev", Napi::Number::New(env, static_cast<double>(s.canon_ev)));
  {
    std::string str(s.model2, strnlen(s.model2, 64));
    if (!str.empty()) obj.Set("model2", str);
  }
  {
    std::string str(s.UniqueCameraModel, strnlen(s.UniqueCameraModel, 64));
    if (!str.empty()) obj.Set("UniqueCameraModel", str);
  }
  {
    std::string str(s.LocalizedCameraModel, strnlen(s.LocalizedCameraModel, 64));
    if (!str.empty()) obj.Set("LocalizedCameraModel", str);
  }
  {
    std::string str(s.ImageUniqueID, strnlen(s.ImageUniqueID, 64));
    if (!str.empty()) obj.Set("ImageUniqueID", str);
  }
  {
    std::string str(s.RawDataUniqueID, strnlen(s.RawDataUniqueID, 17));
    if (!str.empty()) obj.Set("RawDataUniqueID", str);
  }
  {
    std::string str(s.OriginalRawFileName, strnlen(s.OriginalRawFileName, 64));
    if (!str.empty()) obj.Set("OriginalRawFileName", str);
  }
  if (s.profile != nullptr && s.profile_length > 0) {
    Napi::Buffer<uint8_t> buf = Napi::Buffer<uint8_t>::New(env, s.profile_length);
    std::memcpy(buf.Data(), s.profile, s.profile_length);
    obj.Set("profile", buf);
  }
  if (s.profile_length != 0) {
    obj.Set("profile_length", Napi::Number::New(env, static_cast<double>(s.profile_length)));
  }
  {
    Napi::Array arr = Napi::Array::New(env, 2);
    for (uint32_t i = 0; i < 2; i++) {
      arr.Set(i, ToObject_libraw_dng_color_t(env, s.dng_color[i]));
    }
    obj.Set("dng_color", arr);
  }
  obj.Set("dng_levels", ToObject_libraw_dng_levels_t(env, s.dng_levels));
  {  // compacted: only set illuminant slots (docs/plan/tasks.md T14a Do list)
    Napi::Array arr = Napi::Array::New(env);
    uint32_t n = 0;
    for (int i = 0; i < 256; i++) {
      const int* c = s.WB_Coeffs[i];
      if (c[0] == 0 && c[1] == 0 && c[2] == 0 && c[3] == 0) continue;
      Napi::Object entry = Napi::Object::New(env);
      entry.Set("illuminant", Napi::Number::New(env, i));
      Napi::Array coeffs = Napi::Array::New(env, 4);
      for (uint32_t k = 0; k < 4; k++) coeffs.Set(k, Napi::Number::New(env, static_cast<double>(c[k])));
      entry.Set("coeffs", coeffs);
      arr.Set(n++, entry);
    }
    obj.Set("WB_Coeffs", arr);
  }
  {  // compacted: only set color-temperature slots (colorTemperature > 0)
    Napi::Array arr = Napi::Array::New(env);
    uint32_t n = 0;
    for (int i = 0; i < 64; i++) {
      const float* c = s.WBCT_Coeffs[i];
      if (!(c[0] > 0)) continue;
      Napi::Object entry = Napi::Object::New(env);
      entry.Set("colorTemperature", Napi::Number::New(env, static_cast<double>(c[0])));
      Napi::Array coeffs = Napi::Array::New(env, 4);
      for (uint32_t k = 0; k < 4; k++) coeffs.Set(k, Napi::Number::New(env, static_cast<double>(c[k + 1])));
      entry.Set("coeffs", coeffs);
      arr.Set(n++, entry);
    }
    obj.Set("WBCT_Coeffs", arr);
  }
  obj.Set("as_shot_wb_applied", Napi::Number::New(env, static_cast<double>(s.as_shot_wb_applied)));
  {
    Napi::Array arr = Napi::Array::New(env, 2);
    for (uint32_t i = 0; i < 2; i++) {
      arr.Set(i, ToObject_libraw_P1_color_t(env, s.P1_color[i]));
    }
    obj.Set("P1_color", arr);
  }
  obj.Set("raw_bps", Napi::Number::New(env, static_cast<double>(s.raw_bps)));
  obj.Set("ExifColorSpace", Napi::Number::New(env, static_cast<double>(s.ExifColorSpace)));
  return obj;
}

Napi::Object ToObject_struct_ph1_t(Napi::Env env, const ph1_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("format", Napi::Number::New(env, static_cast<double>(s.format)));
  obj.Set("key_off", Napi::Number::New(env, static_cast<double>(s.key_off)));
  obj.Set("tag_21a", Napi::Number::New(env, static_cast<double>(s.tag_21a)));
  obj.Set("t_black", Napi::Number::New(env, static_cast<double>(s.t_black)));
  obj.Set("split_col", Napi::Number::New(env, static_cast<double>(s.split_col)));
  obj.Set("black_col", Napi::Number::New(env, static_cast<double>(s.black_col)));
  obj.Set("split_row", Napi::Number::New(env, static_cast<double>(s.split_row)));
  obj.Set("black_row", Napi::Number::New(env, static_cast<double>(s.black_row)));
  obj.Set("tag_210", Napi::Number::New(env, static_cast<double>(s.tag_210)));
  return obj;
}

Napi::Object ToObject_libraw_dng_color_t(Napi::Env env, const libraw_dng_color_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("parsedfields", Napi::Number::New(env, static_cast<double>(s.parsedfields)));
  obj.Set("illuminant", Napi::Number::New(env, static_cast<double>(s.illuminant)));
  {
    Napi::Array rows = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      Napi::Array cols = Napi::Array::New(env, 4);
      for (uint32_t j = 0; j < 4; j++) {
        cols.Set(j, Napi::Number::New(env, static_cast<double>(s.calibration[i][j])));
      }
      rows.Set(i, cols);
    }
    obj.Set("calibration", rows);
  }
  {
    Napi::Array rows = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      Napi::Array cols = Napi::Array::New(env, 3);
      for (uint32_t j = 0; j < 3; j++) {
        cols.Set(j, Napi::Number::New(env, static_cast<double>(s.colormatrix[i][j])));
      }
      rows.Set(i, cols);
    }
    obj.Set("colormatrix", rows);
  }
  {
    Napi::Array rows = Napi::Array::New(env, 3);
    for (uint32_t i = 0; i < 3; i++) {
      Napi::Array cols = Napi::Array::New(env, 4);
      for (uint32_t j = 0; j < 4; j++) {
        cols.Set(j, Napi::Number::New(env, static_cast<double>(s.forwardmatrix[i][j])));
      }
      rows.Set(i, cols);
    }
    obj.Set("forwardmatrix", rows);
  }
  return obj;
}

Napi::Object ToObject_libraw_dng_levels_t(Napi::Env env, const libraw_dng_levels_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("parsedfields", Napi::Number::New(env, static_cast<double>(s.parsedfields)));
  obj.Set("dng_black", Napi::Number::New(env, static_cast<double>(s.dng_black)));
  obj.Set("dng_fblack", Napi::Number::New(env, static_cast<double>(s.dng_fblack)));
  {
    Napi::Array arr = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.dng_whitelevel[i])));
    }
    obj.Set("dng_whitelevel", arr);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.default_crop[i])));
    }
    obj.Set("default_crop", arr);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.user_crop[i])));
    }
    obj.Set("user_crop", arr);
  }
  obj.Set("preview_colorspace", Napi::Number::New(env, static_cast<double>(s.preview_colorspace)));
  {
    Napi::Array arr = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.analogbalance[i])));
    }
    obj.Set("analogbalance", arr);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.asshotneutral[i])));
    }
    obj.Set("asshotneutral", arr);
  }
  obj.Set("baseline_exposure", Napi::Number::New(env, static_cast<double>(s.baseline_exposure)));
  obj.Set("LinearResponseLimit", Napi::Number::New(env, static_cast<double>(s.LinearResponseLimit)));
  {
    Napi::Array arr = Napi::Array::New(env, 3);
    for (uint32_t i = 0; i < 3; i++) {
      arr.Set(i, ToObject_libraw_dng_rawopcode_t(env, s.rawopcodes[i]));
    }
    obj.Set("rawopcodes", arr);
  }
  return obj;
}

Napi::Object ToObject_libraw_dng_rawopcode_t(Napi::Env env, const libraw_dng_rawopcode_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("len", Napi::Number::New(env, static_cast<double>(s.len)));
  return obj;
}

Napi::Object ToObject_libraw_P1_color_t(Napi::Env env, const libraw_P1_color_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  {
    Napi::Array arr = Napi::Array::New(env, 9);
    for (uint32_t i = 0; i < 9; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.romm_cam[i])));
    }
    obj.Set("romm_cam", arr);
  }
  return obj;
}

Napi::Object ToObject_libraw_metadata_common_t(Napi::Env env, const libraw_metadata_common_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("FlashEC", Napi::Number::New(env, static_cast<double>(s.FlashEC)));
  obj.Set("FlashGN", Napi::Number::New(env, static_cast<double>(s.FlashGN)));
  obj.Set("CameraTemperature", Napi::Number::New(env, static_cast<double>(s.CameraTemperature)));
  obj.Set("SensorTemperature", Napi::Number::New(env, static_cast<double>(s.SensorTemperature)));
  obj.Set("SensorTemperature2", Napi::Number::New(env, static_cast<double>(s.SensorTemperature2)));
  obj.Set("LensTemperature", Napi::Number::New(env, static_cast<double>(s.LensTemperature)));
  obj.Set("AmbientTemperature", Napi::Number::New(env, static_cast<double>(s.AmbientTemperature)));
  obj.Set("BatteryTemperature", Napi::Number::New(env, static_cast<double>(s.BatteryTemperature)));
  obj.Set("exifAmbientTemperature", Napi::Number::New(env, static_cast<double>(s.exifAmbientTemperature)));
  obj.Set("exifHumidity", Napi::Number::New(env, static_cast<double>(s.exifHumidity)));
  obj.Set("exifPressure", Napi::Number::New(env, static_cast<double>(s.exifPressure)));
  obj.Set("exifWaterDepth", Napi::Number::New(env, static_cast<double>(s.exifWaterDepth)));
  obj.Set("exifAcceleration", Napi::Number::New(env, static_cast<double>(s.exifAcceleration)));
  obj.Set("exifCameraElevationAngle", Napi::Number::New(env, static_cast<double>(s.exifCameraElevationAngle)));
  obj.Set("real_ISO", Napi::Number::New(env, static_cast<double>(s.real_ISO)));
  obj.Set("exifExposureIndex", Napi::Number::New(env, static_cast<double>(s.exifExposureIndex)));
  obj.Set("ColorSpace", Napi::Number::New(env, static_cast<double>(s.ColorSpace)));
  {
    std::string str(s.firmware, strnlen(s.firmware, 128));
    if (!str.empty()) obj.Set("firmware", str);
  }
  obj.Set("ExposureCalibrationShift", Napi::Number::New(env, static_cast<double>(s.ExposureCalibrationShift)));
  {  // only the first afcount of the fixed LIBRAW_AFDATA_MAXCOUNT slots are valid
    int count = s.afcount;
    if (count < 0) count = 0;
    if (count > 4) count = 4;
    Napi::Array arr = Napi::Array::New(env, static_cast<uint32_t>(count));
    for (int i = 0; i < count; i++) {
      arr.Set(static_cast<uint32_t>(i), ToObject_libraw_afinfo_item_t(env, s.afdata[i]));
    }
    obj.Set("afdata", arr);
  }
  obj.Set("afcount", Napi::Number::New(env, static_cast<double>(s.afcount)));
  return obj;
}

Napi::Object ToObject_libraw_afinfo_item_t(Napi::Env env, const libraw_afinfo_item_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("AFInfoData_tag", Napi::Number::New(env, static_cast<double>(s.AFInfoData_tag)));
  obj.Set("AFInfoData_order", Napi::Number::New(env, static_cast<double>(s.AFInfoData_order)));
  obj.Set("AFInfoData_version", Napi::Number::New(env, static_cast<double>(s.AFInfoData_version)));
  obj.Set("AFInfoData_length", Napi::Number::New(env, static_cast<double>(s.AFInfoData_length)));
  return obj;
}

Napi::Object ToObject_libraw_canon_makernotes_t(Napi::Env env, const libraw_canon_makernotes_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("ColorDataVer", Napi::Number::New(env, static_cast<double>(s.ColorDataVer)));
  obj.Set("ColorDataSubVer", Napi::Number::New(env, static_cast<double>(s.ColorDataSubVer)));
  obj.Set("SpecularWhiteLevel", Napi::Number::New(env, static_cast<double>(s.SpecularWhiteLevel)));
  obj.Set("NormalWhiteLevel", Napi::Number::New(env, static_cast<double>(s.NormalWhiteLevel)));
  {
    Napi::Array arr = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.ChannelBlackLevel[i])));
    }
    obj.Set("ChannelBlackLevel", arr);
  }
  obj.Set("AverageBlackLevel", Napi::Number::New(env, static_cast<double>(s.AverageBlackLevel)));
  {
    Napi::Array arr = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.multishot[i])));
    }
    obj.Set("multishot", arr);
  }
  obj.Set("MeteringMode", Napi::Number::New(env, static_cast<double>(s.MeteringMode)));
  obj.Set("SpotMeteringMode", Napi::Number::New(env, static_cast<double>(s.SpotMeteringMode)));
  obj.Set("FlashMeteringMode", Napi::Number::New(env, static_cast<double>(s.FlashMeteringMode)));
  obj.Set("FlashExposureLock", Napi::Number::New(env, static_cast<double>(s.FlashExposureLock)));
  obj.Set("ExposureMode", Napi::Number::New(env, static_cast<double>(s.ExposureMode)));
  obj.Set("AESetting", Napi::Number::New(env, static_cast<double>(s.AESetting)));
  obj.Set("ImageStabilization", Napi::Number::New(env, static_cast<double>(s.ImageStabilization)));
  obj.Set("FlashMode", Napi::Number::New(env, static_cast<double>(s.FlashMode)));
  obj.Set("FlashActivity", Napi::Number::New(env, static_cast<double>(s.FlashActivity)));
  obj.Set("FlashBits", Napi::Number::New(env, static_cast<double>(s.FlashBits)));
  obj.Set("ManualFlashOutput", Napi::Number::New(env, static_cast<double>(s.ManualFlashOutput)));
  obj.Set("FlashOutput", Napi::Number::New(env, static_cast<double>(s.FlashOutput)));
  obj.Set("FlashGuideNumber", Napi::Number::New(env, static_cast<double>(s.FlashGuideNumber)));
  obj.Set("ContinuousDrive", Napi::Number::New(env, static_cast<double>(s.ContinuousDrive)));
  obj.Set("SensorWidth", Napi::Number::New(env, static_cast<double>(s.SensorWidth)));
  obj.Set("SensorHeight", Napi::Number::New(env, static_cast<double>(s.SensorHeight)));
  obj.Set("AFMicroAdjMode", Napi::Number::New(env, static_cast<double>(s.AFMicroAdjMode)));
  obj.Set("AFMicroAdjValue", Napi::Number::New(env, static_cast<double>(s.AFMicroAdjValue)));
  obj.Set("MakernotesFlip", Napi::Number::New(env, static_cast<double>(s.MakernotesFlip)));
  obj.Set("AutoRotateMode", Napi::Number::New(env, static_cast<double>(s.AutoRotateMode)));
  obj.Set("RecordMode", Napi::Number::New(env, static_cast<double>(s.RecordMode)));
  obj.Set("SRAWQuality", Napi::Number::New(env, static_cast<double>(s.SRAWQuality)));
  obj.Set("wbi", Napi::Number::New(env, static_cast<double>(s.wbi)));
  obj.Set("RF_lensID", Napi::Number::New(env, static_cast<double>(s.RF_lensID)));
  obj.Set("AutoLightingOptimizer", Napi::Number::New(env, static_cast<double>(s.AutoLightingOptimizer)));
  obj.Set("HighlightTonePriority", Napi::Number::New(env, static_cast<double>(s.HighlightTonePriority)));
  if (s.Quality != -1) {
    obj.Set("Quality", Napi::Number::New(env, static_cast<double>(s.Quality)));
  }
  obj.Set("CanonLog", Napi::Number::New(env, static_cast<double>(s.CanonLog)));
  obj.Set("DefaultCropAbsolute", ToObject_libraw_area_t(env, s.DefaultCropAbsolute));
  obj.Set("RecommendedImageArea", ToObject_libraw_area_t(env, s.RecommendedImageArea));
  obj.Set("LeftOpticalBlack", ToObject_libraw_area_t(env, s.LeftOpticalBlack));
  obj.Set("UpperOpticalBlack", ToObject_libraw_area_t(env, s.UpperOpticalBlack));
  obj.Set("ActiveArea", ToObject_libraw_area_t(env, s.ActiveArea));
  {
    Napi::Array arr = Napi::Array::New(env, 2);
    for (uint32_t i = 0; i < 2; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.ISOgain[i])));
    }
    obj.Set("ISOgain", arr);
  }
  return obj;
}

Napi::Object ToObject_libraw_area_t(Napi::Env env, const libraw_area_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("t", Napi::Number::New(env, static_cast<double>(s.t)));
  obj.Set("l", Napi::Number::New(env, static_cast<double>(s.l)));
  obj.Set("b", Napi::Number::New(env, static_cast<double>(s.b)));
  obj.Set("r", Napi::Number::New(env, static_cast<double>(s.r)));
  return obj;
}

Napi::Object ToObject_libraw_nikon_makernotes_t(Napi::Env env, const libraw_nikon_makernotes_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("ExposureBracketValue", Napi::Number::New(env, static_cast<double>(s.ExposureBracketValue)));
  obj.Set("ActiveDLighting", Napi::Number::New(env, static_cast<double>(s.ActiveDLighting)));
  obj.Set("ShootingMode", Napi::Number::New(env, static_cast<double>(s.ShootingMode)));
  {
    Napi::Buffer<uint8_t> buf = Napi::Buffer<uint8_t>::New(env, 7);
    std::memcpy(buf.Data(), s.ImageStabilization, 7);
    obj.Set("ImageStabilization", buf);
  }
  obj.Set("VibrationReduction", Napi::Number::New(env, static_cast<double>(s.VibrationReduction)));
  obj.Set("VRMode", Napi::Number::New(env, static_cast<double>(s.VRMode)));
  {
    std::string str(s.FlashSetting, strnlen(s.FlashSetting, 13));
    if (!str.empty()) obj.Set("FlashSetting", str);
  }
  {
    std::string str(s.FlashType, strnlen(s.FlashType, 20));
    if (!str.empty()) obj.Set("FlashType", str);
  }
  {
    Napi::Buffer<uint8_t> buf = Napi::Buffer<uint8_t>::New(env, 4);
    std::memcpy(buf.Data(), s.FlashExposureCompensation, 4);
    obj.Set("FlashExposureCompensation", buf);
  }
  {
    Napi::Buffer<uint8_t> buf = Napi::Buffer<uint8_t>::New(env, 4);
    std::memcpy(buf.Data(), s.ExternalFlashExposureComp, 4);
    obj.Set("ExternalFlashExposureComp", buf);
  }
  {
    Napi::Buffer<uint8_t> buf = Napi::Buffer<uint8_t>::New(env, 4);
    std::memcpy(buf.Data(), s.FlashExposureBracketValue, 4);
    obj.Set("FlashExposureBracketValue", buf);
  }
  obj.Set("FlashMode", Napi::Number::New(env, static_cast<double>(s.FlashMode)));
  obj.Set("FlashExposureCompensation2", Napi::Number::New(env, static_cast<double>(s.FlashExposureCompensation2)));
  obj.Set("FlashExposureCompensation3", Napi::Number::New(env, static_cast<double>(s.FlashExposureCompensation3)));
  obj.Set("FlashExposureCompensation4", Napi::Number::New(env, static_cast<double>(s.FlashExposureCompensation4)));
  obj.Set("FlashSource", Napi::Number::New(env, static_cast<double>(s.FlashSource)));
  {
    Napi::Buffer<uint8_t> buf = Napi::Buffer<uint8_t>::New(env, 2);
    std::memcpy(buf.Data(), s.FlashFirmware, 2);
    obj.Set("FlashFirmware", buf);
  }
  obj.Set("ExternalFlashFlags", Napi::Number::New(env, static_cast<double>(s.ExternalFlashFlags)));
  obj.Set("FlashControlCommanderMode", Napi::Number::New(env, static_cast<double>(s.FlashControlCommanderMode)));
  obj.Set("FlashOutputAndCompensation", Napi::Number::New(env, static_cast<double>(s.FlashOutputAndCompensation)));
  obj.Set("FlashFocalLength", Napi::Number::New(env, static_cast<double>(s.FlashFocalLength)));
  obj.Set("FlashGNDistance", Napi::Number::New(env, static_cast<double>(s.FlashGNDistance)));
  {
    Napi::Buffer<uint8_t> buf = Napi::Buffer<uint8_t>::New(env, 4);
    std::memcpy(buf.Data(), s.FlashGroupControlMode, 4);
    obj.Set("FlashGroupControlMode", buf);
  }
  {
    Napi::Buffer<uint8_t> buf = Napi::Buffer<uint8_t>::New(env, 4);
    std::memcpy(buf.Data(), s.FlashGroupOutputAndCompensation, 4);
    obj.Set("FlashGroupOutputAndCompensation", buf);
  }
  obj.Set("FlashColorFilter", Napi::Number::New(env, static_cast<double>(s.FlashColorFilter)));
  obj.Set("NEFCompression", Napi::Number::New(env, static_cast<double>(s.NEFCompression)));
  obj.Set("ExposureMode", Napi::Number::New(env, static_cast<double>(s.ExposureMode)));
  obj.Set("ExposureProgram", Napi::Number::New(env, static_cast<double>(s.ExposureProgram)));
  obj.Set("nMEshots", Napi::Number::New(env, static_cast<double>(s.nMEshots)));
  obj.Set("MEgainOn", Napi::Number::New(env, static_cast<double>(s.MEgainOn)));
  {
    Napi::Array arr = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.ME_WB[i])));
    }
    obj.Set("ME_WB", arr);
  }
  obj.Set("AFFineTune", Napi::Number::New(env, static_cast<double>(s.AFFineTune)));
  obj.Set("AFFineTuneIndex", Napi::Number::New(env, static_cast<double>(s.AFFineTuneIndex)));
  obj.Set("AFFineTuneAdj", Napi::Number::New(env, static_cast<double>(s.AFFineTuneAdj)));
  obj.Set("LensDataVersion", Napi::Number::New(env, static_cast<double>(s.LensDataVersion)));
  obj.Set("FlashInfoVersion", Napi::Number::New(env, static_cast<double>(s.FlashInfoVersion)));
  obj.Set("ColorBalanceVersion", Napi::Number::New(env, static_cast<double>(s.ColorBalanceVersion)));
  obj.Set("key", Napi::Number::New(env, static_cast<double>(s.key)));
  {
    Napi::Array arr = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.NEFBitDepth[i])));
    }
    obj.Set("NEFBitDepth", arr);
  }
  obj.Set("HighSpeedCropFormat", Napi::Number::New(env, static_cast<double>(s.HighSpeedCropFormat)));
  obj.Set("SensorHighSpeedCrop", ToObject_libraw_sensor_highspeed_crop_t(env, s.SensorHighSpeedCrop));
  obj.Set("SensorWidth", Napi::Number::New(env, static_cast<double>(s.SensorWidth)));
  obj.Set("SensorHeight", Napi::Number::New(env, static_cast<double>(s.SensorHeight)));
  obj.Set("Active_D_Lighting", Napi::Number::New(env, static_cast<double>(s.Active_D_Lighting)));
  obj.Set("PictureControlVersion", Napi::Number::New(env, static_cast<double>(s.PictureControlVersion)));
  {
    std::string str(s.PictureControlName, strnlen(s.PictureControlName, 20));
    if (!str.empty()) obj.Set("PictureControlName", str);
  }
  {
    std::string str(s.PictureControlBase, strnlen(s.PictureControlBase, 20));
    if (!str.empty()) obj.Set("PictureControlBase", str);
  }
  obj.Set("ShotInfoVersion", Napi::Number::New(env, static_cast<double>(s.ShotInfoVersion)));
  {
    std::string str(s.ShotInfoFirmware, strnlen(s.ShotInfoFirmware, 9));
    if (!str.empty()) obj.Set("ShotInfoFirmware", str);
  }
  obj.Set("BurstTable_0x0056_len", Napi::Number::New(env, static_cast<double>(s.BurstTable_0x0056_len)));
  obj.Set("BurstTable_0x0056_ver", Napi::Number::New(env, static_cast<double>(s.BurstTable_0x0056_ver)));
  obj.Set("BurstTable_0x0056_gid", Napi::Number::New(env, static_cast<double>(s.BurstTable_0x0056_gid)));
  obj.Set("BurstTable_0x0056_fnum", Napi::Number::New(env, static_cast<double>(s.BurstTable_0x0056_fnum)));
  obj.Set("MakernotesFlip", Napi::Number::New(env, static_cast<double>(s.MakernotesFlip)));
  obj.Set("RollAngle", Napi::Number::New(env, static_cast<double>(s.RollAngle)));
  obj.Set("PitchAngle", Napi::Number::New(env, static_cast<double>(s.PitchAngle)));
  obj.Set("YawAngle", Napi::Number::New(env, static_cast<double>(s.YawAngle)));
  return obj;
}

Napi::Object ToObject_libraw_sensor_highspeed_crop_t(Napi::Env env, const libraw_sensor_highspeed_crop_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("cleft", Napi::Number::New(env, static_cast<double>(s.cleft)));
  obj.Set("ctop", Napi::Number::New(env, static_cast<double>(s.ctop)));
  obj.Set("cwidth", Napi::Number::New(env, static_cast<double>(s.cwidth)));
  obj.Set("cheight", Napi::Number::New(env, static_cast<double>(s.cheight)));
  return obj;
}

Napi::Object ToObject_libraw_sony_info_t(Napi::Env env, const libraw_sony_info_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  if (s.CameraType != 65535) {
    obj.Set("CameraType", Napi::Number::New(env, static_cast<double>(s.CameraType)));
  }
  if (s.Sony0x9400_version != 0) {
    obj.Set("Sony0x9400_version", Napi::Number::New(env, static_cast<double>(s.Sony0x9400_version)));
  }
  obj.Set("Sony0x9400_ReleaseMode2", Napi::Number::New(env, static_cast<double>(s.Sony0x9400_ReleaseMode2)));
  obj.Set("Sony0x9400_SequenceImageNumber", Napi::Number::New(env, static_cast<double>(s.Sony0x9400_SequenceImageNumber)));
  obj.Set("Sony0x9400_SequenceLength1", Napi::Number::New(env, static_cast<double>(s.Sony0x9400_SequenceLength1)));
  obj.Set("Sony0x9400_SequenceFileNumber", Napi::Number::New(env, static_cast<double>(s.Sony0x9400_SequenceFileNumber)));
  obj.Set("Sony0x9400_SequenceLength2", Napi::Number::New(env, static_cast<double>(s.Sony0x9400_SequenceLength2)));
  if (s.AFAreaModeSetting != 255) {
    obj.Set("AFAreaModeSetting", Napi::Number::New(env, static_cast<double>(s.AFAreaModeSetting)));
  }
  if (s.AFAreaMode != 65535) {
    obj.Set("AFAreaMode", Napi::Number::New(env, static_cast<double>(s.AFAreaMode)));
  }
  {
    Napi::Array arr = Napi::Array::New(env, 2);
    for (uint32_t i = 0; i < 2; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.FlexibleSpotPosition[i])));
    }
    obj.Set("FlexibleSpotPosition", arr);
  }
  if (s.AFPointSelected != 255) {
    obj.Set("AFPointSelected", Napi::Number::New(env, static_cast<double>(s.AFPointSelected)));
  }
  if (s.AFPointSelected_0x201e != 255) {
    obj.Set("AFPointSelected_0x201e", Napi::Number::New(env, static_cast<double>(s.AFPointSelected_0x201e)));
  }
  obj.Set("nAFPointsUsed", Napi::Number::New(env, static_cast<double>(s.nAFPointsUsed)));
  {
    Napi::Array arr = Napi::Array::New(env, 10);
    for (uint32_t i = 0; i < 10; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.AFPointsUsed[i])));
    }
    obj.Set("AFPointsUsed", arr);
  }
  if (s.AFTracking != 255) {
    obj.Set("AFTracking", Napi::Number::New(env, static_cast<double>(s.AFTracking)));
  }
  obj.Set("AFType", Napi::Number::New(env, static_cast<double>(s.AFType)));
  {
    Napi::Array arr = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.FocusLocation[i])));
    }
    obj.Set("FocusLocation", arr);
  }
  if (s.FocusPosition != 65535) {
    obj.Set("FocusPosition", Napi::Number::New(env, static_cast<double>(s.FocusPosition)));
  }
  if (s.AFMicroAdjValue != 127) {
    obj.Set("AFMicroAdjValue", Napi::Number::New(env, static_cast<double>(s.AFMicroAdjValue)));
  }
  if (s.AFMicroAdjOn != -1) {
    obj.Set("AFMicroAdjOn", Napi::Number::New(env, static_cast<double>(s.AFMicroAdjOn)));
  }
  if (s.AFMicroAdjRegisteredLenses != 255) {
    obj.Set("AFMicroAdjRegisteredLenses", Napi::Number::New(env, static_cast<double>(s.AFMicroAdjRegisteredLenses)));
  }
  obj.Set("VariableLowPassFilter", Napi::Number::New(env, static_cast<double>(s.VariableLowPassFilter)));
  if (s.LongExposureNoiseReduction != 4294967295) {
    obj.Set("LongExposureNoiseReduction", Napi::Number::New(env, static_cast<double>(s.LongExposureNoiseReduction)));
  }
  if (s.HighISONoiseReduction != 65535) {
    obj.Set("HighISONoiseReduction", Napi::Number::New(env, static_cast<double>(s.HighISONoiseReduction)));
  }
  {
    Napi::Array arr = Napi::Array::New(env, 2);
    for (uint32_t i = 0; i < 2; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.HDR[i])));
    }
    obj.Set("HDR", arr);
  }
  obj.Set("group2010", Napi::Number::New(env, static_cast<double>(s.group2010)));
  obj.Set("group9050", Napi::Number::New(env, static_cast<double>(s.group9050)));
  obj.Set("len_group9050", Napi::Number::New(env, static_cast<double>(s.len_group9050)));
  if (s.real_iso_offset != 65535) {
    obj.Set("real_iso_offset", Napi::Number::New(env, static_cast<double>(s.real_iso_offset)));
  }
  obj.Set("MeteringMode_offset", Napi::Number::New(env, static_cast<double>(s.MeteringMode_offset)));
  obj.Set("ExposureProgram_offset", Napi::Number::New(env, static_cast<double>(s.ExposureProgram_offset)));
  obj.Set("ReleaseMode2_offset", Napi::Number::New(env, static_cast<double>(s.ReleaseMode2_offset)));
  if (s.MinoltaCamID != 4294967295) {
    obj.Set("MinoltaCamID", Napi::Number::New(env, static_cast<double>(s.MinoltaCamID)));
  }
  obj.Set("firmware", Napi::Number::New(env, static_cast<double>(s.firmware)));
  if (s.ImageCount3_offset != 65535) {
    obj.Set("ImageCount3_offset", Napi::Number::New(env, static_cast<double>(s.ImageCount3_offset)));
  }
  obj.Set("ImageCount3", Napi::Number::New(env, static_cast<double>(s.ImageCount3)));
  if (s.ElectronicFrontCurtainShutter != 4294967295) {
    obj.Set("ElectronicFrontCurtainShutter", Napi::Number::New(env, static_cast<double>(s.ElectronicFrontCurtainShutter)));
  }
  obj.Set("MeteringMode2", Napi::Number::New(env, static_cast<double>(s.MeteringMode2)));
  {
    std::string str(s.SonyDateTime, strnlen(s.SonyDateTime, 20));
    if (!str.empty()) obj.Set("SonyDateTime", str);
  }
  obj.Set("ShotNumberSincePowerUp", Napi::Number::New(env, static_cast<double>(s.ShotNumberSincePowerUp)));
  obj.Set("PixelShiftGroupPrefix", Napi::Number::New(env, static_cast<double>(s.PixelShiftGroupPrefix)));
  obj.Set("PixelShiftGroupID", Napi::Number::New(env, static_cast<double>(s.PixelShiftGroupID)));
  if (s.nShotsInPixelShiftGroup != 0) {
    obj.Set("nShotsInPixelShiftGroup", std::string(1, s.nShotsInPixelShiftGroup));
  }
  if (s.numInPixelShiftGroup != 0) {
    obj.Set("numInPixelShiftGroup", std::string(1, s.numInPixelShiftGroup));
  }
  obj.Set("prd_ImageHeight", Napi::Number::New(env, static_cast<double>(s.prd_ImageHeight)));
  obj.Set("prd_ImageWidth", Napi::Number::New(env, static_cast<double>(s.prd_ImageWidth)));
  obj.Set("prd_Total_bps", Napi::Number::New(env, static_cast<double>(s.prd_Total_bps)));
  obj.Set("prd_Active_bps", Napi::Number::New(env, static_cast<double>(s.prd_Active_bps)));
  obj.Set("prd_StorageMethod", Napi::Number::New(env, static_cast<double>(s.prd_StorageMethod)));
  if (s.prd_BayerPattern != 0) {
    obj.Set("prd_BayerPattern", Napi::Number::New(env, static_cast<double>(s.prd_BayerPattern)));
  }
  if (s.SonyRawFileType != 65535) {
    obj.Set("SonyRawFileType", Napi::Number::New(env, static_cast<double>(s.SonyRawFileType)));
  }
  if (s.RAWFileType != 65535) {
    obj.Set("RAWFileType", Napi::Number::New(env, static_cast<double>(s.RAWFileType)));
  }
  if (s.RawSizeType != 65535) {
    obj.Set("RawSizeType", Napi::Number::New(env, static_cast<double>(s.RawSizeType)));
  }
  if (s.Quality != 4294967295) {
    obj.Set("Quality", Napi::Number::New(env, static_cast<double>(s.Quality)));
  }
  obj.Set("FileFormat", Napi::Number::New(env, static_cast<double>(s.FileFormat)));
  {
    std::string str(s.MetaVersion, strnlen(s.MetaVersion, 16));
    if (!str.empty()) obj.Set("MetaVersion", str);
  }
  obj.Set("AspectRatio", Napi::Number::New(env, static_cast<double>(s.AspectRatio)));
  return obj;
}

Napi::Object ToObject_libraw_fuji_info_t(Napi::Env env, const libraw_fuji_info_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("ExpoMidPointShift", Napi::Number::New(env, static_cast<double>(s.ExpoMidPointShift)));
  obj.Set("DynamicRange", Napi::Number::New(env, static_cast<double>(s.DynamicRange)));
  obj.Set("FilmMode", Napi::Number::New(env, static_cast<double>(s.FilmMode)));
  obj.Set("DynamicRangeSetting", Napi::Number::New(env, static_cast<double>(s.DynamicRangeSetting)));
  obj.Set("DevelopmentDynamicRange", Napi::Number::New(env, static_cast<double>(s.DevelopmentDynamicRange)));
  obj.Set("AutoDynamicRange", Napi::Number::New(env, static_cast<double>(s.AutoDynamicRange)));
  obj.Set("DRangePriority", Napi::Number::New(env, static_cast<double>(s.DRangePriority)));
  obj.Set("DRangePriorityAuto", Napi::Number::New(env, static_cast<double>(s.DRangePriorityAuto)));
  obj.Set("DRangePriorityFixed", Napi::Number::New(env, static_cast<double>(s.DRangePriorityFixed)));
  {
    std::string str(s.FujiModel, strnlen(s.FujiModel, 33));
    if (!str.empty()) obj.Set("FujiModel", str);
  }
  {
    std::string str(s.FujiModel2, strnlen(s.FujiModel2, 33));
    if (!str.empty()) obj.Set("FujiModel2", str);
  }
  obj.Set("BrightnessCompensation", Napi::Number::New(env, static_cast<double>(s.BrightnessCompensation)));
  obj.Set("FocusMode", Napi::Number::New(env, static_cast<double>(s.FocusMode)));
  obj.Set("AFMode", Napi::Number::New(env, static_cast<double>(s.AFMode)));
  {
    Napi::Array arr = Napi::Array::New(env, 2);
    for (uint32_t i = 0; i < 2; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.FocusPixel[i])));
    }
    obj.Set("FocusPixel", arr);
  }
  obj.Set("PrioritySettings", Napi::Number::New(env, static_cast<double>(s.PrioritySettings)));
  obj.Set("FocusSettings", Napi::Number::New(env, static_cast<double>(s.FocusSettings)));
  obj.Set("AF_C_Settings", Napi::Number::New(env, static_cast<double>(s.AF_C_Settings)));
  obj.Set("FocusWarning", Napi::Number::New(env, static_cast<double>(s.FocusWarning)));
  {
    Napi::Array arr = Napi::Array::New(env, 3);
    for (uint32_t i = 0; i < 3; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.ImageStabilization[i])));
    }
    obj.Set("ImageStabilization", arr);
  }
  obj.Set("FlashMode", Napi::Number::New(env, static_cast<double>(s.FlashMode)));
  obj.Set("WB_Preset", Napi::Number::New(env, static_cast<double>(s.WB_Preset)));
  obj.Set("ShutterType", Napi::Number::New(env, static_cast<double>(s.ShutterType)));
  obj.Set("ExrMode", Napi::Number::New(env, static_cast<double>(s.ExrMode)));
  obj.Set("Macro", Napi::Number::New(env, static_cast<double>(s.Macro)));
  obj.Set("Rating", Napi::Number::New(env, static_cast<double>(s.Rating)));
  obj.Set("CropMode", Napi::Number::New(env, static_cast<double>(s.CropMode)));
  {
    std::string str(s.SerialSignature, strnlen(s.SerialSignature, 13));
    if (!str.empty()) obj.Set("SerialSignature", str);
  }
  {
    std::string str(s.SensorID, strnlen(s.SensorID, 5));
    if (!str.empty()) obj.Set("SensorID", str);
  }
  {
    std::string str(s.RAFVersion, strnlen(s.RAFVersion, 5));
    if (!str.empty()) obj.Set("RAFVersion", str);
  }
  if (s.RAFDataGeneration != 0) {
    obj.Set("RAFDataGeneration", Napi::Number::New(env, static_cast<double>(s.RAFDataGeneration)));
  }
  obj.Set("RAFDataVersion", Napi::Number::New(env, static_cast<double>(s.RAFDataVersion)));
  obj.Set("isTSNERDTS", Napi::Number::New(env, static_cast<double>(s.isTSNERDTS)));
  obj.Set("DriveMode", Napi::Number::New(env, static_cast<double>(s.DriveMode)));
  {
    Napi::Array arr = Napi::Array::New(env, 9);
    for (uint32_t i = 0; i < 9; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.BlackLevel[i])));
    }
    obj.Set("BlackLevel", arr);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 32);
    for (uint32_t i = 0; i < 32; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.RAFData_ImageSizeTable[i])));
    }
    obj.Set("RAFData_ImageSizeTable", arr);
  }
  obj.Set("AutoBracketing", Napi::Number::New(env, static_cast<double>(s.AutoBracketing)));
  obj.Set("SequenceNumber", Napi::Number::New(env, static_cast<double>(s.SequenceNumber)));
  obj.Set("SeriesLength", Napi::Number::New(env, static_cast<double>(s.SeriesLength)));
  {
    Napi::Array arr = Napi::Array::New(env, 2);
    for (uint32_t i = 0; i < 2; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.PixelShiftOffset[i])));
    }
    obj.Set("PixelShiftOffset", arr);
  }
  obj.Set("ImageCount", Napi::Number::New(env, static_cast<double>(s.ImageCount)));
  return obj;
}

Napi::Object ToObject_libraw_olympus_makernotes_t(Napi::Env env, const libraw_olympus_makernotes_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  {
    std::string str(s.CameraType2, strnlen(s.CameraType2, 6));
    if (!str.empty()) obj.Set("CameraType2", str);
  }
  obj.Set("ValidBits", Napi::Number::New(env, static_cast<double>(s.ValidBits)));
  obj.Set("tagX640", Napi::Number::New(env, static_cast<double>(s.tagX640)));
  obj.Set("tagX641", Napi::Number::New(env, static_cast<double>(s.tagX641)));
  obj.Set("tagX642", Napi::Number::New(env, static_cast<double>(s.tagX642)));
  obj.Set("tagX643", Napi::Number::New(env, static_cast<double>(s.tagX643)));
  obj.Set("tagX644", Napi::Number::New(env, static_cast<double>(s.tagX644)));
  obj.Set("tagX645", Napi::Number::New(env, static_cast<double>(s.tagX645)));
  obj.Set("tagX646", Napi::Number::New(env, static_cast<double>(s.tagX646)));
  obj.Set("tagX647", Napi::Number::New(env, static_cast<double>(s.tagX647)));
  obj.Set("tagX648", Napi::Number::New(env, static_cast<double>(s.tagX648)));
  obj.Set("tagX649", Napi::Number::New(env, static_cast<double>(s.tagX649)));
  obj.Set("tagX650", Napi::Number::New(env, static_cast<double>(s.tagX650)));
  obj.Set("tagX651", Napi::Number::New(env, static_cast<double>(s.tagX651)));
  obj.Set("tagX652", Napi::Number::New(env, static_cast<double>(s.tagX652)));
  obj.Set("tagX653", Napi::Number::New(env, static_cast<double>(s.tagX653)));
  {
    Napi::Array arr = Napi::Array::New(env, 2);
    for (uint32_t i = 0; i < 2; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.SensorCalibration[i])));
    }
    obj.Set("SensorCalibration", arr);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 5);
    for (uint32_t i = 0; i < 5; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.DriveMode[i])));
    }
    obj.Set("DriveMode", arr);
  }
  obj.Set("ColorSpace", Napi::Number::New(env, static_cast<double>(s.ColorSpace)));
  {
    Napi::Array arr = Napi::Array::New(env, 2);
    for (uint32_t i = 0; i < 2; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.FocusMode[i])));
    }
    obj.Set("FocusMode", arr);
  }
  obj.Set("AutoFocus", Napi::Number::New(env, static_cast<double>(s.AutoFocus)));
  obj.Set("AFPoint", Napi::Number::New(env, static_cast<double>(s.AFPoint)));
  {
    Napi::Array arr = Napi::Array::New(env, 64);
    for (uint32_t i = 0; i < 64; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.AFAreas[i])));
    }
    obj.Set("AFAreas", arr);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 5);
    for (uint32_t i = 0; i < 5; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.AFPointSelected[i])));
    }
    obj.Set("AFPointSelected", arr);
  }
  obj.Set("AFResult", Napi::Number::New(env, static_cast<double>(s.AFResult)));
  obj.Set("AFFineTune", Napi::Number::New(env, static_cast<double>(s.AFFineTune)));
  {
    Napi::Array arr = Napi::Array::New(env, 3);
    for (uint32_t i = 0; i < 3; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.AFFineTuneAdj[i])));
    }
    obj.Set("AFFineTuneAdj", arr);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 3);
    for (uint32_t i = 0; i < 3; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.SpecialMode[i])));
    }
    obj.Set("SpecialMode", arr);
  }
  obj.Set("ZoomStepCount", Napi::Number::New(env, static_cast<double>(s.ZoomStepCount)));
  obj.Set("FocusStepCount", Napi::Number::New(env, static_cast<double>(s.FocusStepCount)));
  obj.Set("FocusStepInfinity", Napi::Number::New(env, static_cast<double>(s.FocusStepInfinity)));
  obj.Set("FocusStepNear", Napi::Number::New(env, static_cast<double>(s.FocusStepNear)));
  obj.Set("FocusDistance", Napi::Number::New(env, static_cast<double>(s.FocusDistance)));
  {
    Napi::Array arr = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.AspectFrame[i])));
    }
    obj.Set("AspectFrame", arr);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 2);
    for (uint32_t i = 0; i < 2; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.StackedImage[i])));
    }
    obj.Set("StackedImage", arr);
  }
  obj.Set("isLiveND", Napi::Number::New(env, static_cast<double>(s.isLiveND)));
  obj.Set("LiveNDfactor", Napi::Number::New(env, static_cast<double>(s.LiveNDfactor)));
  obj.Set("Panorama_mode", Napi::Number::New(env, static_cast<double>(s.Panorama_mode)));
  obj.Set("Panorama_frameNum", Napi::Number::New(env, static_cast<double>(s.Panorama_frameNum)));
  return obj;
}

Napi::Object ToObject_libraw_panasonic_makernotes_t(Napi::Env env, const libraw_panasonic_makernotes_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("Compression", Napi::Number::New(env, static_cast<double>(s.Compression)));
  obj.Set("BlackLevelDim", Napi::Number::New(env, static_cast<double>(s.BlackLevelDim)));
  {
    Napi::Array arr = Napi::Array::New(env, 8);
    for (uint32_t i = 0; i < 8; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.BlackLevel[i])));
    }
    obj.Set("BlackLevel", arr);
  }
  obj.Set("Multishot", Napi::Number::New(env, static_cast<double>(s.Multishot)));
  obj.Set("gamma", Napi::Number::New(env, static_cast<double>(s.gamma)));
  {
    Napi::Array arr = Napi::Array::New(env, 3);
    for (uint32_t i = 0; i < 3; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.HighISOMultiplier[i])));
    }
    obj.Set("HighISOMultiplier", arr);
  }
  obj.Set("FocusStepNear", Napi::Number::New(env, static_cast<double>(s.FocusStepNear)));
  obj.Set("FocusStepCount", Napi::Number::New(env, static_cast<double>(s.FocusStepCount)));
  obj.Set("ZoomPosition", Napi::Number::New(env, static_cast<double>(s.ZoomPosition)));
  obj.Set("LensManufacturer", Napi::Number::New(env, static_cast<double>(s.LensManufacturer)));
  return obj;
}

Napi::Object ToObject_libraw_pentax_makernotes_t(Napi::Env env, const libraw_pentax_makernotes_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  {
    Napi::Buffer<uint8_t> buf = Napi::Buffer<uint8_t>::New(env, 4);
    std::memcpy(buf.Data(), s.DriveMode, 4);
    obj.Set("DriveMode", buf);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 2);
    for (uint32_t i = 0; i < 2; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.FocusMode[i])));
    }
    obj.Set("FocusMode", arr);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 2);
    for (uint32_t i = 0; i < 2; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.AFPointSelected[i])));
    }
    obj.Set("AFPointSelected", arr);
  }
  obj.Set("AFPointSelected_Area", Napi::Number::New(env, static_cast<double>(s.AFPointSelected_Area)));
  obj.Set("AFPointsInFocus_version", Napi::Number::New(env, static_cast<double>(s.AFPointsInFocus_version)));
  obj.Set("AFPointsInFocus", Napi::Number::New(env, static_cast<double>(s.AFPointsInFocus)));
  obj.Set("FocusPosition", Napi::Number::New(env, static_cast<double>(s.FocusPosition)));
  {
    Napi::Buffer<uint8_t> buf = Napi::Buffer<uint8_t>::New(env, 4);
    std::memcpy(buf.Data(), s.DynamicRangeExpansion, 4);
    obj.Set("DynamicRangeExpansion", buf);
  }
  obj.Set("AFAdjustment", Napi::Number::New(env, static_cast<double>(s.AFAdjustment)));
  obj.Set("AFPointMode", Napi::Number::New(env, static_cast<double>(s.AFPointMode)));
  obj.Set("MultiExposure", Napi::Number::New(env, static_cast<double>(s.MultiExposure)));
  obj.Set("Quality", Napi::Number::New(env, static_cast<double>(s.Quality)));
  return obj;
}

Napi::Object ToObject_libraw_samsung_makernotes_t(Napi::Env env, const libraw_samsung_makernotes_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  {
    Napi::Array arr = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.ImageSizeFull[i])));
    }
    obj.Set("ImageSizeFull", arr);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.ImageSizeCrop[i])));
    }
    obj.Set("ImageSizeCrop", arr);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 2);
    for (uint32_t i = 0; i < 2; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.ColorSpace[i])));
    }
    obj.Set("ColorSpace", arr);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 11);
    for (uint32_t i = 0; i < 11; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.key[i])));
    }
    obj.Set("key", arr);
  }
  obj.Set("DigitalGain", Napi::Number::New(env, static_cast<double>(s.DigitalGain)));
  obj.Set("DeviceType", Napi::Number::New(env, static_cast<double>(s.DeviceType)));
  {
    std::string str(s.LensFirmware, strnlen(s.LensFirmware, 32));
    if (!str.empty()) obj.Set("LensFirmware", str);
  }
  return obj;
}

Napi::Object ToObject_libraw_kodak_makernotes_t(Napi::Env env, const libraw_kodak_makernotes_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("BlackLevelTop", Napi::Number::New(env, static_cast<double>(s.BlackLevelTop)));
  obj.Set("BlackLevelBottom", Napi::Number::New(env, static_cast<double>(s.BlackLevelBottom)));
  obj.Set("offset_left", Napi::Number::New(env, static_cast<double>(s.offset_left)));
  obj.Set("offset_top", Napi::Number::New(env, static_cast<double>(s.offset_top)));
  obj.Set("clipBlack", Napi::Number::New(env, static_cast<double>(s.clipBlack)));
  obj.Set("clipWhite", Napi::Number::New(env, static_cast<double>(s.clipWhite)));
  {
    Napi::Array rows = Napi::Array::New(env, 3);
    for (uint32_t i = 0; i < 3; i++) {
      Napi::Array cols = Napi::Array::New(env, 3);
      for (uint32_t j = 0; j < 3; j++) {
        cols.Set(j, Napi::Number::New(env, static_cast<double>(s.romm_camDaylight[i][j])));
      }
      rows.Set(i, cols);
    }
    obj.Set("romm_camDaylight", rows);
  }
  {
    Napi::Array rows = Napi::Array::New(env, 3);
    for (uint32_t i = 0; i < 3; i++) {
      Napi::Array cols = Napi::Array::New(env, 3);
      for (uint32_t j = 0; j < 3; j++) {
        cols.Set(j, Napi::Number::New(env, static_cast<double>(s.romm_camTungsten[i][j])));
      }
      rows.Set(i, cols);
    }
    obj.Set("romm_camTungsten", rows);
  }
  {
    Napi::Array rows = Napi::Array::New(env, 3);
    for (uint32_t i = 0; i < 3; i++) {
      Napi::Array cols = Napi::Array::New(env, 3);
      for (uint32_t j = 0; j < 3; j++) {
        cols.Set(j, Napi::Number::New(env, static_cast<double>(s.romm_camFluorescent[i][j])));
      }
      rows.Set(i, cols);
    }
    obj.Set("romm_camFluorescent", rows);
  }
  {
    Napi::Array rows = Napi::Array::New(env, 3);
    for (uint32_t i = 0; i < 3; i++) {
      Napi::Array cols = Napi::Array::New(env, 3);
      for (uint32_t j = 0; j < 3; j++) {
        cols.Set(j, Napi::Number::New(env, static_cast<double>(s.romm_camFlash[i][j])));
      }
      rows.Set(i, cols);
    }
    obj.Set("romm_camFlash", rows);
  }
  {
    Napi::Array rows = Napi::Array::New(env, 3);
    for (uint32_t i = 0; i < 3; i++) {
      Napi::Array cols = Napi::Array::New(env, 3);
      for (uint32_t j = 0; j < 3; j++) {
        cols.Set(j, Napi::Number::New(env, static_cast<double>(s.romm_camCustom[i][j])));
      }
      rows.Set(i, cols);
    }
    obj.Set("romm_camCustom", rows);
  }
  {
    Napi::Array rows = Napi::Array::New(env, 3);
    for (uint32_t i = 0; i < 3; i++) {
      Napi::Array cols = Napi::Array::New(env, 3);
      for (uint32_t j = 0; j < 3; j++) {
        cols.Set(j, Napi::Number::New(env, static_cast<double>(s.romm_camAuto[i][j])));
      }
      rows.Set(i, cols);
    }
    obj.Set("romm_camAuto", rows);
  }
  obj.Set("val018percent", Napi::Number::New(env, static_cast<double>(s.val018percent)));
  obj.Set("val100percent", Napi::Number::New(env, static_cast<double>(s.val100percent)));
  obj.Set("val170percent", Napi::Number::New(env, static_cast<double>(s.val170percent)));
  obj.Set("MakerNoteKodak8a", Napi::Number::New(env, static_cast<double>(s.MakerNoteKodak8a)));
  obj.Set("ISOCalibrationGain", Napi::Number::New(env, static_cast<double>(s.ISOCalibrationGain)));
  obj.Set("AnalogISO", Napi::Number::New(env, static_cast<double>(s.AnalogISO)));
  return obj;
}

Napi::Object ToObject_libraw_p1_makernotes_t(Napi::Env env, const libraw_p1_makernotes_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  {
    std::string str(s.Software, strnlen(s.Software, 64));
    if (!str.empty()) obj.Set("Software", str);
  }
  {
    std::string str(s.SystemType, strnlen(s.SystemType, 64));
    if (!str.empty()) obj.Set("SystemType", str);
  }
  {
    std::string str(s.FirmwareString, strnlen(s.FirmwareString, 256));
    if (!str.empty()) obj.Set("FirmwareString", str);
  }
  {
    std::string str(s.SystemModel, strnlen(s.SystemModel, 64));
    if (!str.empty()) obj.Set("SystemModel", str);
  }
  return obj;
}

Napi::Object ToObject_libraw_hasselblad_makernotes_t(Napi::Env env, const libraw_hasselblad_makernotes_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("BaseISO", Napi::Number::New(env, static_cast<double>(s.BaseISO)));
  obj.Set("Gain", Napi::Number::New(env, static_cast<double>(s.Gain)));
  {
    std::string str(s.Sensor, strnlen(s.Sensor, 8));
    if (!str.empty()) obj.Set("Sensor", str);
  }
  {
    std::string str(s.SensorUnit, strnlen(s.SensorUnit, 64));
    if (!str.empty()) obj.Set("SensorUnit", str);
  }
  {
    std::string str(s.HostBody, strnlen(s.HostBody, 64));
    if (!str.empty()) obj.Set("HostBody", str);
  }
  obj.Set("SensorCode", Napi::Number::New(env, static_cast<double>(s.SensorCode)));
  obj.Set("SensorSubCode", Napi::Number::New(env, static_cast<double>(s.SensorSubCode)));
  obj.Set("CoatingCode", Napi::Number::New(env, static_cast<double>(s.CoatingCode)));
  obj.Set("uncropped", Napi::Number::New(env, static_cast<double>(s.uncropped)));
  {
    std::string str(s.CaptureSequenceInitiator, strnlen(s.CaptureSequenceInitiator, 32));
    if (!str.empty()) obj.Set("CaptureSequenceInitiator", str);
  }
  {
    std::string str(s.SensorUnitConnector, strnlen(s.SensorUnitConnector, 64));
    if (!str.empty()) obj.Set("SensorUnitConnector", str);
  }
  obj.Set("format", Napi::Number::New(env, static_cast<double>(s.format)));
  {
    Napi::Array arr = Napi::Array::New(env, 2);
    for (uint32_t i = 0; i < 2; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.nIFD_CM[i])));
    }
    obj.Set("nIFD_CM", arr);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 2);
    for (uint32_t i = 0; i < 2; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.RecommendedCrop[i])));
    }
    obj.Set("RecommendedCrop", arr);
  }
  {
    Napi::Array rows = Napi::Array::New(env, 4);
    for (uint32_t i = 0; i < 4; i++) {
      Napi::Array cols = Napi::Array::New(env, 3);
      for (uint32_t j = 0; j < 3; j++) {
        cols.Set(j, Napi::Number::New(env, static_cast<double>(s.mnColorMatrix[i][j])));
      }
      rows.Set(i, cols);
    }
    obj.Set("mnColorMatrix", rows);
  }
  return obj;
}

Napi::Object ToObject_libraw_ricoh_makernotes_t(Napi::Env env, const libraw_ricoh_makernotes_t& s) {
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("AFStatus", Napi::Number::New(env, static_cast<double>(s.AFStatus)));
  {
    Napi::Array arr = Napi::Array::New(env, 2);
    for (uint32_t i = 0; i < 2; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.AFAreaXPosition[i])));
    }
    obj.Set("AFAreaXPosition", arr);
  }
  {
    Napi::Array arr = Napi::Array::New(env, 2);
    for (uint32_t i = 0; i < 2; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(s.AFAreaYPosition[i])));
    }
    obj.Set("AFAreaYPosition", arr);
  }
  obj.Set("AFAreaMode", Napi::Number::New(env, static_cast<double>(s.AFAreaMode)));
  obj.Set("SensorWidth", Napi::Number::New(env, static_cast<double>(s.SensorWidth)));
  obj.Set("SensorHeight", Napi::Number::New(env, static_cast<double>(s.SensorHeight)));
  obj.Set("CroppedImageWidth", Napi::Number::New(env, static_cast<double>(s.CroppedImageWidth)));
  obj.Set("CroppedImageHeight", Napi::Number::New(env, static_cast<double>(s.CroppedImageHeight)));
  obj.Set("WideAdapter", Napi::Number::New(env, static_cast<double>(s.WideAdapter)));
  obj.Set("CropMode", Napi::Number::New(env, static_cast<double>(s.CropMode)));
  obj.Set("NDFilter", Napi::Number::New(env, static_cast<double>(s.NDFilter)));
  obj.Set("AutoBracketing", Napi::Number::New(env, static_cast<double>(s.AutoBracketing)));
  obj.Set("MacroMode", Napi::Number::New(env, static_cast<double>(s.MacroMode)));
  obj.Set("FlashMode", Napi::Number::New(env, static_cast<double>(s.FlashMode)));
  obj.Set("FlashExposureComp", Napi::Number::New(env, static_cast<double>(s.FlashExposureComp)));
  obj.Set("ManualFlashOutput", Napi::Number::New(env, static_cast<double>(s.ManualFlashOutput)));
  return obj;
}

}  // namespace

Napi::Object MetadataToObject(Napi::Env env, const libraw_data_t& d) {
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("idata", ToObject_libraw_iparams_t(env, d.idata));

  Napi::Object sizesObj = ToObject_libraw_image_sizes_t(env, d.sizes);
  {
    // T14a acceptance: sizes.oriented swaps width/height when
    // imgdata.sizes.flip (as reported after open) is 5 or 6.
    int flip = d.sizes.flip;
    bool swapped = (flip == 5 || flip == 6);
    Napi::Object oriented = Napi::Object::New(env);
    oriented.Set("width", Napi::Number::New(env, swapped ? d.sizes.height : d.sizes.width));
    oriented.Set("height", Napi::Number::New(env, swapped ? d.sizes.width : d.sizes.height));
    sizesObj.Set("oriented", oriented);
  }
  obj.Set("sizes", sizesObj);

  obj.Set("other", ToObject_libraw_imgother_t(env, d.other));
  obj.Set("lens", ToObject_libraw_lensinfo_t(env, d.lens));
  obj.Set("color", ToObject_libraw_colordata_t(env, d.color));

  Napi::Object makernotesObj = Napi::Object::New(env);
  makernotesObj.Set("common", ToObject_libraw_metadata_common_t(env, d.makernotes.common));
  makernotesObj.Set("canon", ToObject_libraw_canon_makernotes_t(env, d.makernotes.canon));
  makernotesObj.Set("nikon", ToObject_libraw_nikon_makernotes_t(env, d.makernotes.nikon));
  makernotesObj.Set("sony", ToObject_libraw_sony_info_t(env, d.makernotes.sony));
  makernotesObj.Set("fuji", ToObject_libraw_fuji_info_t(env, d.makernotes.fuji));
  makernotesObj.Set("olympus", ToObject_libraw_olympus_makernotes_t(env, d.makernotes.olympus));
  makernotesObj.Set("panasonic", ToObject_libraw_panasonic_makernotes_t(env, d.makernotes.panasonic));
  makernotesObj.Set("pentax", ToObject_libraw_pentax_makernotes_t(env, d.makernotes.pentax));
  makernotesObj.Set("samsung", ToObject_libraw_samsung_makernotes_t(env, d.makernotes.samsung));
  makernotesObj.Set("kodak", ToObject_libraw_kodak_makernotes_t(env, d.makernotes.kodak));
  makernotesObj.Set("p1", ToObject_libraw_p1_makernotes_t(env, d.makernotes.phaseone));
  makernotesObj.Set("hasselblad", ToObject_libraw_hasselblad_makernotes_t(env, d.makernotes.hasselblad));
  makernotesObj.Set("ricoh", ToObject_libraw_ricoh_makernotes_t(env, d.makernotes.ricoh));
  obj.Set("makernotes", makernotesObj);

  return obj;
}

}  // namespace libraw_node
