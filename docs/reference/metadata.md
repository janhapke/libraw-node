# LibRaw metadata reference

> Generated file -- do not edit by hand. Regenerate with `npm run gen:docs` (scripts/gen-docs.js).
> Source: vendor/LibRaw/libraw/libraw_types.h, api/metadata.json.

The `identify()` result's `metadata` field and `Processor#metadata` mirror `imgdata` as `{ idata, sizes, other, lens, color, makernotes: { common, canon, nikon, sony, fuji, olympus, panasonic, pentax, samsung, kodak, p1, hasselblad, ricoh } }`. `sizes` additionally carries a synthesized `oriented: { width, height }` (width/height already swapped for a 5/6 `flip`), not part of `libraw_image_sizes_t` itself.

## Groups

| Group key | C type | imgdata path |
| --- | --- | --- |
| `idata` | `libraw_iparams_t` | `imgdata.idata` |
| `sizes` | `libraw_image_sizes_t` | `imgdata.sizes` |
| `other` | `libraw_imgother_t` | `imgdata.other` |
| `lens` | `libraw_lensinfo_t` | `imgdata.lens` |
| `color` | `libraw_colordata_t` | `imgdata.color` |
| `makernotes.common` | `libraw_metadata_common_t` | `imgdata.makernotes.common` |
| `makernotes.canon` | `libraw_canon_makernotes_t` | `imgdata.makernotes.canon` |
| `makernotes.nikon` | `libraw_nikon_makernotes_t` | `imgdata.makernotes.nikon` |
| `makernotes.sony` | `libraw_sony_info_t` | `imgdata.makernotes.sony` |
| `makernotes.fuji` | `libraw_fuji_info_t` | `imgdata.makernotes.fuji` |
| `makernotes.olympus` | `libraw_olympus_makernotes_t` | `imgdata.makernotes.olympus` |
| `makernotes.panasonic` | `libraw_panasonic_makernotes_t` | `imgdata.makernotes.panasonic` |
| `makernotes.pentax` | `libraw_pentax_makernotes_t` | `imgdata.makernotes.pentax` |
| `makernotes.samsung` | `libraw_samsung_makernotes_t` | `imgdata.makernotes.samsung` |
| `makernotes.kodak` | `libraw_kodak_makernotes_t` | `imgdata.makernotes.kodak` |
| `makernotes.p1` | `libraw_p1_makernotes_t` | `imgdata.makernotes.phaseone` |
| `makernotes.hasselblad` | `libraw_hasselblad_makernotes_t` | `imgdata.makernotes.hasselblad` |
| `makernotes.ricoh` | `libraw_ricoh_makernotes_t` | `imgdata.makernotes.ricoh` |

## Structs

### `libraw_iparams_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `guard` | unsupported | Internal LibRaw bookkeeping (not documented as a public field); no useful JS representation. | Internal struct-validity guard bytes; not meaningful to callers. |
| `make` | string (char[64]) | — | Camera make, as parsed from the file (may need normalization -- see normalized_make). |
| `model` | string (char[64]) | — | Camera model, as parsed from the file (may need normalization -- see normalized_model). |
| `software` | string (char[64]) | — | Software/firmware string embedded in the file, if any. |
| `normalized_make` | string (char[64]) | — | Make normalized against LibRaw's camera database (canonical vendor name). |
| `normalized_model` | string (char[64]) | — | Model normalized against LibRaw's camera database (canonical model name). |
| `maker_index` | number (int) | — | Index into LibRaw's internal maker table for normalized_make. |
| `raw_count` | number (int) | — | Number of RAW frames/images stored in this file (e.g. multi-shot/burst formats). |
| `dng_version` | number (int) | omitted when equal to 0 | DNG version encoded as LibRaw packs it (0 if this is not a DNG file). |
| `is_foveon` | number (int) | — | Non-zero if this is a Foveon (layered-sensor) file. |
| `colors` | number (int) | — | Number of colors in the RAW data (1, 3, or 4). |
| `filters` | number (int) | — | CFA pattern bitmask LibRaw uses internally to decode the Bayer/X-Trans layout (0 or 9 for non-Bayer/X-Trans sensors). |
| `xtrans` | number[6][6] | — | 6x6 X-Trans CFA pattern (color-plane indices 0..3), only meaningful when filters == 9. |
| `xtrans_abs` | number[6][6] | — | 6x6 X-Trans CFA pattern in absolute (unshifted) sensor coordinates. |
| `cdesc` | string (char[5]) | — | Color plane description string (e.g. "RGBG"), indexed by the values in filters/xtrans. |
| `xmplen` | number (int) | omitted when equal to 0 | Length in bytes of the embedded XMP packet (0 if none). See xmpdata for why the packet itself is not exposed. |
| `xmpdata` | unsupported | Raw char* into LibRaw-owned memory; exposing it safely would need a Buffer copy keyed off xmplen, which is a reasonable future addition but out of scope for T14a's core-struct mirror. | Pointer to the embedded XMP packet's raw bytes. |

### `libraw_image_sizes_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `raw_height` | number (int) | — | Full sensor height in raw pixels, before any cropping. |
| `raw_width` | number (int) | — | Full sensor width in raw pixels, before any cropping. |
| `height` | number (int) | — | Output image height in pixels, after LibRaw's standard crop. |
| `width` | number (int) | — | Output image width in pixels, after LibRaw's standard crop. |
| `top_margin` | number (int) | — | Rows skipped from the top of the raw sensor data to reach the cropped image. |
| `left_margin` | number (int) | — | Columns skipped from the left of the raw sensor data to reach the cropped image. |
| `iheight` | number (int) | — | Final output height after any half_size/other output-size-affecting params (equals height unless half_size etc. is used). |
| `iwidth` | number (int) | — | Final output width after any half_size/other output-size-affecting params (equals width unless half_size etc. is used). |
| `raw_pitch` | number (int) | — | Bytes per row of the raw (undecoded) sensor data. |
| `pixel_aspect` | number (float) | — | Pixel aspect ratio (width:height of one sensor pixel); 1.0 for square pixels. |
| `flip` | number (int) | — | Orientation from the file: 0 none, 3 180deg, 5 90deg CCW, 6 90deg CW (other LibRaw-internal values are possible for less common sensors). See the `sizes.oriented` convenience for swapped width/height at flip 5/6. |
| `mask` | number[8][4] | — | Up to 8 masked/black-frame border rectangles (each [top, left, bottom, right] in raw pixel coordinates); unused entries are all-zero. |
| `raw_aspect` | number (int) | omitted when equal to 0 | Raw sensor aspect-ratio hint LibRaw derives for a few multi-aspect sensors (0 if not applicable). |
| `raw_inset_crops` | libraw_raw_inset_crop_t[2] | — | Up to 2 inset-crop rectangles some makers embed (e.g. an in-camera crop suggestion), as libraw_raw_inset_crop_t. |

### `libraw_raw_inset_crop_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `cleft` | number (int) | omitted when equal to 65535; LibRaw leaves an unfilled entry at {cleft: 0xffff, ctop: 0xffff, cwidth: 0, cheight: 0} -- verified empirically (synthetic DNG, no inset-crop tags). | Inset crop left edge, in raw pixel coordinates. |
| `ctop` | number (int) | omitted when equal to 65535 | Inset crop top edge, in raw pixel coordinates. |
| `cwidth` | number (int) | — | Inset crop width, in raw pixels. |
| `cheight` | number (int) | — | Inset crop height, in raw pixels. |

### `libraw_imgother_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `iso_speed` | number (float) | — | ISO speed rating as parsed from the file's EXIF/maker data. |
| `shutter` | number (float) | — | Shutter speed (exposure time) in seconds. |
| `aperture` | number (float) | — | Aperture (f-number). |
| `focal_len` | number (float) | — | Focal length in millimeters. |
| `timestamp` | number (unix seconds) | — | Capture time as a Unix epoch value in seconds, exactly as LibRaw's time_t reports it (not converted to a JS Date -- construct one with `new Date(other.timestamp * 1000)` if needed). |
| `shot_order` | number (int) | — | Shot sequence number within a burst/multi-shot file, where the format records one. |
| `gpsdata` | unsupported | Low-level parser intermediate; parsed_gps below is the decoded, useful form of the same data. | Raw, undecoded GPS IFD tag words LibRaw captured while parsing. |
| `parsed_gps` | libraw_gps_info_t | — | Decoded GPS data (latitude/longitude/altitude/timestamp and reference codes), as libraw_gps_info_t. |
| `desc` | string (char[512]) | — | Free-text image description embedded in the file, if any. |
| `artist` | string (char[64]) | — | Artist/photographer name embedded in the file, if any. |
| `analogbalance` | number[4] | — | DNG AnalogBalance tag (per-channel R,G,B,G2 multipliers applied before the color matrix), when present. |

