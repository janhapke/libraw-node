# LibRaw enums reference

> Generated file -- do not edit by hand. Regenerate with `npm run gen:docs` (scripts/gen-docs.js).
> Source: vendor/LibRaw/libraw/libraw_const.h, api/enums.json.

Every enum in `libraw_const.h`. Re-exported at runtime as `enums` (see README.md's "Enums and flags" section) -- `enums.all[cEnumName]` by C name, plus short aliases (`enums.WARN`, `enums.CAPS`, `enums.DECODER`, `enums.RAWOPTIONS`, `enums.PROGRESS`, `enums.ERRORS`, `enums.THUMBNAIL_FORMATS`, `enums.INTERNAL_THUMBNAIL_FORMATS`, `enums.IMAGE_FORMATS`) for the families callers reach for most.

## Summary

| C name | Kind | Enumerators | Common prefix |
| --- | --- | --- | --- |
| `LibRaw_open_flags` | flags | 2 | `LIBRAW_OPEN_` |
| `LibRaw_openbayer_patterns` | enum | 4 | `LIBRAW_OPENBAYER_` |
| `LibRaw_dngfields_marks` | flags | 18 | `LIBRAW_DNGFM_` |
| `LibRaw_As_Shot_WB_Applied_codes` | flags | 6 | `LIBRAW_ASWB_` |
| `LibRaw_ExifTagTypes` | enum | 19 | `LIBRAW_EXIFTAG_TYPE_` |
| `LibRaw_whitebalance_code` | enum | 48 | `LIBRAW_WBI_` |
| `LibRaw_MultiExposure_related` | enum | 4 | `LIBRAW_ME_` |
| `LibRaw_dng_processing` | enum | 9 | `LIBRAW_DNG_` |
| `LibRaw_output_flags` | flags | 2 | `LIBRAW_OUTPUT_FLAGS_` |
| `LibRaw_runtime_capabilities` | flags | 10 | `LIBRAW_CAPS_` |
| `LibRaw_colorspace` | enum | 15 | `LIBRAW_COLORSPACE_` |
| `LibRaw_cameramaker_index` | enum | 80 | `LIBRAW_CAMERAMAKER_` |
| `LibRaw_camera_mounts` | enum | 46 | `LIBRAW_MOUNT_` |
| `LibRaw_camera_formats` | enum | 23 | `LIBRAW_FORMAT_` |
| `LibRawImageAspects` | enum | 12 | `LIBRAW_IMAGE_ASPECT_` |
| `LibRaw_lens_focal_types` | enum | 5 | `LIBRAW_FT_` |
| `LibRaw_Canon_RecordModes` | enum | 17 | `LIBRAW_Canon_RecordMode_` |
| `LibRaw_minolta_storagemethods` | enum | 2 | `LIBRAW_MINOLTA_` |
| `LibRaw_minolta_bayerpatterns` | flags | 2 | `LIBRAW_MINOLTA_` |
| `LibRaw_sony_cameratypes` | enum | 7 | `LIBRAW_SONY_` |
| `LibRaw_Sony_0x2010_Type` | enum | 10 | `LIBRAW_SONY_` |
| `LibRaw_Sony_0x9050_Type` | enum | 5 | `LIBRAW_SONY_` |
| `LIBRAW_SONY_FOCUSMODEmodes` | enum | 10 | `LIBRAW_SONY_FOCUSMODE_` |
| `LibRaw_KodakSensors` | enum | 14 | `LIBRAW_Kodak_` |
| `LibRaw_HasselbladFormatCodes` | enum | 7 | `LIBRAW_HF_` |
| `LibRaw_rawspecial_t` | enum | 10 | `LIBRAW_RAWSPECIAL_` |
| `LibRaw_rawspeed_bits_t` | flags | 6 | `LIBRAW_` |
| `LibRaw_processing_options` | flags | 26 | `LIBRAW_RAWOPTIONS_` |
| `LibRaw_decoder_flags` | flags | 14 | `LIBRAW_DECODER_` |
| `LibRaw_constructor_flags` | flags | 3 | `LIBRAW_` |
| `LibRaw_warnings` | flags | 26 | `LIBRAW_WARN_` |
| `LibRaw_exceptions` | enum | 13 | `LIBRAW_EXCEPTION_` |
| `LibRaw_progress` | flags | 32 | `LIBRAW_PROGRESS_` |
| `LibRaw_errors` | enum | 17 | `LIBRAW_` |
| `LibRaw_internal_thumbnail_formats` | enum | 12 | `LIBRAW_INTERNAL_THUMBNAIL_` |
| `LibRaw_thumbnail_formats` | enum | 8 | `LIBRAW_THUMBNAIL_` |
| `LibRaw_image_formats` | enum | 4 | `LIBRAW_IMAGE_` |

## Enums

### `LibRaw_open_flags` (flags)

| Short name | Value | Full C name |
| --- | --- | --- |
| `BIGFILE` | 1 | `LIBRAW_OPEN_BIGFILE` |
| `FILE` | 2 | `LIBRAW_OPEN_FILE` |

### `LibRaw_openbayer_patterns` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `RGGB` | 148 | `LIBRAW_OPENBAYER_RGGB` |
| `BGGR` | 22 | `LIBRAW_OPENBAYER_BGGR` |
| `GRBG` | 97 | `LIBRAW_OPENBAYER_GRBG` |
| `GBRG` | 73 | `LIBRAW_OPENBAYER_GBRG` |

### `LibRaw_dngfields_marks` (flags)

| Short name | Value | Full C name |
| --- | --- | --- |
| `FORWARDMATRIX` | 1 | `LIBRAW_DNGFM_FORWARDMATRIX` |
| `ILLUMINANT` | 2 | `LIBRAW_DNGFM_ILLUMINANT` |
| `COLORMATRIX` | 4 | `LIBRAW_DNGFM_COLORMATRIX` |
| `CALIBRATION` | 8 | `LIBRAW_DNGFM_CALIBRATION` |
| `ANALOGBALANCE` | 16 | `LIBRAW_DNGFM_ANALOGBALANCE` |
| `BLACK` | 32 | `LIBRAW_DNGFM_BLACK` |
| `WHITE` | 64 | `LIBRAW_DNGFM_WHITE` |
| `OPCODE2` | 128 | `LIBRAW_DNGFM_OPCODE2` |
| `LINTABLE` | 256 | `LIBRAW_DNGFM_LINTABLE` |
| `CROPORIGIN` | 512 | `LIBRAW_DNGFM_CROPORIGIN` |
| `CROPSIZE` | 1024 | `LIBRAW_DNGFM_CROPSIZE` |
| `PREVIEWCS` | 2048 | `LIBRAW_DNGFM_PREVIEWCS` |
| `ASSHOTNEUTRAL` | 4096 | `LIBRAW_DNGFM_ASSHOTNEUTRAL` |
| `BASELINEEXPOSURE` | 8192 | `LIBRAW_DNGFM_BASELINEEXPOSURE` |
| `LINEARRESPONSELIMIT` | 16384 | `LIBRAW_DNGFM_LINEARRESPONSELIMIT` |
| `USERCROP` | 32768 | `LIBRAW_DNGFM_USERCROP` |
| `OPCODE1` | 65536 | `LIBRAW_DNGFM_OPCODE1` |
| `OPCODE3` | 131072 | `LIBRAW_DNGFM_OPCODE3` |

### `LibRaw_As_Shot_WB_Applied_codes` (flags)

| Short name | Value | Full C name |
| --- | --- | --- |
| `APPLIED` | 1 | `LIBRAW_ASWB_APPLIED` |
| `CANON` | 2 | `LIBRAW_ASWB_CANON` |
| `NIKON` | 4 | `LIBRAW_ASWB_NIKON` |
| `NIKON_SRAW` | 8 | `LIBRAW_ASWB_NIKON_SRAW` |
| `PENTAX` | 16 | `LIBRAW_ASWB_PENTAX` |
| `SONY` | 32 | `LIBRAW_ASWB_SONY` |

### `LibRaw_ExifTagTypes` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `UNKNOWN` | 0 | `LIBRAW_EXIFTAG_TYPE_UNKNOWN` |
| `BYTE` | 1 | `LIBRAW_EXIFTAG_TYPE_BYTE` |
| `ASCII` | 2 | `LIBRAW_EXIFTAG_TYPE_ASCII` |
| `SHORT` | 3 | `LIBRAW_EXIFTAG_TYPE_SHORT` |
| `LONG` | 4 | `LIBRAW_EXIFTAG_TYPE_LONG` |
| `RATIONAL` | 5 | `LIBRAW_EXIFTAG_TYPE_RATIONAL` |
| `SBYTE` | 6 | `LIBRAW_EXIFTAG_TYPE_SBYTE` |
| `UNDEFINED` | 7 | `LIBRAW_EXIFTAG_TYPE_UNDEFINED` |
| `SSHORT` | 8 | `LIBRAW_EXIFTAG_TYPE_SSHORT` |
| `SLONG` | 9 | `LIBRAW_EXIFTAG_TYPE_SLONG` |
| `SRATIONAL` | 10 | `LIBRAW_EXIFTAG_TYPE_SRATIONAL` |
| `FLOAT` | 11 | `LIBRAW_EXIFTAG_TYPE_FLOAT` |
| `DOUBLE` | 12 | `LIBRAW_EXIFTAG_TYPE_DOUBLE` |
| `IFD` | 13 | `LIBRAW_EXIFTAG_TYPE_IFD` |
| `UNICODE` | 14 | `LIBRAW_EXIFTAG_TYPE_UNICODE` |
| `COMPLEX` | 15 | `LIBRAW_EXIFTAG_TYPE_COMPLEX` |
| `LONG8` | 16 | `LIBRAW_EXIFTAG_TYPE_LONG8` |
| `SLONG8` | 17 | `LIBRAW_EXIFTAG_TYPE_SLONG8` |
| `IFD8` | 18 | `LIBRAW_EXIFTAG_TYPE_IFD8` |

### `LibRaw_whitebalance_code` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `Unknown` | 0 | `LIBRAW_WBI_Unknown` |
| `Daylight` | 1 | `LIBRAW_WBI_Daylight` |
| `Fluorescent` | 2 | `LIBRAW_WBI_Fluorescent` |
| `Tungsten` | 3 | `LIBRAW_WBI_Tungsten` |
| `Flash` | 4 | `LIBRAW_WBI_Flash` |
| `FineWeather` | 9 | `LIBRAW_WBI_FineWeather` |
| `Cloudy` | 10 | `LIBRAW_WBI_Cloudy` |
| `Shade` | 11 | `LIBRAW_WBI_Shade` |
| `FL_D` | 12 | `LIBRAW_WBI_FL_D` |
| `FL_N` | 13 | `LIBRAW_WBI_FL_N` |
| `FL_W` | 14 | `LIBRAW_WBI_FL_W` |
| `FL_WW` | 15 | `LIBRAW_WBI_FL_WW` |
| `FL_L` | 16 | `LIBRAW_WBI_FL_L` |
| `Ill_A` | 17 | `LIBRAW_WBI_Ill_A` |
| `Ill_B` | 18 | `LIBRAW_WBI_Ill_B` |
| `Ill_C` | 19 | `LIBRAW_WBI_Ill_C` |
| `D55` | 20 | `LIBRAW_WBI_D55` |
| `D65` | 21 | `LIBRAW_WBI_D65` |
| `D75` | 22 | `LIBRAW_WBI_D75` |
| `D50` | 23 | `LIBRAW_WBI_D50` |
| `StudioTungsten` | 24 | `LIBRAW_WBI_StudioTungsten` |
| `Sunset` | 64 | `LIBRAW_WBI_Sunset` |
| `Underwater` | 65 | `LIBRAW_WBI_Underwater` |
| `FluorescentHigh` | 66 | `LIBRAW_WBI_FluorescentHigh` |
| `HT_Mercury` | 67 | `LIBRAW_WBI_HT_Mercury` |
| `AsShot` | 81 | `LIBRAW_WBI_AsShot` |
| `Auto` | 82 | `LIBRAW_WBI_Auto` |
| `Custom` | 83 | `LIBRAW_WBI_Custom` |
| `Auto1` | 85 | `LIBRAW_WBI_Auto1` |
| `Auto2` | 86 | `LIBRAW_WBI_Auto2` |
| `Auto3` | 87 | `LIBRAW_WBI_Auto3` |
| `Auto4` | 88 | `LIBRAW_WBI_Auto4` |
| `Custom1` | 90 | `LIBRAW_WBI_Custom1` |
| `Custom2` | 91 | `LIBRAW_WBI_Custom2` |
| `Custom3` | 92 | `LIBRAW_WBI_Custom3` |
| `Custom4` | 93 | `LIBRAW_WBI_Custom4` |
| `Custom5` | 94 | `LIBRAW_WBI_Custom5` |
| `Custom6` | 95 | `LIBRAW_WBI_Custom6` |
| `PC_Set1` | 96 | `LIBRAW_WBI_PC_Set1` |
| `PC_Set2` | 97 | `LIBRAW_WBI_PC_Set2` |
| `PC_Set3` | 98 | `LIBRAW_WBI_PC_Set3` |
| `PC_Set4` | 99 | `LIBRAW_WBI_PC_Set4` |
| `PC_Set5` | 100 | `LIBRAW_WBI_PC_Set5` |
| `Measured` | 110 | `LIBRAW_WBI_Measured` |
| `BW` | 120 | `LIBRAW_WBI_BW` |
| `Kelvin` | 254 | `LIBRAW_WBI_Kelvin` |
| `Other` | 255 | `LIBRAW_WBI_Other` |
| `None` | 65535 | `LIBRAW_WBI_None` |

### `LibRaw_MultiExposure_related` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `NONE` | 0 | `LIBRAW_ME_NONE` |
| `SIMPLE` | 1 | `LIBRAW_ME_SIMPLE` |
| `OVERLAY` | 2 | `LIBRAW_ME_OVERLAY` |
| `HDR` | 3 | `LIBRAW_ME_HDR` |

### `LibRaw_dng_processing` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `NONE` | 0 | `LIBRAW_DNG_NONE` |
| `FLOAT` | 1 | `LIBRAW_DNG_FLOAT` |
| `LINEAR` | 2 | `LIBRAW_DNG_LINEAR` |
| `DEFLATE` | 4 | `LIBRAW_DNG_DEFLATE` |
| `XTRANS` | 8 | `LIBRAW_DNG_XTRANS` |
| `OTHER` | 16 | `LIBRAW_DNG_OTHER` |
| `8BIT` | 32 | `LIBRAW_DNG_8BIT` |
| `ALL` | 63 | `LIBRAW_DNG_ALL` |
| `DEFAULT` | 39 | `LIBRAW_DNG_DEFAULT` |

### `LibRaw_output_flags` (flags)

| Short name | Value | Full C name |
| --- | --- | --- |
| `NONE` | 0 | `LIBRAW_OUTPUT_FLAGS_NONE` |
| `PPMMETA` | 1 | `LIBRAW_OUTPUT_FLAGS_PPMMETA` |

### `LibRaw_runtime_capabilities` (flags)

| Short name | Value | Full C name |
| --- | --- | --- |
| `RAWSPEED` | 1 | `LIBRAW_CAPS_RAWSPEED` |
| `DNGSDK` | 2 | `LIBRAW_CAPS_DNGSDK` |
| `GPRSDK` | 4 | `LIBRAW_CAPS_GPRSDK` |
| `UNICODEPATHS` | 8 | `LIBRAW_CAPS_UNICODEPATHS` |
| `X3FTOOLS` | 16 | `LIBRAW_CAPS_X3FTOOLS` |
| `RPI6BY9` | 32 | `LIBRAW_CAPS_RPI6BY9` |
| `ZLIB` | 64 | `LIBRAW_CAPS_ZLIB` |
| `JPEG` | 128 | `LIBRAW_CAPS_JPEG` |
| `RAWSPEED3` | 256 | `LIBRAW_CAPS_RAWSPEED3` |
| `RAWSPEED_BITS` | 512 | `LIBRAW_CAPS_RAWSPEED_BITS` |

### `LibRaw_colorspace` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `NotFound` | 0 | `LIBRAW_COLORSPACE_NotFound` |
| `sRGB` | 1 | `LIBRAW_COLORSPACE_sRGB` |
| `AdobeRGB` | 2 | `LIBRAW_COLORSPACE_AdobeRGB` |
| `WideGamutRGB` | 3 | `LIBRAW_COLORSPACE_WideGamutRGB` |
| `ProPhotoRGB` | 4 | `LIBRAW_COLORSPACE_ProPhotoRGB` |
| `ICC` | 5 | `LIBRAW_COLORSPACE_ICC` |
| `Uncalibrated` | 6 | `LIBRAW_COLORSPACE_Uncalibrated` |
| `CameraLinearUniWB` | 7 | `LIBRAW_COLORSPACE_CameraLinearUniWB` |
| `CameraLinear` | 8 | `LIBRAW_COLORSPACE_CameraLinear` |
| `CameraGammaUniWB` | 9 | `LIBRAW_COLORSPACE_CameraGammaUniWB` |
| `CameraGamma` | 10 | `LIBRAW_COLORSPACE_CameraGamma` |
| `MonochromeLinear` | 11 | `LIBRAW_COLORSPACE_MonochromeLinear` |
| `MonochromeGamma` | 12 | `LIBRAW_COLORSPACE_MonochromeGamma` |
| `Rec2020` | 13 | `LIBRAW_COLORSPACE_Rec2020` |
| `Unknown` | 255 | `LIBRAW_COLORSPACE_Unknown` |

### `LibRaw_cameramaker_index` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `Unknown` | 0 | `LIBRAW_CAMERAMAKER_Unknown` |
| `Agfa` | 1 | `LIBRAW_CAMERAMAKER_Agfa` |
| `Alcatel` | 2 | `LIBRAW_CAMERAMAKER_Alcatel` |
| `Apple` | 3 | `LIBRAW_CAMERAMAKER_Apple` |
| `Aptina` | 4 | `LIBRAW_CAMERAMAKER_Aptina` |
| `AVT` | 5 | `LIBRAW_CAMERAMAKER_AVT` |
| `Baumer` | 6 | `LIBRAW_CAMERAMAKER_Baumer` |
| `Broadcom` | 7 | `LIBRAW_CAMERAMAKER_Broadcom` |
| `Canon` | 8 | `LIBRAW_CAMERAMAKER_Canon` |
| `Casio` | 9 | `LIBRAW_CAMERAMAKER_Casio` |
| `CINE` | 10 | `LIBRAW_CAMERAMAKER_CINE` |
| `Clauss` | 11 | `LIBRAW_CAMERAMAKER_Clauss` |
| `Contax` | 12 | `LIBRAW_CAMERAMAKER_Contax` |
| `Creative` | 13 | `LIBRAW_CAMERAMAKER_Creative` |
| `DJI` | 14 | `LIBRAW_CAMERAMAKER_DJI` |
| `DXO` | 15 | `LIBRAW_CAMERAMAKER_DXO` |
| `Epson` | 16 | `LIBRAW_CAMERAMAKER_Epson` |
| `Foculus` | 17 | `LIBRAW_CAMERAMAKER_Foculus` |
| `Fujifilm` | 18 | `LIBRAW_CAMERAMAKER_Fujifilm` |
| `Generic` | 19 | `LIBRAW_CAMERAMAKER_Generic` |
| `Gione` | 20 | `LIBRAW_CAMERAMAKER_Gione` |
| `GITUP` | 21 | `LIBRAW_CAMERAMAKER_GITUP` |
| `Google` | 22 | `LIBRAW_CAMERAMAKER_Google` |
| `GoPro` | 23 | `LIBRAW_CAMERAMAKER_GoPro` |
| `Hasselblad` | 24 | `LIBRAW_CAMERAMAKER_Hasselblad` |
| `HTC` | 25 | `LIBRAW_CAMERAMAKER_HTC` |
| `I_Mobile` | 26 | `LIBRAW_CAMERAMAKER_I_Mobile` |
| `Imacon` | 27 | `LIBRAW_CAMERAMAKER_Imacon` |
| `JK_Imaging` | 28 | `LIBRAW_CAMERAMAKER_JK_Imaging` |
| `Kodak` | 29 | `LIBRAW_CAMERAMAKER_Kodak` |
| `Konica` | 30 | `LIBRAW_CAMERAMAKER_Konica` |
| `Leaf` | 31 | `LIBRAW_CAMERAMAKER_Leaf` |
| `Leica` | 32 | `LIBRAW_CAMERAMAKER_Leica` |
| `Lenovo` | 33 | `LIBRAW_CAMERAMAKER_Lenovo` |
| `LG` | 34 | `LIBRAW_CAMERAMAKER_LG` |
| `Logitech` | 35 | `LIBRAW_CAMERAMAKER_Logitech` |
| `Mamiya` | 36 | `LIBRAW_CAMERAMAKER_Mamiya` |
| `Matrix` | 37 | `LIBRAW_CAMERAMAKER_Matrix` |
| `Meizu` | 38 | `LIBRAW_CAMERAMAKER_Meizu` |
| `Micron` | 39 | `LIBRAW_CAMERAMAKER_Micron` |
| `Minolta` | 40 | `LIBRAW_CAMERAMAKER_Minolta` |
| `Motorola` | 41 | `LIBRAW_CAMERAMAKER_Motorola` |
| `NGM` | 42 | `LIBRAW_CAMERAMAKER_NGM` |
| `Nikon` | 43 | `LIBRAW_CAMERAMAKER_Nikon` |
| `Nokia` | 44 | `LIBRAW_CAMERAMAKER_Nokia` |
| `Olympus` | 45 | `LIBRAW_CAMERAMAKER_Olympus` |
| `OmniVison` | 46 | `LIBRAW_CAMERAMAKER_OmniVison` |
| `Panasonic` | 47 | `LIBRAW_CAMERAMAKER_Panasonic` |
| `Parrot` | 48 | `LIBRAW_CAMERAMAKER_Parrot` |
| `Pentax` | 49 | `LIBRAW_CAMERAMAKER_Pentax` |
| `PhaseOne` | 50 | `LIBRAW_CAMERAMAKER_PhaseOne` |
| `PhotoControl` | 51 | `LIBRAW_CAMERAMAKER_PhotoControl` |
| `Photron` | 52 | `LIBRAW_CAMERAMAKER_Photron` |
| `Pixelink` | 53 | `LIBRAW_CAMERAMAKER_Pixelink` |
| `Polaroid` | 54 | `LIBRAW_CAMERAMAKER_Polaroid` |
| `RED` | 55 | `LIBRAW_CAMERAMAKER_RED` |
| `Ricoh` | 56 | `LIBRAW_CAMERAMAKER_Ricoh` |
| `Rollei` | 57 | `LIBRAW_CAMERAMAKER_Rollei` |
| `RoverShot` | 58 | `LIBRAW_CAMERAMAKER_RoverShot` |
| `Samsung` | 59 | `LIBRAW_CAMERAMAKER_Samsung` |
| `Sigma` | 60 | `LIBRAW_CAMERAMAKER_Sigma` |
| `Sinar` | 61 | `LIBRAW_CAMERAMAKER_Sinar` |
| `SMaL` | 62 | `LIBRAW_CAMERAMAKER_SMaL` |
| `Sony` | 63 | `LIBRAW_CAMERAMAKER_Sony` |
| `ST_Micro` | 64 | `LIBRAW_CAMERAMAKER_ST_Micro` |
| `THL` | 65 | `LIBRAW_CAMERAMAKER_THL` |
| `VLUU` | 66 | `LIBRAW_CAMERAMAKER_VLUU` |
| `Xiaomi` | 67 | `LIBRAW_CAMERAMAKER_Xiaomi` |
| `XIAOYI` | 68 | `LIBRAW_CAMERAMAKER_XIAOYI` |
| `YI` | 69 | `LIBRAW_CAMERAMAKER_YI` |
| `Yuneec` | 70 | `LIBRAW_CAMERAMAKER_Yuneec` |
| `Zeiss` | 71 | `LIBRAW_CAMERAMAKER_Zeiss` |
| `OnePlus` | 72 | `LIBRAW_CAMERAMAKER_OnePlus` |
| `ISG` | 73 | `LIBRAW_CAMERAMAKER_ISG` |
| `VIVO` | 74 | `LIBRAW_CAMERAMAKER_VIVO` |
| `HMD_Global` | 75 | `LIBRAW_CAMERAMAKER_HMD_Global` |
| `HUAWEI` | 76 | `LIBRAW_CAMERAMAKER_HUAWEI` |
| `RaspberryPi` | 77 | `LIBRAW_CAMERAMAKER_RaspberryPi` |
| `OmDigital` | 78 | `LIBRAW_CAMERAMAKER_OmDigital` |
| `TheLastOne` | 79 | `LIBRAW_CAMERAMAKER_TheLastOne` |

### `LibRaw_camera_mounts` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `Unknown` | 0 | `LIBRAW_MOUNT_Unknown` |
| `Alpa` | 1 | `LIBRAW_MOUNT_Alpa` |
| `C` | 2 | `LIBRAW_MOUNT_C` |
| `Canon_EF_M` | 3 | `LIBRAW_MOUNT_Canon_EF_M` |
| `Canon_EF_S` | 4 | `LIBRAW_MOUNT_Canon_EF_S` |
| `Canon_EF` | 5 | `LIBRAW_MOUNT_Canon_EF` |
| `Canon_RF` | 6 | `LIBRAW_MOUNT_Canon_RF` |
| `Contax_N` | 7 | `LIBRAW_MOUNT_Contax_N` |
| `Contax645` | 8 | `LIBRAW_MOUNT_Contax645` |
| `FT` | 9 | `LIBRAW_MOUNT_FT` |
| `mFT` | 10 | `LIBRAW_MOUNT_mFT` |
| `Fuji_GF` | 11 | `LIBRAW_MOUNT_Fuji_GF` |
| `Fuji_GX` | 12 | `LIBRAW_MOUNT_Fuji_GX` |
| `Fuji_X` | 13 | `LIBRAW_MOUNT_Fuji_X` |
| `Hasselblad_H` | 14 | `LIBRAW_MOUNT_Hasselblad_H` |
| `Hasselblad_V` | 15 | `LIBRAW_MOUNT_Hasselblad_V` |
| `Hasselblad_XCD` | 16 | `LIBRAW_MOUNT_Hasselblad_XCD` |
| `Leica_M` | 17 | `LIBRAW_MOUNT_Leica_M` |
| `Leica_R` | 18 | `LIBRAW_MOUNT_Leica_R` |
| `Leica_S` | 19 | `LIBRAW_MOUNT_Leica_S` |
| `Leica_SL` | 20 | `LIBRAW_MOUNT_Leica_SL` |
| `Leica_TL` | 21 | `LIBRAW_MOUNT_Leica_TL` |
| `LPS_L` | 22 | `LIBRAW_MOUNT_LPS_L` |
| `Mamiya67` | 23 | `LIBRAW_MOUNT_Mamiya67` |
| `Mamiya645` | 24 | `LIBRAW_MOUNT_Mamiya645` |
| `Minolta_A` | 25 | `LIBRAW_MOUNT_Minolta_A` |
| `Nikon_CX` | 26 | `LIBRAW_MOUNT_Nikon_CX` |
| `Nikon_F` | 27 | `LIBRAW_MOUNT_Nikon_F` |
| `Nikon_Z` | 28 | `LIBRAW_MOUNT_Nikon_Z` |
| `PhaseOne_iXM_MV` | 29 | `LIBRAW_MOUNT_PhaseOne_iXM_MV` |
| `PhaseOne_iXM_RS` | 30 | `LIBRAW_MOUNT_PhaseOne_iXM_RS` |
| `PhaseOne_iXM` | 31 | `LIBRAW_MOUNT_PhaseOne_iXM` |
| `Pentax_645` | 32 | `LIBRAW_MOUNT_Pentax_645` |
| `Pentax_K` | 33 | `LIBRAW_MOUNT_Pentax_K` |
| `Pentax_Q` | 34 | `LIBRAW_MOUNT_Pentax_Q` |
| `RicohModule` | 35 | `LIBRAW_MOUNT_RicohModule` |
| `Rollei_bayonet` | 36 | `LIBRAW_MOUNT_Rollei_bayonet` |
| `Samsung_NX_M` | 37 | `LIBRAW_MOUNT_Samsung_NX_M` |
| `Samsung_NX` | 38 | `LIBRAW_MOUNT_Samsung_NX` |
| `Sigma_X3F` | 39 | `LIBRAW_MOUNT_Sigma_X3F` |
| `Sony_E` | 40 | `LIBRAW_MOUNT_Sony_E` |
| `LF` | 41 | `LIBRAW_MOUNT_LF` |
| `DigitalBack` | 42 | `LIBRAW_MOUNT_DigitalBack` |
| `FixedLens` | 43 | `LIBRAW_MOUNT_FixedLens` |
| `IL_UM` | 44 | `LIBRAW_MOUNT_IL_UM` |
| `TheLastOne` | 45 | `LIBRAW_MOUNT_TheLastOne` |

### `LibRaw_camera_formats` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `Unknown` | 0 | `LIBRAW_FORMAT_Unknown` |
| `APSC` | 1 | `LIBRAW_FORMAT_APSC` |
| `FF` | 2 | `LIBRAW_FORMAT_FF` |
| `MF` | 3 | `LIBRAW_FORMAT_MF` |
| `APSH` | 4 | `LIBRAW_FORMAT_APSH` |
| `1INCH` | 5 | `LIBRAW_FORMAT_1INCH` |
| `1div2p3INCH` | 6 | `LIBRAW_FORMAT_1div2p3INCH` |
| `1div1p7INCH` | 7 | `LIBRAW_FORMAT_1div1p7INCH` |
| `FT` | 8 | `LIBRAW_FORMAT_FT` |
| `CROP645` | 9 | `LIBRAW_FORMAT_CROP645` |
| `LeicaS` | 10 | `LIBRAW_FORMAT_LeicaS` |
| `645` | 11 | `LIBRAW_FORMAT_645` |
| `66` | 12 | `LIBRAW_FORMAT_66` |
| `69` | 13 | `LIBRAW_FORMAT_69` |
| `LF` | 14 | `LIBRAW_FORMAT_LF` |
| `Leica_DMR` | 15 | `LIBRAW_FORMAT_Leica_DMR` |
| `67` | 16 | `LIBRAW_FORMAT_67` |
| `SigmaAPSC` | 17 | `LIBRAW_FORMAT_SigmaAPSC` |
| `SigmaMerrill` | 18 | `LIBRAW_FORMAT_SigmaMerrill` |
| `SigmaAPSH` | 19 | `LIBRAW_FORMAT_SigmaAPSH` |
| `3648` | 20 | `LIBRAW_FORMAT_3648` |
| `68` | 21 | `LIBRAW_FORMAT_68` |
| `TheLastOne` | 22 | `LIBRAW_FORMAT_TheLastOne` |

### `LibRawImageAspects` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `UNKNOWN` | 0 | `LIBRAW_IMAGE_ASPECT_UNKNOWN` |
| `OTHER` | 1 | `LIBRAW_IMAGE_ASPECT_OTHER` |
| `MINIMAL_REAL_ASPECT_VALUE` | 99 | `LIBRAW_IMAGE_ASPECT_MINIMAL_REAL_ASPECT_VALUE` |
| `MAXIMAL_REAL_ASPECT_VALUE` | 10000 | `LIBRAW_IMAGE_ASPECT_MAXIMAL_REAL_ASPECT_VALUE` |
| `3to2` | 1500 | `LIBRAW_IMAGE_ASPECT_3to2` |
| `1to1` | 1000 | `LIBRAW_IMAGE_ASPECT_1to1` |
| `4to3` | 1333 | `LIBRAW_IMAGE_ASPECT_4to3` |
| `16to9` | 1777 | `LIBRAW_IMAGE_ASPECT_16to9` |
| `5to4` | 1250 | `LIBRAW_IMAGE_ASPECT_5to4` |
| `7to6` | 1166 | `LIBRAW_IMAGE_ASPECT_7to6` |
| `6to5` | 1200 | `LIBRAW_IMAGE_ASPECT_6to5` |
| `7to5` | 1400 | `LIBRAW_IMAGE_ASPECT_7to5` |

### `LibRaw_lens_focal_types` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `UNDEFINED` | 0 | `LIBRAW_FT_UNDEFINED` |
| `PRIME_LENS` | 1 | `LIBRAW_FT_PRIME_LENS` |
| `ZOOM_LENS` | 2 | `LIBRAW_FT_ZOOM_LENS` |
| `ZOOM_LENS_CONSTANT_APERTURE` | 3 | `LIBRAW_FT_ZOOM_LENS_CONSTANT_APERTURE` |
| `ZOOM_LENS_VARIABLE_APERTURE` | 4 | `LIBRAW_FT_ZOOM_LENS_VARIABLE_APERTURE` |

### `LibRaw_Canon_RecordModes` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `UNDEFINED` | 0 | `LIBRAW_Canon_RecordMode_UNDEFINED` |
| `JPEG` | 1 | `LIBRAW_Canon_RecordMode_JPEG` |
| `CRW_THM` | 2 | `LIBRAW_Canon_RecordMode_CRW_THM` |
| `AVI_THM` | 3 | `LIBRAW_Canon_RecordMode_AVI_THM` |
| `TIF` | 4 | `LIBRAW_Canon_RecordMode_TIF` |
| `TIF_JPEG` | 5 | `LIBRAW_Canon_RecordMode_TIF_JPEG` |
| `CR2` | 6 | `LIBRAW_Canon_RecordMode_CR2` |
| `CR2_JPEG` | 7 | `LIBRAW_Canon_RecordMode_CR2_JPEG` |
| `UNKNOWN` | 8 | `LIBRAW_Canon_RecordMode_UNKNOWN` |
| `MOV` | 9 | `LIBRAW_Canon_RecordMode_MOV` |
| `MP4` | 10 | `LIBRAW_Canon_RecordMode_MP4` |
| `CRM` | 11 | `LIBRAW_Canon_RecordMode_CRM` |
| `CR3` | 12 | `LIBRAW_Canon_RecordMode_CR3` |
| `CR3_JPEG` | 13 | `LIBRAW_Canon_RecordMode_CR3_JPEG` |
| `HEIF` | 14 | `LIBRAW_Canon_RecordMode_HEIF` |
| `CR3_HEIF` | 15 | `LIBRAW_Canon_RecordMode_CR3_HEIF` |
| `TheLastOne` | 16 | `LIBRAW_Canon_RecordMode_TheLastOne` |

### `LibRaw_minolta_storagemethods` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `UNPACKED` | 82 | `LIBRAW_MINOLTA_UNPACKED` |
| `PACKED` | 89 | `LIBRAW_MINOLTA_PACKED` |

### `LibRaw_minolta_bayerpatterns` (flags)

| Short name | Value | Full C name |
| --- | --- | --- |
| `RGGB` | 1 | `LIBRAW_MINOLTA_RGGB` |
| `G2BRG1` | 4 | `LIBRAW_MINOLTA_G2BRG1` |

### `LibRaw_sony_cameratypes` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `DSC` | 1 | `LIBRAW_SONY_DSC` |
| `DSLR` | 2 | `LIBRAW_SONY_DSLR` |
| `NEX` | 3 | `LIBRAW_SONY_NEX` |
| `SLT` | 4 | `LIBRAW_SONY_SLT` |
| `ILCE` | 5 | `LIBRAW_SONY_ILCE` |
| `ILCA` | 6 | `LIBRAW_SONY_ILCA` |
| `CameraType_UNKNOWN` | 65535 | `LIBRAW_SONY_CameraType_UNKNOWN` |

### `LibRaw_Sony_0x2010_Type` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `Tag2010None` | 0 | `LIBRAW_SONY_Tag2010None` |
| `Tag2010a` | 1 | `LIBRAW_SONY_Tag2010a` |
| `Tag2010b` | 2 | `LIBRAW_SONY_Tag2010b` |
| `Tag2010c` | 3 | `LIBRAW_SONY_Tag2010c` |
| `Tag2010d` | 4 | `LIBRAW_SONY_Tag2010d` |
| `Tag2010e` | 5 | `LIBRAW_SONY_Tag2010e` |
| `Tag2010f` | 6 | `LIBRAW_SONY_Tag2010f` |
| `Tag2010g` | 7 | `LIBRAW_SONY_Tag2010g` |
| `Tag2010h` | 8 | `LIBRAW_SONY_Tag2010h` |
| `Tag2010i` | 9 | `LIBRAW_SONY_Tag2010i` |

### `LibRaw_Sony_0x9050_Type` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `Tag9050None` | 0 | `LIBRAW_SONY_Tag9050None` |
| `Tag9050a` | 1 | `LIBRAW_SONY_Tag9050a` |
| `Tag9050b` | 2 | `LIBRAW_SONY_Tag9050b` |
| `Tag9050c` | 3 | `LIBRAW_SONY_Tag9050c` |
| `Tag9050d` | 4 | `LIBRAW_SONY_Tag9050d` |

### `LIBRAW_SONY_FOCUSMODEmodes` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `MF` | 0 | `LIBRAW_SONY_FOCUSMODE_MF` |
| `AF_S` | 2 | `LIBRAW_SONY_FOCUSMODE_AF_S` |
| `AF_C` | 3 | `LIBRAW_SONY_FOCUSMODE_AF_C` |
| `AF_A` | 4 | `LIBRAW_SONY_FOCUSMODE_AF_A` |
| `DMF` | 6 | `LIBRAW_SONY_FOCUSMODE_DMF` |
| `AF_D` | 7 | `LIBRAW_SONY_FOCUSMODE_AF_D` |
| `AF` | 101 | `LIBRAW_SONY_FOCUSMODE_AF` |
| `PERMANENT_AF` | 104 | `LIBRAW_SONY_FOCUSMODE_PERMANENT_AF` |
| `SEMI_MF` | 105 | `LIBRAW_SONY_FOCUSMODE_SEMI_MF` |
| `UNKNOWN` | -1 | `LIBRAW_SONY_FOCUSMODE_UNKNOWN` |

### `LibRaw_KodakSensors` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `UnknownSensor` | 0 | `LIBRAW_Kodak_UnknownSensor` |
| `M1` | 1 | `LIBRAW_Kodak_M1` |
| `M15` | 2 | `LIBRAW_Kodak_M15` |
| `M16` | 3 | `LIBRAW_Kodak_M16` |
| `M17` | 4 | `LIBRAW_Kodak_M17` |
| `M2` | 5 | `LIBRAW_Kodak_M2` |
| `M23` | 6 | `LIBRAW_Kodak_M23` |
| `M24` | 7 | `LIBRAW_Kodak_M24` |
| `M3` | 8 | `LIBRAW_Kodak_M3` |
| `M5` | 9 | `LIBRAW_Kodak_M5` |
| `M6` | 10 | `LIBRAW_Kodak_M6` |
| `C14` | 11 | `LIBRAW_Kodak_C14` |
| `X14` | 12 | `LIBRAW_Kodak_X14` |
| `M11` | 13 | `LIBRAW_Kodak_M11` |

### `LibRaw_HasselbladFormatCodes` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `Unknown` | 0 | `LIBRAW_HF_Unknown` |
| `3FR` | 1 | `LIBRAW_HF_3FR` |
| `FFF` | 2 | `LIBRAW_HF_FFF` |
| `Imacon` | 3 | `LIBRAW_HF_Imacon` |
| `HasselbladDNG` | 4 | `LIBRAW_HF_HasselbladDNG` |
| `AdobeDNG` | 5 | `LIBRAW_HF_AdobeDNG` |
| `AdobeDNG_fromPhocusDNG` | 6 | `LIBRAW_HF_AdobeDNG_fromPhocusDNG` |

### `LibRaw_rawspecial_t` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `SONYARW2_NONE` | 0 | `LIBRAW_RAWSPECIAL_SONYARW2_NONE` |
| `SONYARW2_BASEONLY` | 1 | `LIBRAW_RAWSPECIAL_SONYARW2_BASEONLY` |
| `SONYARW2_DELTAONLY` | 2 | `LIBRAW_RAWSPECIAL_SONYARW2_DELTAONLY` |
| `SONYARW2_DELTAZEROBASE` | 4 | `LIBRAW_RAWSPECIAL_SONYARW2_DELTAZEROBASE` |
| `SONYARW2_DELTATOVALUE` | 8 | `LIBRAW_RAWSPECIAL_SONYARW2_DELTATOVALUE` |
| `SONYARW2_ALLFLAGS` | 15 | `LIBRAW_RAWSPECIAL_SONYARW2_ALLFLAGS` |
| `NODP2Q_INTERPOLATERG` | 16 | `LIBRAW_RAWSPECIAL_NODP2Q_INTERPOLATERG` |
| `NODP2Q_INTERPOLATEAF` | 32 | `LIBRAW_RAWSPECIAL_NODP2Q_INTERPOLATEAF` |
| `SRAW_NO_RGB` | 64 | `LIBRAW_RAWSPECIAL_SRAW_NO_RGB` |
| `SRAW_NO_INTERPOLATE` | 128 | `LIBRAW_RAWSPECIAL_SRAW_NO_INTERPOLATE` |

### `LibRaw_rawspeed_bits_t` (flags)

| Short name | Value | Full C name |
| --- | --- | --- |
| `RAWSPEEDV1_USE` | 1 | `LIBRAW_RAWSPEEDV1_USE` |
| `RAWSPEEDV1_FAILONUNKNOWN` | 2 | `LIBRAW_RAWSPEEDV1_FAILONUNKNOWN` |
| `RAWSPEEDV1_IGNOREERRORS` | 4 | `LIBRAW_RAWSPEEDV1_IGNOREERRORS` |
| `RAWSPEEDV3_USE` | 256 | `LIBRAW_RAWSPEEDV3_USE` |
| `RAWSPEEDV3_FAILONUNKNOWN` | 512 | `LIBRAW_RAWSPEEDV3_FAILONUNKNOWN` |
| `RAWSPEEDV3_IGNOREERRORS` | 1024 | `LIBRAW_RAWSPEEDV3_IGNOREERRORS` |

### `LibRaw_processing_options` (flags)

| Short name | Value | Full C name |
| --- | --- | --- |
| `PENTAX_PS_ALLFRAMES` | 1 | `LIBRAW_RAWOPTIONS_PENTAX_PS_ALLFRAMES` |
| `CONVERTFLOAT_TO_INT` | 2 | `LIBRAW_RAWOPTIONS_CONVERTFLOAT_TO_INT` |
| `ARQ_SKIP_CHANNEL_SWAP` | 4 | `LIBRAW_RAWOPTIONS_ARQ_SKIP_CHANNEL_SWAP` |
| `NO_ROTATE_FOR_KODAK_THUMBNAILS` | 8 | `LIBRAW_RAWOPTIONS_NO_ROTATE_FOR_KODAK_THUMBNAILS` |
| `USE_PPM16_THUMBS` | 32 | `LIBRAW_RAWOPTIONS_USE_PPM16_THUMBS` |
| `DONT_CHECK_DNG_ILLUMINANT` | 64 | `LIBRAW_RAWOPTIONS_DONT_CHECK_DNG_ILLUMINANT` |
| `DNGSDK_ZEROCOPY` | 128 | `LIBRAW_RAWOPTIONS_DNGSDK_ZEROCOPY` |
| `ZEROFILTERS_FOR_MONOCHROMETIFFS` | 256 | `LIBRAW_RAWOPTIONS_ZEROFILTERS_FOR_MONOCHROMETIFFS` |
| `DNG_ADD_ENHANCED` | 512 | `LIBRAW_RAWOPTIONS_DNG_ADD_ENHANCED` |
| `DNG_ADD_PREVIEWS` | 1024 | `LIBRAW_RAWOPTIONS_DNG_ADD_PREVIEWS` |
| `DNG_PREFER_LARGEST_IMAGE` | 2048 | `LIBRAW_RAWOPTIONS_DNG_PREFER_LARGEST_IMAGE` |
| `DNG_STAGE2` | 4096 | `LIBRAW_RAWOPTIONS_DNG_STAGE2` |
| `DNG_STAGE3` | 8192 | `LIBRAW_RAWOPTIONS_DNG_STAGE3` |
| `DNG_ALLOWSIZECHANGE` | 16384 | `LIBRAW_RAWOPTIONS_DNG_ALLOWSIZECHANGE` |
| `DNG_DISABLEWBADJUST` | 32768 | `LIBRAW_RAWOPTIONS_DNG_DISABLEWBADJUST` |
| `PROVIDE_NONSTANDARD_WB` | 65536 | `LIBRAW_RAWOPTIONS_PROVIDE_NONSTANDARD_WB` |
| `CAMERAWB_FALLBACK_TO_DAYLIGHT` | 131072 | `LIBRAW_RAWOPTIONS_CAMERAWB_FALLBACK_TO_DAYLIGHT` |
| `CHECK_THUMBNAILS_KNOWN_VENDORS` | 262144 | `LIBRAW_RAWOPTIONS_CHECK_THUMBNAILS_KNOWN_VENDORS` |
| `CHECK_THUMBNAILS_ALL_VENDORS` | 524288 | `LIBRAW_RAWOPTIONS_CHECK_THUMBNAILS_ALL_VENDORS` |
| `DNG_STAGE2_IFPRESENT` | 1048576 | `LIBRAW_RAWOPTIONS_DNG_STAGE2_IFPRESENT` |
| `DNG_STAGE3_IFPRESENT` | 2097152 | `LIBRAW_RAWOPTIONS_DNG_STAGE3_IFPRESENT` |
| `DNG_ADD_MASKS` | 4194304 | `LIBRAW_RAWOPTIONS_DNG_ADD_MASKS` |
| `CANON_IGNORE_MAKERNOTES_ROTATION` | 8388608 | `LIBRAW_RAWOPTIONS_CANON_IGNORE_MAKERNOTES_ROTATION` |
| `ALLOW_JPEGXL_PREVIEWS` | 16777216 | `LIBRAW_RAWOPTIONS_ALLOW_JPEGXL_PREVIEWS` |
| `CANON_CHECK_CAMERA_AUTO_ROTATION_MODE` | 67108864 | `LIBRAW_RAWOPTIONS_CANON_CHECK_CAMERA_AUTO_ROTATION_MODE` |
| `DNG_STAGE23_IFPRESENT_JPGJXL` | 134217728 | `LIBRAW_RAWOPTIONS_DNG_STAGE23_IFPRESENT_JPGJXL` |

### `LibRaw_decoder_flags` (flags)

| Short name | Value | Full C name |
| --- | --- | --- |
| `HASCURVE` | 16 | `LIBRAW_DECODER_HASCURVE` |
| `SONYARW2` | 32 | `LIBRAW_DECODER_SONYARW2` |
| `TRYRAWSPEED` | 64 | `LIBRAW_DECODER_TRYRAWSPEED` |
| `OWNALLOC` | 128 | `LIBRAW_DECODER_OWNALLOC` |
| `FIXEDMAXC` | 256 | `LIBRAW_DECODER_FIXEDMAXC` |
| `ADOBECOPYPIXEL` | 512 | `LIBRAW_DECODER_ADOBECOPYPIXEL` |
| `LEGACY_WITH_MARGINS` | 1024 | `LIBRAW_DECODER_LEGACY_WITH_MARGINS` |
| `3CHANNEL` | 2048 | `LIBRAW_DECODER_3CHANNEL` |
| `SINAR4SHOT` | 2048 | `LIBRAW_DECODER_SINAR4SHOT` |
| `FLATDATA` | 4096 | `LIBRAW_DECODER_FLATDATA` |
| `FLAT_BG2_SWAPPED` | 8192 | `LIBRAW_DECODER_FLAT_BG2_SWAPPED` |
| `UNSUPPORTED_FORMAT` | 16384 | `LIBRAW_DECODER_UNSUPPORTED_FORMAT` |
| `NOTSET` | 32768 | `LIBRAW_DECODER_NOTSET` |
| `TRYRAWSPEED3` | 65536 | `LIBRAW_DECODER_TRYRAWSPEED3` |

### `LibRaw_constructor_flags` (flags)

| Short name | Value | Full C name |
| --- | --- | --- |
| `OPTIONS_NONE` | 0 | `LIBRAW_OPTIONS_NONE` |
| `OPTIONS_NO_DATAERR_CALLBACK` | 2 | `LIBRAW_OPTIONS_NO_DATAERR_CALLBACK` |
| `OPIONS_NO_DATAERR_CALLBACK` | 2 | `LIBRAW_OPIONS_NO_DATAERR_CALLBACK` |

### `LibRaw_warnings` (flags)

| Short name | Value | Full C name |
| --- | --- | --- |
| `NONE` | 0 | `LIBRAW_WARN_NONE` |
| `BAD_CAMERA_WB` | 4 | `LIBRAW_WARN_BAD_CAMERA_WB` |
| `NO_METADATA` | 8 | `LIBRAW_WARN_NO_METADATA` |
| `NO_JPEGLIB` | 16 | `LIBRAW_WARN_NO_JPEGLIB` |
| `NO_EMBEDDED_PROFILE` | 32 | `LIBRAW_WARN_NO_EMBEDDED_PROFILE` |
| `NO_INPUT_PROFILE` | 64 | `LIBRAW_WARN_NO_INPUT_PROFILE` |
| `BAD_OUTPUT_PROFILE` | 128 | `LIBRAW_WARN_BAD_OUTPUT_PROFILE` |
| `NO_BADPIXELMAP` | 256 | `LIBRAW_WARN_NO_BADPIXELMAP` |
| `BAD_DARKFRAME_FILE` | 512 | `LIBRAW_WARN_BAD_DARKFRAME_FILE` |
| `BAD_DARKFRAME_DIM` | 1024 | `LIBRAW_WARN_BAD_DARKFRAME_DIM` |
| `RAWSPEED_PROBLEM` | 4096 | `LIBRAW_WARN_RAWSPEED_PROBLEM` |
| `RAWSPEED_UNSUPPORTED` | 8192 | `LIBRAW_WARN_RAWSPEED_UNSUPPORTED` |
| `RAWSPEED_PROCESSED` | 16384 | `LIBRAW_WARN_RAWSPEED_PROCESSED` |
| `FALLBACK_TO_AHD` | 32768 | `LIBRAW_WARN_FALLBACK_TO_AHD` |
| `PARSEFUJI_PROCESSED` | 65536 | `LIBRAW_WARN_PARSEFUJI_PROCESSED` |
| `DNGSDK_PROCESSED` | 131072 | `LIBRAW_WARN_DNGSDK_PROCESSED` |
| `DNG_IMAGES_REORDERED` | 262144 | `LIBRAW_WARN_DNG_IMAGES_REORDERED` |
| `DNG_STAGE2_APPLIED` | 524288 | `LIBRAW_WARN_DNG_STAGE2_APPLIED` |
| `DNG_STAGE3_APPLIED` | 1048576 | `LIBRAW_WARN_DNG_STAGE3_APPLIED` |
| `RAWSPEED3_PROBLEM` | 2097152 | `LIBRAW_WARN_RAWSPEED3_PROBLEM` |
| `RAWSPEED3_UNSUPPORTED` | 4194304 | `LIBRAW_WARN_RAWSPEED3_UNSUPPORTED` |
| `RAWSPEED3_PROCESSED` | 8388608 | `LIBRAW_WARN_RAWSPEED3_PROCESSED` |
| `RAWSPEED3_NOTLISTED` | 16777216 | `LIBRAW_WARN_RAWSPEED3_NOTLISTED` |
| `VENDOR_CROP_SUGGESTED` | 33554432 | `LIBRAW_WARN_VENDOR_CROP_SUGGESTED` |
| `DNG_NOT_PROCESSED` | 67108864 | `LIBRAW_WARN_DNG_NOT_PROCESSED` |
| `DNG_NOT_PARSED` | 134217728 | `LIBRAW_WARN_DNG_NOT_PARSED` |

### `LibRaw_exceptions` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `NONE` | 0 | `LIBRAW_EXCEPTION_NONE` |
| `ALLOC` | 1 | `LIBRAW_EXCEPTION_ALLOC` |
| `DECODE_RAW` | 2 | `LIBRAW_EXCEPTION_DECODE_RAW` |
| `DECODE_JPEG` | 3 | `LIBRAW_EXCEPTION_DECODE_JPEG` |
| `IO_EOF` | 4 | `LIBRAW_EXCEPTION_IO_EOF` |
| `IO_CORRUPT` | 5 | `LIBRAW_EXCEPTION_IO_CORRUPT` |
| `CANCELLED_BY_CALLBACK` | 6 | `LIBRAW_EXCEPTION_CANCELLED_BY_CALLBACK` |
| `BAD_CROP` | 7 | `LIBRAW_EXCEPTION_BAD_CROP` |
| `IO_BADFILE` | 8 | `LIBRAW_EXCEPTION_IO_BADFILE` |
| `DECODE_JPEG2000` | 9 | `LIBRAW_EXCEPTION_DECODE_JPEG2000` |
| `TOOBIG` | 10 | `LIBRAW_EXCEPTION_TOOBIG` |
| `MEMPOOL` | 11 | `LIBRAW_EXCEPTION_MEMPOOL` |
| `UNSUPPORTED_FORMAT` | 12 | `LIBRAW_EXCEPTION_UNSUPPORTED_FORMAT` |

### `LibRaw_progress` (flags)

| Short name | Value | Full C name |
| --- | --- | --- |
| `START` | 0 | `LIBRAW_PROGRESS_START` |
| `OPEN` | 1 | `LIBRAW_PROGRESS_OPEN` |
| `IDENTIFY` | 2 | `LIBRAW_PROGRESS_IDENTIFY` |
| `SIZE_ADJUST` | 4 | `LIBRAW_PROGRESS_SIZE_ADJUST` |
| `LOAD_RAW` | 8 | `LIBRAW_PROGRESS_LOAD_RAW` |
| `RAW2_IMAGE` | 16 | `LIBRAW_PROGRESS_RAW2_IMAGE` |
| `REMOVE_ZEROES` | 32 | `LIBRAW_PROGRESS_REMOVE_ZEROES` |
| `BAD_PIXELS` | 64 | `LIBRAW_PROGRESS_BAD_PIXELS` |
| `DARK_FRAME` | 128 | `LIBRAW_PROGRESS_DARK_FRAME` |
| `FOVEON_INTERPOLATE` | 256 | `LIBRAW_PROGRESS_FOVEON_INTERPOLATE` |
| `SCALE_COLORS` | 512 | `LIBRAW_PROGRESS_SCALE_COLORS` |
| `PRE_INTERPOLATE` | 1024 | `LIBRAW_PROGRESS_PRE_INTERPOLATE` |
| `INTERPOLATE` | 2048 | `LIBRAW_PROGRESS_INTERPOLATE` |
| `MIX_GREEN` | 4096 | `LIBRAW_PROGRESS_MIX_GREEN` |
| `MEDIAN_FILTER` | 8192 | `LIBRAW_PROGRESS_MEDIAN_FILTER` |
| `HIGHLIGHTS` | 16384 | `LIBRAW_PROGRESS_HIGHLIGHTS` |
| `FUJI_ROTATE` | 32768 | `LIBRAW_PROGRESS_FUJI_ROTATE` |
| `FLIP` | 65536 | `LIBRAW_PROGRESS_FLIP` |
| `APPLY_PROFILE` | 131072 | `LIBRAW_PROGRESS_APPLY_PROFILE` |
| `CONVERT_RGB` | 262144 | `LIBRAW_PROGRESS_CONVERT_RGB` |
| `STRETCH` | 524288 | `LIBRAW_PROGRESS_STRETCH` |
| `STAGE20` | 1048576 | `LIBRAW_PROGRESS_STAGE20` |
| `STAGE21` | 2097152 | `LIBRAW_PROGRESS_STAGE21` |
| `STAGE22` | 4194304 | `LIBRAW_PROGRESS_STAGE22` |
| `STAGE23` | 8388608 | `LIBRAW_PROGRESS_STAGE23` |
| `STAGE24` | 16777216 | `LIBRAW_PROGRESS_STAGE24` |
| `STAGE25` | 33554432 | `LIBRAW_PROGRESS_STAGE25` |
| `STAGE26` | 67108864 | `LIBRAW_PROGRESS_STAGE26` |
| `STAGE27` | 134217728 | `LIBRAW_PROGRESS_STAGE27` |
| `THUMB_LOAD` | 268435456 | `LIBRAW_PROGRESS_THUMB_LOAD` |
| `TRESERVED1` | 536870912 | `LIBRAW_PROGRESS_TRESERVED1` |
| `TRESERVED2` | 1073741824 | `LIBRAW_PROGRESS_TRESERVED2` |

### `LibRaw_errors` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `SUCCESS` | 0 | `LIBRAW_SUCCESS` |
| `UNSPECIFIED_ERROR` | -1 | `LIBRAW_UNSPECIFIED_ERROR` |
| `FILE_UNSUPPORTED` | -2 | `LIBRAW_FILE_UNSUPPORTED` |
| `REQUEST_FOR_NONEXISTENT_IMAGE` | -3 | `LIBRAW_REQUEST_FOR_NONEXISTENT_IMAGE` |
| `OUT_OF_ORDER_CALL` | -4 | `LIBRAW_OUT_OF_ORDER_CALL` |
| `NO_THUMBNAIL` | -5 | `LIBRAW_NO_THUMBNAIL` |
| `UNSUPPORTED_THUMBNAIL` | -6 | `LIBRAW_UNSUPPORTED_THUMBNAIL` |
| `INPUT_CLOSED` | -7 | `LIBRAW_INPUT_CLOSED` |
| `NOT_IMPLEMENTED` | -8 | `LIBRAW_NOT_IMPLEMENTED` |
| `REQUEST_FOR_NONEXISTENT_THUMBNAIL` | -9 | `LIBRAW_REQUEST_FOR_NONEXISTENT_THUMBNAIL` |
| `UNSUFFICIENT_MEMORY` | -100007 | `LIBRAW_UNSUFFICIENT_MEMORY` |
| `DATA_ERROR` | -100008 | `LIBRAW_DATA_ERROR` |
| `IO_ERROR` | -100009 | `LIBRAW_IO_ERROR` |
| `CANCELLED_BY_CALLBACK` | -100010 | `LIBRAW_CANCELLED_BY_CALLBACK` |
| `BAD_CROP` | -100011 | `LIBRAW_BAD_CROP` |
| `TOO_BIG` | -100012 | `LIBRAW_TOO_BIG` |
| `MEMPOOL_OVERFLOW` | -100013 | `LIBRAW_MEMPOOL_OVERFLOW` |

### `LibRaw_internal_thumbnail_formats` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `UNKNOWN` | 0 | `LIBRAW_INTERNAL_THUMBNAIL_UNKNOWN` |
| `KODAK_THUMB` | 1 | `LIBRAW_INTERNAL_THUMBNAIL_KODAK_THUMB` |
| `KODAK_YCBCR` | 2 | `LIBRAW_INTERNAL_THUMBNAIL_KODAK_YCBCR` |
| `KODAK_RGB` | 3 | `LIBRAW_INTERNAL_THUMBNAIL_KODAK_RGB` |
| `JPEG` | 4 | `LIBRAW_INTERNAL_THUMBNAIL_JPEG` |
| `LAYER` | 5 | `LIBRAW_INTERNAL_THUMBNAIL_LAYER` |
| `ROLLEI` | 6 | `LIBRAW_INTERNAL_THUMBNAIL_ROLLEI` |
| `PPM` | 7 | `LIBRAW_INTERNAL_THUMBNAIL_PPM` |
| `PPM16` | 8 | `LIBRAW_INTERNAL_THUMBNAIL_PPM16` |
| `X3F` | 9 | `LIBRAW_INTERNAL_THUMBNAIL_X3F` |
| `DNG_YCBCR` | 10 | `LIBRAW_INTERNAL_THUMBNAIL_DNG_YCBCR` |
| `JPEGXL` | 11 | `LIBRAW_INTERNAL_THUMBNAIL_JPEGXL` |

### `LibRaw_thumbnail_formats` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `UNKNOWN` | 0 | `LIBRAW_THUMBNAIL_UNKNOWN` |
| `JPEG` | 1 | `LIBRAW_THUMBNAIL_JPEG` |
| `BITMAP` | 2 | `LIBRAW_THUMBNAIL_BITMAP` |
| `BITMAP16` | 3 | `LIBRAW_THUMBNAIL_BITMAP16` |
| `LAYER` | 4 | `LIBRAW_THUMBNAIL_LAYER` |
| `ROLLEI` | 5 | `LIBRAW_THUMBNAIL_ROLLEI` |
| `H265` | 6 | `LIBRAW_THUMBNAIL_H265` |
| `JPEGXL` | 7 | `LIBRAW_THUMBNAIL_JPEGXL` |

### `LibRaw_image_formats` (enum)

| Short name | Value | Full C name |
| --- | --- | --- |
| `JPEG` | 1 | `LIBRAW_IMAGE_JPEG` |
| `BITMAP` | 2 | `LIBRAW_IMAGE_BITMAP` |
| `JPEGXL` | 3 | `LIBRAW_IMAGE_JPEGXL` |
| `H265` | 4 | `LIBRAW_IMAGE_H265` |

