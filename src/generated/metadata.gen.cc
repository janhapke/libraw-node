// GENERATED FILE -- do not edit by hand.
// Regenerate with `npm run gen:metadata-cc` (scripts/gen-metadata-cc.js).
// Source: api/metadata.json (LibRaw 0.22.2).
//
// Implements MetadataToObject, declared by src/metadata.h -- see that
// header's comment and this generator's own header comment for the
// per-field type rules and the three LibRaw-specific special cases
// (color.profile, color.WB_Coeffs/WBCT_Coeffs, makernotes.common.afdata).
#include "../metadata.h"

#include <cstring>
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
  obj.Set("LensID", Napi::Number::New(env, static_cast<double>(s.LensID)));
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
  obj.Set("CamID", Napi::Number::New(env, static_cast<double>(s.CamID)));
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
  obj.Set("TeleconverterID", Napi::Number::New(env, static_cast<double>(s.TeleconverterID)));
  {
    std::string str(s.Teleconverter, strnlen(s.Teleconverter, 128));
    if (!str.empty()) obj.Set("Teleconverter", str);
  }
  obj.Set("AdapterID", Napi::Number::New(env, static_cast<double>(s.AdapterID)));
  {
    std::string str(s.Adapter, strnlen(s.Adapter, 128));
    if (!str.empty()) obj.Set("Adapter", str);
  }
  obj.Set("AttachmentID", Napi::Number::New(env, static_cast<double>(s.AttachmentID)));
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
  obj.Set("makernotes", makernotesObj);

  return obj;
}

}  // namespace libraw_node