### `libraw_gps_info_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `latitude` | number[3] | — | Latitude as [degrees, minutes, seconds]. |
| `longitude` | number[3] | — | Longitude as [degrees, minutes, seconds]. |
| `gpstimestamp` | number[3] | — | GPS timestamp (UTC) as [hours, minutes, seconds]. |
| `altitude` | number (float) | — | Altitude in meters. |
| `altref` | string (1 char) | omitted when equal to 0 | Altitude reference: '0' above sea level, '1' below sea level (ASCII digit character, not a number). |
| `latref` | string (1 char) | omitted when equal to 0 | Latitude reference hemisphere: 'N' or 'S'. |
| `longref` | string (1 char) | omitted when equal to 0 | Longitude reference hemisphere: 'E' or 'W'. |
| `gpsstatus` | string (1 char) | omitted when equal to 0 | GPS receiver status code as recorded by the camera (maker-specific single character). |
| `gpsparsed` | number (int) | — | Non-zero once LibRaw has successfully parsed GPS data for this file (0 if the file has no GPS data). |

### `libraw_lensinfo_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `MinFocal` | number (float) | omitted when equal to 0 | Minimum focal length of the lens, in millimeters. |
| `MaxFocal` | number (float) | omitted when equal to 0 | Maximum focal length of the lens, in millimeters. |
| `MaxAp4MinFocal` | number (float) | omitted when equal to 0 | Maximum aperture (f-number) at MinFocal. |
| `MaxAp4MaxFocal` | number (float) | omitted when equal to 0 | Maximum aperture (f-number) at MaxFocal. |
| `EXIF_MaxAp` | number (float) | omitted when equal to 0 | Maximum aperture as reported by the EXIF MaxApertureValue tag. |
| `LensMake` | string (char[128]) | — | Lens manufacturer, if recorded separately from the camera maker. |
| `Lens` | string (char[128]) | — | Lens model/name string, from whichever source (EXIF or maker-specific) LibRaw found first. |
| `LensSerial` | string (char[128]) | — | Lens serial number, if recorded. |
| `InternalLensSerial` | string (char[128]) | — | Lens's internal (maker-specific) serial number, if recorded. |
| `FocalLengthIn35mmFormat` | number (int) | omitted when equal to 0 | 35mm-equivalent focal length in millimeters, from EXIF. |
| `nikon` | libraw_nikonlens_t | — | Nikon-specific lens fields, as libraw_nikonlens_t (populated regardless of camera make in a few cross-compatible cases). |
| `dng` | libraw_dnglens_t | — | DNG lens-info tags, as libraw_dnglens_t. |
| `makernotes` | libraw_makernotes_lens_t | — | Vendor-agnostic lens-database fields LibRaw resolves from maker notes, as libraw_makernotes_lens_t. |

