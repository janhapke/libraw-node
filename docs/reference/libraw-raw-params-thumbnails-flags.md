# LibRaw raw-unpack params, thumbnail list, capability and warning flags

## `imgdata.rawparams` (`libraw_raw_unpack_params_t`, 0.21+)

Decode-stage options, consulted by `open_*` and `unpack()`; must be set **before** `open_*` for the
`options` bits that affect parsing.

| Field | Type | Meaning | Default |
|---|---|---|---|
| `use_rawspeed` | int | Bitmask of `LibRaw_rawspeed_bits_t` (`LIBRAW_RAWSPEEDV1_USE`/`_FAILONUNKNOWN`/`_IGNOREERRORS`, `LIBRAW_RAWSPEEDV3_*`); use RawSpeed if compiled in | `LIBRAW_RAWSPEEDV1_USE` (1) |
| `use_dngsdk` | int | Bitmask of `LibRaw_dng_processing` (`LIBRAW_DNG_FLOAT`/`_LINEAR`/`_DEFLATE`/`_XTRANS`/`_OTHER`/`_8BIT`) selecting which DNG variants use the Adobe SDK, if compiled in — **not** a 0/1/2 scale (older LibRaw docs describe that scheme, but 0.22.2's header and `dngsdk_glue.cpp`'s bit tests confirm it is this bitmask) | `LIBRAW_DNG_DEFAULT` = `FLOAT\|LINEAR\|DEFLATE\|8BIT` = 39 |
| `options` | unsigned | Bitmask of `LIBRAW_RAWOPTIONS_*` (below) | `LIBRAW_RAWOPTIONS_CONVERTFLOAT_TO_INT` (2) |
| `shot_select` | unsigned | Frame index in multi-frame files (`idata.raw_count`) | 0 |
| `specials` | unsigned | `LIBRAW_RAWSPECIAL_SONYARW2_*` (posterisation handling), `_NODP2Q_INTERPOLATERG/_INTERPOLATEAF` | 0 |
| `max_raw_memory_mb` | unsigned | Refuse files needing more than this (`LIBRAW_TOO_BIG`) | 2048 |
| `sony_arw2_posterization_thr` | int | Sony ARW2 posterisation threshold | 0 |
| `coolscan_nef_gamma` | float | Nikon Coolscan gamma | 1.0 |
| `p4shot_order[5]` | char | Pentax 4-shot frame order | "3102" |
| `custom_camera_strings` | char** | Extra camera table entries (dcraw format) | NULL |

### `LIBRAW_RAWOPTIONS_*` bits (0.21.5 header; 0.22 adds `ALLOW_JPEGXL_PREVIEWS`, `DNG_STAGE23_IFPRESENT_JPGJXL`)

| Bit | Effect |
|---|---|
| `PENTAX_PS_ALLFRAMES` | Pentax pixel shift: keep all frames |
| `CONVERTFLOAT_TO_INT` | Convert float raw to int on unpack |
| `ARQ_SKIP_CHANNEL_SWAP` | Sony ARQ |
| `NO_ROTATE_FOR_KODAK_THUMBNAILS` | |
| `USE_PPM16_THUMBS` | 16-bit bitmap thumbnails |
| `DONT_CHECK_DNG_ILLUMINANT` | |
| `DNGSDK_ZEROCOPY` | |
| `ZEROFILTERS_FOR_MONOCHROMETIFFS` | |
| `DNG_ADD_ENHANCED` / `DNG_ADD_PREVIEWS` / `DNG_PREFER_LARGEST_IMAGE` / `DNG_ADD_MASKS` | Which DNG sub-images become selectable via `shot_select` |
| `DNG_STAGE2` / `DNG_STAGE3` / `DNG_STAGE2_IFPRESENT` / `DNG_STAGE3_IFPRESENT` | Apply DNG opcode lists 2/3 (needs DNG SDK for full support) |
| `DNG_ALLOWSIZECHANGE` / `DNG_DISABLEWBADJUST` | |
| `PROVIDE_NONSTANDARD_WB` | Fill `WB_Coeffs` for non-standard illuminants |
| `CAMERAWB_FALLBACK_TO_DAYLIGHT` | If as-shot WB is missing, use daylight instead of failing |
| `CHECK_THUMBNAILS_KNOWN_VENDORS` / `CHECK_THUMBNAILS_ALL_VENDORS` | Validate thumbnail entries during parse (costs a few reads; fixes wrong sizes in `thumbs_list`) |
| `CANON_IGNORE_MAKERNOTES_ROTATION` | |
| `CANON_CHECK_CAMERA_AUTO_ROTATION_MODE` | (missing from the original table above; present in the vendored 0.22.2 header) |

## Thumbnails (`imgdata.thumbs_list`, `libraw_thumbnail_list_t`, 0.21+)

