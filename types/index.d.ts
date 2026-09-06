// GENERATED FILE -- do not edit by hand.
// Regenerate with `npm run gen:types` (scripts/gen-types.js), which splices
// api/params.json, api/metadata.json and api/enums.json into the hand-written
// template scripts/templates/index.d.ts.tpl. Edit that template for the
// hand-written parts (result shapes, Processor, module functions,
// LibRawError, buildInfo); edit the api/*.annotations.json files (then
// regenerate their manifest) for the generated parts.

// Public TypeScript surface of @janhapke/libraw.
//
// This is a *template*: scripts/gen-types.js splices the manifest-derived
// sections at the four `/*GEN:...*/` markers below and writes the result to
// types/index.d.ts (banner prepended there, not here). Edit this file for
// every hand-written declaration -- everything below is typed straight off
// the actual runtime source, not aspirational:
//   - Result/option shapes: src/fused.cc (decode/identify/thumbnail),
//     src/processor.cc (Processor's sync/async methods + the `metadata`
//     getter), src/addon.cc (decodeSync, buildInfo, version/versionNumber/
//     capabilities/cameraCount/cameraList/hello/napiVersion), src/events.h
//     (progress/dataError/exifTag event payloads), src/image_format.cc
//     (the *three independent* format-name string sets -- see the comment
//     above ImageFormatType below, do not reuse one for another).
//   - lib/index.cjs: which native properties are re-exported as-is
//     (hello, napiVersion, version, versionNumber, capabilities,
//     cameraCount, cameraList, buildInfo, decodeSync, decode, identify,
//     thumbnail) vs. wrapped (Processor, LibRawError, capabilityNames,
//     warningNames, enums, progressStages).
//   - lib/processor.cjs / lib/fused.cjs / lib/errors.cjs: the
//     LibRawError-throwing wrapping, the `{ signal? }` cancellation
//     option on every async method/helper, and fused helpers' JS-side-only
//     `onProgress`/`onDataError` callback options (Processor has no
//     callback-option equivalent -- its events arrive via the EventEmitter
//     interface once a job settles, see T10's docs/plan/tasks.md section).
//
// Regenerate after editing: `npm run gen:types`. `npm run gen:check` fails
// if types/index.d.ts no longer matches what this template + the manifests
// produce.

import { EventEmitter } from 'node:events';

// One table per enum in vendor/LibRaw/libraw/libraw_const.h (api/enums.json,
// scripts/gen-enums.js) -- `kind` is "flags" when every value is 0 or a
// single set bit, else "enum"; `NAME_TO_VALUE`/`VALUE_TO_NAME`/
// `VALUE_TO_NAMES` are keyed by each enumerator's *short* name (the C name
// with the enum's common LIBRAW_..._ prefix stripped) -- see README.md's
// "Enums and flags" section.

/** Short enumerator names of `LibRaw_open_flags` (LIBRAW_OPEN_). */
export type LibRaw_open_flagsName = "BIGFILE" | "FILE";
export interface LibRaw_open_flagsTable {
  readonly kind: "flags";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_open_flagsName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_open_flagsName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_open_flagsName[] };
}

/** Short enumerator names of `LibRaw_openbayer_patterns` (LIBRAW_OPENBAYER_). */
export type LibRaw_openbayer_patternsName = "RGGB" | "BGGR" | "GRBG" | "GBRG";
export interface LibRaw_openbayer_patternsTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_openbayer_patternsName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_openbayer_patternsName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_openbayer_patternsName[] };
}

/** Short enumerator names of `LibRaw_dngfields_marks` (LIBRAW_DNGFM_). */
export type LibRaw_dngfields_marksName = "FORWARDMATRIX" | "ILLUMINANT" | "COLORMATRIX" | "CALIBRATION" | "ANALOGBALANCE" | "BLACK" | "WHITE" | "OPCODE2" | "LINTABLE" | "CROPORIGIN" | "CROPSIZE" | "PREVIEWCS" | "ASSHOTNEUTRAL" | "BASELINEEXPOSURE" | "LINEARRESPONSELIMIT" | "USERCROP" | "OPCODE1" | "OPCODE3";
export interface LibRaw_dngfields_marksTable {
  readonly kind: "flags";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_dngfields_marksName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_dngfields_marksName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_dngfields_marksName[] };
}

/** Short enumerator names of `LibRaw_As_Shot_WB_Applied_codes` (LIBRAW_ASWB_). */
export type LibRaw_As_Shot_WB_Applied_codesName = "APPLIED" | "CANON" | "NIKON" | "NIKON_SRAW" | "PENTAX" | "SONY";
export interface LibRaw_As_Shot_WB_Applied_codesTable {
  readonly kind: "flags";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_As_Shot_WB_Applied_codesName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_As_Shot_WB_Applied_codesName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_As_Shot_WB_Applied_codesName[] };
}

/** Short enumerator names of `LibRaw_ExifTagTypes` (LIBRAW_EXIFTAG_TYPE_). */
export type LibRaw_ExifTagTypesName = "UNKNOWN" | "BYTE" | "ASCII" | "SHORT" | "LONG" | "RATIONAL" | "SBYTE" | "UNDEFINED" | "SSHORT" | "SLONG" | "SRATIONAL" | "FLOAT" | "DOUBLE" | "IFD" | "UNICODE" | "COMPLEX" | "LONG8" | "SLONG8" | "IFD8";
export interface LibRaw_ExifTagTypesTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_ExifTagTypesName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_ExifTagTypesName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_ExifTagTypesName[] };
}

/** Short enumerator names of `LibRaw_whitebalance_code` (LIBRAW_WBI_). */
export type LibRaw_whitebalance_codeName = "Unknown" | "Daylight" | "Fluorescent" | "Tungsten" | "Flash" | "FineWeather" | "Cloudy" | "Shade" | "FL_D" | "FL_N" | "FL_W" | "FL_WW" | "FL_L" | "Ill_A" | "Ill_B" | "Ill_C" | "D55" | "D65" | "D75" | "D50" | "StudioTungsten" | "Sunset" | "Underwater" | "FluorescentHigh" | "HT_Mercury" | "AsShot" | "Auto" | "Custom" | "Auto1" | "Auto2" | "Auto3" | "Auto4" | "Custom1" | "Custom2" | "Custom3" | "Custom4" | "Custom5" | "Custom6" | "PC_Set1" | "PC_Set2" | "PC_Set3" | "PC_Set4" | "PC_Set5" | "Measured" | "BW" | "Kelvin" | "Other" | "None";
export interface LibRaw_whitebalance_codeTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_whitebalance_codeName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_whitebalance_codeName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_whitebalance_codeName[] };
}

/** Short enumerator names of `LibRaw_MultiExposure_related` (LIBRAW_ME_). */
export type LibRaw_MultiExposure_relatedName = "NONE" | "SIMPLE" | "OVERLAY" | "HDR";
export interface LibRaw_MultiExposure_relatedTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_MultiExposure_relatedName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_MultiExposure_relatedName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_MultiExposure_relatedName[] };
}

/** Short enumerator names of `LibRaw_dng_processing` (LIBRAW_DNG_). */
export type LibRaw_dng_processingName = "NONE" | "FLOAT" | "LINEAR" | "DEFLATE" | "XTRANS" | "OTHER" | "8BIT" | "ALL" | "DEFAULT";
export interface LibRaw_dng_processingTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_dng_processingName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_dng_processingName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_dng_processingName[] };
}

/** Short enumerator names of `LibRaw_output_flags` (LIBRAW_OUTPUT_FLAGS_). */
export type LibRaw_output_flagsName = "NONE" | "PPMMETA";
export interface LibRaw_output_flagsTable {
  readonly kind: "flags";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_output_flagsName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_output_flagsName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_output_flagsName[] };
}

/** Short enumerator names of `LibRaw_runtime_capabilities` (LIBRAW_CAPS_). */
export type LibRaw_runtime_capabilitiesName = "RAWSPEED" | "DNGSDK" | "GPRSDK" | "UNICODEPATHS" | "X3FTOOLS" | "RPI6BY9" | "ZLIB" | "JPEG" | "RAWSPEED3" | "RAWSPEED_BITS";
export interface LibRaw_runtime_capabilitiesTable {
  readonly kind: "flags";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_runtime_capabilitiesName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_runtime_capabilitiesName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_runtime_capabilitiesName[] };
}

/** Short enumerator names of `LibRaw_colorspace` (LIBRAW_COLORSPACE_). */
export type LibRaw_colorspaceName = "NotFound" | "sRGB" | "AdobeRGB" | "WideGamutRGB" | "ProPhotoRGB" | "ICC" | "Uncalibrated" | "CameraLinearUniWB" | "CameraLinear" | "CameraGammaUniWB" | "CameraGamma" | "MonochromeLinear" | "MonochromeGamma" | "Rec2020" | "Unknown";
export interface LibRaw_colorspaceTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_colorspaceName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_colorspaceName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_colorspaceName[] };
}

/** Short enumerator names of `LibRaw_cameramaker_index` (LIBRAW_CAMERAMAKER_). */
export type LibRaw_cameramaker_indexName = "Unknown" | "Agfa" | "Alcatel" | "Apple" | "Aptina" | "AVT" | "Baumer" | "Broadcom" | "Canon" | "Casio" | "CINE" | "Clauss" | "Contax" | "Creative" | "DJI" | "DXO" | "Epson" | "Foculus" | "Fujifilm" | "Generic" | "Gione" | "GITUP" | "Google" | "GoPro" | "Hasselblad" | "HTC" | "I_Mobile" | "Imacon" | "JK_Imaging" | "Kodak" | "Konica" | "Leaf" | "Leica" | "Lenovo" | "LG" | "Logitech" | "Mamiya" | "Matrix" | "Meizu" | "Micron" | "Minolta" | "Motorola" | "NGM" | "Nikon" | "Nokia" | "Olympus" | "OmniVison" | "Panasonic" | "Parrot" | "Pentax" | "PhaseOne" | "PhotoControl" | "Photron" | "Pixelink" | "Polaroid" | "RED" | "Ricoh" | "Rollei" | "RoverShot" | "Samsung" | "Sigma" | "Sinar" | "SMaL" | "Sony" | "ST_Micro" | "THL" | "VLUU" | "Xiaomi" | "XIAOYI" | "YI" | "Yuneec" | "Zeiss" | "OnePlus" | "ISG" | "VIVO" | "HMD_Global" | "HUAWEI" | "RaspberryPi" | "OmDigital" | "TheLastOne";
export interface LibRaw_cameramaker_indexTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_cameramaker_indexName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_cameramaker_indexName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_cameramaker_indexName[] };
}

/** Short enumerator names of `LibRaw_camera_mounts` (LIBRAW_MOUNT_). */
export type LibRaw_camera_mountsName = "Unknown" | "Alpa" | "C" | "Canon_EF_M" | "Canon_EF_S" | "Canon_EF" | "Canon_RF" | "Contax_N" | "Contax645" | "FT" | "mFT" | "Fuji_GF" | "Fuji_GX" | "Fuji_X" | "Hasselblad_H" | "Hasselblad_V" | "Hasselblad_XCD" | "Leica_M" | "Leica_R" | "Leica_S" | "Leica_SL" | "Leica_TL" | "LPS_L" | "Mamiya67" | "Mamiya645" | "Minolta_A" | "Nikon_CX" | "Nikon_F" | "Nikon_Z" | "PhaseOne_iXM_MV" | "PhaseOne_iXM_RS" | "PhaseOne_iXM" | "Pentax_645" | "Pentax_K" | "Pentax_Q" | "RicohModule" | "Rollei_bayonet" | "Samsung_NX_M" | "Samsung_NX" | "Sigma_X3F" | "Sony_E" | "LF" | "DigitalBack" | "FixedLens" | "IL_UM" | "TheLastOne";
export interface LibRaw_camera_mountsTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_camera_mountsName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_camera_mountsName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_camera_mountsName[] };
}

/** Short enumerator names of `LibRaw_camera_formats` (LIBRAW_FORMAT_). */
export type LibRaw_camera_formatsName = "Unknown" | "APSC" | "FF" | "MF" | "APSH" | "1INCH" | "1div2p3INCH" | "1div1p7INCH" | "FT" | "CROP645" | "LeicaS" | "645" | "66" | "69" | "LF" | "Leica_DMR" | "67" | "SigmaAPSC" | "SigmaMerrill" | "SigmaAPSH" | "3648" | "68" | "TheLastOne";
export interface LibRaw_camera_formatsTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_camera_formatsName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_camera_formatsName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_camera_formatsName[] };
}

/** Short enumerator names of `LibRawImageAspects` (LIBRAW_IMAGE_ASPECT_). */
export type LibRawImageAspectsName = "UNKNOWN" | "OTHER" | "MINIMAL_REAL_ASPECT_VALUE" | "MAXIMAL_REAL_ASPECT_VALUE" | "3to2" | "1to1" | "4to3" | "16to9" | "5to4" | "7to6" | "6to5" | "7to5";
export interface LibRawImageAspectsTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRawImageAspectsName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRawImageAspectsName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRawImageAspectsName[] };
}

/** Short enumerator names of `LibRaw_lens_focal_types` (LIBRAW_FT_). */
export type LibRaw_lens_focal_typesName = "UNDEFINED" | "PRIME_LENS" | "ZOOM_LENS" | "ZOOM_LENS_CONSTANT_APERTURE" | "ZOOM_LENS_VARIABLE_APERTURE";
export interface LibRaw_lens_focal_typesTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_lens_focal_typesName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_lens_focal_typesName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_lens_focal_typesName[] };
}

/** Short enumerator names of `LibRaw_Canon_RecordModes` (LIBRAW_Canon_RecordMode_). */
export type LibRaw_Canon_RecordModesName = "UNDEFINED" | "JPEG" | "CRW_THM" | "AVI_THM" | "TIF" | "TIF_JPEG" | "CR2" | "CR2_JPEG" | "UNKNOWN" | "MOV" | "MP4" | "CRM" | "CR3" | "CR3_JPEG" | "HEIF" | "CR3_HEIF" | "TheLastOne";
export interface LibRaw_Canon_RecordModesTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_Canon_RecordModesName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_Canon_RecordModesName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_Canon_RecordModesName[] };
}

/** Short enumerator names of `LibRaw_minolta_storagemethods` (LIBRAW_MINOLTA_). */
export type LibRaw_minolta_storagemethodsName = "UNPACKED" | "PACKED";
export interface LibRaw_minolta_storagemethodsTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_minolta_storagemethodsName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_minolta_storagemethodsName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_minolta_storagemethodsName[] };
}

/** Short enumerator names of `LibRaw_minolta_bayerpatterns` (LIBRAW_MINOLTA_). */
export type LibRaw_minolta_bayerpatternsName = "RGGB" | "G2BRG1";
export interface LibRaw_minolta_bayerpatternsTable {
  readonly kind: "flags";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_minolta_bayerpatternsName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_minolta_bayerpatternsName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_minolta_bayerpatternsName[] };
}

/** Short enumerator names of `LibRaw_sony_cameratypes` (LIBRAW_SONY_). */
export type LibRaw_sony_cameratypesName = "DSC" | "DSLR" | "NEX" | "SLT" | "ILCE" | "ILCA" | "CameraType_UNKNOWN";
export interface LibRaw_sony_cameratypesTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_sony_cameratypesName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_sony_cameratypesName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_sony_cameratypesName[] };
}

/** Short enumerator names of `LibRaw_Sony_0x2010_Type` (LIBRAW_SONY_). */
export type LibRaw_Sony_0x2010_TypeName = "Tag2010None" | "Tag2010a" | "Tag2010b" | "Tag2010c" | "Tag2010d" | "Tag2010e" | "Tag2010f" | "Tag2010g" | "Tag2010h" | "Tag2010i";
export interface LibRaw_Sony_0x2010_TypeTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_Sony_0x2010_TypeName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_Sony_0x2010_TypeName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_Sony_0x2010_TypeName[] };
}

/** Short enumerator names of `LibRaw_Sony_0x9050_Type` (LIBRAW_SONY_). */
export type LibRaw_Sony_0x9050_TypeName = "Tag9050None" | "Tag9050a" | "Tag9050b" | "Tag9050c" | "Tag9050d";
export interface LibRaw_Sony_0x9050_TypeTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_Sony_0x9050_TypeName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_Sony_0x9050_TypeName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_Sony_0x9050_TypeName[] };
}

/** Short enumerator names of `LIBRAW_SONY_FOCUSMODEmodes` (LIBRAW_SONY_FOCUSMODE_). */
export type LIBRAW_SONY_FOCUSMODEmodesName = "MF" | "AF_S" | "AF_C" | "AF_A" | "DMF" | "AF_D" | "AF" | "PERMANENT_AF" | "SEMI_MF" | "UNKNOWN";
export interface LIBRAW_SONY_FOCUSMODEmodesTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LIBRAW_SONY_FOCUSMODEmodesName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LIBRAW_SONY_FOCUSMODEmodesName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LIBRAW_SONY_FOCUSMODEmodesName[] };
}

/** Short enumerator names of `LibRaw_KodakSensors` (LIBRAW_Kodak_). */
export type LibRaw_KodakSensorsName = "UnknownSensor" | "M1" | "M15" | "M16" | "M17" | "M2" | "M23" | "M24" | "M3" | "M5" | "M6" | "C14" | "X14" | "M11";
export interface LibRaw_KodakSensorsTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_KodakSensorsName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_KodakSensorsName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_KodakSensorsName[] };
}

/** Short enumerator names of `LibRaw_HasselbladFormatCodes` (LIBRAW_HF_). */
export type LibRaw_HasselbladFormatCodesName = "Unknown" | "3FR" | "FFF" | "Imacon" | "HasselbladDNG" | "AdobeDNG" | "AdobeDNG_fromPhocusDNG";
export interface LibRaw_HasselbladFormatCodesTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_HasselbladFormatCodesName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_HasselbladFormatCodesName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_HasselbladFormatCodesName[] };
}

/** Short enumerator names of `LibRaw_rawspecial_t` (LIBRAW_RAWSPECIAL_). */
export type LibRaw_rawspecial_tName = "SONYARW2_NONE" | "SONYARW2_BASEONLY" | "SONYARW2_DELTAONLY" | "SONYARW2_DELTAZEROBASE" | "SONYARW2_DELTATOVALUE" | "SONYARW2_ALLFLAGS" | "NODP2Q_INTERPOLATERG" | "NODP2Q_INTERPOLATEAF" | "SRAW_NO_RGB" | "SRAW_NO_INTERPOLATE";
export interface LibRaw_rawspecial_tTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_rawspecial_tName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_rawspecial_tName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_rawspecial_tName[] };
}

