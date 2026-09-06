# LibRaw processing methods (C++ API surface)

Public methods of `class LibRaw` as declared in `libraw/libraw.h` (0.21.5 headers on this machine; 0.22
adds no removals relevant here). Return type `int` means a `LIBRAW_*` error code (`LIBRAW_SUCCESS` = 0).

> **Correction (T06, checked against the vendored 0.22.2 `libraw/libraw_const.h`):** every non-success
> `LibRaw_errors` enumerator is negative, not just a "fatal" subset -- `LIBRAW_UNSPECIFIED_ERROR` (-1)
> through `LIBRAW_REQUEST_FOR_NONEXISTENT_THUMBNAIL` (-9), then `LIBRAW_UNSUFFICIENT_MEMORY` (-100007)
> through `LIBRAW_MEMPOOL_OVERFLOW` (-100013). There is no positive/errno-style range in this enum
> (`LIBRAW_FILE_UNSUPPORTED`, `LIBRAW_REQUEST_FOR_NONEXISTENT_IMAGE`, `LIBRAW_OUT_OF_ORDER_CALL`,
> `LIBRAW_NO_THUMBNAIL`, `LIBRAW_UNSUPPORTED_THUMBNAIL`, `LIBRAW_INPUT_CLOSED`, `LIBRAW_NOT_IMPLEMENTED` are
> all negative too, just closer to zero). "Fatal" is instead a distinct, narrower notion the header defines
> via `#define LIBRAW_FATAL_ERROR(ec) ((ec) < -100000)` -- true only for the `-100007..-100013` group
> above, false for `-1..-9` despite those also being negative. `scripts/gen-errors.js` (T06) generates the
> full name/value table from this header for both the C++ and JS sides, so the binding's error names never
> drift from it regardless of this prose.

## Input

| Method | Purpose | Binding note |
|---|---|---|
| `int open_file(const char*)` / `(const wchar_t*)` (Windows) | Open by path, parse metadata | Expose; use wide path on Windows |
| `int open_buffer(const void*, size_t)` | Open from memory | Primary path for photoview; buffer must stay valid until `recycle()` |
| `int open_datastream(LibRaw_abstract_datastream*)` | Custom stream | Skip (pointer ownership) |
| `int open_bayer(uchar* data, unsigned datalen, ushort raw_w, raw_h, left/top/right/bottom margins, uchar procflags, bayer_pattern, unsigned unused_bits, otherflags, black_level)` | Raw mosaic from memory | Optional, later |
| `void recycle_datastream()` | Close the input, keep parsed data | Expose (`close input` early) |

## Decode

| Method | Purpose |
|---|---|
| `int unpack()` | Decode mosaic into `imgdata.rawdata` (expensive) |
| `int unpack_thumb()` | Default thumbnail → `imgdata.thumbnail` |
| `int unpack_thumb_ex(int i)` | Thumbnail `i` of `imgdata.thumbs_list` |
| `int thumbOK(INT64 maxsz = -1)` | 1 if a JPEG/bitmap thumbnail is present (and ≤ `maxsz` bytes), 0 otherwise, negative on error |
| `int adjust_sizes_info_only()` | Fill `sizes.iwidth/iheight` and flip without decoding |
| `int raw2image()` / `int raw2image_ex(int do_subtract_black)` | Copy mosaic into `imgdata.image` (4 × ushort per pixel), honour `half_size`, optional black subtraction |
| `void raw2image_start()` / `void free_image()` | Internals / free `imgdata.image` |
| `int subtract_black()` / `int adjust_maximum()` | Explicit steps normally done by `dcraw_process` |
| `int adjust_to_raw_inset_crop(unsigned mask, float maxcrop = 0.55f)` | Apply the camera's recommended crop |
| `void convertFloatToInt(float dmin, dmax, dtarget)` | For float DNG |
| `int selectCRXTrack()` (0.21+) | Choose track in Canon CR3 with multiple |

## Postprocess and output