### `libraw_nikonlens_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `EffectiveMaxAp` | number (float) | omitted when equal to 0 | Effective maximum aperture (f-number) as decoded from Nikon lens data. |
| `LensIDNumber` | number (int) | omitted when equal to 0 | Nikon lens ID byte (indexes Nikon's own lens database). |
| `LensFStops` | number (int) | omitted when equal to 0 | Number of f-stops in the lens's aperture range, Nikon encoding (1/12 EV units for some models -- see EXIF tools for the exact decode table). |
| `MCUVersion` | number (int) | omitted when equal to 0 | Lens MCU (electronic contacts) firmware version byte. |
| `LensType` | number (int) | omitted when equal to 0 | Nikon lens type flags byte (AF/AF-D/G/VR/etc. bit flags). |

### `libraw_dnglens_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `MinFocal` | number (float) | omitted when equal to 0 | Minimum focal length of the lens, in millimeters, from DNG tags. |
| `MaxFocal` | number (float) | omitted when equal to 0 | Maximum focal length of the lens, in millimeters, from DNG tags. |
| `MaxAp4MinFocal` | number (float) | omitted when equal to 0 | Maximum aperture (f-number) at MinFocal, from DNG tags. |
| `MaxAp4MaxFocal` | number (float) | omitted when equal to 0 | Maximum aperture (f-number) at MaxFocal, from DNG tags. |

### `libraw_makernotes_lens_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `LensID` | number \| bigint | omitted when LibRaw has not filled it in; LibRaw's own unset value for this field is UINT64_MAX (all bits set, verified empirically on the synthetic DNG), not 0 -- handled specially by scripts/gen-metadata-cc.js's `uint64` case rather than this file's generic `unset` mechanism; see the top-level $comment. | 64-bit lens ID as decoded from maker notes (indexes LibRaw's lens database). Number when it fits Number.MAX_SAFE_INTEGER, otherwise a BigInt; the key is absent (not any sentinel value) when LibRaw has not filled it in. |
| `Lens` | string (char[128]) | — | Lens name resolved from LibRaw's lens database using LensID. |
| `LensFormat` | number (int) | omitted when equal to 0 | Image-circle format the lens covers (LibRaw's internal lens-format enum value). |
| `LensMount` | number (int) | omitted when equal to 0 | Lens mount type ('male', the lens side; LibRaw's internal lens-mount enum value). |
| `CamID` | number \| bigint | omitted when LibRaw has not filled it in; Same unset note as LensID. | 64-bit camera-body ID as decoded from maker notes (indexes LibRaw's camera database). Number when it fits Number.MAX_SAFE_INTEGER, otherwise a BigInt; the key is absent when LibRaw has not filled it in. |
| `CameraFormat` | number (int) | omitted when equal to 0 | Sensor format of the camera body (LibRaw's internal camera-format enum value). |
| `CameraMount` | number (int) | omitted when equal to 0 | Camera mount type ('female', the body side; LibRaw's internal camera-mount enum value). |
| `body` | string (char[64]) | — | Camera body name associated with CamID. |
| `FocalType` | number (int) | — | Lens focal-length type: -1 unknown, 0 unknown, 1 fixed focal length, 2 zoom. |
| `LensFeatures_pre` | string (char[16]) | — | Lens name prefix features (e.g. mount/format markers) LibRaw splits out of the full lens name. |
| `LensFeatures_suf` | string (char[16]) | — | Lens name suffix features (e.g. stabilization/AF markers) LibRaw splits out of the full lens name. |
| `MinFocal` | number (float) | omitted when equal to 0 | Minimum focal length of the lens, in millimeters, as resolved via the lens database. |
| `MaxFocal` | number (float) | omitted when equal to 0 | Maximum focal length of the lens, in millimeters, as resolved via the lens database. |
| `MaxAp4MinFocal` | number (float) | omitted when equal to 0 | Maximum aperture (f-number) at MinFocal, as resolved via the lens database. |
| `MaxAp4MaxFocal` | number (float) | omitted when equal to 0 | Maximum aperture (f-number) at MaxFocal, as resolved via the lens database. |
| `MinAp4MinFocal` | number (float) | omitted when equal to 0 | Minimum aperture (f-number) at MinFocal, as resolved via the lens database. |
| `MinAp4MaxFocal` | number (float) | omitted when equal to 0 | Minimum aperture (f-number) at MaxFocal, as resolved via the lens database. |
| `MaxAp` | number (float) | omitted when equal to 0 | Maximum aperture (f-number) across the lens's zoom range. |
| `MinAp` | number (float) | omitted when equal to 0 | Minimum aperture (f-number) across the lens's zoom range. |
| `CurFocal` | number (float) | omitted when equal to 0 | Focal length at time of shooting, in millimeters, as resolved via the lens database. |
| `CurAp` | number (float) | omitted when equal to 0 | Aperture (f-number) at time of shooting, as resolved via the lens database. |
| `MaxAp4CurFocal` | number (float) | omitted when equal to 0 | Maximum aperture (f-number) available at CurFocal. |
| `MinAp4CurFocal` | number (float) | omitted when equal to 0 | Minimum aperture (f-number) available at CurFocal. |
| `MinFocusDistance` | number (float) | omitted when equal to 0 | Minimum focus distance of the lens, in meters. |
| `FocusRangeIndex` | number (float) | omitted when equal to 0 | Lens focus-range index (maker-specific classification of the lens's focus range). |
| `LensFStops` | number (float) | omitted when equal to 0 | Number of f-stops in the lens's aperture range, as resolved via the lens database. |
| `TeleconverterID` | number \| bigint | omitted when LibRaw has not filled it in; Same unset note as LensID. | 64-bit teleconverter ID, if a teleconverter was attached and recognized. Number when it fits Number.MAX_SAFE_INTEGER, otherwise a BigInt; the key is absent when unset. |
| `Teleconverter` | string (char[128]) | — | Teleconverter name resolved from TeleconverterID. |
| `AdapterID` | number \| bigint | omitted when LibRaw has not filled it in; Same unset note as LensID. | 64-bit lens-mount adapter ID, if an adapter was recognized. Number when it fits Number.MAX_SAFE_INTEGER, otherwise a BigInt; the key is absent when unset. |
| `Adapter` | string (char[128]) | — | Adapter name resolved from AdapterID. |
| `AttachmentID` | number \| bigint | omitted when LibRaw has not filled it in; Same unset note as LensID. | 64-bit attachment (e.g. close-up filter) ID, if recognized. Number when it fits Number.MAX_SAFE_INTEGER, otherwise a BigInt; the key is absent when unset. |
| `Attachment` | string (char[128]) | — | Attachment name resolved from AttachmentID. |
| `FocalUnits` | number (int) | omitted when equal to 0 | Divisor to convert the lens database's internal focal-length units to millimeters (1 in the common case). |
| `FocalLengthIn35mmFormat` | number (float) | omitted when equal to 0 | 35mm-equivalent focal length in millimeters, as resolved via the lens database. |

### `libraw_colordata_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `curve` | unsupported | Only meaningful mid-decode (after unpack, before/around dcraw_process) and not part of the metadata this generator mirrors -- huge (65536 entries) and internal. | Internal 65536-entry linearization/tone lookup table LibRaw builds during processing. |
| `cblack` | unsupported | 4104-entry internal table (LIBRAW_CBLACK_SIZE); its first few entries are the common per-channel case, the rest a maker-specific pattern encoding not worth exposing raw. color.black/color.maximum below cover the common case. | Per-channel/per-pattern black level correction table (LIBRAW_CBLACK_SIZE entries; encodes both simple per-color-channel and complex per-line/per-pixel-pattern black levels depending on the camera). |
| `black` | number (int) | — | Overall black level (baseline dark-current offset) applied during processing. |
| `data_maximum` | number (int) | — | Maximum raw pixel value actually found in this file's data. |
| `maximum` | number (int) | — | Maximum sensor value (saturation point) LibRaw uses for highlight handling. |
| `linear_max` | number[4] | — | Per-channel linear maximum values (R,G,B,G2), used for highlight reconstruction on some formats. |
| `fmaximum` | number (float) | — | Floating-point maximum sensor value, for floating-point RAW formats. |
| `fnorm` | number (float) | — | Floating-point normalization factor, for floating-point RAW formats. |
| `white` | unsupported | Internal shading-correction sample grid, not part of the requested color metadata surface. | Per-corner (8x8 grid) white-level sample table some cameras embed for vignette/shading correction. |
| `cam_mul` | number[4] | — | As-shot white balance multipliers (R, G1, B, G2), from the camera/file. |
| `pre_mul` | number[4] | — | Pre-multipliers LibRaw computed for the sensor/file (used to build the final white balance when no as-shot data is available). |
| `cmatrix` | number[3][4] | — | 3x4 color matrix (camera RGB -> a working color space) LibRaw computed for this file. |
| `ccm` | number[3][4] | — | 3x4 color correction matrix embedded in the file (e.g. DNG ColorMatrix), before LibRaw's own adjustments. |
| `rgb_cam` | number[3][4] | — | 3x4 matrix converting camera-native RGB to output RGB, as used by dcraw_process. |
| `cam_xyz` | number[4][3] | — | 4x3 matrix converting camera-native RGB to CIE XYZ. |
| `phase_one_data` | struct ph1_t | — | Phase One-specific decoding parameters, as struct ph1_t (format, black-level geometry). |
| `flash_used` | number (float) | — | Flash compensation/power value as parsed from the file, when available. |
| `canon_ev` | number (float) | — | Canon-specific exposure value adjustment parsed from maker notes. |
| `model2` | string (char[64]) | — | Secondary/internal model string some files embed (distinct from idata.model). |
| `UniqueCameraModel` | string (char[64]) | — | DNG UniqueCameraModel tag value. |
| `LocalizedCameraModel` | string (char[64]) | — | DNG LocalizedCameraModel tag value. |
| `ImageUniqueID` | string (char[64]) | — | DNG/EXIF ImageUniqueID tag value. |
| `RawDataUniqueID` | string (char[17]) | — | DNG RawDataUniqueID tag value (hex-encoded identifier). |
| `OriginalRawFileName` | string (char[64]) | — | DNG OriginalRawFileName tag value, for a DNG converted from another raw format. |
| `profile` | Buffer | void* pointer into LibRaw-owned memory, paired with profile_length below; scripts/gen-metadata-cc.js special-cases this field to copy profile_length bytes into a fresh Buffer when the pointer is non-null, and to omit the key entirely (never an empty Buffer) when it is null -- the one documented exception to "pointer fields are unsupported" (docs/plan/tasks.md's T14a Do list). | Embedded ICC color profile bytes, when the file carries one. |
| `profile_length` | number (int) | omitted when equal to 0 | Length in bytes of the embedded ICC profile (0 if color.profile is absent). |
| `black_stat` | unsupported | Internal accumulator, not a documented public metadata field. | Internal black-level statistics accumulator (sum/count pairs) used while computing color.black. |
| `dng_color` | libraw_dng_color_t[2] | — | Up to 2 DNG color calibration sets (e.g. for two calibration illuminants), as libraw_dng_color_t. |
| `dng_levels` | libraw_dng_levels_t | — | DNG black/white level and crop metadata, as libraw_dng_levels_t. |
| `WB_Coeffs` | number[256][4] | Compacted: scripts/gen-metadata-cc.js emits only the illuminant slots that are actually set (any non-zero coefficient) as `[{ illuminant, coeffs: [r, g, b, g2] }]`, per docs/plan/tasks.md's T14a Do list, instead of the full fixed-size 256-entry table (almost entirely zero for any given file). | Per-illuminant white balance coefficient presets (256 possible illuminant/CCT slots, [R, G1, B, G2] each) LibRaw parsed from the file's maker notes. |
| `WBCT_Coeffs` | number[64][5] | Compacted the same way as WB_Coeffs, keyed on CCT > 0 instead of illuminant index: `[{ colorTemperature, coeffs: [r, g, b, g2] }]`. | Per-color-temperature white balance coefficient presets (64 possible slots, [CCT, R, G1, B, G2] each) some makers embed. |
| `as_shot_wb_applied` | number (int) | — | Non-zero if the as-shot white balance was already applied to the raw data by the camera/converter (rare; e.g. some compressed raw formats). |
| `P1_color` | libraw_P1_color_t[2] | — | Up to 2 Phase One color calibration sets, as libraw_P1_color_t. |
| `raw_bps` | number (int) | — | Bits per pixel/sample of the raw data (Phase One: raw format code instead -- see the header's field comment for the code table). |
| `ExifColorSpace` | number (int) | — | EXIF ColorSpace tag value (e.g. 1 = sRGB, 0xffff = uncalibrated). |

### `struct ph1_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `format` | number (int) | — | Phase One raw format code. |
| `key_off` | number (int) | — | Phase One decryption key offset within the file. |
| `tag_21a` | number (int) | — | Raw value of Phase One maker-note tag 0x21a (undocumented by Phase One; used internally by the decoder). |
| `t_black` | number (int) | — | Phase One black-level tag value. |
| `split_col` | number (int) | — | Column at which the sensor's dual-readout halves split, for split-sensor Phase One backs. |
| `black_col` | number (int) | — | Column index of the black-reference columns. |
| `split_row` | number (int) | — | Row at which the sensor's dual-readout halves split, for split-sensor Phase One backs. |
| `black_row` | number (int) | — | Row index of the black-reference rows. |
| `tag_210` | number (float) | — | Raw value of Phase One maker-note tag 0x210 (undocumented by Phase One; used internally by the decoder). |

### `libraw_dng_color_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `parsedfields` | number (int) | — | Bitmask of which DNG color-calibration fields this set actually parsed from the file. |
| `illuminant` | number (int) | — | DNG CalibrationIlluminant tag value (standard illuminant code) this calibration set applies to. |
| `calibration` | number[4][4] | — | 4x4 DNG CameraCalibration matrix. |
| `colormatrix` | number[4][3] | — | 4x3 DNG ColorMatrix (camera RGB -> XYZ under the calibration illuminant). |
| `forwardmatrix` | number[3][4] | — | 3x4 DNG ForwardMatrix (XYZ -> camera RGB, the inverse-direction calibration some DNGs embed). |

### `libraw_dng_levels_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `parsedfields` | number (int) | — | Bitmask of which DNG level/crop fields this struct actually parsed from the file. |
| `dng_cblack` | unsupported | Same rationale as color.cblack above: a 4104-entry internal table. | DNG per-pattern black level table (LIBRAW_CBLACK_SIZE entries), the DNG-tag counterpart of color.cblack. |
| `dng_black` | number (int) | — | DNG BlackLevel tag value (single black level), when the file uses the simple (non-per-pattern) form. |
| `dng_fcblack` | unsupported | Same rationale as dng_cblack above. | Floating-point DNG per-pattern black level table (LIBRAW_CBLACK_SIZE entries), for floating-point DNGs. |
| `dng_fblack` | number (float) | — | Floating-point DNG BlackLevel tag value, for floating-point DNGs. |
| `dng_whitelevel` | number[4] | — | DNG WhiteLevel tag values, one per color plane. |
| `default_crop` | number[4] | — | DNG DefaultCropOrigin + DefaultCropSize as [originX, originY, width, height]. |
| `user_crop` | number[4] | — | DNG user-crop rectangle, relative to default_crop, as [top, left, bottom, right] fractions. |
| `preview_colorspace` | number (int) | — | DNG PreviewColorSpace tag value. |
| `analogbalance` | number[4] | — | DNG AnalogBalance tag (per-channel R,G,B,G2 multipliers), as parsed directly into this DNG-specific struct. |
| `asshotneutral` | number[4] | — | DNG AsShotNeutral tag (per-channel neutral white balance values). |
| `baseline_exposure` | number (float) | — | DNG BaselineExposure tag value (EV adjustment recommended by the DNG author). |
| `LinearResponseLimit` | number (float) | — | DNG LinearResponseLimit tag value (fraction of full scale where the sensor's response stops being linear). |
| `rawopcodes` | libraw_dng_rawopcode_t[3] | — | Up to 3 DNG opcode-list entries (OpcodeList1/2/3), as libraw_dng_rawopcode_t. |

### `libraw_dng_rawopcode_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `len` | number (int) | — | Length in bytes of this DNG opcode-list entry's raw data. |
| `data` | unsupported | Raw void* into LibRaw-owned memory; DNG opcode lists are an advanced, format-specific feature out of scope for T14a's core mirror. | Pointer to this DNG opcode-list entry's raw (undecoded) opcode data. |

### `libraw_P1_color_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `romm_cam` | number[9] | — | 3x3 ROMM (ProPhoto RGB reference space) to camera-RGB matrix, flattened row-major to 9 values, for Phase One files. |

### `libraw_metadata_common_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `FlashEC` | number (float) | — | Flash exposure compensation, in EV. |
| `FlashGN` | number (float) | — | Flash guide number. |
| `CameraTemperature` | number (float) | — | Camera body internal temperature in degrees Celsius, when recorded. |
| `SensorTemperature` | number (float) | — | Sensor temperature in degrees Celsius, when recorded. |
| `SensorTemperature2` | number (float) | — | Secondary sensor temperature reading in degrees Celsius, when the camera records more than one. |
| `LensTemperature` | number (float) | — | Lens temperature in degrees Celsius, when recorded. |
| `AmbientTemperature` | number (float) | — | Ambient (environment) temperature in degrees Celsius, when recorded. |
| `BatteryTemperature` | number (float) | — | Battery temperature in degrees Celsius, when recorded. |
| `exifAmbientTemperature` | number (float) | — | Ambient temperature in degrees Celsius, from the EXIF/MakerNote ambient-temperature tag specifically. |
| `exifHumidity` | number (float) | — | Relative humidity percentage, from EXIF, when recorded. |
| `exifPressure` | number (float) | — | Atmospheric pressure in hPa, from EXIF, when recorded. |
| `exifWaterDepth` | number (float) | — | Water depth in meters, from EXIF, for underwater housings that record it. |
| `exifAcceleration` | number (float) | — | Acceleration magnitude, from EXIF, when recorded. |
| `exifCameraElevationAngle` | number (float) | — | Camera elevation angle in degrees, from EXIF, when recorded. |
| `real_ISO` | number (float) | — | Measured (actual) ISO sensitivity, when the camera records one distinct from the nominal ISO in other.iso_speed. |
| `exifExposureIndex` | number (float) | — | EXIF ExposureIndex tag value. |
| `ColorSpace` | number (int) | — | EXIF/MakerNote color space code (maker-specific encoding; compare against the relevant vendor's documented values). |
| `firmware` | string (char[128]) | — | Camera firmware version string, when recorded outside idata.software. |
| `ExposureCalibrationShift` | number (float) | — | Exposure calibration shift, in EV, some cameras record as a fine metering correction. |
| `afdata` | libraw_afinfo_item_t[4] | Fixed-size LIBRAW_AFDATA_MAXCOUNT (4) slots in the C struct; scripts/gen-metadata-cc.js emits only the first `afcount` entries (the rest are unused/zero slots). | Autofocus-related maker-note data blocks actually present in this file (see afcount), as libraw_afinfo_item_t. |
| `afcount` | number (int) | — | Number of afdata entries actually populated (0..4). |

### `libraw_afinfo_item_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `AFInfoData_tag` | number (int) | — | Maker-note tag ID this autofocus data block was read from. |
| `AFInfoData_order` | number (int) | — | Byte order (TIFF-style, e.g. 0x4949/0x4d4d) this autofocus data block was encoded with. |
| `AFInfoData_version` | number (int) | — | Version number/tag of this autofocus data block's internal format. |
| `AFInfoData_length` | number (int) | — | Length in bytes of this autofocus data block's raw payload. |
| `AFInfoData` | unsupported | Raw uchar* into LibRaw-owned memory; decoding autofocus point layouts is maker-specific and out of scope for T14a's core mirror. | Pointer to this autofocus data block's raw (undecoded) payload bytes. |

### `libraw_canon_makernotes_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `ColorDataVer` | number (int) | — | Canon color-data maker-note record version number. |
| `ColorDataSubVer` | number (int) | — | Canon color-data maker-note record sub-version number. |
| `SpecularWhiteLevel` | number (int) | — | Canon specular (saturation) white level parsed from color-data. |
| `NormalWhiteLevel` | number (int) | — | Canon normal white level parsed from color-data. |
| `ChannelBlackLevel` | number[4] | — | Per-channel (R,G1,B,G2) black level from Canon color-data. |
| `AverageBlackLevel` | number (int) | — | Average black level across channels from Canon color-data. |
| `multishot` | number[4] | — | Canon multi-shot-mode per-channel data (e.g. Dual Pixel/HDR shot info). |
| `MeteringMode` | number (int) | — | Canon metering mode code. |
| `SpotMeteringMode` | number (int) | — | Canon spot-metering sub-mode code. |
| `FlashMeteringMode` | number (int) | — | Canon flash metering mode code. |
| `FlashExposureLock` | number (int) | — | Canon flash exposure lock (FE lock) flag. |
| `ExposureMode` | number (int) | — | Canon exposure mode code. |
| `AESetting` | number (int) | — | Canon auto-exposure bracketing/setting code. |
| `ImageStabilization` | number (int) | — | Canon image stabilization mode code. |
| `FlashMode` | number (int) | — | Canon flash mode code. |
| `FlashActivity` | number (int) | — | Canon flash-fired flag/activity code. |
| `FlashBits` | number (int) | — | Canon flash configuration bit flags. |
| `ManualFlashOutput` | number (int) | — | Canon manual flash output level code. |
| `FlashOutput` | number (int) | — | Canon flash output level. |
| `FlashGuideNumber` | number (int) | — | Canon flash guide number. |
| `ContinuousDrive` | number (int) | — | Canon continuous-drive mode code. |
| `SensorWidth` | number (int) | — | Canon sensor width parsed from maker notes, in pixels. |
| `SensorHeight` | number (int) | — | Canon sensor height parsed from maker notes, in pixels. |
| `AFMicroAdjMode` | number (int) | — | Canon AF micro-adjustment mode code. |
| `AFMicroAdjValue` | number (float) | — | Canon AF micro-adjustment value. |
| `MakernotesFlip` | number (int) | — | Orientation flag Canon records in maker notes (LibRaw-internal flip encoding). |
| `AutoRotateMode` | number (int) | — | Canon auto-rotate mode code. |
| `RecordMode` | number (int) | — | Canon record mode code (still/movie/RAW variant). |
| `SRAWQuality` | number (int) | — | Canon sRAW quality code. |
| `wbi` | number (int) | — | Canon white-balance index/preset code. |
| `RF_lensID` | number (int) | — | Canon RF-mount lens ID code, when an RF lens is attached. |
| `AutoLightingOptimizer` | number (int) | — | Canon Auto Lighting Optimizer setting code. |
| `HighlightTonePriority` | number (int) | — | Canon Highlight Tone Priority setting code. |
| `Quality` | number (int) | omitted when equal to -1; LibRaw's own header comment documents -1 as "n/a" for this field (the only Canon field with a documented sentinel; every other Canon field here has no such comment, so no `unset` is applied even though the struct is zero-initialized before parsing -- see this file's per-vendor sentinel-rule note). | Canon recording-quality code (see the header comment for the value table). |
| `CanonLog` | number (int) | — | Canon Log data-compression curve code (0 off, 1 CLogV1, 2 CLogV2, 3 CLogV3). |
| `DefaultCropAbsolute` | libraw_area_t | — | Canon default absolute crop rectangle, as libraw_area_t. |
| `RecommendedImageArea` | libraw_area_t | — | Canon recommended image area rectangle, as libraw_area_t. |
| `LeftOpticalBlack` | libraw_area_t | — | Canon left optical-black (masked border) rectangle, as libraw_area_t. |
| `UpperOpticalBlack` | libraw_area_t | — | Canon upper optical-black (masked border) rectangle, as libraw_area_t. |
| `ActiveArea` | libraw_area_t | — | Canon active (non-masked) sensor area rectangle, as libraw_area_t. |
| `ISOgain` | number[2] | — | Canon [AutoISO, BaseISO] gain pair, per ExifTool convention. |

### `libraw_area_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `t` | number (int) | — | Top edge, in pixels (0,0 is the top-left pixel). |
| `l` | number (int) | — | Left edge, in pixels. |
| `b` | number (int) | — | Bottom edge, in pixels. |
| `r` | number (int) | — | Right edge, in pixels. |

### `libraw_nikon_makernotes_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `ExposureBracketValue` | number (float) | — | Nikon exposure bracketing step value, in EV. |
| `ActiveDLighting` | number (int) | — | Nikon Active D-Lighting setting code. |
| `ShootingMode` | number (int) | — | Nikon shooting mode bit flags. |
| `ImageStabilization` | Buffer (7 bytes) | — | Nikon VR (vibration reduction) status byte record, raw undecoded bytes. |
| `VibrationReduction` | number (int) | — | Nikon vibration reduction (VR) on/off code. |
| `VRMode` | number (int) | — | Nikon VR mode code (e.g. normal/active/sport). |
| `FlashSetting` | string (char[13]) | — | Nikon flash setting string (e.g. "Normal", "Slow"). |
| `FlashType` | string (char[20]) | — | Nikon flash type string (e.g. "Built-in", "Optional,TTL"). |
| `FlashExposureCompensation` | Buffer (4 bytes) | — | Nikon flash exposure compensation, raw undecoded byte record. |
| `ExternalFlashExposureComp` | Buffer (4 bytes) | — | Nikon external flash exposure compensation, raw undecoded byte record. |
| `FlashExposureBracketValue` | Buffer (4 bytes) | — | Nikon flash exposure bracketing value, raw undecoded byte record. |
| `FlashMode` | number (int) | — | Nikon flash mode code. |
| `FlashExposureCompensation2` | number (int) | — | Nikon flash exposure compensation, secondary encoding. |
| `FlashExposureCompensation3` | number (int) | — | Nikon flash exposure compensation, tertiary encoding. |
| `FlashExposureCompensation4` | number (int) | — | Nikon flash exposure compensation, quaternary encoding. |
| `FlashSource` | number (int) | — | Nikon flash source code (built-in vs external). |
| `FlashFirmware` | Buffer (2 bytes) | — | Nikon external flash unit firmware version, raw 2-byte record. |
| `ExternalFlashFlags` | number (int) | — | Nikon external flash configuration bit flags. |
| `FlashControlCommanderMode` | number (int) | — | Nikon flash commander-mode flag. |
| `FlashOutputAndCompensation` | number (int) | — | Nikon flash output and compensation combined code. |
| `FlashFocalLength` | number (int) | — | Nikon flash-zoom-head focal length code. |
| `FlashGNDistance` | number (int) | — | Nikon flash guide-number distance code. |
| `FlashGroupControlMode` | Buffer (4 bytes) | — | Nikon commander flash-group control mode, raw undecoded byte record. |
| `FlashGroupOutputAndCompensation` | Buffer (4 bytes) | — | Nikon commander flash-group output/compensation, raw undecoded byte record. |
| `FlashColorFilter` | number (int) | — | Nikon flash color-filter code. |
| `NEFCompression` | number (int) | — | NEF compression type code (see the header comment for the value table). |
| `ExposureMode` | number (int) | — | Nikon exposure mode code. |
| `ExposureProgram` | number (int) | — | Nikon exposure program code. |
| `nMEshots` | number (int) | — | Nikon multiple-exposure shot count. |
| `MEgainOn` | number (int) | — | Nikon multiple-exposure auto-gain flag. |
| `ME_WB` | number[4] | — | Nikon multiple-exposure white balance multipliers. |
| `AFFineTune` | number (int) | — | Nikon AF fine-tune on/off flag. |
| `AFFineTuneIndex` | number (int) | — | Nikon AF fine-tune lens-registration index. |
| `AFFineTuneAdj` | number (int) | — | Nikon AF fine-tune adjustment value. |
| `LensDataVersion` | number (int) | — | Nikon lens-data maker-note record version number. |
| `FlashInfoVersion` | number (int) | — | Nikon flash-info maker-note record version number. |
| `ColorBalanceVersion` | number (int) | — | Nikon color-balance maker-note record version number. |
| `key` | number (int) | — | Nikon maker-note decryption key byte (derived from the file's serial number/shutter count). |
| `NEFBitDepth` | number[4] | — | Nikon NEF per-component bit depth values. |
| `HighSpeedCropFormat` | number (int) | — | Nikon high-speed-crop format code (see the header comment for the value table). |
| `SensorHighSpeedCrop` | libraw_sensor_highspeed_crop_t | — | Nikon high-speed-crop sensor rectangle, as libraw_sensor_highspeed_crop_t. |
| `SensorWidth` | number (int) | — | Nikon sensor width parsed from maker notes, in pixels. |
| `SensorHeight` | number (int) | — | Nikon sensor height parsed from maker notes, in pixels. |
| `Active_D_Lighting` | number (int) | — | Nikon Active D-Lighting applied-level code. |
| `PictureControlVersion` | number (int) | — | Nikon Picture Control maker-note record version number. |
| `PictureControlName` | string (char[20]) | — | Nikon Picture Control preset name (e.g. "STANDARD", "VIVID"). |
| `PictureControlBase` | string (char[20]) | — | Nikon Picture Control base preset name this one derives from. |
| `ShotInfoVersion` | number (int) | — | Nikon shot-info maker-note record version number. |
| `ShotInfoFirmware` | string (char[9]) | — | Firmware version string recorded in the Nikon shot-info block. |
| `BurstTable_0x0056_len` | number (int) | — | Length in bytes of the Nikon burst-table (tag 0x0056) raw payload. |
| `BurstTable_0x0056` | unsupported | Raw uchar* into LibRaw-owned memory; a maker-specific undecoded burst-mode record, paired with BurstTable_0x0056_len -- out of scope for this generator (pointer fields are unsupported). | Pointer to the Nikon burst-table raw payload. |
| `BurstTable_0x0056_ver` | number (int) | — | Nikon burst-table (tag 0x0056) record version number. |
| `BurstTable_0x0056_gid` | number (int) | — | Nikon burst-table (tag 0x0056) group ID. |
| `BurstTable_0x0056_fnum` | number (int) | — | Nikon burst-table (tag 0x0056) frame number. |
| `MakernotesFlip` | number (int) | — | Orientation flag Nikon records in maker notes (LibRaw-internal flip encoding). |
| `RollAngle` | number (float) | — | Camera roll angle in degrees, positive is clockwise, from Nikon maker notes. |
| `PitchAngle` | number (float) | — | Camera pitch angle in degrees, positive is upwards, from Nikon maker notes. |
| `YawAngle` | number (float) | — | Camera yaw angle in degrees, positive is to the right, from Nikon maker notes. |

### `libraw_sensor_highspeed_crop_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `cleft` | number (int) | — | High-speed-crop left edge, in raw pixel coordinates. |
| `ctop` | number (int) | — | High-speed-crop top edge, in raw pixel coordinates. |
| `cwidth` | number (int) | — | High-speed-crop width, in raw pixels. |
| `cheight` | number (int) | — | High-speed-crop height, in raw pixels. |

### `libraw_sony_info_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `CameraType` | number (int) | omitted when equal to 65535; See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields. | Sony camera-type code parsed from maker notes. |
| `Sony0x9400_version` | number (int) | omitted when equal to 0; Header comment: "0 if not found/deciphered". | Decoded format version of Sony maker-note tag 0x9400 (0xa/0xb/0xc per ExifTool convention). |
| `Sony0x9400_ReleaseMode2` | number (int) | — | Sony tag 0x9400 ReleaseMode2 sub-field. |
| `Sony0x9400_SequenceImageNumber` | number (int) | — | Sony tag 0x9400 sequence image number. |
| `Sony0x9400_SequenceLength1` | number (int) | — | Sony tag 0x9400 sequence length, encoding 1. |
| `Sony0x9400_SequenceFileNumber` | number (int) | — | Sony tag 0x9400 sequence file number. |
| `Sony0x9400_SequenceLength2` | number (int) | — | Sony tag 0x9400 sequence length, encoding 2. |
| `AFAreaModeSetting` | number (int) | omitted when equal to 255; See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields. | Sony AF area mode setting code. |
| `AFAreaMode` | number (int) | omitted when equal to 65535; See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields. | Sony AF area mode code. |
| `FlexibleSpotPosition` | number[2] | — | Sony flexible-spot AF position [x, y]. |
| `AFPointSelected` | number (int) | omitted when equal to 255; See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields. | Sony selected AF point index. |
| `AFPointSelected_0x201e` | number (int) | omitted when equal to 255; See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields. | Sony selected AF point index, tag 0x201e encoding. |
| `nAFPointsUsed` | number (int) | — | Number of Sony AF points reported as in-focus/used. |
| `AFPointsUsed` | number[10] | — | Sony AF point index bitfield/list actually used for this shot. |
| `AFTracking` | number (int) | omitted when equal to 255; See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields. | Sony AF tracking on/off flag. |
| `AFType` | number (int) | — | Sony AF system type code (e.g. phase- vs contrast-detect). |
| `FocusLocation` | number[4] | — | Sony focus point location [x, y, width, height] in sensor coordinates. |
| `FocusPosition` | number (int) | omitted when equal to 65535; See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields. | Sony lens focus position/distance code. |
| `AFMicroAdjValue` | number (int) | omitted when equal to 127; See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields. | Sony AF micro-adjustment value. |
| `AFMicroAdjOn` | number (int) | omitted when equal to -1; See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields. | Sony AF micro-adjustment on/off flag. |
| `AFMicroAdjRegisteredLenses` | number (int) | omitted when equal to 255; See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields. | Number of lenses with a registered Sony AF micro-adjustment value. |
| `VariableLowPassFilter` | number (int) | — | Sony variable low-pass filter setting code. |
| `LongExposureNoiseReduction` | number (int) | omitted when equal to 4294967295; See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields. | Sony long-exposure noise reduction setting code. |
| `HighISONoiseReduction` | number (int) | omitted when equal to 65535; See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields. | Sony high-ISO noise reduction setting code. |
| `HDR` | number[2] | — | Sony in-camera HDR [mode, strength] setting. |
| `group2010` | number (int) | — | Presence/length marker for the Sony maker-note tag-group starting at 0x2010 (decoder-internal). |
| `group9050` | number (int) | — | Presence/length marker for the Sony maker-note tag-group starting at 0x9050 (decoder-internal). |
| `len_group9050` | number (int) | — | Length of the Sony 0x9050 maker-note tag-group, in bytes (debugging only, per the header comment). |
| `real_iso_offset` | number (int) | omitted when equal to 65535; See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields. | Byte offset of Sony's "real" (measured) ISO field within its maker-note record. |
| `MeteringMode_offset` | number (int) | — | Byte offset of Sony's metering-mode field within its maker-note record. |
| `ExposureProgram_offset` | number (int) | — | Byte offset of Sony's exposure-program field within its maker-note record. |
| `ReleaseMode2_offset` | number (int) | — | Byte offset of Sony's ReleaseMode2 field within its maker-note record. |
| `MinoltaCamID` | number (int) | omitted when equal to 4294967295; See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields. | Legacy Minolta camera-model ID some Sony/Minolta-derived files carry. |
| `firmware` | number (float) | — | Sony camera firmware version number. |
| `ImageCount3_offset` | number (int) | omitted when equal to 65535; See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields. | Byte offset of the Sony ImageCount3 field within its maker-note record. |
| `ImageCount3` | number (int) | — | Sony cumulative image (shutter actuation) count, encoding 3. |
| `ElectronicFrontCurtainShutter` | number (int) | omitted when equal to 4294967295; See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields. | Sony electronic front-curtain shutter on/off flag. |
| `MeteringMode2` | number (int) | — | Sony metering mode code, secondary encoding. |
| `SonyDateTime` | string (char[20]) | — | Capture date/time string as recorded in Sony maker notes. |
| `ShotNumberSincePowerUp` | number (int) | — | Number of shots taken since the camera was last powered on. |
| `PixelShiftGroupPrefix` | number (int) | — | Sony pixel-shift-group identifier prefix. |
| `PixelShiftGroupID` | number (int) | — | Sony pixel-shift-group identifier. |
| `nShotsInPixelShiftGroup` | string (1 char) | omitted when equal to 0 | Number of shots in this file's Sony pixel-shift group, as an ASCII digit character. |
| `numInPixelShiftGroup` | string (1 char) | omitted when equal to 0 | This shot's position within its Sony pixel-shift group, as an ASCII digit character ('0' for ARQ, '1' for the group's first shot). |
| `prd_ImageHeight` | number (int) | — | Sony PRD (raw-data descriptor) image height, in pixels. |
| `prd_ImageWidth` | number (int) | — | Sony PRD (raw-data descriptor) image width, in pixels. |
| `prd_Total_bps` | number (int) | — | Sony PRD total bits per sample. |
| `prd_Active_bps` | number (int) | — | Sony PRD active (meaningful) bits per sample. |
| `prd_StorageMethod` | number (int) | — | Sony PRD storage method code (82 padded, 89 linear). |
| `prd_BayerPattern` | number (int) | omitted when equal to 0; Header comment: "0 -> not valid". | Sony PRD Bayer CFA pattern code (1 RGGB, 4 GBRG). |
| `SonyRawFileType` | number (int) | omitted when equal to 65535; See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields. | Sony raw-file sub-type code (see the header comment for the value table); takes precedence over RAWFileType/Quality for ARW 2.0+. |
| `RAWFileType` | number (int) | omitted when equal to 65535; See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields. | Sony raw-file type code (0 compressed, 1 uncompressed, 2 lossless compressed v2); takes precedence over Quality. |
| `RawSizeType` | number (int) | omitted when equal to 65535; See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields. | Sony raw image-size class code (1 large, 2 small, 3 medium). |
| `Quality` | number (int) | omitted when equal to 4294967295; See this file's per-vendor sentinel-rule note: LibRaw's header comments document this field's C-level "init in" default explicitly, unlike most other vendor fields. | Sony recording-quality code (0/6 raw, 7/8 compressed raw). |
| `FileFormat` | number (int) | — | Sony raw-format version code (see the header comment for the value table, e.g. 3000 = ARW 2.0). |
| `MetaVersion` | string (char[16]) | — | Sony maker-note metadata format version string. |
| `AspectRatio` | number (float) | — | Sony recorded aspect ratio. |

### `libraw_fuji_info_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `ExpoMidPointShift` | number (float) | — | Fuji exposure mid-point shift, in EV. |
| `DynamicRange` | number (int) | — | Fuji Dynamic Range setting code. |
| `FilmMode` | number (int) | — | Fuji Film Simulation mode code. |
| `DynamicRangeSetting` | number (int) | — | Fuji Dynamic Range setting mode code. |
| `DevelopmentDynamicRange` | number (int) | — | Fuji development (in-camera JPEG) Dynamic Range code. |
| `AutoDynamicRange` | number (int) | — | Fuji Auto Dynamic Range setting code. |
| `DRangePriority` | number (int) | — | Fuji D-Range Priority setting code. |
| `DRangePriorityAuto` | number (int) | — | Fuji D-Range Priority Auto sub-setting code. |
| `DRangePriorityFixed` | number (int) | — | Fuji D-Range Priority Fixed sub-setting code. |
| `FujiModel` | string (char[33]) | — | Fuji internal model name string. |
| `FujiModel2` | string (char[33]) | — | Fuji internal secondary model name string. |
| `BrightnessCompensation` | number (float) | — | Fuji brightness compensation, in EV (raw data scaled by 2^value when set). |
| `FocusMode` | number (int) | — | Fuji focus mode code. |
| `AFMode` | number (int) | — | Fuji AF mode code. |
| `FocusPixel` | number[2] | — | Fuji focus-point pixel coordinates [x, y]. |
| `PrioritySettings` | number (int) | — | Fuji shutter/release priority settings code. |
| `FocusSettings` | number (int) | — | Fuji focus settings bit flags. |
| `AF_C_Settings` | number (int) | — | Fuji AF-C (continuous AF) custom settings bit flags. |
| `FocusWarning` | number (int) | — | Fuji focus-warning (possible missed focus) flag. |
| `ImageStabilization` | number[3] | — | Fuji image stabilization [mode, ..., ...] setting values. |
| `FlashMode` | number (int) | — | Fuji flash mode code. |
| `WB_Preset` | number (int) | — | Fuji white balance preset code. |
| `ShutterType` | number (int) | — | Fuji shutter type code (0 mechanical, 1 electronic, 2 electronic long, 3 electronic front-curtain). |
| `ExrMode` | number (int) | — | Fuji EXR sensor mode code. |
| `Macro` | number (int) | — | Fuji macro mode on/off flag. |
| `Rating` | number (int) | — | Star rating assigned to the image in-camera. |
| `CropMode` | number (int) | — | Fuji sensor crop mode code (see the header comment for the value table). |
| `SerialSignature` | string (char[13]) | — | Fuji sensor serial-number signature string. |
| `SensorID` | string (char[5]) | — | Fuji sensor ID string. |
| `RAFVersion` | string (char[5]) | — | RAF (raw file format) version string. |
| `RAFDataGeneration` | number (int) | omitted when equal to 0; Header comment: "0 (none), 1..4, 4096". | RAF data-generation code (1..4, or 4096). |
| `RAFDataVersion` | number (int) | — | RAF data record version number. |
| `isTSNERDTS` | number (int) | — | Flag for a Fuji sensor/processing variant LibRaw identifies internally as "TSNERDTS". |
| `DriveMode` | number (int) | — | Fuji drive mode code (0 single frame, 1 continuous low, 2 continuous high). |
| `BlackLevel` | number[9] | — | Per-channel black level table some Fuji models embed in maker notes (see the header comment for the model list). |
| `RAFData_ImageSizeTable` | number[32] | — | RAF internal per-mode image-size lookup table. |
| `AutoBracketing` | number (int) | — | Fuji auto-bracketing mode code. |
| `SequenceNumber` | number (int) | — | Frame sequence number within a Fuji burst/bracket sequence. |
| `SeriesLength` | number (int) | — | Length of the Fuji burst/bracket series this frame belongs to. |
| `PixelShiftOffset` | number[2] | — | Fuji pixel-shift multi-shot [x, y] sub-pixel offset for this frame. |
| `ImageCount` | number (int) | — | Fuji cumulative image (shutter actuation) count. |

### `libraw_olympus_makernotes_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `CameraType2` | string (char[6]) | — | Olympus internal camera-type code string. |
| `ValidBits` | number (int) | — | Valid bits per sample, as recorded by Olympus maker notes. |
| `tagX640` | number (int) | — | Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 0). |
| `tagX641` | number (int) | — | Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 1). |
| `tagX642` | number (int) | — | Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 2). |
| `tagX643` | number (int) | — | Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 3). |
| `tagX644` | number (int) | — | Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 4). |
| `tagX645` | number (int) | — | Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 5). |
| `tagX646` | number (int) | — | Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 6). |
| `tagX647` | number (int) | — | Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 7). |
| `tagX648` | number (int) | — | Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 8). |
| `tagX649` | number (int) | — | Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 9). |
| `tagX650` | number (int) | — | Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 10). |
| `tagX651` | number (int) | — | Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 11). |
| `tagX652` | number (int) | — | Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 12). |
| `tagX653` | number (int) | — | Undocumented Olympus decoder-internal maker-note value (tag group 0x0640-0x0653, entry 13). |
| `SensorCalibration` | number[2] | — | Olympus sensor calibration [gain, offset] pair. |
| `DriveMode` | number[5] | — | Olympus drive-mode setting values. |
| `ColorSpace` | number (int) | — | Olympus color space code. |
| `FocusMode` | number[2] | — | Olympus focus-mode setting values. |
| `AutoFocus` | number (int) | — | Olympus autofocus on/off flag. |
| `AFPoint` | number (int) | — | Olympus selected AF point index. |
| `AFAreas` | number[64] | — | Olympus AF area bitfield/coordinate table. |
| `AFPointSelected` | number[5] | — | Olympus selected AF point, normalized coordinates. |
| `AFResult` | number (int) | — | Olympus AF result (in-focus/failed) code. |
| `AFFineTune` | number (int) | — | Olympus AF fine-tune on/off flag. |
| `AFFineTuneAdj` | number[3] | — | Olympus AF fine-tune adjustment values. |
| `SpecialMode` | number[3] | — | Olympus special shooting mode [group, mode, sub-mode] code. |
| `ZoomStepCount` | number (int) | — | Olympus zoom lens step-position count. |
| `FocusStepCount` | number (int) | — | Olympus focus lens step-position count. |
| `FocusStepInfinity` | number (int) | — | Olympus focus step count corresponding to infinity focus. |
| `FocusStepNear` | number (int) | — | Olympus focus step count corresponding to the near focus limit. |
| `FocusDistance` | number (float) | — | Olympus focus distance, in meters. |
| `AspectFrame` | number[4] | — | Olympus aspect-ratio crop frame [left, top, width, height]. |
| `StackedImage` | number[2] | — | Olympus focus/image-stacking [count, index] pair. |
| `isLiveND` | number (int) | — | Olympus Live ND (electronic neutral density) on/off flag. |
| `LiveNDfactor` | number (int) | — | Olympus Live ND applied attenuation factor. |
| `Panorama_mode` | number (int) | — | Olympus in-camera panorama mode code. |
| `Panorama_frameNum` | number (int) | — | Frame number within an Olympus in-camera panorama sequence. |