/** Short enumerator names of `LibRaw_rawspeed_bits_t` (LIBRAW_). */
export type LibRaw_rawspeed_bits_tName = "RAWSPEEDV1_USE" | "RAWSPEEDV1_FAILONUNKNOWN" | "RAWSPEEDV1_IGNOREERRORS" | "RAWSPEEDV3_USE" | "RAWSPEEDV3_FAILONUNKNOWN" | "RAWSPEEDV3_IGNOREERRORS";
export interface LibRaw_rawspeed_bits_tTable {
  readonly kind: "flags";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_rawspeed_bits_tName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_rawspeed_bits_tName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_rawspeed_bits_tName[] };
}

/** Short enumerator names of `LibRaw_processing_options` (LIBRAW_RAWOPTIONS_). */
export type LibRaw_processing_optionsName = "PENTAX_PS_ALLFRAMES" | "CONVERTFLOAT_TO_INT" | "ARQ_SKIP_CHANNEL_SWAP" | "NO_ROTATE_FOR_KODAK_THUMBNAILS" | "USE_PPM16_THUMBS" | "DONT_CHECK_DNG_ILLUMINANT" | "DNGSDK_ZEROCOPY" | "ZEROFILTERS_FOR_MONOCHROMETIFFS" | "DNG_ADD_ENHANCED" | "DNG_ADD_PREVIEWS" | "DNG_PREFER_LARGEST_IMAGE" | "DNG_STAGE2" | "DNG_STAGE3" | "DNG_ALLOWSIZECHANGE" | "DNG_DISABLEWBADJUST" | "PROVIDE_NONSTANDARD_WB" | "CAMERAWB_FALLBACK_TO_DAYLIGHT" | "CHECK_THUMBNAILS_KNOWN_VENDORS" | "CHECK_THUMBNAILS_ALL_VENDORS" | "DNG_STAGE2_IFPRESENT" | "DNG_STAGE3_IFPRESENT" | "DNG_ADD_MASKS" | "CANON_IGNORE_MAKERNOTES_ROTATION" | "ALLOW_JPEGXL_PREVIEWS" | "CANON_CHECK_CAMERA_AUTO_ROTATION_MODE" | "DNG_STAGE23_IFPRESENT_JPGJXL";
export interface LibRaw_processing_optionsTable {
  readonly kind: "flags";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_processing_optionsName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_processing_optionsName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_processing_optionsName[] };
}

/** Short enumerator names of `LibRaw_decoder_flags` (LIBRAW_DECODER_). */
export type LibRaw_decoder_flagsName = "HASCURVE" | "SONYARW2" | "TRYRAWSPEED" | "OWNALLOC" | "FIXEDMAXC" | "ADOBECOPYPIXEL" | "LEGACY_WITH_MARGINS" | "3CHANNEL" | "SINAR4SHOT" | "FLATDATA" | "FLAT_BG2_SWAPPED" | "UNSUPPORTED_FORMAT" | "NOTSET" | "TRYRAWSPEED3";
export interface LibRaw_decoder_flagsTable {
  readonly kind: "flags";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_decoder_flagsName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_decoder_flagsName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_decoder_flagsName[] };
}

/** Short enumerator names of `LibRaw_constructor_flags` (LIBRAW_). */
export type LibRaw_constructor_flagsName = "OPTIONS_NONE" | "OPTIONS_NO_DATAERR_CALLBACK" | "OPIONS_NO_DATAERR_CALLBACK";
export interface LibRaw_constructor_flagsTable {
  readonly kind: "flags";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_constructor_flagsName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_constructor_flagsName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_constructor_flagsName[] };
}

/** Short enumerator names of `LibRaw_warnings` (LIBRAW_WARN_). */
export type LibRaw_warningsName = "NONE" | "BAD_CAMERA_WB" | "NO_METADATA" | "NO_JPEGLIB" | "NO_EMBEDDED_PROFILE" | "NO_INPUT_PROFILE" | "BAD_OUTPUT_PROFILE" | "NO_BADPIXELMAP" | "BAD_DARKFRAME_FILE" | "BAD_DARKFRAME_DIM" | "RAWSPEED_PROBLEM" | "RAWSPEED_UNSUPPORTED" | "RAWSPEED_PROCESSED" | "FALLBACK_TO_AHD" | "PARSEFUJI_PROCESSED" | "DNGSDK_PROCESSED" | "DNG_IMAGES_REORDERED" | "DNG_STAGE2_APPLIED" | "DNG_STAGE3_APPLIED" | "RAWSPEED3_PROBLEM" | "RAWSPEED3_UNSUPPORTED" | "RAWSPEED3_PROCESSED" | "RAWSPEED3_NOTLISTED" | "VENDOR_CROP_SUGGESTED" | "DNG_NOT_PROCESSED" | "DNG_NOT_PARSED";
export interface LibRaw_warningsTable {
  readonly kind: "flags";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_warningsName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_warningsName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_warningsName[] };
}

/** Short enumerator names of `LibRaw_exceptions` (LIBRAW_EXCEPTION_). */
export type LibRaw_exceptionsName = "NONE" | "ALLOC" | "DECODE_RAW" | "DECODE_JPEG" | "IO_EOF" | "IO_CORRUPT" | "CANCELLED_BY_CALLBACK" | "BAD_CROP" | "IO_BADFILE" | "DECODE_JPEG2000" | "TOOBIG" | "MEMPOOL" | "UNSUPPORTED_FORMAT";
export interface LibRaw_exceptionsTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_exceptionsName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_exceptionsName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_exceptionsName[] };
}

/** Short enumerator names of `LibRaw_progress` (LIBRAW_PROGRESS_). */
export type LibRaw_progressName = "START" | "OPEN" | "IDENTIFY" | "SIZE_ADJUST" | "LOAD_RAW" | "RAW2_IMAGE" | "REMOVE_ZEROES" | "BAD_PIXELS" | "DARK_FRAME" | "FOVEON_INTERPOLATE" | "SCALE_COLORS" | "PRE_INTERPOLATE" | "INTERPOLATE" | "MIX_GREEN" | "MEDIAN_FILTER" | "HIGHLIGHTS" | "FUJI_ROTATE" | "FLIP" | "APPLY_PROFILE" | "CONVERT_RGB" | "STRETCH" | "STAGE20" | "STAGE21" | "STAGE22" | "STAGE23" | "STAGE24" | "STAGE25" | "STAGE26" | "STAGE27" | "THUMB_LOAD" | "TRESERVED1" | "TRESERVED2";
export interface LibRaw_progressTable {
  readonly kind: "flags";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_progressName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_progressName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_progressName[] };
}

/** Short enumerator names of `LibRaw_errors` (LIBRAW_). */
export type LibRaw_errorsName = "SUCCESS" | "UNSPECIFIED_ERROR" | "FILE_UNSUPPORTED" | "REQUEST_FOR_NONEXISTENT_IMAGE" | "OUT_OF_ORDER_CALL" | "NO_THUMBNAIL" | "UNSUPPORTED_THUMBNAIL" | "INPUT_CLOSED" | "NOT_IMPLEMENTED" | "REQUEST_FOR_NONEXISTENT_THUMBNAIL" | "UNSUFFICIENT_MEMORY" | "DATA_ERROR" | "IO_ERROR" | "CANCELLED_BY_CALLBACK" | "BAD_CROP" | "TOO_BIG" | "MEMPOOL_OVERFLOW";
export interface LibRaw_errorsTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_errorsName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_errorsName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_errorsName[] };
}

/** Short enumerator names of `LibRaw_internal_thumbnail_formats` (LIBRAW_INTERNAL_THUMBNAIL_). */
export type LibRaw_internal_thumbnail_formatsName = "UNKNOWN" | "KODAK_THUMB" | "KODAK_YCBCR" | "KODAK_RGB" | "JPEG" | "LAYER" | "ROLLEI" | "PPM" | "PPM16" | "X3F" | "DNG_YCBCR" | "JPEGXL";
export interface LibRaw_internal_thumbnail_formatsTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_internal_thumbnail_formatsName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_internal_thumbnail_formatsName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_internal_thumbnail_formatsName[] };
}

/** Short enumerator names of `LibRaw_thumbnail_formats` (LIBRAW_THUMBNAIL_). */
export type LibRaw_thumbnail_formatsName = "UNKNOWN" | "JPEG" | "BITMAP" | "BITMAP16" | "LAYER" | "ROLLEI" | "H265" | "JPEGXL";
export interface LibRaw_thumbnail_formatsTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_thumbnail_formatsName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_thumbnail_formatsName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_thumbnail_formatsName[] };
}

/** Short enumerator names of `LibRaw_image_formats` (LIBRAW_IMAGE_). */
export type LibRaw_image_formatsName = "JPEG" | "BITMAP" | "JPEGXL" | "H265";
export interface LibRaw_image_formatsTable {
  readonly kind: "enum";
  readonly NAME_TO_VALUE: { readonly [K in LibRaw_image_formatsName]: number };
  readonly VALUE_TO_NAME: { readonly [value: string]: LibRaw_image_formatsName };
  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly LibRaw_image_formatsName[] };
}

/** One entry per C enum name in libraw_const.h -- `enums.all` (see README.md). */
export interface LibRawEnumsAll {
  readonly "LibRaw_open_flags": LibRaw_open_flagsTable;
  readonly "LibRaw_openbayer_patterns": LibRaw_openbayer_patternsTable;
  readonly "LibRaw_dngfields_marks": LibRaw_dngfields_marksTable;
  readonly "LibRaw_As_Shot_WB_Applied_codes": LibRaw_As_Shot_WB_Applied_codesTable;
  readonly "LibRaw_ExifTagTypes": LibRaw_ExifTagTypesTable;
  readonly "LibRaw_whitebalance_code": LibRaw_whitebalance_codeTable;
  readonly "LibRaw_MultiExposure_related": LibRaw_MultiExposure_relatedTable;
  readonly "LibRaw_dng_processing": LibRaw_dng_processingTable;
  readonly "LibRaw_output_flags": LibRaw_output_flagsTable;
  readonly "LibRaw_runtime_capabilities": LibRaw_runtime_capabilitiesTable;
  readonly "LibRaw_colorspace": LibRaw_colorspaceTable;
  readonly "LibRaw_cameramaker_index": LibRaw_cameramaker_indexTable;
  readonly "LibRaw_camera_mounts": LibRaw_camera_mountsTable;
  readonly "LibRaw_camera_formats": LibRaw_camera_formatsTable;
  readonly "LibRawImageAspects": LibRawImageAspectsTable;
  readonly "LibRaw_lens_focal_types": LibRaw_lens_focal_typesTable;
  readonly "LibRaw_Canon_RecordModes": LibRaw_Canon_RecordModesTable;
  readonly "LibRaw_minolta_storagemethods": LibRaw_minolta_storagemethodsTable;
  readonly "LibRaw_minolta_bayerpatterns": LibRaw_minolta_bayerpatternsTable;
  readonly "LibRaw_sony_cameratypes": LibRaw_sony_cameratypesTable;
  readonly "LibRaw_Sony_0x2010_Type": LibRaw_Sony_0x2010_TypeTable;
  readonly "LibRaw_Sony_0x9050_Type": LibRaw_Sony_0x9050_TypeTable;
  readonly "LIBRAW_SONY_FOCUSMODEmodes": LIBRAW_SONY_FOCUSMODEmodesTable;
  readonly "LibRaw_KodakSensors": LibRaw_KodakSensorsTable;
  readonly "LibRaw_HasselbladFormatCodes": LibRaw_HasselbladFormatCodesTable;
  readonly "LibRaw_rawspecial_t": LibRaw_rawspecial_tTable;
  readonly "LibRaw_rawspeed_bits_t": LibRaw_rawspeed_bits_tTable;
  readonly "LibRaw_processing_options": LibRaw_processing_optionsTable;
  readonly "LibRaw_decoder_flags": LibRaw_decoder_flagsTable;
  readonly "LibRaw_constructor_flags": LibRaw_constructor_flagsTable;
  readonly "LibRaw_warnings": LibRaw_warningsTable;
  readonly "LibRaw_exceptions": LibRaw_exceptionsTable;
  readonly "LibRaw_progress": LibRaw_progressTable;
  readonly "LibRaw_errors": LibRaw_errorsTable;
  readonly "LibRaw_internal_thumbnail_formats": LibRaw_internal_thumbnail_formatsTable;
  readonly "LibRaw_thumbnail_formats": LibRaw_thumbnail_formatsTable;
  readonly "LibRaw_image_formats": LibRaw_image_formatsTable;
}

/** `enums` (lib/index.cjs): `all` plus short, documented aliases for the families callers reach for most. */
export interface LibRawEnums {
  readonly all: LibRawEnumsAll;
  readonly WARN: LibRaw_warningsTable;
  readonly CAPS: LibRaw_runtime_capabilitiesTable;
  readonly DECODER: LibRaw_decoder_flagsTable;
  readonly RAWOPTIONS: LibRaw_processing_optionsTable;
  readonly PROGRESS: LibRaw_progressTable;
  readonly ERRORS: LibRaw_errorsTable;
  readonly THUMBNAIL_FORMATS: LibRaw_thumbnail_formatsTable;
  readonly INTERNAL_THUMBNAIL_FORMATS: LibRaw_internal_thumbnail_formatsTable;
  readonly IMAGE_FORMATS: LibRaw_image_formatsTable;
}

// Friendly aliases for the families decode()/identify()/Processor results and
// module functions below are typed against, matching lib/index.cjs's ENUM_ALIASES.
export type WarningName = LibRaw_warningsName;
export type CapabilityName = LibRaw_runtime_capabilitiesName;
export type DecoderFlagName = LibRaw_decoder_flagsName;
export type RawOptionName = LibRaw_processing_optionsName;
export type ProgressStageName = LibRaw_progressName;
export type ErrorName = LibRaw_errorsName;
export type ThumbnailFormatName = LibRaw_thumbnail_formatsName;
export type InternalThumbnailFormatName = LibRaw_internal_thumbnail_formatsName;
export type ImageFormatName = LibRaw_image_formatsName;

// --- format-name string sets (src/image_format.cc) --------------------------
//
// These three are *hand-written* literal C++ switches, independent of both
// each other and of the libraw_const.h-derived `ImageFormatName`/
// `ThumbnailFormatName`/`InternalThumbnailFormatName` aliases generated
// above (those name enums.json tables for LibRaw_image_formats/
// LibRaw_thumbnail_formats/LibRaw_internal_thumbnail_formats, which use
// different strings and are not what any result field below actually
// carries) -- see src/image_format.h's header comment for why there are
// three of them.

/** `Processor#thumbSync()`/`#thumb()`'s `type` field (src/image_format.cc's ImageFormatName). */
export type ImageFormatType = 'jpeg' | 'bitmap' | 'jpegxl' | 'h265' | 'unknown';

/** The fused `thumbnail()` helper's `format` field (src/image_format.cc's ThumbnailResultFormatName) -- splits LIBRAW_IMAGE_BITMAP into 'bitmap'/'bitmap16' by bit depth and spells LIBRAW_IMAGE_JPEGXL 'jxl', not 'jpegxl'. */
export type ThumbnailResultFormat = 'jpeg' | 'bitmap' | 'bitmap16' | 'jxl' | 'h265' | 'unknown';

/** `identify()`'s `thumbs[].tformat` (src/image_format.cc's InternalThumbnailFormatName, `enum LibRaw_internal_thumbnail_formats`'s own numbering -- distinct from both `ImageFormatType` and `ThumbnailResultFormat` above). */
export type InternalThumbnailFormat =
  | 'kodak_thumb'
  | 'kodak_ycbcr'
  | 'kodak_rgb'
  | 'jpeg'
  | 'layer'
  | 'rollei'
  | 'ppm'
  | 'ppm16'
  | 'x3f'
  | 'dng_ycbcr'
  | 'jpegxl'
  | 'unknown';