| Method | Purpose |
|---|---|
| `int dcraw_process()` | Full postprocessing per `imgdata.params` |
| `libraw_processed_image_t* dcraw_make_mem_image(int* errcode = NULL)` | Allocate + fill RGB (8/16-bit, `output_bps`), `colors` 1 or 3; free with `dcraw_clear_mem` |
| `libraw_processed_image_t* dcraw_make_mem_thumb(int* errcode = NULL)` | Thumbnail as JPEG bytes (`LIBRAW_IMAGE_JPEG`) or bitmap |
| `void get_mem_image_format(int* width, int* height, int* colors, int* bps)` | Size of the processed image before copying |
| `int copy_mem_image(void* scan0, int stride, int bgr)` | Write processed pixels into caller memory (this is the one-copy path) |
| `int dcraw_ppm_tiff_writer(const char*)` / `int dcraw_thumb_writer(const char*)` | Write files (PPM/TIFF, JPEG/PPM thumb) |
| `static void dcraw_clear_mem(libraw_processed_image_t*)` | Free |

`libraw_processed_image_t`: `type` (`LIBRAW_IMAGE_JPEG`=1 / `LIBRAW_IMAGE_BITMAP`=2, per `libraw_const.h`), `height`, `width`,
`colors`, `bits`, `data_size`, `data[]`.

## Control and callbacks

| Method | Purpose |
|---|---|
| `imgdata.params` | see [output params](libraw-output-params.md) |
| `imgdata.rawparams` | see [raw params](libraw-raw-params-thumbnails-flags.md) |
| `void set_progress_handler(progress_callback, void*)` | `int cb(void* data, enum LibRaw_progress stage, int iteration, int expected)`; return non-zero to cancel |
| `void setCancelFlag()` / `void clearCancelFlag()` | Atomic flag checked in decoders/demosaic; abort → `LIBRAW_CANCELLED_BY_CALLBACK` |
| `void set_dataerror_handler(data_callback, void*)` | Called on truncated/corrupt data |
| `void set_exifparser_handler(exif_parser_callback, void*)` | Called per EXIF/MakerNote tag during parse (tag, type, len, ordering, stream) |
| `void set_memerror_handler(...)` | Present in older versions; 0.21 removed the exception-based memory handler |
| `int error_count()` | Non-fatal data errors seen so far |
| `void recycle()` | Free everything, keep the object |

## Introspection

| Method | Purpose |
|---|---|
| `int is_fuji_rotated()`, `is_sraw()`, `sraw_midpoint()`, `is_nikon_sraw()`, `is_coolscan_nef()`, `is_jpeg_thumb()`, `is_floating_point()`, `have_fpdata()` | Format traits |
| `int COLOR(int row, int col)`, `FC(row,col)`, `fcol(row,col)` | CFA colour at a position |
| `const char* unpack_function_name()` | Which decoder is active |
| `int get_decoder_info(libraw_decoder_info_t*)` | `decoder_name`, `decoder_flags` (e.g. `LIBRAW_DECODER_HASCURVE`, `_3CHANNEL`, `_SINAR4SHOT`, `_FLATDATA`, `_FLAT_BG2_SWAPPED`, `_UNSUPPORTED_FORMAT`, `_NOTSET`, `_TRYRAWSPEED3`) |
| `static const char* version()`, `static int versionNumber()` | e.g. "0.22.2-Release", 0x001602 |
| `static unsigned capabilities()` | `LIBRAW_CAPS_RAWSPEED`, `DNGSDK`, `GPRSDK`, `UNICODEPATHS`, `X3FTOOLS`, `RPI6BY9`, `ZLIB`, `JPEG`, `RAWSPEED3`, `RAWSPEED_BITS` |
| `static const char** cameraList()`, `static int cameraCount()` | Supported camera names |
| `static const char* strerror(int)`, `static const char* strprogress(enum LibRaw_progress)` | Text |

## Progress stages (`enum LibRaw_progress`)

`LIBRAW_PROGRESS_START, OPEN_FILE, IDENTIFY, SIZE_ADJUST, LOAD_RAW, RAW2_IMAGE, REMOVE_ZEROES, BAD_PIXELS,
DARK_FRAME, FOVEON_INTERPOLATE, SCALE_COLORS, PRE_INTERPOLATE, INTERPOLATE, MIX_GREEN, MEDIAN_FILTER,
HIGHLIGHTS, FUJI_ROTATE, FLIP, APPLY_PROFILE, CONVERT_RGB, STRETCH, ..., THUMB_LOAD, TREADY, THUMB_MASK, ...`.
The progress callback fires between these stages, not continuously; a binding can use it for an ordered
stage log and for cancellation, not for a percentage bar.