### `libraw_panasonic_makernotes_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `Compression` | number (int) | — | Panasonic/Leica raw compression code (see the header comment for the value table). |
| `BlackLevelDim` | number (int) | — | Number of valid entries in BlackLevel. |
| `BlackLevel` | number[8] | — | Per-channel black level table from Panasonic maker notes. |
| `Multishot` | number (int) | — | Panasonic multi-shot mode code (0 off, 65536 Pixel Shift). |
| `gamma` | number (float) | — | Panasonic gamma value applied/recorded for this file. |
| `HighISOMultiplier` | number[3] | — | Panasonic per-channel (R,G,B) high-ISO multiplier. |
| `FocusStepNear` | number (int) | — | Panasonic lens focus step count towards the near limit. |
| `FocusStepCount` | number (int) | — | Panasonic lens focus step count at the time of capture. |
| `ZoomPosition` | number (int) | — | Panasonic zoom lens position code. |
| `LensManufacturer` | number (int) | — | Panasonic lens-manufacturer code. |

### `libraw_pentax_makernotes_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `DriveMode` | Buffer (4 bytes) | — | Pentax drive-mode setting bytes. |
| `FocusMode` | number[2] | — | Pentax focus-mode setting values. |
| `AFPointSelected` | number[2] | — | Pentax selected AF point [mode, point] pair. |
| `AFPointSelected_Area` | number (int) | — | Pentax selected AF point area code. |
| `AFPointsInFocus_version` | number (int) | — | Format version of the Pentax AF-points-in-focus record. |
| `AFPointsInFocus` | number (int) | — | Pentax AF points reported in-focus, as a bitfield. |
| `FocusPosition` | number (int) | — | Pentax lens focus position code. |
| `DynamicRangeExpansion` | Buffer (4 bytes) | — | Pentax dynamic range expansion setting bytes (entry 1 > 0 adds entry 0 to the black level, per the header comment). |
| `AFAdjustment` | number (int) | — | Pentax AF micro-adjustment value. |
| `AFPointMode` | number (int) | — | Pentax AF point selection mode code. |
| `MultiExposure` | number (int) | — | Pentax multi-exposure setting flags (per the header comment, the last bit is 0 when multi-exposure is not used). |
| `Quality` | number (int) | — | Pentax recording-quality code (4 raw, 7 raw+pixel-shift, 8 raw+dynamic pixel-shift). |