/** Named values for `use_camera_matrix`: 0 = NEVER, 1 = IF_CAMERA_WB, 3 = ALWAYS. */
export type ParamsUseCameraMatrix = 0 | 1 | 3;
/** Named values for `output_color`: 0 = RAW, 1 = SRGB, 2 = ADOBE, 3 = WIDE, 4 = PROPHOTO, 5 = XYZ, 6 = ACES, 7 = DCI_P3, 8 = REC2020. */
export type ParamsOutputColor = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
/** Named values for `output_bps`: 8 = 8, 16 = 16. */
export type ParamsOutputBps = 8 | 16;
/** Flag names accepted for `output_flags` (OR'd together when given as an array). */
export type ParamsOutputFlagsName = "LIBRAW_OUTPUT_FLAGS_NONE" | "LIBRAW_OUTPUT_FLAGS_PPMMETA";
/** Named values for `user_qual`: 0 = LINEAR, 1 = VNG, 2 = PPG, 3 = AHD, 4 = DCB, 5 = MODIFIED_AHD_GPL2, 6 = AFD_GPL2, 7 = VCD_GPL2, 8 = VCD_MODIFIED_AHD_GPL2, 9 = LMMSE_GPL2, 10 = AMAZE_GPL3, 11 = DHT, 12 = AAHD. */
export type ParamsUserQual = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** Settable fields of `libraw_output_params_t` (imgdata.params). Every field is optional -- pass only the ones you want to change; `getParams()`/`getRawParams()` return every field populated (`Required<OutputParams>`). See docs/reference/params.md. */
export interface OutputParams {
  /**
   * Area (x, y, w, h), in raw pixels, averaged for use_auto_wb. -A in dcraw.
   *
   * Default is {0,0,UINT_MAX,UINT_MAX} (the whole image), not all-zero -- verified in LibRaw::LibRaw().
   *
   * Default: `[0,0,4294967295,4294967295]`.
   */
  greybox?: [number, number, number, number];
  /**
   * Crop rectangle (x, y, w, h), in raw pixels, applied in raw2image before rotation.
   *
   * Default is {0,0,UINT_MAX,UINT_MAX} (no crop), not all-zero -- verified in LibRaw::LibRaw().
   *
   * Default: `[0,0,4294967295,4294967295]`.
   */
  cropbox?: [number, number, number, number];
  /**
   * Chromatic aberration correction multipliers. Only aber[0] (red) and aber[2] (blue) are used; can affect raw data reading since it changes output size. -C in dcraw.
   *
   * Default: `[1,1,1,1]`.
   */
  aber?: [number, number, number, number];
  /**
   * Output gamma curve: gamm[0] = 1/power, gamm[1] = toe slope (0 for a pure power curve); gamm[2..5] are filled in by LibRaw. -g power toe_slope in dcraw.
   *
   * Default is rec. BT.709 (power 2.222, i.e. gamm[0]=1/2.222=0.45, toe slope 4.5), not sRGB -- verified in LibRaw::LibRaw(). For an sRGB curve set gamm[0]=1/2.4, gamm[1]=12.92; for linear, set both to 1.0.
   *
   * Default: `[0.45,4.5,0,0,0,0]`.
   */
  gamm?: [number, number, number, number, number, number];
  /**
   * Manual white-balance multipliers (R, G, B, G2); non-zero values enable manual WB. -r mul0 mul1 mul2 mul3 in dcraw.
   *
   * Default: `[0,0,0,0]`.
   */
  user_mul?: [number, number, number, number];
  /**
   * Brightness multiplier applied in scale_colors/auto-bright. -b in dcraw.
   *
   * Default: `1`.
   */
  bright?: number;
  /**
   * Wavelet denoise threshold; 0 disables, typical useful range 100-1000. -n in dcraw.
   *
   * Range: >= 0.
   *
   * Default: `0`.
   */
  threshold?: number;
  /**
   * 2x2 binning, no demosaic; output is half size. Can affect raw data reading for some formats. -h in dcraw.
   *
   * Default: `false`.
   */
  half_size?: boolean;
  /**
   * Interpolate the two green channels of a Bayer image separately instead of averaging them. -f in dcraw.
   *
   * Default: `false`.
   */
  four_color_rgb?: boolean;
  /**
   * Highlight recovery mode: 0 clip, 1 unclip (leave), 2 blend, 3-9 rebuild (higher = more aggressive reconstruction). -H in dcraw.
   *
   * Range: >= 0, <= 9.
   *
   * Default: `0`.
   */
  highlight?: number;
  /**
   * Use white balance averaged over the whole image (or the greybox area). -a in dcraw.
   *
   * Default: `false`.
   */
  use_auto_wb?: boolean;
  /**
   * Use the as-shot white balance from the camera (cam_mul) if available. Falls back to auto-WB, or to daylight WB if LIBRAW_RAWOPTIONS_CAMERAWB_FALLBACK_TO_DAYLIGHT is set in rawparams.options. -w in dcraw.
   *
   * The vendored reference doc's row for this field previously said "check default" as a placeholder; the constructor never sets it, so it is 0/false like every other field zeroed by ZERO(imgdata).
   *
   * Default: `false`.
   */
  use_camera_wb?: boolean;
  /**
   * Use the embedded camera color matrix.
   *
   * 1 (default): use for DNG files always, for other files only when use_camera_wb is set. 3: use regardless of white-balance setting. +M/-M in dcraw.
   *
   * Values: 0 (NEVER), 1 (IF_CAMERA_WB), 3 (ALWAYS).
   *
   * Default: `1`.
   */
  use_camera_matrix?: ParamsUseCameraMatrix;
  /**
   * Output color space: 0 raw, 1 sRGB, 2 Adobe RGB, 3 Wide Gamut RGB, 4 ProPhoto RGB, 5 XYZ, 6 ACES, 7 DCI-P3, 8 Rec. 2020. -o in dcraw.
   *
   * Values: 0 (RAW), 1 (SRGB), 2 (ADOBE), 3 (WIDE), 4 (PROPHOTO), 5 (XYZ), 6 (ACES), 7 (DCI_P3), 8 (REC2020).
   *
   * Default: `1`.
   */
  output_color?: ParamsOutputColor;
  /**
   * Path to an ICC output profile file. Only used when LibRaw was built with LCMS2 support. -o filename in dcraw.
   *
   * Default: `null`.
   */
  output_profile?: string | null;
  /**
   * Path to an ICC input (camera) profile file, or the literal string "embed" to use the file's embedded profile. Only used when LibRaw was built with LCMS2 support. -p file in dcraw.
   *
   * Default: `null`.
   */
  camera_profile?: string | null;
  /**
   * Path to a dcraw-format bad-pixel map file. -P file in dcraw.
   *
   * Default: `null`.
   */
  bad_pixels?: string | null;
  /**
   * Path to a 16-bit PGM dark-frame file. -K file in dcraw.
   *
   * Default: `null`.
   */
  dark_frame?: string | null;
  /**
   * Output bits per sample.
   *
   * -4 in dcraw selects 16.
   *
   * Values: 8 (8), 16 (16).
   *
   * Default: `8`.
   */
  output_bps?: ParamsOutputBps;
  /**
   * Write TIFF instead of PPM/PGM from dcraw_ppm_tiff_writer. -T in dcraw.
   *
   * Default: `false`.
   */
  output_tiff?: boolean;
  /**
   * Bitfield of output-file options.
   *
   * PPMMETA writes additional metadata into PPM/PGM output files.
   *
   * Flags: LIBRAW_OUTPUT_FLAGS_NONE = 0, LIBRAW_OUTPUT_FLAGS_PPMMETA = 1.
   *
   * Default: `0`.
   */
  output_flags?: number | ParamsOutputFlagsName[];
  /**
   * Flip/rotate the output image. -1 uses the value from the raw file (the default); 0 none, 3 180 degrees, 5 90 degrees CCW, 6 90 degrees CW; the full 0-7 range is accepted (dcraw-style flip/rotate bit combinations). Can affect raw data reading for some formats (e.g. Kodak thumbnail unpacking). -t in dcraw.
   *
   * Range: >= -1, <= 7.
   *
   * Default: `-1`.
   */
  user_flip?: number;
  /**
   * Demosaic algorithm: 0 linear, 1 VNG, 2 PPG, 3 AHD, 4 DCB, 5-10 GPL2/GPL3 demosaic-pack algorithms (unavailable, fall back to AHD), 11 DHT, 12 modified AHD (AAHD). -q in dcraw.
   *
   * Default -1 selects AHD (3) at process time. 5-10 name the LibRaw-demosaic-pack-GPL2/GPL3 algorithms (5 modified AHD, 6 AFD, 7 VCD, 8 mixed VCD/modified AHD, 9 LMMSE, 10 AMaZE -- vendor/LibRaw/Changelog.txt's 2010-11-15 entry and vendor/LibRaw/README.demosaic-packs). Those packs were never merged into this vendored LibRaw source (README.demosaic-packs: "LibRaw-demosaic-pack-GPLn are abandoned"), so 5-10 are unreachable in any build of this package -- verified against vendor/LibRaw/src/postprocessing/dcraw_process.cpp, whose quality dispatch handles 0, 1, 2, 3, 4, 11, 12 explicitly and falls back to ahd_interpolate() with LIBRAW_WARN_FALLBACK_TO_AHD set for every other value, 5-10 included.
   *
   * Values: 0 (LINEAR), 1 (VNG), 2 (PPG), 3 (AHD), 4 (DCB), 5 (MODIFIED_AHD_GPL2), 6 (AFD_GPL2), 7 (VCD_GPL2), 8 (VCD_MODIFIED_AHD_GPL2), 9 (LMMSE_GPL2), 10 (AMAZE_GPL3), 11 (DHT), 12 (AAHD).
   *
   * Default: `-1`.
   */
  user_qual?: ParamsUserQual;
  /**
   * Override black level for all channels; -1 uses the value LibRaw determined from the raw file. -k in dcraw.
   *
   * Default: `-1`.
   */
  user_black?: number;
  /**
   * Per-channel correction to user_black/the detected black level.
   *
   * Default is {-1000001,-1000001,-1000001,-1000001} (LibRaw treats any value <= -1000000 as unset), not 0 -- verified in LibRaw::LibRaw() and utils_libraw.cpp's `if (O.user_cblack[i] > -1000000)` check.
   *
   * Default: `[-1000001,-1000001,-1000001,-1000001]`.
   */
  user_cblack?: [number, number, number, number];
  /**
   * Override saturation (white) level; -1 uses the value LibRaw determined from the raw file. -S in dcraw.
   *
   * Default: `-1`.
   */
  user_sat?: number;
  /**
   * Number of 3x3 median filter passes applied after demosaic. -m in dcraw.
   *
   * Range: >= 0.
   *
   * Default: `0`.
   */
  med_passes?: number;
  /**
   * Fraction of pixels allowed to clip when no_auto_bright is off.
   *
   * 0.01 (1%) matches dcraw. For modern low-noise multi-megapixel cameras, values in the 0.00003-0.001 range are often more appropriate.
   *
   * Range: >= 0.
   *
   * Default: `0.01`.
   */
  auto_bright_thr?: number;
  /**
   * Auto-adjusts the maximum data value from real channel_maximum[] data if the calculated maximum is at least this fraction of the nominal maximum; 0 disables the adjustment.
   *
   * Range: >= 0, <= 1.
   *
   * Default: `0.75`.
   */
  adjust_maximum_thr?: number;
  /**
   * Disable automatic brightness increase by histogram. -W in dcraw.
   *
   * Default: `false`.
   */
  no_auto_bright?: boolean;
  /**
   * Rotate Fuji Super-CCD / X-Trans images back to their natural 45-degree orientation. -j in dcraw.
   *
   * The vendored reference doc previously listed the default as -1 (matching only one of two contradictory statements in LibRaw's own API-datastruct.html); the constructor sets it to 1, and every use site (mem_image.cpp, dcraw_process.cpp, utils_libraw.cpp) only tests truthiness, so any non-zero value behaves the same as 1. Modeled here as bool; 0 disables rotation.
   *
   * Default: `true`.
   */
  use_fuji_rotate?: boolean;
  /**
   * Apply Phase One compressed-file corrections (linearization etc.) when non-zero (the default).
   *
   * Default: `true`.
   */
  use_p1_correction?: boolean;
  /**
   * Fix a green-channel imbalance between the two green subpixels as an extra postprocessing pass. Requires additional memory.
   *
   * Default: `false`.
   */
  green_matching?: boolean;
  /**
   * Number of DCB demosaic correction passes; only meaningful with user_qual=4 (DCB).
   *
   * LibRaw's own API-datastruct.html says the default is -1 ("no correction"), but LibRaw::LibRaw() never sets this field, so it is 0 like every other field zeroed by ZERO(imgdata) -- verified in init_close_utils.cpp and postprocessing/dcraw_process.cpp's `if (O.dcb_iterations >= 0) iterations = O.dcb_iterations;` (0 overrides the DCB routine's own internal -1 default).
   *
   * Default: `0`.
   */
  dcb_iterations?: number;
  /**
   * Enhance interpolated colors during DCB demosaic (user_qual=4).
   *
   * Default: `false`.
   */
  dcb_enhance_fl?: boolean;
  /**
   * FBDD noise reduction applied before demosaic: 0 off, 1 light, 2 (and higher) full.
   *
   * Range: >= 0.
   *
   * Default: `0`.
   */
  fbdd_noiserd?: number;
  /**
   * Enable exposure correction (exp_shift/exp_preser) before demosaic.
   *
   * Default: `false`.
   */
  exp_correc?: boolean;
  /**
   * Exposure correction multiplier, linear scale. Usable range 0.25 (2-stop darken) to 8.0 (3-stop lighten). Only applied when exp_correc is set.
   *
   * Range: >= 0.25, <= 8.
   *
   * Default: `1`.
   */
  exp_shift?: number;
  /**
   * Highlight preservation when lightening via exp_shift > 1. 0.0 no preservation, 1.0 full preservation. Only applied when exp_correc is set.
   *
   * Range: >= 0, <= 1.
   *
   * Default: `0`.
   */
  exp_preser?: number;
  /**
   * Skip scale_colors() in dcraw_process() (no white balance, no black/white normalization). White balance is applied in scale_colors(), so skipping it yields an unbalanced image; intended for use with no_interpolation or a custom interpolation callback.
   *
   * Default: `false`.
   */
  no_auto_scale?: boolean;
  /**
   * Skip the demosaic step in dcraw_process(); output stays as a 4-channel mosaic.
   *
   * Default: `false`.
   */
  no_interpolation?: boolean;
}

/** Flag names accepted for `use_rawspeed` (OR'd together when given as an array). */
export type RawParamsUseRawspeedName = "LIBRAW_RAWSPEEDV1_USE" | "LIBRAW_RAWSPEEDV1_FAILONUNKNOWN" | "LIBRAW_RAWSPEEDV1_IGNOREERRORS" | "LIBRAW_RAWSPEEDV3_USE" | "LIBRAW_RAWSPEEDV3_FAILONUNKNOWN" | "LIBRAW_RAWSPEEDV3_IGNOREERRORS";
/** Flag names accepted for `use_dngsdk` (OR'd together when given as an array). */
export type RawParamsUseDngsdkName = "LIBRAW_DNG_FLOAT" | "LIBRAW_DNG_LINEAR" | "LIBRAW_DNG_DEFLATE" | "LIBRAW_DNG_XTRANS" | "LIBRAW_DNG_OTHER" | "LIBRAW_DNG_8BIT";
/** Flag names accepted for `options` (OR'd together when given as an array). */
export type RawParamsOptionsName = "LIBRAW_RAWOPTIONS_PENTAX_PS_ALLFRAMES" | "LIBRAW_RAWOPTIONS_CONVERTFLOAT_TO_INT" | "LIBRAW_RAWOPTIONS_ARQ_SKIP_CHANNEL_SWAP" | "LIBRAW_RAWOPTIONS_NO_ROTATE_FOR_KODAK_THUMBNAILS" | "LIBRAW_RAWOPTIONS_USE_PPM16_THUMBS" | "LIBRAW_RAWOPTIONS_DONT_CHECK_DNG_ILLUMINANT" | "LIBRAW_RAWOPTIONS_DNGSDK_ZEROCOPY" | "LIBRAW_RAWOPTIONS_ZEROFILTERS_FOR_MONOCHROMETIFFS" | "LIBRAW_RAWOPTIONS_DNG_ADD_ENHANCED" | "LIBRAW_RAWOPTIONS_DNG_ADD_PREVIEWS" | "LIBRAW_RAWOPTIONS_DNG_PREFER_LARGEST_IMAGE" | "LIBRAW_RAWOPTIONS_DNG_STAGE2" | "LIBRAW_RAWOPTIONS_DNG_STAGE3" | "LIBRAW_RAWOPTIONS_DNG_ALLOWSIZECHANGE" | "LIBRAW_RAWOPTIONS_DNG_DISABLEWBADJUST" | "LIBRAW_RAWOPTIONS_PROVIDE_NONSTANDARD_WB" | "LIBRAW_RAWOPTIONS_CAMERAWB_FALLBACK_TO_DAYLIGHT" | "LIBRAW_RAWOPTIONS_CHECK_THUMBNAILS_KNOWN_VENDORS" | "LIBRAW_RAWOPTIONS_CHECK_THUMBNAILS_ALL_VENDORS" | "LIBRAW_RAWOPTIONS_DNG_STAGE2_IFPRESENT" | "LIBRAW_RAWOPTIONS_DNG_STAGE3_IFPRESENT" | "LIBRAW_RAWOPTIONS_DNG_ADD_MASKS" | "LIBRAW_RAWOPTIONS_CANON_IGNORE_MAKERNOTES_ROTATION" | "LIBRAW_RAWOPTIONS_ALLOW_JPEGXL_PREVIEWS" | "LIBRAW_RAWOPTIONS_CANON_CHECK_CAMERA_AUTO_ROTATION_MODE" | "LIBRAW_RAWOPTIONS_DNG_STAGE23_IFPRESENT_JPGJXL";
/** Flag names accepted for `specials` (OR'd together when given as an array). */
export type RawParamsSpecialsName = "LIBRAW_RAWSPECIAL_SONYARW2_NONE" | "LIBRAW_RAWSPECIAL_SONYARW2_BASEONLY" | "LIBRAW_RAWSPECIAL_SONYARW2_DELTAONLY" | "LIBRAW_RAWSPECIAL_SONYARW2_DELTAZEROBASE" | "LIBRAW_RAWSPECIAL_SONYARW2_DELTATOVALUE" | "LIBRAW_RAWSPECIAL_NODP2Q_INTERPOLATERG" | "LIBRAW_RAWSPECIAL_NODP2Q_INTERPOLATEAF" | "LIBRAW_RAWSPECIAL_SRAW_NO_RGB" | "LIBRAW_RAWSPECIAL_SRAW_NO_INTERPOLATE";