```
int thumbcount;                                   // ≤ LIBRAW_THUMBNAIL_MAXCOUNT (8)
libraw_thumbnail_item_t thumblist[8] {
  enum LibRaw_internal_thumbnail_formats tformat; // LIBRAW_INTERNAL_THUMBNAIL_JPEG, _PPM, _PPM16, _X3F, _KODAK_*, _ROLLEI, _H265, _JPEGXL ...
  ushort twidth, theight, tflip;                  // may be 0 / 0xffff if unknown (use CHECK_THUMBNAILS_* to fix)
  unsigned tlength;                               // bytes on disk
  unsigned tmisc;                                 // (colors << 5) | bits
  INT64 toffset;                                  // file offset
}
```

`unpack_thumb()` = `unpack_thumb_ex(default index)`; after unpacking, `imgdata.thumbnail` holds
`{tformat (LIBRAW_THUMBNAIL_JPEG=1, BITMAP=2, BITMAP16=3, LAYER=4, ROLLEI=5, H265=6, JPEGXL in 0.22),
twidth, theight, tlength, tcolors, thumb}`. `dcraw_make_mem_thumb()` returns the JPEG bytes unchanged
(type `LIBRAW_IMAGE_JPEG`) or a bitmap; 0.22 decodes H.265 and JPEG-XL thumbnails there when the
matching libraries are compiled in. Selection strategy for a viewer: pick the smallest entry whose long
edge ≥ requested size, else the largest.

## Capabilities (`LibRaw::capabilities()`)

`LIBRAW_CAPS_RAWSPEED`, `_DNGSDK`, `_GPRSDK`, `_UNICODEPATHS`, `_X3FTOOLS`, `_RPI6BY9`, `_ZLIB`, `_JPEG`,
`_RAWSPEED3`, `_RAWSPEED_BITS` (`enum LibRaw_runtime_capabilities`, `libraw_const.h`).

**T13 correction:** this section originally said "a binding should export these as booleans"; the binding
instead exports `capabilityNames()` (short names of the set bits, e.g. `['ZLIB', 'JPEG']`) plus the full
`enums.CAPS` forward/reverse table (`scripts/gen-enums.js` → `api/enums.json` →
`lib/generated/libraw-enums.cjs`) — see `README.md`'s "Enums and flags" section. A caller can still get a
boolean for one flag with `capabilities() & enums.CAPS.NAME_TO_VALUE.JPEG` (or check `capabilityNames()`
with `.includes('JPEG')`); the array form additionally reports flags this doc doesn't enumerate, without
the binding needing to know their names ahead of time.

## Warnings (`imgdata.process_warnings`, `LIBRAW_WARN_*`)

`BAD_CAMERA_WB`, `NO_METADATA`, `NO_JPEGLIB`, `NO_EMBEDDED_PROFILE`, `NO_INPUT_PROFILE`, `BAD_OUTPUT_PROFILE`,
`NO_BADPIXELMAP`, `BAD_DARKFRAME_FILE`, `BAD_DARKFRAME_DIM`, `RAWSPEED_PROBLEM`,
`RAWSPEED_UNSUPPORTED`, `RAWSPEED_PROCESSED`, `FALLBACK_TO_AHD`, `PARSEFUJI_PROCESSED`, `DNGSDK_PROCESSED`,
`DNG_IMAGES_REORDERED`, `DNG_STAGE2_APPLIED`, `DNG_STAGE3_APPLIED`, `RAWSPEED3_PROBLEM`,
`RAWSPEED3_UNSUPPORTED`, `RAWSPEED3_PROCESSED`, `RAWSPEED3_NOTLISTED`, `VENDOR_CROP_SUGGESTED`,
`DNG_NOT_PROCESSED`, `DNG_NOT_PARSED` (`enum LibRaw_warnings`, `libraw_const.h`; `NONE = 0` also exists but
never appears in a decoded `warnings` array — see below). Exposed as a string array.

**T13 correction:** this section previously listed `NO_JASPER` among the warnings; `enum LibRaw_warnings`
in the vendored 0.22.2 `libraw_const.h` has no such enumerator (JasPer/JPEG2000 support was dropped from
upstream LibRaw before this vendored version). `scripts/gen-enums.js`'s output (`api/enums.json`) is the
source of truth for the exact, versioned list going forward.

`decode()`/`identify()`'s `warnings` array (`src/enums.h`/`src/enums.cc`, generated by
`scripts/gen-enums.js`) reports the *short* name of each set bit (the enumerator name with the
`LIBRAW_WARN_` prefix stripped, e.g. `LIBRAW_WARN_FALLBACK_TO_AHD` → `'FALLBACK_TO_AHD'`), not the full
`LIBRAW_WARN_*` identifier. `warningNames(mask)` (module-level helper) and `enums.WARN` (the full
forward/reverse table) use the same short names — see `README.md`.

## Options (`LIBRAW_OPTIONS_*`, constructor flag)

`LibRaw(unsigned flags)`: `LIBRAW_OPTIONS_NO_DATAERR_CALLBACK` disables the data-error callback. lightdrift
1.0.0 passes a flags number to the constructor; keep that.