### `libraw_samsung_makernotes_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `ImageSizeFull` | number[4] | — | Samsung full sensor image size [left, top, width, height]. |
| `ImageSizeCrop` | number[4] | — | Samsung cropped output image size [left, top, width, height]. |
| `ColorSpace` | number[2] | — | Samsung color space [tag, value] pair. |
| `key` | number[11] | — | Samsung maker-note decryption/derivation key material (11 words). |
| `DigitalGain` | number (float) | — | Samsung digital gain (PostAEGain / digital stretch) applied. |
| `DeviceType` | number (int) | — | Samsung device-type code. |
| `LensFirmware` | string (char[32]) | — | Samsung lens firmware version string. |

### `libraw_kodak_makernotes_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `BlackLevelTop` | number (int) | — | Kodak black level for the top sensor region. |
| `BlackLevelBottom` | number (int) | — | Kodak black level for the bottom sensor region. |
| `offset_left` | number (int) | — | Kodak KDC left sensor offset (may be negative or zero). |
| `offset_top` | number (int) | — | Kodak KDC top sensor offset (may be negative or zero). |
| `clipBlack` | number (int) | — | Kodak clipping black-point value (valid for the P712/P850/P880 models). |
| `clipWhite` | number (int) | — | Kodak clipping white-point value (valid for the P712/P850/P880 models). |
| `romm_camDaylight` | number[3][3] | — | Kodak ROMM (ProPhoto RGB) to camera-RGB matrix, daylight illuminant. |
| `romm_camTungsten` | number[3][3] | — | Kodak ROMM to camera-RGB matrix, tungsten illuminant. |
| `romm_camFluorescent` | number[3][3] | — | Kodak ROMM to camera-RGB matrix, fluorescent illuminant. |
| `romm_camFlash` | number[3][3] | — | Kodak ROMM to camera-RGB matrix, flash illuminant. |
| `romm_camCustom` | number[3][3] | — | Kodak ROMM to camera-RGB matrix, custom illuminant. |
| `romm_camAuto` | number[3][3] | — | Kodak ROMM to camera-RGB matrix, auto-selected illuminant. |
| `val018percent` | number (int) | — | Kodak tone-curve calibration value at the 18% (mid-gray) point. |
| `val100percent` | number (int) | — | Kodak tone-curve calibration value at the 100% (white) point. |
| `val170percent` | number (int) | — | Kodak tone-curve calibration value at the 170% (highlight headroom) point. |
| `MakerNoteKodak8a` | number (int) | — | Raw value of Kodak maker-note tag 0x8a (undocumented by Kodak). |
| `ISOCalibrationGain` | number (float) | — | Kodak ISO calibration gain factor. |
| `AnalogISO` | number (float) | — | Kodak analog (sensor-level) ISO value, before digital gain. |