/** Settable fields of `libraw_raw_unpack_params_t` (imgdata.rawparams). Every field is optional -- pass only the ones you want to change; `getParams()`/`getRawParams()` return every field populated (`Required<RawParams>`). See docs/reference/rawparams.md. */
export interface RawParams {
  /**
   * Controls use of the RawSpeed library for raw data unpacking (only if LibRaw was built with RawSpeed support).
   *
   * Default is LIBRAW_RAWSPEEDV1_USE (1) -- verified in LibRaw::LibRaw(). Bits are LibRaw_rawspeed_bits_t (libraw_const.h); use is gated further by whether LibRaw was compiled with RawSpeed/RawSpeed3 support.
   *
   * Flags: LIBRAW_RAWSPEEDV1_USE = 1, LIBRAW_RAWSPEEDV1_FAILONUNKNOWN = 2, LIBRAW_RAWSPEEDV1_IGNOREERRORS = 4, LIBRAW_RAWSPEEDV3_USE = 256, LIBRAW_RAWSPEEDV3_FAILONUNKNOWN = 512, LIBRAW_RAWSPEEDV3_IGNOREERRORS = 1024.
   *
   * Default: `1`.
   */
  use_rawspeed?: number | RawParamsUseRawspeedName[];
  /**
   * Controls use of the Adobe DNG SDK for specific DNG variants (only if LibRaw was built with DNG SDK support and a DNG host is set).
   *
   * Default is LIBRAW_DNG_DEFAULT = FLOAT|LINEAR|DEFLATE|8BIT (1+2+4+32=39) -- verified in LibRaw::LibRaw(). LibRaw's own API-datastruct.html describes an older 0/1/2 scheme for this field under the name use_dng_sdk; the compiled header (libraw_const.h's LibRaw_dng_processing enum) and dngsdk_glue.cpp's bit tests confirm it is this bitmask, and the struct field is spelled use_dngsdk.
   *
   * Flags: LIBRAW_DNG_FLOAT = 1, LIBRAW_DNG_LINEAR = 2, LIBRAW_DNG_DEFLATE = 4, LIBRAW_DNG_XTRANS = 8, LIBRAW_DNG_OTHER = 16, LIBRAW_DNG_8BIT = 32.
   *
   * Default: `39`.
   */
  use_dngsdk?: number | RawParamsUseDngsdkName[];
  /**
   * Bitfield of format-specific unpack()-phase processing options.
   *
   * Default is LIBRAW_RAWOPTIONS_CONVERTFLOAT_TO_INT (2) -- verified in LibRaw::LibRaw(). Bits are LibRaw_processing_options (libraw_const.h); this generator/task refers to that family of flags as LIBRAW_RAWOPTIONS_* per its naming convention. T12 accepts either the raw bitmask number or an array of these flag names for this field; T13 exports the flag table to api/enums.json.
   *
   * Flags: LIBRAW_RAWOPTIONS_PENTAX_PS_ALLFRAMES = 1, LIBRAW_RAWOPTIONS_CONVERTFLOAT_TO_INT = 2, LIBRAW_RAWOPTIONS_ARQ_SKIP_CHANNEL_SWAP = 4, LIBRAW_RAWOPTIONS_NO_ROTATE_FOR_KODAK_THUMBNAILS = 8, LIBRAW_RAWOPTIONS_USE_PPM16_THUMBS = 32, LIBRAW_RAWOPTIONS_DONT_CHECK_DNG_ILLUMINANT = 64, LIBRAW_RAWOPTIONS_DNGSDK_ZEROCOPY = 128, LIBRAW_RAWOPTIONS_ZEROFILTERS_FOR_MONOCHROMETIFFS = 256, LIBRAW_RAWOPTIONS_DNG_ADD_ENHANCED = 512, LIBRAW_RAWOPTIONS_DNG_ADD_PREVIEWS = 1024, LIBRAW_RAWOPTIONS_DNG_PREFER_LARGEST_IMAGE = 2048, LIBRAW_RAWOPTIONS_DNG_STAGE2 = 4096, LIBRAW_RAWOPTIONS_DNG_STAGE3 = 8192, LIBRAW_RAWOPTIONS_DNG_ALLOWSIZECHANGE = 16384, LIBRAW_RAWOPTIONS_DNG_DISABLEWBADJUST = 32768, LIBRAW_RAWOPTIONS_PROVIDE_NONSTANDARD_WB = 65536, LIBRAW_RAWOPTIONS_CAMERAWB_FALLBACK_TO_DAYLIGHT = 131072, LIBRAW_RAWOPTIONS_CHECK_THUMBNAILS_KNOWN_VENDORS = 262144, LIBRAW_RAWOPTIONS_CHECK_THUMBNAILS_ALL_VENDORS = 524288, LIBRAW_RAWOPTIONS_DNG_STAGE2_IFPRESENT = 1048576, LIBRAW_RAWOPTIONS_DNG_STAGE3_IFPRESENT = 2097152, LIBRAW_RAWOPTIONS_DNG_ADD_MASKS = 4194304, LIBRAW_RAWOPTIONS_CANON_IGNORE_MAKERNOTES_ROTATION = 8388608, LIBRAW_RAWOPTIONS_ALLOW_JPEGXL_PREVIEWS = 16777216, LIBRAW_RAWOPTIONS_CANON_CHECK_CAMERA_AUTO_ROTATION_MODE = 67108864, LIBRAW_RAWOPTIONS_DNG_STAGE23_IFPRESENT_JPGJXL = 134217728.
   *
   * Default: `2`.
   */
  options?: number | RawParamsOptionsName[];
  /**
   * Select which embedded image to process, for formats that store several raw images per file (e.g. multi-shot Pentax, Sony sequences). -s in dcraw.
   *
   * Default: `0`.
   */
  shot_select?: number;
  /**
   * Special unpack-phase processing mode bits (e.g. Sony ARW2 delta handling, DP2 Quattro RG/AF interpolation, sRAW RGB/interpolation skipping).
   *
   * Bits are LibRaw_rawspecial_t (libraw_const.h). If LIBRAW_RAWSPECIAL_SONYARW2_DELTATOVALUE is set, sony_arw2_posterization_thr sets the shadow posterization suppression level.
   *
   * Flags: LIBRAW_RAWSPECIAL_SONYARW2_NONE = 0, LIBRAW_RAWSPECIAL_SONYARW2_BASEONLY = 1, LIBRAW_RAWSPECIAL_SONYARW2_DELTAONLY = 2, LIBRAW_RAWSPECIAL_SONYARW2_DELTAZEROBASE = 4, LIBRAW_RAWSPECIAL_SONYARW2_DELTATOVALUE = 8, LIBRAW_RAWSPECIAL_NODP2Q_INTERPOLATERG = 16, LIBRAW_RAWSPECIAL_NODP2Q_INTERPOLATEAF = 32, LIBRAW_RAWSPECIAL_SRAW_NO_RGB = 64, LIBRAW_RAWSPECIAL_SRAW_NO_INTERPOLATE = 128.
   *
   * Default: `0`.
   */
  specials?: number | RawParamsSpecialsName[];
  /**
   * Abort processing if the raw data buffer would grow larger than this many megabytes.
   *
   * Default is LIBRAW_MAX_ALLOC_MB_DEFAULT (2048).
   *
   * Default: `2048`.
   */
  max_raw_memory_mb?: number;
  /**
   * Shadow posterization-suppression level used when specials includes LIBRAW_RAWSPECIAL_SONYARW2_DELTATOVALUE.
   *
   * Default: `0`.
   */
  sony_arw2_posterization_thr?: number;
  /**
   * Gamma value applied when decoding Nikon Coolscan NEF files; LibRaw cannot determine this from the file, so the application must set it explicitly if needed.
   *
   * Default: `1`.
   */
  coolscan_nef_gamma?: number;
  /**
   * Shot order string for Pentax 4-shot pixel-shift files.
   *
   * Fixed-size char[5] buffer (4 digits + NUL) in the header, exposed as a string; any value assigned must be at most 4 characters.
   *
   * Default: `"3102"`.
   */
  p4shot_order?: string;
  // custom_camera_strings: unsupported -- Application-supplied list of additional camera-identification strings, terminated by a NULL entry, in LibRaw's internal adobe_coeff table format. Not settable/readable through this API; see api/params.json.
}

// Compacted illuminant/color-temperature white-balance coefficient entries
// (colordata.WB_Coeffs/WBCT_Coeffs) -- see src/generated/metadata.gen.cc's
// special cases for these two fields.
export interface WbCoeffEntry {
  readonly illuminant: number;
  readonly coeffs: readonly [number, number, number, number];
}
export interface WbctCoeffEntry {
  readonly colorTemperature: number;
  readonly coeffs: readonly [number, number, number, number];
}

export interface Iparams {
  // guard: unsupported -- Internal struct-validity guard bytes; not meaningful to callers. No safe JS representation; see api/metadata.json.
  /**
   * Camera make, as parsed from the file (may need normalization -- see normalized_make).
   */
  readonly make?: string;
  /**
   * Camera model, as parsed from the file (may need normalization -- see normalized_model).
   */
  readonly model?: string;
  /**
   * Software/firmware string embedded in the file, if any.
   */
  readonly software?: string;
  /**
   * Make normalized against LibRaw's camera database (canonical vendor name).
   */
  readonly normalized_make?: string;
  /**
   * Model normalized against LibRaw's camera database (canonical model name).
   */
  readonly normalized_model?: string;
  /**
   * Index into LibRaw's internal maker table for normalized_make.
   */
  readonly maker_index: number;
  /**
   * Number of RAW frames/images stored in this file (e.g. multi-shot/burst formats).
   */
  readonly raw_count: number;
  /**
   * DNG version encoded as LibRaw packs it (0 if this is not a DNG file).
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly dng_version?: number;
  /**
   * Non-zero if this is a Foveon (layered-sensor) file.
   */
  readonly is_foveon: number;
  /**
   * Number of colors in the RAW data (1, 3, or 4).
   */
  readonly colors: number;
  /**
   * CFA pattern bitmask LibRaw uses internally to decode the Bayer/X-Trans layout (0 or 9 for non-Bayer/X-Trans sensors).
   */
  readonly filters: number;
  /**
   * 6x6 X-Trans CFA pattern (color-plane indices 0..3), only meaningful when filters == 9.
   */
  readonly xtrans: [[number, number, number, number, number, number], [number, number, number, number, number, number], [number, number, number, number, number, number], [number, number, number, number, number, number], [number, number, number, number, number, number], [number, number, number, number, number, number]];
  /**
   * 6x6 X-Trans CFA pattern in absolute (unshifted) sensor coordinates.
   */
  readonly xtrans_abs: [[number, number, number, number, number, number], [number, number, number, number, number, number], [number, number, number, number, number, number], [number, number, number, number, number, number], [number, number, number, number, number, number], [number, number, number, number, number, number]];
  /**
   * Color plane description string (e.g. "RGBG"), indexed by the values in filters/xtrans.
   */
  readonly cdesc?: string;
  /**
   * Length in bytes of the embedded XMP packet (0 if none). See xmpdata for why the packet itself is not exposed.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly xmplen?: number;
  // xmpdata: unsupported -- Pointer to the embedded XMP packet's raw bytes. No safe JS representation; see api/metadata.json.
}

export interface ImageSizes {
  /**
   * Full sensor height in raw pixels, before any cropping.
   */
  readonly raw_height: number;
  /**
   * Full sensor width in raw pixels, before any cropping.
   */
  readonly raw_width: number;
  /**
   * Output image height in pixels, after LibRaw's standard crop.
   */
  readonly height: number;
  /**
   * Output image width in pixels, after LibRaw's standard crop.
   */
  readonly width: number;
  /**
   * Rows skipped from the top of the raw sensor data to reach the cropped image.
   */
  readonly top_margin: number;
  /**
   * Columns skipped from the left of the raw sensor data to reach the cropped image.
   */
  readonly left_margin: number;
  /**
   * Final output height after any half_size/other output-size-affecting params (equals height unless half_size etc. is used).
   */
  readonly iheight: number;
  /**
   * Final output width after any half_size/other output-size-affecting params (equals width unless half_size etc. is used).
   */
  readonly iwidth: number;
  /**
   * Bytes per row of the raw (undecoded) sensor data.
   */
  readonly raw_pitch: number;
  /**
   * Pixel aspect ratio (width:height of one sensor pixel); 1.0 for square pixels.
   */
  readonly pixel_aspect: number;
  /**
   * Orientation from the file: 0 none, 3 180deg, 5 90deg CCW, 6 90deg CW (other LibRaw-internal values are possible for less common sensors). See the `sizes.oriented` convenience for swapped width/height at flip 5/6.
   */
  readonly flip: number;
  /**
   * Up to 8 masked/black-frame border rectangles (each [top, left, bottom, right] in raw pixel coordinates); unused entries are all-zero.
   */
  readonly mask: [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]];
  /**
   * Raw sensor aspect-ratio hint LibRaw derives for a few multi-aspect sensors (0 if not applicable).
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly raw_aspect?: number;
  /**
   * Up to 2 inset-crop rectangles some makers embed (e.g. an in-camera crop suggestion), as libraw_raw_inset_crop_t.
   */
  readonly raw_inset_crops: [RawInsetCrop, RawInsetCrop];
  /**
   * Convenience width/height with a 5 or 6 `flip` already swapped, so most callers never need to check `flip` themselves. Synthesized by MetadataToObject (src/generated/metadata.gen.cc's caller) -- not a field of libraw_image_sizes_t itself.
   */
  readonly oriented: { readonly width: number; readonly height: number };
}

export interface RawInsetCrop {
  /**
   * Inset crop left edge, in raw pixel coordinates.
   *
   * LibRaw leaves an unfilled entry at {cleft: 0xffff, ctop: 0xffff, cwidth: 0, cheight: 0} -- verified empirically (synthetic DNG, no inset-crop tags).
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (65535).
   */
  readonly cleft?: number;
  /**
   * Inset crop top edge, in raw pixel coordinates.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (65535).
   */
  readonly ctop?: number;
  /**
   * Inset crop width, in raw pixels.
   */
  readonly cwidth: number;
  /**
   * Inset crop height, in raw pixels.
   */
  readonly cheight: number;
}

export interface Imgother {
  /**
   * ISO speed rating as parsed from the file's EXIF/maker data.
   */
  readonly iso_speed: number;
  /**
   * Shutter speed (exposure time) in seconds.
   */
  readonly shutter: number;
  /**
   * Aperture (f-number).
   */
  readonly aperture: number;
  /**
   * Focal length in millimeters.
   */
  readonly focal_len: number;
  /**
   * Capture time as a Unix epoch value in seconds, exactly as LibRaw's time_t reports it (not converted to a JS Date -- construct one with `new Date(other.timestamp * 1000)` if needed).
   */
  readonly timestamp: number;
  /**
   * Shot sequence number within a burst/multi-shot file, where the format records one.
   */
  readonly shot_order: number;
  // gpsdata: unsupported -- Raw, undecoded GPS IFD tag words LibRaw captured while parsing. No safe JS representation; see api/metadata.json.
  /**
   * Decoded GPS data (latitude/longitude/altitude/timestamp and reference codes), as libraw_gps_info_t.
   */
  readonly parsed_gps: GpsInfo;
  /**
   * Free-text image description embedded in the file, if any.
   */
  readonly desc?: string;
  /**
   * Artist/photographer name embedded in the file, if any.
   */
  readonly artist?: string;
  /**
   * DNG AnalogBalance tag (per-channel R,G,B,G2 multipliers applied before the color matrix), when present.
   */
  readonly analogbalance: [number, number, number, number];
}

export interface GpsInfo {
  /**
   * Latitude as [degrees, minutes, seconds].
   */
  readonly latitude: [number, number, number];
  /**
   * Longitude as [degrees, minutes, seconds].
   */
  readonly longitude: [number, number, number];
  /**
   * GPS timestamp (UTC) as [hours, minutes, seconds].
   */
  readonly gpstimestamp: [number, number, number];
  /**
   * Altitude in meters.
   */
  readonly altitude: number;
  /**
   * Altitude reference: '0' above sea level, '1' below sea level (ASCII digit character, not a number).
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly altref?: string;
  /**
   * Latitude reference hemisphere: 'N' or 'S'.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly latref?: string;
  /**
   * Longitude reference hemisphere: 'E' or 'W'.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly longref?: string;
  /**
   * GPS receiver status code as recorded by the camera (maker-specific single character).
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly gpsstatus?: string;
  /**
   * Non-zero once LibRaw has successfully parsed GPS data for this file (0 if the file has no GPS data).
   */
  readonly gpsparsed: number;
}

export interface Lensinfo {
  /**
   * Minimum focal length of the lens, in millimeters.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly MinFocal?: number;
  /**
   * Maximum focal length of the lens, in millimeters.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly MaxFocal?: number;
  /**
   * Maximum aperture (f-number) at MinFocal.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly MaxAp4MinFocal?: number;
  /**
   * Maximum aperture (f-number) at MaxFocal.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly MaxAp4MaxFocal?: number;
  /**
   * Maximum aperture as reported by the EXIF MaxApertureValue tag.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly EXIF_MaxAp?: number;
  /**
   * Lens manufacturer, if recorded separately from the camera maker.
   */
  readonly LensMake?: string;
  /**
   * Lens model/name string, from whichever source (EXIF or maker-specific) LibRaw found first.
   */
  readonly Lens?: string;
  /**
   * Lens serial number, if recorded.
   */
  readonly LensSerial?: string;
  /**
   * Lens's internal (maker-specific) serial number, if recorded.
   */
  readonly InternalLensSerial?: string;
  /**
   * 35mm-equivalent focal length in millimeters, from EXIF.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly FocalLengthIn35mmFormat?: number;
  /**
   * Nikon-specific lens fields, as libraw_nikonlens_t (populated regardless of camera make in a few cross-compatible cases).
   */
  readonly nikon: Nikonlens;
  /**
   * DNG lens-info tags, as libraw_dnglens_t.
   */
  readonly dng: Dnglens;
  /**
   * Vendor-agnostic lens-database fields LibRaw resolves from maker notes, as libraw_makernotes_lens_t.
   */
  readonly makernotes: MakernotesLens;
}

export interface Nikonlens {
  /**
   * Effective maximum aperture (f-number) as decoded from Nikon lens data.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly EffectiveMaxAp?: number;
  /**
   * Nikon lens ID byte (indexes Nikon's own lens database).
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly LensIDNumber?: number;
  /**
   * Number of f-stops in the lens's aperture range, Nikon encoding (1/12 EV units for some models -- see EXIF tools for the exact decode table).
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly LensFStops?: number;
  /**
   * Lens MCU (electronic contacts) firmware version byte.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly MCUVersion?: number;
  /**
   * Nikon lens type flags byte (AF/AF-D/G/VR/etc. bit flags).
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly LensType?: number;
}

export interface Dnglens {
  /**
   * Minimum focal length of the lens, in millimeters, from DNG tags.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly MinFocal?: number;
  /**
   * Maximum focal length of the lens, in millimeters, from DNG tags.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly MaxFocal?: number;
  /**
   * Maximum aperture (f-number) at MinFocal, from DNG tags.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly MaxAp4MinFocal?: number;
  /**
   * Maximum aperture (f-number) at MaxFocal, from DNG tags.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly MaxAp4MaxFocal?: number;
}

export interface MakernotesLens {
  /**
   * 64-bit lens ID as decoded from maker notes (indexes LibRaw's lens database). Number when it fits Number.MAX_SAFE_INTEGER, otherwise a BigInt; the key is absent (not any sentinel value) when LibRaw has not filled it in.
   *
   * LibRaw's own unset value for this field is UINT64_MAX (all bits set, verified empirically on the synthetic DNG), not 0 -- handled specially by scripts/gen-metadata-cc.js's `uint64` case rather than this file's generic `unset` mechanism; see the top-level $comment.
   *
   * Key is omitted when LibRaw has not filled in this field (LibRaw's own sentinel is UINT64_MAX, not representable in the manifest). Present as a plain number when it fits Number.MAX_SAFE_INTEGER, otherwise a BigInt.
   */
  readonly LensID?: number | bigint;
  /**
   * Lens name resolved from LibRaw's lens database using LensID.
   */
  readonly Lens?: string;
  /**
   * Image-circle format the lens covers (LibRaw's internal lens-format enum value).
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly LensFormat?: number;
  /**
   * Lens mount type ('male', the lens side; LibRaw's internal lens-mount enum value).
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly LensMount?: number;
  /**
   * 64-bit camera-body ID as decoded from maker notes (indexes LibRaw's camera database). Number when it fits Number.MAX_SAFE_INTEGER, otherwise a BigInt; the key is absent when LibRaw has not filled it in.
   *
   * Same unset note as LensID.
   *
   * Key is omitted when LibRaw has not filled in this field (LibRaw's own sentinel is UINT64_MAX, not representable in the manifest). Present as a plain number when it fits Number.MAX_SAFE_INTEGER, otherwise a BigInt.
   */
  readonly CamID?: number | bigint;
  /**
   * Sensor format of the camera body (LibRaw's internal camera-format enum value).
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly CameraFormat?: number;
  /**
   * Camera mount type ('female', the body side; LibRaw's internal camera-mount enum value).
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly CameraMount?: number;
  /**
   * Camera body name associated with CamID.
   */
  readonly body?: string;
  /**
   * Lens focal-length type: -1 unknown, 0 unknown, 1 fixed focal length, 2 zoom.
   */
  readonly FocalType: number;
  /**
   * Lens name prefix features (e.g. mount/format markers) LibRaw splits out of the full lens name.
   */
  readonly LensFeatures_pre?: string;
  /**
   * Lens name suffix features (e.g. stabilization/AF markers) LibRaw splits out of the full lens name.
   */
  readonly LensFeatures_suf?: string;
  /**
   * Minimum focal length of the lens, in millimeters, as resolved via the lens database.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly MinFocal?: number;
  /**
   * Maximum focal length of the lens, in millimeters, as resolved via the lens database.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly MaxFocal?: number;
  /**
   * Maximum aperture (f-number) at MinFocal, as resolved via the lens database.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly MaxAp4MinFocal?: number;
  /**
   * Maximum aperture (f-number) at MaxFocal, as resolved via the lens database.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly MaxAp4MaxFocal?: number;
  /**
   * Minimum aperture (f-number) at MinFocal, as resolved via the lens database.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly MinAp4MinFocal?: number;
  /**
   * Minimum aperture (f-number) at MaxFocal, as resolved via the lens database.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly MinAp4MaxFocal?: number;
  /**
   * Maximum aperture (f-number) across the lens's zoom range.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly MaxAp?: number;
  /**
   * Minimum aperture (f-number) across the lens's zoom range.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly MinAp?: number;
  /**
   * Focal length at time of shooting, in millimeters, as resolved via the lens database.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly CurFocal?: number;
  /**
   * Aperture (f-number) at time of shooting, as resolved via the lens database.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly CurAp?: number;
  /**
   * Maximum aperture (f-number) available at CurFocal.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly MaxAp4CurFocal?: number;
  /**
   * Minimum aperture (f-number) available at CurFocal.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly MinAp4CurFocal?: number;
  /**
   * Minimum focus distance of the lens, in meters.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly MinFocusDistance?: number;
  /**
   * Lens focus-range index (maker-specific classification of the lens's focus range).
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly FocusRangeIndex?: number;
  /**
   * Number of f-stops in the lens's aperture range, as resolved via the lens database.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly LensFStops?: number;
  /**
   * 64-bit teleconverter ID, if a teleconverter was attached and recognized. Number when it fits Number.MAX_SAFE_INTEGER, otherwise a BigInt; the key is absent when unset.
   *
   * Same unset note as LensID.
   *
   * Key is omitted when LibRaw has not filled in this field (LibRaw's own sentinel is UINT64_MAX, not representable in the manifest). Present as a plain number when it fits Number.MAX_SAFE_INTEGER, otherwise a BigInt.
   */
  readonly TeleconverterID?: number | bigint;
  /**
   * Teleconverter name resolved from TeleconverterID.
   */
  readonly Teleconverter?: string;
  /**
   * 64-bit lens-mount adapter ID, if an adapter was recognized. Number when it fits Number.MAX_SAFE_INTEGER, otherwise a BigInt; the key is absent when unset.
   *
   * Same unset note as LensID.
   *
   * Key is omitted when LibRaw has not filled in this field (LibRaw's own sentinel is UINT64_MAX, not representable in the manifest). Present as a plain number when it fits Number.MAX_SAFE_INTEGER, otherwise a BigInt.
   */
  readonly AdapterID?: number | bigint;
  /**
   * Adapter name resolved from AdapterID.
   */
  readonly Adapter?: string;
  /**
   * 64-bit attachment (e.g. close-up filter) ID, if recognized. Number when it fits Number.MAX_SAFE_INTEGER, otherwise a BigInt; the key is absent when unset.
   *
   * Same unset note as LensID.
   *
   * Key is omitted when LibRaw has not filled in this field (LibRaw's own sentinel is UINT64_MAX, not representable in the manifest). Present as a plain number when it fits Number.MAX_SAFE_INTEGER, otherwise a BigInt.
   */
  readonly AttachmentID?: number | bigint;
  /**
   * Attachment name resolved from AttachmentID.
   */
  readonly Attachment?: string;
  /**
   * Divisor to convert the lens database's internal focal-length units to millimeters (1 in the common case).
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly FocalUnits?: number;
  /**
   * 35mm-equivalent focal length in millimeters, as resolved via the lens database.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly FocalLengthIn35mmFormat?: number;
}

export interface Colordata {
  // curve: unsupported -- Internal 65536-entry linearization/tone lookup table LibRaw builds during processing. No safe JS representation; see api/metadata.json.
  // cblack: unsupported -- Per-channel/per-pattern black level correction table (LIBRAW_CBLACK_SIZE entries; encodes both simple per-color-channel and complex per-line/per-pixel-pattern black levels depending on the camera). No safe JS representation; see api/metadata.json.
  /**
   * Overall black level (baseline dark-current offset) applied during processing.
   */
  readonly black: number;
  /**
   * Maximum raw pixel value actually found in this file's data.
   */
  readonly data_maximum: number;
  /**
   * Maximum sensor value (saturation point) LibRaw uses for highlight handling.
   */
  readonly maximum: number;
  /**
   * Per-channel linear maximum values (R,G,B,G2), used for highlight reconstruction on some formats.
   */
  readonly linear_max: [number, number, number, number];
  /**
   * Floating-point maximum sensor value, for floating-point RAW formats.
   */
  readonly fmaximum: number;
  /**
   * Floating-point normalization factor, for floating-point RAW formats.
   */
  readonly fnorm: number;
  // white: unsupported -- Per-corner (8x8 grid) white-level sample table some cameras embed for vignette/shading correction. No safe JS representation; see api/metadata.json.
  /**
   * As-shot white balance multipliers (R, G1, B, G2), from the camera/file.
   */
  readonly cam_mul: [number, number, number, number];
  /**
   * Pre-multipliers LibRaw computed for the sensor/file (used to build the final white balance when no as-shot data is available).
   */
  readonly pre_mul: [number, number, number, number];
  /**
   * 3x4 color matrix (camera RGB -> a working color space) LibRaw computed for this file.
   */
  readonly cmatrix: [[number, number, number, number], [number, number, number, number], [number, number, number, number]];
  /**
   * 3x4 color correction matrix embedded in the file (e.g. DNG ColorMatrix), before LibRaw's own adjustments.
   */
  readonly ccm: [[number, number, number, number], [number, number, number, number], [number, number, number, number]];
  /**
   * 3x4 matrix converting camera-native RGB to output RGB, as used by dcraw_process.
   */
  readonly rgb_cam: [[number, number, number, number], [number, number, number, number], [number, number, number, number]];
  /**
   * 4x3 matrix converting camera-native RGB to CIE XYZ.
   */
  readonly cam_xyz: [[number, number, number], [number, number, number], [number, number, number], [number, number, number]];
  /**
   * Phase One-specific decoding parameters, as struct ph1_t (format, black-level geometry).
   */
  readonly phase_one_data: Ph1;
  /**
   * Flash compensation/power value as parsed from the file, when available.
   */
  readonly flash_used: number;
  /**
   * Canon-specific exposure value adjustment parsed from maker notes.
   */
  readonly canon_ev: number;
  /**
   * Secondary/internal model string some files embed (distinct from idata.model).
   */
  readonly model2?: string;
  /**
   * DNG UniqueCameraModel tag value.
   */
  readonly UniqueCameraModel?: string;
  /**
   * DNG LocalizedCameraModel tag value.
   */
  readonly LocalizedCameraModel?: string;
  /**
   * DNG/EXIF ImageUniqueID tag value.
   */
  readonly ImageUniqueID?: string;
  /**
   * DNG RawDataUniqueID tag value (hex-encoded identifier).
   */
  readonly RawDataUniqueID?: string;
  /**
   * DNG OriginalRawFileName tag value, for a DNG converted from another raw format.
   */
  readonly OriginalRawFileName?: string;
  /**
   * Embedded ICC color profile bytes, when the file carries one.
   *
   * void* pointer into LibRaw-owned memory, paired with profile_length below; scripts/gen-metadata-cc.js special-cases this field to copy profile_length bytes into a fresh Buffer when the pointer is non-null, and to omit the key entirely (never an empty Buffer) when it is null -- the one documented exception to "pointer fields are unsupported" (docs/plan/tasks.md's T14a Do list).
   */
  readonly profile?: Buffer;
  /**
   * Length in bytes of the embedded ICC profile (0 if color.profile is absent).
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly profile_length?: number;
  // black_stat: unsupported -- Internal black-level statistics accumulator (sum/count pairs) used while computing color.black. No safe JS representation; see api/metadata.json.
  /**
   * Up to 2 DNG color calibration sets (e.g. for two calibration illuminants), as libraw_dng_color_t.
   */
  readonly dng_color: [DngColor, DngColor];
  /**
   * DNG black/white level and crop metadata, as libraw_dng_levels_t.
   */
  readonly dng_levels: DngLevels;
  /**
   * Per-illuminant white balance coefficient presets (256 possible illuminant/CCT slots, [R, G1, B, G2] each) LibRaw parsed from the file's maker notes.
   *
   * Compacted: scripts/gen-metadata-cc.js emits only the illuminant slots that are actually set (any non-zero coefficient) as `[{ illuminant, coeffs: [r, g, b, g2] }]`, per docs/plan/tasks.md's T14a Do list, instead of the full fixed-size 256-entry table (almost entirely zero for any given file).
   */
  readonly WB_Coeffs: readonly WbCoeffEntry[];
  /**
   * Per-color-temperature white balance coefficient presets (64 possible slots, [CCT, R, G1, B, G2] each) some makers embed.
   *
   * Compacted the same way as WB_Coeffs, keyed on CCT > 0 instead of illuminant index: `[{ colorTemperature, coeffs: [r, g, b, g2] }]`.
   */
  readonly WBCT_Coeffs: readonly WbctCoeffEntry[];
  /**
   * Non-zero if the as-shot white balance was already applied to the raw data by the camera/converter (rare; e.g. some compressed raw formats).
   */
  readonly as_shot_wb_applied: number;
  /**
   * Up to 2 Phase One color calibration sets, as libraw_P1_color_t.
   */
  readonly P1_color: [P1Color, P1Color];
  /**
   * Bits per pixel/sample of the raw data (Phase One: raw format code instead -- see the header's field comment for the code table).
   */
  readonly raw_bps: number;
  /**
   * EXIF ColorSpace tag value (e.g. 1 = sRGB, 0xffff = uncalibrated).
   */
  readonly ExifColorSpace: number;
}

export interface Ph1 {
  /**
   * Phase One raw format code.
   */
  readonly format: number;
  /**
   * Phase One decryption key offset within the file.
   */
  readonly key_off: number;
  /**
   * Raw value of Phase One maker-note tag 0x21a (undocumented by Phase One; used internally by the decoder).
   */
  readonly tag_21a: number;
  /**
   * Phase One black-level tag value.
   */
  readonly t_black: number;
  /**
   * Column at which the sensor's dual-readout halves split, for split-sensor Phase One backs.
   */
  readonly split_col: number;
  /**
   * Column index of the black-reference columns.
   */
  readonly black_col: number;
  /**
   * Row at which the sensor's dual-readout halves split, for split-sensor Phase One backs.
   */
  readonly split_row: number;
  /**
   * Row index of the black-reference rows.
   */
  readonly black_row: number;
  /**
   * Raw value of Phase One maker-note tag 0x210 (undocumented by Phase One; used internally by the decoder).
   */
  readonly tag_210: number;
}

export interface DngColor {
  /**
   * Bitmask of which DNG color-calibration fields this set actually parsed from the file.
   */
  readonly parsedfields: number;
  /**
   * DNG CalibrationIlluminant tag value (standard illuminant code) this calibration set applies to.
   */
  readonly illuminant: number;
  /**
   * 4x4 DNG CameraCalibration matrix.
   */
  readonly calibration: [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]];
  /**
   * 4x3 DNG ColorMatrix (camera RGB -> XYZ under the calibration illuminant).
   */
  readonly colormatrix: [[number, number, number], [number, number, number], [number, number, number], [number, number, number]];
  /**
   * 3x4 DNG ForwardMatrix (XYZ -> camera RGB, the inverse-direction calibration some DNGs embed).
   */
  readonly forwardmatrix: [[number, number, number, number], [number, number, number, number], [number, number, number, number]];
}

export interface DngLevels {
  /**
   * Bitmask of which DNG level/crop fields this struct actually parsed from the file.
   */
  readonly parsedfields: number;
  // dng_cblack: unsupported -- DNG per-pattern black level table (LIBRAW_CBLACK_SIZE entries), the DNG-tag counterpart of color.cblack. No safe JS representation; see api/metadata.json.
  /**
   * DNG BlackLevel tag value (single black level), when the file uses the simple (non-per-pattern) form.
   */
  readonly dng_black: number;
  // dng_fcblack: unsupported -- Floating-point DNG per-pattern black level table (LIBRAW_CBLACK_SIZE entries), for floating-point DNGs. No safe JS representation; see api/metadata.json.
  /**
   * Floating-point DNG BlackLevel tag value, for floating-point DNGs.
   */
  readonly dng_fblack: number;
  /**
   * DNG WhiteLevel tag values, one per color plane.
   */
  readonly dng_whitelevel: [number, number, number, number];
  /**
   * DNG DefaultCropOrigin + DefaultCropSize as [originX, originY, width, height].
   */
  readonly default_crop: [number, number, number, number];
  /**
   * DNG user-crop rectangle, relative to default_crop, as [top, left, bottom, right] fractions.
   */
  readonly user_crop: [number, number, number, number];
  /**
   * DNG PreviewColorSpace tag value.
   */
  readonly preview_colorspace: number;
  /**
   * DNG AnalogBalance tag (per-channel R,G,B,G2 multipliers), as parsed directly into this DNG-specific struct.
   */
  readonly analogbalance: [number, number, number, number];
  /**
   * DNG AsShotNeutral tag (per-channel neutral white balance values).
   */
  readonly asshotneutral: [number, number, number, number];
  /**
   * DNG BaselineExposure tag value (EV adjustment recommended by the DNG author).
   */
  readonly baseline_exposure: number;
  /**
   * DNG LinearResponseLimit tag value (fraction of full scale where the sensor's response stops being linear).
   */
  readonly LinearResponseLimit: number;
  /**
   * Up to 3 DNG opcode-list entries (OpcodeList1/2/3), as libraw_dng_rawopcode_t.
   */
  readonly rawopcodes: [DngRawopcode, DngRawopcode, DngRawopcode];
}

export interface DngRawopcode {
  /**
   * Length in bytes of this DNG opcode-list entry's raw data.
   */
  readonly len: number;
  // data: unsupported -- Pointer to this DNG opcode-list entry's raw (undecoded) opcode data. No safe JS representation; see api/metadata.json.
}

export interface P1Color {
  /**
   * 3x3 ROMM (ProPhoto RGB reference space) to camera-RGB matrix, flattened row-major to 9 values, for Phase One files.
   */
  readonly romm_cam: [number, number, number, number, number, number, number, number, number];
}

export interface MetadataCommon {
  /**
   * Flash exposure compensation, in EV.
   */
  readonly FlashEC: number;
  /**
   * Flash guide number.
   */
  readonly FlashGN: number;
  /**
   * Camera body internal temperature in degrees Celsius, when recorded.
   */
  readonly CameraTemperature: number;
  /**
   * Sensor temperature in degrees Celsius, when recorded.
   */
  readonly SensorTemperature: number;
  /**
   * Secondary sensor temperature reading in degrees Celsius, when the camera records more than one.
   */
  readonly SensorTemperature2: number;
  /**
   * Lens temperature in degrees Celsius, when recorded.
   */
  readonly LensTemperature: number;
  /**
   * Ambient (environment) temperature in degrees Celsius, when recorded.
   */
  readonly AmbientTemperature: number;
  /**
   * Battery temperature in degrees Celsius, when recorded.
   */
  readonly BatteryTemperature: number;
  /**
   * Ambient temperature in degrees Celsius, from the EXIF/MakerNote ambient-temperature tag specifically.
   */
  readonly exifAmbientTemperature: number;
  /**
   * Relative humidity percentage, from EXIF, when recorded.
   */
  readonly exifHumidity: number;
  /**
   * Atmospheric pressure in hPa, from EXIF, when recorded.
   */
  readonly exifPressure: number;
  /**
   * Water depth in meters, from EXIF, for underwater housings that record it.
   */
  readonly exifWaterDepth: number;
  /**
   * Acceleration magnitude, from EXIF, when recorded.
   */
  readonly exifAcceleration: number;
  /**
   * Camera elevation angle in degrees, from EXIF, when recorded.
   */
  readonly exifCameraElevationAngle: number;
  /**
   * Measured (actual) ISO sensitivity, when the camera records one distinct from the nominal ISO in other.iso_speed.
   */
  readonly real_ISO: number;
  /**
   * EXIF ExposureIndex tag value.
   */
  readonly exifExposureIndex: number;
  /**
   * EXIF/MakerNote color space code (maker-specific encoding; compare against the relevant vendor's documented values).
   */
  readonly ColorSpace: number;
  /**
   * Camera firmware version string, when recorded outside idata.software.
   */
  readonly firmware?: string;
  /**
   * Exposure calibration shift, in EV, some cameras record as a fine metering correction.
   */
  readonly ExposureCalibrationShift: number;
  /**
   * Autofocus-related maker-note data blocks actually present in this file (see afcount), as libraw_afinfo_item_t.
   *
   * Fixed-size LIBRAW_AFDATA_MAXCOUNT (4) slots in the C struct; scripts/gen-metadata-cc.js emits only the first `afcount` entries (the rest are unused/zero slots).
   */
  readonly afdata: readonly AfinfoItem[];
  /**
   * Number of afdata entries actually populated (0..4).
   */
  readonly afcount: number;
}

export interface AfinfoItem {
  /**
   * Maker-note tag ID this autofocus data block was read from.
   */
  readonly AFInfoData_tag: number;
  /**
   * Byte order (TIFF-style, e.g. 0x4949/0x4d4d) this autofocus data block was encoded with.
   */
  readonly AFInfoData_order: number;
  /**
   * Version number/tag of this autofocus data block's internal format.
   */
  readonly AFInfoData_version: number;
  /**
   * Length in bytes of this autofocus data block's raw payload.
   */
  readonly AFInfoData_length: number;
  // AFInfoData: unsupported -- Pointer to this autofocus data block's raw (undecoded) payload bytes. No safe JS representation; see api/metadata.json.
}