### `libraw_p1_makernotes_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `Software` | string (char[64]) | — | Phase One capture software name/version string (maker-note tag 0x0203). |
| `SystemType` | string (char[64]) | — | Phase One system type string (maker-note tag 0x0204). |
| `FirmwareString` | string (char[256]) | — | Phase One firmware version string (maker-note tag 0x0301). |
| `SystemModel` | string (char[64]) | — | Phase One system model string. |

### `libraw_hasselblad_makernotes_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `BaseISO` | number (int) | — | Hasselblad base ISO sensitivity. |
| `Gain` | number (float) | — | Hasselblad sensor gain applied. |
| `Sensor` | string (char[8]) | — | Hasselblad sensor identifier string. |
| `SensorUnit` | string (char[64]) | — | Hasselblad sensor-unit ("SU") identifier string. |
| `HostBody` | string (char[64]) | — | Hasselblad host-body ("HB") identifier string. |
| `SensorCode` | number (int) | — | Hasselblad sensor code. |
| `SensorSubCode` | number (int) | — | Hasselblad sensor sub-code. |
| `CoatingCode` | number (int) | — | Hasselblad sensor coating code. |
| `uncropped` | number (int) | — | Non-zero if the raw data is the uncropped full sensor read-out. |
| `CaptureSequenceInitiator` | string (char[32]) | — | String identifying what initiated this Hasselblad capture sequence (e.g. camera settings menu entry). |
| `SensorUnitConnector` | string (char[64]) | — | Hasselblad sensor-unit connector identifier string (maker-note tag 0x0015). |
| `format` | number (int) | — | Hasselblad file format code (3FR, FFF, Imacon, or Hasselblad/Phocus DNG). |
| `nIFD_CM` | number[2] | — | Number of the IFD containing each Hasselblad color-matrix (CM) record. |
| `RecommendedCrop` | number[2] | — | Hasselblad recommended crop [width, height]. |
| `mnColorMatrix` | number[4][3] | — | Hasselblad maker-note color matrix (tag 0x002a), when present. |