export interface CanonMakernotes {
  /**
   * Canon color-data maker-note record version number.
   */
  readonly ColorDataVer: number;
  /**
   * Canon color-data maker-note record sub-version number.
   */
  readonly ColorDataSubVer: number;
  /**
   * Canon specular (saturation) white level parsed from color-data.
   */
  readonly SpecularWhiteLevel: number;
  /**
   * Canon normal white level parsed from color-data.
   */
  readonly NormalWhiteLevel: number;
  /**
   * Per-channel (R,G1,B,G2) black level from Canon color-data.
   */
  readonly ChannelBlackLevel: [number, number, number, number];
  /**
   * Average black level across channels from Canon color-data.
   */
  readonly AverageBlackLevel: number;
  /**
   * Canon multi-shot-mode per-channel data (e.g. Dual Pixel/HDR shot info).
   */
  readonly multishot: [number, number, number, number];
  /**
   * Canon metering mode code.
   */
  readonly MeteringMode: number;
  /**
   * Canon spot-metering sub-mode code.
   */
  readonly SpotMeteringMode: number;
  /**
   * Canon flash metering mode code.
   */
  readonly FlashMeteringMode: number;
  /**
   * Canon flash exposure lock (FE lock) flag.
   */
  readonly FlashExposureLock: number;
  /**
   * Canon exposure mode code.
   */
  readonly ExposureMode: number;
  /**
   * Canon auto-exposure bracketing/setting code.
   */
  readonly AESetting: number;
  /**
   * Canon image stabilization mode code.
   */
  readonly ImageStabilization: number;
  /**
   * Canon flash mode code.
   */
  readonly FlashMode: number;
  /**
   * Canon flash-fired flag/activity code.
   */
  readonly FlashActivity: number;
  /**
   * Canon flash configuration bit flags.
   */
  readonly FlashBits: number;
  /**
   * Canon manual flash output level code.
   */
  readonly ManualFlashOutput: number;
  /**
   * Canon flash output level.
   */
  readonly FlashOutput: number;
  /**
   * Canon flash guide number.
   */
  readonly FlashGuideNumber: number;
  /**
   * Canon continuous-drive mode code.
   */
  readonly ContinuousDrive: number;
  /**
   * Canon sensor width parsed from maker notes, in pixels.
   */
  readonly SensorWidth: number;
  /**
   * Canon sensor height parsed from maker notes, in pixels.
   */
  readonly SensorHeight: number;
  /**
   * Canon AF micro-adjustment mode code.
   */
  readonly AFMicroAdjMode: number;
  /**
   * Canon AF micro-adjustment value.
   */
  readonly AFMicroAdjValue: number;
  /**
   * Orientation flag Canon records in maker notes (LibRaw-internal flip encoding).
   */
  readonly MakernotesFlip: number;
  /**
   * Canon auto-rotate mode code.
   */
  readonly AutoRotateMode: number;
  /**
   * Canon record mode code (still/movie/RAW variant).
   */
  readonly RecordMode: number;
  /**
   * Canon sRAW quality code.
   */
  readonly SRAWQuality: number;
  /**
   * Canon white-balance index/preset code.
   */
  readonly wbi: number;
  /**
   * Canon RF-mount lens ID code, when an RF lens is attached.
   */
  readonly RF_lensID: number;
  /**
   * Canon Auto Lighting Optimizer setting code.
   */
  readonly AutoLightingOptimizer: number;
  /**
   * Canon Highlight Tone Priority setting code.
   */
  readonly HighlightTonePriority: number;
  /**
   * Canon recording-quality code (see the header comment for the value table).
   *
   * LibRaw's own header comment documents -1 as "n/a" for this field (the only Canon field with a documented sentinel; every other Canon field here has no such comment, so no `unset` is applied even though the struct is zero-initialized before parsing -- see this file's per-vendor sentinel-rule note).
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (-1).
   */
  readonly Quality?: number;
  /**
   * Canon Log data-compression curve code (0 off, 1 CLogV1, 2 CLogV2, 3 CLogV3).
   */
  readonly CanonLog: number;
  /**
   * Canon default absolute crop rectangle, as libraw_area_t.
   */
  readonly DefaultCropAbsolute: Area;
  /**
   * Canon recommended image area rectangle, as libraw_area_t.
   */
  readonly RecommendedImageArea: Area;
  /**
   * Canon left optical-black (masked border) rectangle, as libraw_area_t.
   */
  readonly LeftOpticalBlack: Area;
  /**
   * Canon upper optical-black (masked border) rectangle, as libraw_area_t.
   */
  readonly UpperOpticalBlack: Area;
  /**
   * Canon active (non-masked) sensor area rectangle, as libraw_area_t.
   */
  readonly ActiveArea: Area;
  /**
   * Canon [AutoISO, BaseISO] gain pair, per ExifTool convention.
   */
  readonly ISOgain: [number, number];
}

export interface Area {
  /**
   * Top edge, in pixels (0,0 is the top-left pixel).
   */
  readonly t: number;
  /**
   * Left edge, in pixels.
   */
  readonly l: number;
  /**
   * Bottom edge, in pixels.
   */
  readonly b: number;
  /**
   * Right edge, in pixels.
   */
  readonly r: number;
}

export interface NikonMakernotes {
  /**
   * Nikon exposure bracketing step value, in EV.
   */
  readonly ExposureBracketValue: number;
  /**
   * Nikon Active D-Lighting setting code.
   */
  readonly ActiveDLighting: number;
  /**
   * Nikon shooting mode bit flags.
   */
  readonly ShootingMode: number;
  /**
   * Nikon VR (vibration reduction) status byte record, raw undecoded bytes.
   */
  readonly ImageStabilization: Buffer;
  /**
   * Nikon vibration reduction (VR) on/off code.
   */
  readonly VibrationReduction: number;
  /**
   * Nikon VR mode code (e.g. normal/active/sport).
   */
  readonly VRMode: number;
  /**
   * Nikon flash setting string (e.g. "Normal", "Slow").
   */
  readonly FlashSetting?: string;
  /**
   * Nikon flash type string (e.g. "Built-in", "Optional,TTL").
   */
  readonly FlashType?: string;
  /**
   * Nikon flash exposure compensation, raw undecoded byte record.
   */
  readonly FlashExposureCompensation: Buffer;
  /**
   * Nikon external flash exposure compensation, raw undecoded byte record.
   */
  readonly ExternalFlashExposureComp: Buffer;
  /**
   * Nikon flash exposure bracketing value, raw undecoded byte record.
   */
  readonly FlashExposureBracketValue: Buffer;
  /**
   * Nikon flash mode code.
   */
  readonly FlashMode: number;
  /**
   * Nikon flash exposure compensation, secondary encoding.
   */
  readonly FlashExposureCompensation2: number;
  /**
   * Nikon flash exposure compensation, tertiary encoding.
   */
  readonly FlashExposureCompensation3: number;
  /**
   * Nikon flash exposure compensation, quaternary encoding.
   */
  readonly FlashExposureCompensation4: number;
  /**
   * Nikon flash source code (built-in vs external).
   */
  readonly FlashSource: number;
  /**
   * Nikon external flash unit firmware version, raw 2-byte record.
   */
  readonly FlashFirmware: Buffer;
  /**
   * Nikon external flash configuration bit flags.
   */
  readonly ExternalFlashFlags: number;
  /**
   * Nikon flash commander-mode flag.
   */
  readonly FlashControlCommanderMode: number;
  /**
   * Nikon flash output and compensation combined code.
   */
  readonly FlashOutputAndCompensation: number;
  /**
   * Nikon flash-zoom-head focal length code.
   */
  readonly FlashFocalLength: number;
  /**
   * Nikon flash guide-number distance code.
   */
  readonly FlashGNDistance: number;
  /**
   * Nikon commander flash-group control mode, raw undecoded byte record.
   */
  readonly FlashGroupControlMode: Buffer;
  /**
   * Nikon commander flash-group output/compensation, raw undecoded byte record.
   */
  readonly FlashGroupOutputAndCompensation: Buffer;
  /**
   * Nikon flash color-filter code.
   */
  readonly FlashColorFilter: number;
  /**
   * NEF compression type code (see the header comment for the value table).
   */
  readonly NEFCompression: number;
  /**
   * Nikon exposure mode code.
   */
  readonly ExposureMode: number;
  /**
   * Nikon exposure program code.
   */
  readonly ExposureProgram: number;
  /**
   * Nikon multiple-exposure shot count.
   */
  readonly nMEshots: number;
  /**
   * Nikon multiple-exposure auto-gain flag.
   */
  readonly MEgainOn: number;
  /**
   * Nikon multiple-exposure white balance multipliers.
   */
  readonly ME_WB: [number, number, number, number];
  /**
   * Nikon AF fine-tune on/off flag.
   */
  readonly AFFineTune: number;
  /**
   * Nikon AF fine-tune lens-registration index.
   */
  readonly AFFineTuneIndex: number;
  /**
   * Nikon AF fine-tune adjustment value.
   */
  readonly AFFineTuneAdj: number;
  /**
   * Nikon lens-data maker-note record version number.
   */
  readonly LensDataVersion: number;
  /**
   * Nikon flash-info maker-note record version number.
   */
  readonly FlashInfoVersion: number;
  /**
   * Nikon color-balance maker-note record version number.
   */
  readonly ColorBalanceVersion: number;
  /**
   * Nikon maker-note decryption key byte (derived from the file's serial number/shutter count).
   */
  readonly key: number;
  /**
   * Nikon NEF per-component bit depth values.
   */
  readonly NEFBitDepth: [number, number, number, number];
  /**
   * Nikon high-speed-crop format code (see the header comment for the value table).
   */
  readonly HighSpeedCropFormat: number;
  /**
   * Nikon high-speed-crop sensor rectangle, as libraw_sensor_highspeed_crop_t.
   */
  readonly SensorHighSpeedCrop: SensorHighspeedCrop;
  /**
   * Nikon sensor width parsed from maker notes, in pixels.
   */
  readonly SensorWidth: number;
  /**
   * Nikon sensor height parsed from maker notes, in pixels.
   */
  readonly SensorHeight: number;
  /**
   * Nikon Active D-Lighting applied-level code.
   */
  readonly Active_D_Lighting: number;
  /**
   * Nikon Picture Control maker-note record version number.
   */
  readonly PictureControlVersion: number;
  /**
   * Nikon Picture Control preset name (e.g. "STANDARD", "VIVID").
   */
  readonly PictureControlName?: string;
  /**
   * Nikon Picture Control base preset name this one derives from.
   */
  readonly PictureControlBase?: string;
  /**
   * Nikon shot-info maker-note record version number.
   */
  readonly ShotInfoVersion: number;
  /**
   * Firmware version string recorded in the Nikon shot-info block.
   */
  readonly ShotInfoFirmware?: string;
  /**
   * Length in bytes of the Nikon burst-table (tag 0x0056) raw payload.
   */
  readonly BurstTable_0x0056_len: number;
  // BurstTable_0x0056: unsupported -- Pointer to the Nikon burst-table raw payload. No safe JS representation; see api/metadata.json.
  /**
   * Nikon burst-table (tag 0x0056) record version number.
   */
  readonly BurstTable_0x0056_ver: number;
  /**
   * Nikon burst-table (tag 0x0056) group ID.
   */
  readonly BurstTable_0x0056_gid: number;
  /**
   * Nikon burst-table (tag 0x0056) frame number.
   */
  readonly BurstTable_0x0056_fnum: number;
  /**
   * Orientation flag Nikon records in maker notes (LibRaw-internal flip encoding).
   */
  readonly MakernotesFlip: number;
  /**
   * Camera roll angle in degrees, positive is clockwise, from Nikon maker notes.
   */
  readonly RollAngle: number;
  /**
   * Camera pitch angle in degrees, positive is upwards, from Nikon maker notes.
   */
  readonly PitchAngle: number;
  /**
   * Camera yaw angle in degrees, positive is to the right, from Nikon maker notes.
   */
  readonly YawAngle: number;
}

export interface SensorHighspeedCrop {
  /**
   * High-speed-crop left edge, in raw pixel coordinates.
   */
  readonly cleft: number;
  /**
   * High-speed-crop top edge, in raw pixel coordinates.
   */
  readonly ctop: number;
  /**
   * High-speed-crop width, in raw pixels.
   */
  readonly cwidth: number;
  /**
   * High-speed-crop height, in raw pixels.
   */
  readonly cheight: number;
}

export interface SonyInfo {
  /**
   * Sony camera-type code parsed from maker notes.
   *
   * See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (65535).
   */
  readonly CameraType?: number;
  /**
   * Decoded format version of Sony maker-note tag 0x9400 (0xa/0xb/0xc per ExifTool convention).
   *
   * Header comment: "0 if not found/deciphered".
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly Sony0x9400_version?: number;
  /**
   * Sony tag 0x9400 ReleaseMode2 sub-field.
   */
  readonly Sony0x9400_ReleaseMode2: number;
  /**
   * Sony tag 0x9400 sequence image number.
   */
  readonly Sony0x9400_SequenceImageNumber: number;
  /**
   * Sony tag 0x9400 sequence length, encoding 1.
   */
  readonly Sony0x9400_SequenceLength1: number;
  /**
   * Sony tag 0x9400 sequence file number.
   */
  readonly Sony0x9400_SequenceFileNumber: number;
  /**
   * Sony tag 0x9400 sequence length, encoding 2.
   */
  readonly Sony0x9400_SequenceLength2: number;
  /**
   * Sony AF area mode setting code.
   *
   * See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (255).
   */
  readonly AFAreaModeSetting?: number;
  /**
   * Sony AF area mode code.
   *
   * See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (65535).
   */
  readonly AFAreaMode?: number;
  /**
   * Sony flexible-spot AF position [x, y].
   */
  readonly FlexibleSpotPosition: [number, number];
  /**
   * Sony selected AF point index.
   *
   * See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (255).
   */
  readonly AFPointSelected?: number;
  /**
   * Sony selected AF point index, tag 0x201e encoding.
   *
   * See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (255).
   */
  readonly AFPointSelected_0x201e?: number;
  /**
   * Number of Sony AF points reported as in-focus/used.
   */
  readonly nAFPointsUsed: number;
  /**
   * Sony AF point index bitfield/list actually used for this shot.
   */
  readonly AFPointsUsed: [number, number, number, number, number, number, number, number, number, number];
  /**
   * Sony AF tracking on/off flag.
   *
   * See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (255).
   */
  readonly AFTracking?: number;
  /**
   * Sony AF system type code (e.g. phase- vs contrast-detect).
   */
  readonly AFType: number;
  /**
   * Sony focus point location [x, y, width, height] in sensor coordinates.
   */
  readonly FocusLocation: [number, number, number, number];
  /**
   * Sony lens focus position/distance code.
   *
   * See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (65535).
   */
  readonly FocusPosition?: number;
  /**
   * Sony AF micro-adjustment value.
   *
   * See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (127).
   */
  readonly AFMicroAdjValue?: number;
  /**
   * Sony AF micro-adjustment on/off flag.
   *
   * See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (-1).
   */
  readonly AFMicroAdjOn?: number;
  /**
   * Number of lenses with a registered Sony AF micro-adjustment value.
   *
   * See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (255).
   */
  readonly AFMicroAdjRegisteredLenses?: number;
  /**
   * Sony variable low-pass filter setting code.
   */
  readonly VariableLowPassFilter: number;
  /**
   * Sony long-exposure noise reduction setting code.
   *
   * See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (4294967295).
   */
  readonly LongExposureNoiseReduction?: number;
  /**
   * Sony high-ISO noise reduction setting code.
   *
   * See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (65535).
   */
  readonly HighISONoiseReduction?: number;
  /**
   * Sony in-camera HDR [mode, strength] setting.
   */
  readonly HDR: [number, number];
  /**
   * Presence/length marker for the Sony maker-note tag-group starting at 0x2010 (decoder-internal).
   */
  readonly group2010: number;
  /**
   * Presence/length marker for the Sony maker-note tag-group starting at 0x9050 (decoder-internal).
   */
  readonly group9050: number;
  /**
   * Length of the Sony 0x9050 maker-note tag-group, in bytes (debugging only, per the header comment).
   */
  readonly len_group9050: number;
  /**
   * Byte offset of Sony's "real" (measured) ISO field within its maker-note record.
   *
   * See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (65535).
   */
  readonly real_iso_offset?: number;
  /**
   * Byte offset of Sony's metering-mode field within its maker-note record.
   */
  readonly MeteringMode_offset: number;
  /**
   * Byte offset of Sony's exposure-program field within its maker-note record.
   */
  readonly ExposureProgram_offset: number;
  /**
   * Byte offset of Sony's ReleaseMode2 field within its maker-note record.
   */
  readonly ReleaseMode2_offset: number;
  /**
   * Legacy Minolta camera-model ID some Sony/Minolta-derived files carry.
   *
   * See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (4294967295).
   */
  readonly MinoltaCamID?: number;
  /**
   * Sony camera firmware version number.
   */
  readonly firmware: number;
  /**
   * Byte offset of the Sony ImageCount3 field within its maker-note record.
   *
   * See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (65535).
   */
  readonly ImageCount3_offset?: number;
  /**
   * Sony cumulative image (shutter actuation) count, encoding 3.
   */
  readonly ImageCount3: number;
  /**
   * Sony electronic front-curtain shutter on/off flag.
   *
   * See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (4294967295).
   */
  readonly ElectronicFrontCurtainShutter?: number;
  /**
   * Sony metering mode code, secondary encoding.
   */
  readonly MeteringMode2: number;
  /**
   * Capture date/time string as recorded in Sony maker notes.
   */
  readonly SonyDateTime?: string;
  /**
   * Number of shots taken since the camera was last powered on.
   */
  readonly ShotNumberSincePowerUp: number;
  /**
   * Sony pixel-shift-group identifier prefix.
   */
  readonly PixelShiftGroupPrefix: number;
  /**
   * Sony pixel-shift-group identifier.
   */
  readonly PixelShiftGroupID: number;
  /**
   * Number of shots in this file's Sony pixel-shift group, as an ASCII digit character.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly nShotsInPixelShiftGroup?: string;
  /**
   * This shot's position within its Sony pixel-shift group, as an ASCII digit character ('0' for ARQ, '1' for the group's first shot).
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly numInPixelShiftGroup?: string;
  /**
   * Sony PRD (raw-data descriptor) image height, in pixels.
   */
  readonly prd_ImageHeight: number;
  /**
   * Sony PRD (raw-data descriptor) image width, in pixels.
   */
  readonly prd_ImageWidth: number;
  /**
   * Sony PRD total bits per sample.
   */
  readonly prd_Total_bps: number;
  /**
   * Sony PRD active (meaningful) bits per sample.
   */
  readonly prd_Active_bps: number;
  /**
   * Sony PRD storage method code (82 padded, 89 linear).
   */
  readonly prd_StorageMethod: number;
  /**
   * Sony PRD Bayer CFA pattern code (1 RGGB, 4 GBRG).
   *
   * Header comment: "0 -> not valid".
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly prd_BayerPattern?: number;
  /**
   * Sony raw-file sub-type code (see the header comment for the value table); takes precedence over RAWFileType/Quality for ARW 2.0+.
   *
   * See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (65535).
   */
  readonly SonyRawFileType?: number;
  /**
   * Sony raw-file type code (0 compressed, 1 uncompressed, 2 lossless compressed v2); takes precedence over Quality.
   *
   * See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (65535).
   */
  readonly RAWFileType?: number;
  /**
   * Sony raw image-size class code (1 large, 2 small, 3 medium).
   *
   * See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (65535).
   */
  readonly RawSizeType?: number;
  /**
   * Sony recording-quality code (0/6 raw, 7/8 compressed raw).
   *
   * See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields.
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (4294967295).
   */
  readonly Quality?: number;
  /**
   * Sony raw-format version code (see the header comment for the value table, e.g. 3000 = ARW 2.0).
   */
  readonly FileFormat: number;
  /**
   * Sony maker-note metadata format version string.
   */
  readonly MetaVersion?: string;
  /**
   * Sony recorded aspect ratio.
   */
  readonly AspectRatio: number;
}

export interface FujiInfo {
  /**
   * Fuji exposure mid-point shift, in EV.
   */
  readonly ExpoMidPointShift: number;
  /**
   * Fuji Dynamic Range setting code.
   */
  readonly DynamicRange: number;
  /**
   * Fuji Film Simulation mode code.
   */
  readonly FilmMode: number;
  /**
   * Fuji Dynamic Range setting mode code.
   */
  readonly DynamicRangeSetting: number;
  /**
   * Fuji development (in-camera JPEG) Dynamic Range code.
   */
  readonly DevelopmentDynamicRange: number;
  /**
   * Fuji Auto Dynamic Range setting code.
   */
  readonly AutoDynamicRange: number;
  /**
   * Fuji D-Range Priority setting code.
   */
  readonly DRangePriority: number;
  /**
   * Fuji D-Range Priority Auto sub-setting code.
   */
  readonly DRangePriorityAuto: number;
  /**
   * Fuji D-Range Priority Fixed sub-setting code.
   */
  readonly DRangePriorityFixed: number;
  /**
   * Fuji internal model name string.
   */
  readonly FujiModel?: string;
  /**
   * Fuji internal secondary model name string.
   */
  readonly FujiModel2?: string;
  /**
   * Fuji brightness compensation, in EV (raw data scaled by 2^value when set).
   */
  readonly BrightnessCompensation: number;
  /**
   * Fuji focus mode code.
   */
  readonly FocusMode: number;
  /**
   * Fuji AF mode code.
   */
  readonly AFMode: number;
  /**
   * Fuji focus-point pixel coordinates [x, y].
   */
  readonly FocusPixel: [number, number];
  /**
   * Fuji shutter/release priority settings code.
   */
  readonly PrioritySettings: number;
  /**
   * Fuji focus settings bit flags.
   */
  readonly FocusSettings: number;
  /**
   * Fuji AF-C (continuous AF) custom settings bit flags.
   */
  readonly AF_C_Settings: number;
  /**
   * Fuji focus-warning (possible missed focus) flag.
   */
  readonly FocusWarning: number;
  /**
   * Fuji image stabilization [mode, ..., ...] setting values.
   */
  readonly ImageStabilization: [number, number, number];
  /**
   * Fuji flash mode code.
   */
  readonly FlashMode: number;
  /**
   * Fuji white balance preset code.
   */
  readonly WB_Preset: number;
  /**
   * Fuji shutter type code (0 mechanical, 1 electronic, 2 electronic long, 3 electronic front-curtain).
   */
  readonly ShutterType: number;
  /**
   * Fuji EXR sensor mode code.
   */
  readonly ExrMode: number;
  /**
   * Fuji macro mode on/off flag.
   */
  readonly Macro: number;
  /**
   * Star rating assigned to the image in-camera.
   */
  readonly Rating: number;
  /**
   * Fuji sensor crop mode code (see the header comment for the value table).
   */
  readonly CropMode: number;
  /**
   * Fuji sensor serial-number signature string.
   */
  readonly SerialSignature?: string;
  /**
   * Fuji sensor ID string.
   */
  readonly SensorID?: string;
  /**
   * RAF (raw file format) version string.
   */
  readonly RAFVersion?: string;
  /**
   * RAF data-generation code (1..4, or 4096).
   *
   * Header comment: "0 (none), 1..4, 4096".
   *
   * Key is omitted when the underlying value equals LibRaw's unset sentinel (0).
   */
  readonly RAFDataGeneration?: number;
  /**
   * RAF data record version number.
   */
  readonly RAFDataVersion: number;
  /**
   * Flag for a Fuji sensor/processing variant LibRaw identifies internally as "TSNERDTS".
   */
  readonly isTSNERDTS: number;
  /**
   * Fuji drive mode code (0 single frame, 1 continuous low, 2 continuous high).
   */
  readonly DriveMode: number;
  /**
   * Per-channel black level table some Fuji models embed in maker notes (see the header comment for the model list).
   */
  readonly BlackLevel: [number, number, number, number, number, number, number, number, number];
  /**
   * RAF internal per-mode image-size lookup table.
   */
  readonly RAFData_ImageSizeTable: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  /**
   * Fuji auto-bracketing mode code.
   */
  readonly AutoBracketing: number;
  /**
   * Frame sequence number within a Fuji burst/bracket sequence.
   */
  readonly SequenceNumber: number;
  /**
   * Length of the Fuji burst/bracket series this frame belongs to.
   */
  readonly SeriesLength: number;
  /**
   * Fuji pixel-shift multi-shot [x, y] sub-pixel offset for this frame.
   */
  readonly PixelShiftOffset: [number, number];
  /**
   * Fuji cumulative image (shutter actuation) count.
   */
  readonly ImageCount: number;
}

export interface OlympusMakernotes {
  /**
   * Olympus internal camera-type code string.
   */
  readonly CameraType2?: string;
  /**
   * Valid bits per sample, as recorded by Olympus maker notes.
   */
  readonly ValidBits: number;
  /**
   * Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 0).
   */
  readonly tagX640: number;
  /**
   * Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 1).
   */
  readonly tagX641: number;
  /**
   * Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 2).
   */
  readonly tagX642: number;
  /**
   * Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 3).
   */
  readonly tagX643: number;
  /**
   * Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 4).
   */
  readonly tagX644: number;
  /**
   * Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 5).
   */
  readonly tagX645: number;
  /**
   * Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 6).
   */
  readonly tagX646: number;
  /**
   * Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 7).
   */
  readonly tagX647: number;
  /**
   * Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 8).
   */
  readonly tagX648: number;
  /**
   * Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 9).
   */
  readonly tagX649: number;
  /**
   * Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 10).
   */
  readonly tagX650: number;
  /**
   * Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 11).
   */
  readonly tagX651: number;
  /**
   * Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 12).
   */
  readonly tagX652: number;
  /**
   * Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 13).
   */
  readonly tagX653: number;
  /**
   * Olympus sensor calibration [gain, offset] pair.
   */
  readonly SensorCalibration: [number, number];
  /**
   * Olympus drive-mode setting values.
   */
  readonly DriveMode: [number, number, number, number, number];
  /**
   * Olympus color space code.
   */
  readonly ColorSpace: number;
  /**
   * Olympus focus-mode setting values.
   */
  readonly FocusMode: [number, number];
  /**
   * Olympus autofocus on/off flag.
   */
  readonly AutoFocus: number;
  /**
   * Olympus selected AF point index.
   */
  readonly AFPoint: number;
  /**
   * Olympus AF area bitfield/coordinate table.
   */
  readonly AFAreas: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  /**
   * Olympus selected AF point, normalized coordinates.
   */
  readonly AFPointSelected: [number, number, number, number, number];
  /**
   * Olympus AF result (in-focus/failed) code.
   */
  readonly AFResult: number;
  /**
   * Olympus AF fine-tune on/off flag.
   */
  readonly AFFineTune: number;
  /**
   * Olympus AF fine-tune adjustment values.
   */
  readonly AFFineTuneAdj: [number, number, number];
  /**
   * Olympus special shooting mode [group, mode, sub-mode] code.
   */
  readonly SpecialMode: [number, number, number];
  /**
   * Olympus zoom lens step-position count.
   */
  readonly ZoomStepCount: number;
  /**
   * Olympus focus lens step-position count.
   */
  readonly FocusStepCount: number;
  /**
   * Olympus focus step count corresponding to infinity focus.
   */
  readonly FocusStepInfinity: number;
  /**
   * Olympus focus step count corresponding to the near focus limit.
   */
  readonly FocusStepNear: number;
  /**
   * Olympus focus distance, in meters.
   */
  readonly FocusDistance: number;
  /**
   * Olympus aspect-ratio crop frame [left, top, width, height].
   */
  readonly AspectFrame: [number, number, number, number];
  /**
   * Olympus focus/image-stacking [count, index] pair.
   */
  readonly StackedImage: [number, number];
  /**
   * Olympus Live ND (electronic neutral density) on/off flag.
   */
  readonly isLiveND: number;
  /**
   * Olympus Live ND applied attenuation factor.
   */
  readonly LiveNDfactor: number;
  /**
   * Olympus in-camera panorama mode code.
   */
  readonly Panorama_mode: number;
  /**
   * Frame number within an Olympus in-camera panorama sequence.
   */
  readonly Panorama_frameNum: number;
}

export interface PanasonicMakernotes {
  /**
   * Panasonic/Leica raw compression code (see the header comment for the value table).
   */
  readonly Compression: number;
  /**
   * Number of valid entries in BlackLevel.
   */
  readonly BlackLevelDim: number;
  /**
   * Per-channel black level table from Panasonic maker notes.
   */
  readonly BlackLevel: [number, number, number, number, number, number, number, number];
  /**
   * Panasonic multi-shot mode code (0 off, 65536 Pixel Shift).
   */
  readonly Multishot: number;
  /**
   * Panasonic gamma value applied/recorded for this file.
   */
  readonly gamma: number;
  /**
   * Panasonic per-channel (R,G,B) high-ISO multiplier.
   */
  readonly HighISOMultiplier: [number, number, number];
  /**
   * Panasonic lens focus step count towards the near limit.
   */
  readonly FocusStepNear: number;
  /**
   * Panasonic lens focus step count at the time of capture.
   */
  readonly FocusStepCount: number;
  /**
   * Panasonic zoom lens position code.
   */
  readonly ZoomPosition: number;
  /**
   * Panasonic lens-manufacturer code.
   */
  readonly LensManufacturer: number;
}

export interface PentaxMakernotes {
  /**
   * Pentax drive-mode setting bytes.
   */
  readonly DriveMode: Buffer;
  /**
   * Pentax focus-mode setting values.
   */
  readonly FocusMode: [number, number];
  /**
   * Pentax selected AF point [mode, point] pair.
   */
  readonly AFPointSelected: [number, number];
  /**
   * Pentax selected AF point area code.
   */
  readonly AFPointSelected_Area: number;
  /**
   * Format version of the Pentax AF-points-in-focus record.
   */
  readonly AFPointsInFocus_version: number;
  /**
   * Pentax AF points reported in-focus, as a bitfield.
   */
  readonly AFPointsInFocus: number;
  /**
   * Pentax lens focus position code.
   */
  readonly FocusPosition: number;
  /**
   * Pentax dynamic range expansion setting bytes (entry 1 > 0 adds entry 0 to the black level, per the header comment).
   */
  readonly DynamicRangeExpansion: Buffer;
  /**
   * Pentax AF micro-adjustment value.
   */
  readonly AFAdjustment: number;
  /**
   * Pentax AF point selection mode code.
   */
  readonly AFPointMode: number;
  /**
   * Pentax multi-exposure setting flags (per the header comment, the last bit is 0 when multi-exposure is not used).
   */
  readonly MultiExposure: number;
  /**
   * Pentax recording-quality code (4 raw, 7 raw+pixel-shift, 8 raw+dynamic pixel-shift).
   */
  readonly Quality: number;
}

export interface SamsungMakernotes {
  /**
   * Samsung full sensor image size [left, top, width, height].
   */
  readonly ImageSizeFull: [number, number, number, number];
  /**
   * Samsung cropped output image size [left, top, width, height].
   */
  readonly ImageSizeCrop: [number, number, number, number];
  /**
   * Samsung color space [tag, value] pair.
   */
  readonly ColorSpace: [number, number];
  /**
   * Samsung maker-note decryption/derivation key material (11 words).
   */
  readonly key: [number, number, number, number, number, number, number, number, number, number, number];
  /**
   * Samsung digital gain (PostAEGain / digital stretch) applied.
   */
  readonly DigitalGain: number;
  /**
   * Samsung device-type code.
   */
  readonly DeviceType: number;
  /**
   * Samsung lens firmware version string.
   */
  readonly LensFirmware?: string;
}

export interface KodakMakernotes {
  /**
   * Kodak black level for the top sensor region.
   */
  readonly BlackLevelTop: number;
  /**
   * Kodak black level for the bottom sensor region.
   */
  readonly BlackLevelBottom: number;
  /**
   * Kodak KDC left sensor offset (may be negative or zero).
   */
  readonly offset_left: number;
  /**
   * Kodak KDC top sensor offset (may be negative or zero).
   */
  readonly offset_top: number;
  /**
   * Kodak clipping black-point value (valid for the P712/P850/P880 models).
   */
  readonly clipBlack: number;
  /**
   * Kodak clipping white-point value (valid for the P712/P850/P880 models).
   */
  readonly clipWhite: number;
  /**
   * Kodak ROMM (ProPhoto RGB) to camera-RGB matrix, daylight illuminant.
   */
  readonly romm_camDaylight: [[number, number, number], [number, number, number], [number, number, number]];
  /**
   * Kodak ROMM to camera-RGB matrix, tungsten illuminant.
   */
  readonly romm_camTungsten: [[number, number, number], [number, number, number], [number, number, number]];
  /**
   * Kodak ROMM to camera-RGB matrix, fluorescent illuminant.
   */
  readonly romm_camFluorescent: [[number, number, number], [number, number, number], [number, number, number]];
  /**
   * Kodak ROMM to camera-RGB matrix, flash illuminant.
   */
  readonly romm_camFlash: [[number, number, number], [number, number, number], [number, number, number]];
  /**
   * Kodak ROMM to camera-RGB matrix, custom illuminant.
   */
  readonly romm_camCustom: [[number, number, number], [number, number, number], [number, number, number]];
  /**
   * Kodak ROMM to camera-RGB matrix, auto-selected illuminant.
   */
  readonly romm_camAuto: [[number, number, number], [number, number, number], [number, number, number]];
  /**
   * Kodak tone-curve calibration value at the 18% (mid-gray) point.
   */
  readonly val018percent: number;
  /**
   * Kodak tone-curve calibration value at the 100% (white) point.
   */
  readonly val100percent: number;
  /**
   * Kodak tone-curve calibration value at the 170% (highlight headroom) point.
   */
  readonly val170percent: number;
  /**
   * Raw value of Kodak maker-note tag 0x8a (undocumented by Kodak).
   */
  readonly MakerNoteKodak8a: number;
  /**
   * Kodak ISO calibration gain factor.
   */
  readonly ISOCalibrationGain: number;
  /**
   * Kodak analog (sensor-level) ISO value, before digital gain.
   */
  readonly AnalogISO: number;
}

export interface P1Makernotes {
  /**
   * Phase One capture software name/version string (maker-note tag 0x0203).
   */
  readonly Software?: string;
  /**
   * Phase One system type string (maker-note tag 0x0204).
   */
  readonly SystemType?: string;
  /**
   * Phase One firmware version string (maker-note tag 0x0301).
   */
  readonly FirmwareString?: string;
  /**
   * Phase One system model string.
   */
  readonly SystemModel?: string;
}

export interface HasselbladMakernotes {
  /**
   * Hasselblad base ISO sensitivity.
   */
  readonly BaseISO: number;
  /**
   * Hasselblad sensor gain applied.
   */
  readonly Gain: number;
  /**
   * Hasselblad sensor identifier string.
   */
  readonly Sensor?: string;
  /**
   * Hasselblad sensor-unit ("SU") identifier string.
   */
  readonly SensorUnit?: string;
  /**
   * Hasselblad host-body ("HB") identifier string.
   */
  readonly HostBody?: string;
  /**
   * Hasselblad sensor code.
   */
  readonly SensorCode: number;
  /**
   * Hasselblad sensor sub-code.
   */
  readonly SensorSubCode: number;
  /**
   * Hasselblad sensor coating code.
   */
  readonly CoatingCode: number;
  /**
   * Non-zero if the raw data is the uncropped full sensor read-out.
   */
  readonly uncropped: number;
  /**
   * String identifying what initiated this Hasselblad capture sequence (e.g. camera settings menu entry).
   */
  readonly CaptureSequenceInitiator?: string;
  /**
   * Hasselblad sensor-unit connector identifier string (maker-note tag 0x0015).
   */
  readonly SensorUnitConnector?: string;
  /**
   * Hasselblad file format code (3FR, FFF, Imacon, or Hasselblad/Phocus DNG).
   */
  readonly format: number;
  /**
   * Number of the IFD containing each Hasselblad color-matrix (CM) record.
   */
  readonly nIFD_CM: [number, number];
  /**
   * Hasselblad recommended crop [width, height].
   */
  readonly RecommendedCrop: [number, number];
  /**
   * Hasselblad maker-note color matrix (tag 0x002a), when present.
   */
  readonly mnColorMatrix: [[number, number, number], [number, number, number], [number, number, number], [number, number, number]];
}