### `libraw_ricoh_makernotes_t`

| Field | Type | Notes | Description |
| --- | --- | --- | --- |
| `AFStatus` | number (int) | — | Ricoh AF status code. |
| `AFAreaXPosition` | number[2] | — | Ricoh AF area X positions. |
| `AFAreaYPosition` | number[2] | — | Ricoh AF area Y positions. |
| `AFAreaMode` | number (int) | — | Ricoh AF area mode code. |
| `SensorWidth` | number (int) | — | Ricoh sensor width parsed from maker notes, in pixels. |
| `SensorHeight` | number (int) | — | Ricoh sensor height parsed from maker notes, in pixels. |
| `CroppedImageWidth` | number (int) | — | Ricoh cropped output image width, in pixels. |
| `CroppedImageHeight` | number (int) | — | Ricoh cropped output image height, in pixels. |
| `WideAdapter` | number (int) | — | Ricoh wide-conversion-adapter attached flag. |
| `CropMode` | number (int) | — | Ricoh sensor crop mode code. |
| `NDFilter` | number (int) | — | Ricoh built-in neutral-density filter on/off flag. |
| `AutoBracketing` | number (int) | — | Ricoh auto-bracketing mode code. |
| `MacroMode` | number (int) | — | Ricoh macro mode on/off flag. |
| `FlashMode` | number (int) | — | Ricoh flash mode code. |
| `FlashExposureComp` | number (float) | — | Ricoh flash exposure compensation, in EV. |
| `ManualFlashOutput` | number (float) | — | Ricoh manual flash output level. |