export interface RicohMakernotes {
  /**
   * Ricoh AF status code.
   */
  readonly AFStatus: number;
  /**
   * Ricoh AF area X positions.
   */
  readonly AFAreaXPosition: [number, number];
  /**
   * Ricoh AF area Y positions.
   */
  readonly AFAreaYPosition: [number, number];
  /**
   * Ricoh AF area mode code.
   */
  readonly AFAreaMode: number;
  /**
   * Ricoh sensor width parsed from maker notes, in pixels.
   */
  readonly SensorWidth: number;
  /**
   * Ricoh sensor height parsed from maker notes, in pixels.
   */
  readonly SensorHeight: number;
  /**
   * Ricoh cropped output image width, in pixels.
   */
  readonly CroppedImageWidth: number;
  /**
   * Ricoh cropped output image height, in pixels.
   */
  readonly CroppedImageHeight: number;
  /**
   * Ricoh wide-conversion-adapter attached flag.
   */
  readonly WideAdapter: number;
  /**
   * Ricoh sensor crop mode code.
   */
  readonly CropMode: number;
  /**
   * Ricoh built-in neutral-density filter on/off flag.
   */
  readonly NDFilter: number;
  /**
   * Ricoh auto-bracketing mode code.
   */
  readonly AutoBracketing: number;
  /**
   * Ricoh macro mode on/off flag.
   */
  readonly MacroMode: number;
  /**
   * Ricoh flash mode code.
   */
  readonly FlashMode: number;
  /**
   * Ricoh flash exposure compensation, in EV.
   */
  readonly FlashExposureComp: number;
  /**
   * Ricoh manual flash output level.
   */
  readonly ManualFlashOutput: number;
}

/**
 * Read-only metadata mirror of `imgdata` (identify()'s `metadata` result field,
 * and Processor.metadata) -- see docs/reference/metadata.md.
 */
export interface Metadata {
  readonly idata: Iparams;
  readonly sizes: ImageSizes;
  readonly other: Imgother;
  readonly lens: Lensinfo;
  readonly color: Colordata;
  readonly makernotes: {
    readonly common: MetadataCommon;
    readonly canon: CanonMakernotes;
    readonly nikon: NikonMakernotes;
    readonly sony: SonyInfo;
    readonly fuji: FujiInfo;
    readonly olympus: OlympusMakernotes;
    readonly panasonic: PanasonicMakernotes;
    readonly pentax: PentaxMakernotes;
    readonly samsung: SamsungMakernotes;
    readonly kodak: KodakMakernotes;
    readonly p1: P1Makernotes;
    readonly hasselblad: HasselbladMakernotes;
    readonly ricoh: RicohMakernotes;
  };
}

// --- events (src/events.h's JobEvent, via EventsToArray) --------------------

/** `Processor` 'progress' event / a fused helper's `onProgress` callback payload. */
export interface ProgressEvent {
  readonly stage: ProgressStageName;
  readonly iteration: number;
  readonly expected: number;
}

/** `Processor` 'dataError' event / a fused helper's `onDataError` callback payload. */
export interface DataErrorEvent {
  /** The data_callback's own offset argument; -1 for an EOF condition. */
  readonly offset: number;
  /** The file name LibRaw reported, or "data error" if it reported none. */
  readonly message: string;
}

/** `Processor` 'exifTag' event payload -- only fires when constructed with `{ exifTags: true }`. */
export interface ExifTagEvent {
  /**
   * Not a bare EXIF/TIFF tag number in general -- the call site ORs the real
   * tag into the low 16 bits with an IFD/GPS marker in the high bits.
   * `tag & 0xffff` recovers the plain tag number for an ordinary TIFF/DNG IFD.
   */
  readonly tag: number;
  readonly type: number;
  readonly len: number;
  readonly ordering: number;
}

// --- result shapes ------------------------------------------------------------

/** `decode()`'s resolved value (src/fused.cc's DecodeWorker::OnOK). */
export interface DecodeResult {
  readonly width: number;
  readonly height: number;
  readonly colors: number;
  readonly bits: number;
  readonly stride: number;
  readonly data: Buffer;
  readonly flip: number;
  /** Short `LIBRAW_WARN_*` names accumulated during this decode (see `enums.WARN`). */
  readonly warnings: readonly WarningName[];
}

/** One entry of `identify()`'s `thumbs` array (src/fused.cc's IdentifyWorker::OnOK, `imgdata.thumbs_list`). */
export interface ThumbsListEntry {
  readonly tformat: InternalThumbnailFormat;
  readonly twidth: number;
  readonly theight: number;
  readonly tflip: number;
  readonly tlength: number;
  readonly tmisc: number;
}

/** `identify()`'s `decoder` field -- note the key names differ from `Processor#decoderInfo()`'s `DecoderInfo` below. */
export interface IdentifyDecoderInfo {
  readonly name: string | null;
  readonly flags: number;
}

/** `identify()`'s resolved value (src/fused.cc's IdentifyWorker::OnOK). */
export interface IdentifyResult {
  readonly sizes: ImageSizes;
  readonly idata: Iparams;
  readonly thumbs: readonly ThumbsListEntry[];
  readonly decoder: IdentifyDecoderInfo;
  readonly warnings: readonly WarningName[];
  readonly metadata: Metadata;
}

/** The fused `thumbnail()` helper's resolved value (src/fused.cc's ThumbnailWorker::OnOK). */
export interface ThumbnailResult {
  readonly format: ThumbnailResultFormat;
  readonly width: number;
  readonly height: number;
  readonly flip: number;
  readonly colors: number;
  readonly bits: number;
  readonly data: Buffer;
}

/** `Processor#imageSync()`/`#image()`'s resolved value (src/processor.cc). */
export interface ImageResult {
  readonly width: number;
  readonly height: number;
  readonly colors: number;
  readonly bits: number;
  readonly data: Buffer;
}

/** `Processor#thumbSync()`/`#thumb()`'s resolved value (src/processor.cc). */
export interface ThumbResult {
  readonly type: ImageFormatType;
  readonly width: number;
  readonly height: number;
  readonly colors: number;
  readonly bits: number;
  readonly data: Buffer;
}

/** `Processor#decoderInfo()`'s return value -- note the key names differ from `identify()`'s `IdentifyDecoderInfo` above. */
export interface DecoderInfo {
  readonly decoder_name: string | null;
  /** Raw `LibRaw_decoder_flags` bitmask -- decode short names via `enums.DECODER`. */
  readonly decoder_flags: number;
}

// --- options ------------------------------------------------------------------

/** `decode()`'s `output` option (copy_mem_image target). */
export interface DecodeOutputOptions {
  /** @default 'rgb' */
  layout?: 'rgb' | 'bgr';
  /** Row stride in bytes; default is `width * colors * (bits / 8)`. */
  stride?: number;
  /** Caller-supplied output buffer; must be at least the required size or a RangeError is thrown. */
  into?: Buffer;
}

/** Options for the fused `decode()` helper (src/fused.cc's Decode, lib/fused.cjs). */
export interface DecodeOptions {
  params?: OutputParams;
  rawparams?: RawParams;
  output?: DecodeOutputOptions;
  signal?: AbortSignal;
  /** JS-side only (lib/fused.cjs) -- invoked once per buffered event, after the job settles, not live. */
  onProgress?: (event: ProgressEvent) => void;
  /** JS-side only (lib/fused.cjs) -- invoked once per buffered event, after the job settles, not live. */
  onDataError?: (event: DataErrorEvent) => void;
}

/** Options for the fused `identify()` helper. */
export interface IdentifyOptions {
  rawparams?: RawParams;
  signal?: AbortSignal;
  onProgress?: (event: ProgressEvent) => void;
  onDataError?: (event: DataErrorEvent) => void;
}

/** Options for the fused `thumbnail()` helper. */
export interface ThumbnailOptions {
  /** Index into `identify()`'s `thumbs` array; defaults to LibRaw's own `unpack_thumb()` choice. */
  index?: number;
  signal?: AbortSignal;
  onProgress?: (event: ProgressEvent) => void;
  onDataError?: (event: DataErrorEvent) => void;
}

/** `new Processor(options)` (src/processor.cc's ParseFlags/ParseExifTags). */
export interface ProcessorOptions {
  /**
   * Raw `LibRaw_constructor_flags` bitmask (a plain number only -- unlike
   * `RawParams`'s flags fields, this one does not accept an array of flag
   * names). Build it from `enums.all.LibRaw_constructor_flags.NAME_TO_VALUE`
   * if needed.
   */
  flags?: number;
  /** Installs the exif-tag callback so 'exifTag' events are recorded (T10). @default false */
  exifTags?: boolean;
}

/** Trailing options object accepted by every `Processor` async stage method. */
export interface ProcessorAsyncOptions {
  signal?: AbortSignal;
}

/** `Processor#imageSync()`/`#image()`'s options. */
export interface ProcessorImageOptions {
  into?: Buffer;
  /** @default false (rgb) */
  bgr?: boolean;
  /** Row stride in bytes; default is `width * colors * (bits / 8)`. */
  stride?: number;
}

/** `Processor#image()`'s options (ProcessorImageOptions plus cancellation). */
export interface ProcessorImageAsyncOptions extends ProcessorImageOptions {
  signal?: AbortSignal;
}

/** `decodeSync()`'s options (src/addon.cc's DecodeSync -- the legacy, single-shot decode path). */
export interface DecodeSyncOptions {
  /** @default false */
  half_size?: boolean;
  /** -1 (the default) leaves LibRaw's own default quality in place. */
  user_qual?: number;
  /** @default true */
  use_camera_wb?: boolean;
  /** Adds per-stage millisecond timings to the result. @default false */
  stages?: boolean;
}

/** Per-stage millisecond timings, present on `decodeSync()`'s result iff `{ stages: true }` was passed. */
export interface DecodeSyncStages {
  readonly open: number;
  readonly unpack: number;
  readonly process: number;
  readonly copy: number;
}

/**
 * `decodeSync()`'s return value. Note: on failure, `decodeSync` throws a
 * plain `Error` with a *string* `code` property (e.g. `"LIBRAW_IO_ERROR"`),
 * predating and distinct from `LibRawError` (whose `code` is numeric) --
 * see lib/errors.cjs's header comment. Every other error path in this
 * package throws/rejects a `LibRawError`.
 */
export interface DecodeSyncResult {
  readonly width: number;
  readonly height: number;
  readonly colors: number;
  readonly bits: number;
  readonly data: Buffer;
  readonly stages?: DecodeSyncStages;
}

// --- buildInfo ------------------------------------------------------------

/** `buildInfo` (src/addon.cc's MakeBuildInfo, from the CMake-generated build_info.h). */
export interface BuildInfo {
  readonly libraw: string;
  readonly zlib: string;
  readonly libjpegTurbo: string;
  /** Whether LibRaw was compiled with `-fopenmp` (parallel PPG/AHD/DHT/AAHD demosaic). */
  readonly openmp: boolean;
  /** `"<CMAKE_CXX_COMPILER_ID> <CMAKE_CXX_COMPILER_VERSION>"`, e.g. `"GNU 14.2.1"`. */
  readonly compiler: string;
  /** The full compiler flags string the addon was built with, space-separated. */
  readonly flags: string;
  readonly buildDate: string;
  readonly gitCommit: string;
}

// --- errors -----------------------------------------------------------------

/**
 * Thrown by every `Processor` method and rejected by every async
 * method/fused helper on a LibRaw-level failure (lib/errors.cjs). Argument
 * validation failures (wrong type, wrong-size buffer, ...) throw/reject a
 * plain `TypeError`/`RangeError` instead -- not a `LibRawError` -- see
 * lib/errors.cjs's `fromNative` header comment.
 */
export class LibRawError extends Error {
  constructor(
    message: string,
    details?: { code?: number; name?: string; stage?: string; aborted?: boolean },
  );
  /** LibRaw's own numeric error code, or `LibRawError.ERR_LIBRAW_BUSY_CODE` for the busy guard. `undefined` only if constructed without one. */
  readonly code: number | undefined;
  /** The `LIBRAW_*` enumerator name (e.g. `"LIBRAW_OUT_OF_ORDER_CALL"`), `"ERR_LIBRAW_BUSY"`, or `"LibRawError"` as a last resort -- *not* the JS class name. */
  readonly name: string;
  /** The method/helper name the error occurred in (e.g. `"unpack"`, `"decode"`). */
  readonly stage: string | undefined;
  /** `true` only for a cancellation (an already-aborted or mid-call-aborted `signal`); otherwise absent, never `false`. */
  readonly aborted?: true;
  /** Numeric code of the `ERR_LIBRAW_BUSY` guard error (a second concurrent call on the same `Processor`). */
  static readonly ERR_LIBRAW_BUSY_CODE: number;
}

// --- Processor ----------------------------------------------------------------

/**
 * Stateful, long-lived wrapper around one `LibRaw` instance (src/processor.cc/.h,
 * lib/processor.cjs). Accepts one in-flight async call at a time -- a second
 * call while one is pending rejects with `LibRawError.ERR_LIBRAW_BUSY_CODE`.
 * Emits 'progress' / 'dataError' / 'exifTag' after each async call settles
 * (buffered during the call, not delivered live -- see T10's docs/plan/tasks.md
 * section); the `*Sync` methods emit nothing.
 */
export class Processor extends EventEmitter {
  constructor(options?: ProcessorOptions);

  // --- input ---
  openBufferSync(buffer: Buffer): void;
  openFileSync(path: string): void;
  openBuffer(buffer: Buffer, options?: ProcessorAsyncOptions): Promise<void>;
  openFile(path: string, options?: ProcessorAsyncOptions): Promise<void>;

  // --- decode pipeline ---
  unpackSync(): void;
  unpackThumbSync(index?: number): void;
  processSync(): void;
  adjustSizesInfoOnlySync(): void;
  unpack(options?: ProcessorAsyncOptions): Promise<void>;
  unpackThumb(index?: number, options?: ProcessorAsyncOptions): Promise<void>;
  unpackThumb(options?: ProcessorAsyncOptions): Promise<void>;
  process(options?: ProcessorAsyncOptions): Promise<void>;
  adjustSizesInfoOnly(options?: ProcessorAsyncOptions): Promise<void>;

  // --- output ---
  imageSync(options?: ProcessorImageOptions): ImageResult;
  thumbSync(): ThumbResult;
  image(options?: ProcessorImageAsyncOptions): Promise<ImageResult>;
  thumb(options?: ProcessorAsyncOptions): Promise<ThumbResult>;

  // --- lifecycle ---
  /** Resets to the pre-open state (same instance, ready for a fresh open*Sync/open*). */
  recycle(): void;
  /** Idempotent; frees the underlying LibRaw instance. Every other method throws LIBRAW_OUT_OF_ORDER_CALL afterwards. */
  close(): void;

  // --- introspection (require an opened instance; `color`/`getParams`/`getRawParams` have their own narrower state rules -- see src/processor.cc) ---
  errorCount(): number;
  decoderInfo(): DecoderInfo;
  /** Read-only snapshot of `imgdata` after open (idata/sizes/other/lens/color/makernotes.*). Throws before opening. */
  readonly metadata: Metadata;
  unpackFunctionName(): string | null;
  isFujiRotated(): boolean;
  isSraw(): boolean;
  isNikonSraw(): boolean;
  isCoolscanNef(): boolean;
  isJpegThumb(): boolean;
  isFloatingPoint(): boolean;
  haveFpData(): boolean;
  srawMidpoint(): number;
  /** Requires `unpack()`/`unpackSync()` to have run. */
  color(row: number, col: number): number;
  thumbOK(maxsz?: number): number;

  // --- parameters (T12) ---
  /** Allowed until `process()`/`processSync()` has run; throws LIBRAW_OUT_OF_ORDER_CALL after. */
  setParams(params: OutputParams): void;
  /** Allowed only before opening; throws LIBRAW_OUT_OF_ORDER_CALL once opened. */
  setRawParams(rawparams: RawParams): void;
  getParams(): Required<OutputParams>;
  getRawParams(): Required<RawParams>;

  // --- events ---
  on(event: 'progress', listener: (event: ProgressEvent) => void): this;
  on(event: 'dataError', listener: (event: DataErrorEvent) => void): this;
  on(event: 'exifTag', listener: (event: ExifTagEvent) => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  once(event: 'progress', listener: (event: ProgressEvent) => void): this;
  once(event: 'dataError', listener: (event: DataErrorEvent) => void): this;
  once(event: 'exifTag', listener: (event: ExifTagEvent) => void): this;
  once(event: string | symbol, listener: (...args: any[]) => void): this;
  off(event: 'progress', listener: (event: ProgressEvent) => void): this;
  off(event: 'dataError', listener: (event: DataErrorEvent) => void): this;
  off(event: 'exifTag', listener: (event: ExifTagEvent) => void): this;
  off(event: string | symbol, listener: (...args: any[]) => void): this;
}

// --- module functions and values ---------------------------------------------

/** Fused, stateless helper: open + unpack + process + copy in one call, its own LibRaw instance (src/fused.cc). */
export function decode(buffer: Buffer, options?: DecodeOptions): Promise<DecodeResult>;
/** Fused, stateless helper: open + adjust_sizes_info_only, full metadata mirror, its own LibRaw instance. */
export function identify(buffer: Buffer, options?: IdentifyOptions): Promise<IdentifyResult>;
/** Fused, stateless helper: open + unpack_thumb + dcraw_make_mem_thumb, its own LibRaw instance. */
export function thumbnail(buffer: Buffer, options?: ThumbnailOptions): Promise<ThumbnailResult>;

/**
 * Legacy single-shot synchronous decode (predates `Processor`/the fused
 * helpers -- T04). Prefer `decode()` or `Processor` for new code; kept for
 * benchmarking (`{ stages: true }`) and simple scripts. See
 * `DecodeSyncResult`'s doc comment for its distinct error shape.
 */
export function decodeSync(buffer: Buffer, options?: DecodeSyncOptions): DecodeSyncResult;

export function version(): string;
export function versionNumber(): number;
/** Raw `LibRaw_runtime_capabilities` bitmask; decode short names via `capabilityNames()` or `enums.CAPS`. */
export function capabilities(): number;
/** Short names of `capabilities()`'s set bits, e.g. `['ZLIB', 'JPEG']`. */
export function capabilityNames(): readonly CapabilityName[];
/** Short names of a `LIBRAW_WARN_*` bitmask's set bits, e.g. `warningNames(1 << 15) => ['FALLBACK_TO_AHD']`. */
export function warningNames(mask: number): readonly WarningName[];
export function cameraCount(): number;
export function cameraList(): readonly string[];

/** Diagnostic addon self-check; always returns `"ok"`. */
export function hello(): string;
/** The Node-API version this addon was compiled against (not the host runtime's maximum supported version). */
export const napiVersion: number;

export const buildInfo: BuildInfo;

/** `LibRaw_progress` short stage name -> numeric code (scripts/gen-progress.js). Compare a 'progress' event's `stage` against this, or look up LibRaw's own numeric constant. */
export const progressStages: { readonly [K in ProgressStageName]: number };

/** Every enum in `libraw_const.h`, plus short documented aliases -- see README.md's "Enums and flags" section. */
export const enums: LibRawEnums;
