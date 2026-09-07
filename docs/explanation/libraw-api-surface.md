# The LibRaw API surface and processing pipeline

This is the conceptual map; exact lists live in the reference section
([methods](../reference/libraw-processing-methods.md),
[output params](../reference/libraw-output-params.md),
[raw params, thumbnails, flags](../reference/libraw-raw-params-thumbnails-flags.md)).

## One object, one file, one state machine

Everything hangs off a `LibRaw` object whose public data member `imgdata` (type `libraw_data_t`) holds all
inputs (`params`, `rawparams`), all parsed metadata, and all pixel buffers. Methods advance the object
through states; calling them out of order returns `LIBRAW_OUT_OF_ORDER_CALL` (the "Out of order call of
libraw function" photoview hit when calling `unpackThumbnail()` twice).

```
new LibRaw()
  └─ open_file / open_buffer        → identified   (metadata, sizes, thumbs_list filled)
       ├─ unpack_thumb / unpack_thumb_ex(i) → thumbnail   (imgdata.thumbnail)
       │     └─ dcraw_make_mem_thumb / dcraw_thumb_writer
       └─ unpack                    → unpacked     (imgdata.rawdata mosaic)
            └─ raw2image | raw2image_ex   (copy mosaic into imgdata.image, optional black subtract)
                 └─ dcraw_process   → processed    (RGB in imgdata.image)
                      └─ dcraw_make_mem_image / copy_mem_image / dcraw_ppm_tiff_writer
  recycle()  → back to fresh (keeps the object, frees buffers); free_image() frees only imgdata.image
```

`dcraw_process()` calls `raw2image_ex()` itself if needed, so the minimal full decode is
`open → unpack → dcraw_process → dcraw_make_mem_image`. lightdrift's alpha `loadBuffer()` fuses `open_buffer +
unpack`, which is why photoview pays a full unpack even for metadata-only and thumbnail-only calls (see
[photoview-usage.md](photoview-usage.md)).

You can re-run `dcraw_process()` with different `params` on the same unpacked data (the `multirender_test`
sample does exactly this) — useful for "render preview, then render final" without re-parsing.

## The five groups of the surface

1. **Input**: `open_file` (char and wchar_t on Windows), `open_buffer`, `open_datastream` (custom stream
   subclass, not sensible over N-API), `open_bayer` (raw mosaic from memory with a description, for
   unusual sources).
2. **Decode**: `unpack`, `unpack_thumb`, `unpack_thumb_ex`, `thumbOK(maxsize)` (is there a usable thumbnail
   under this size?), `raw2image`, `raw2image_ex`, `adjust_sizes_info_only` (compute final `sizes` incl.
   flip without decoding), `subtract_black`, `adjust_maximum`, `convertFloatToInt`.
3. **Postprocess and output**: `dcraw_process`, `dcraw_make_mem_image`, `dcraw_make_mem_thumb`,
   `get_mem_image_format`, `copy_mem_image(scan0, stride, bgr)`, `dcraw_ppm_tiff_writer`,
   `dcraw_thumb_writer`, `dcraw_clear_mem`.
4. **Control**: `imgdata.params` (postprocessing knobs), `imgdata.rawparams` (decode knobs, 0.21+),
   `set_progress_handler` (called between stages; returning non-zero cancels), `setCancelFlag` /
   `clearCancelFlag` (checked inside long loops, raises `LIBRAW_CANCELLED_BY_CALLBACK`),
   `set_dataerror_handler`, `set_exifparser_handler` (callback for every EXIF/MakerNote tag while parsing,
   the hook for "give me all tags").
5. **Static info**: `version`, `versionNumber`, `capabilities` (bitmask: ZLIB, JPEG, RAWSPEED, DNGSDK, ...),
   `cameraList`, `cameraCount`, `strerror`, `strprogress`.

## The metadata you get after `open_*` (no unpack needed)

All in `imgdata`:

- `idata`: make, model, normalized_make/model, software, raw_count (frames in file), dng_version,
  is_foveon, colors, filters (CFA pattern), xtrans pattern, cdesc.
- `sizes`: raw_width/height, width/height (after crop), top/left margin, iwidth/iheight (output after
  half_size), pixel_aspect, flip (orientation from file), raw_inset_crops.
- `other`: iso_speed, shutter, aperture, focal_len, timestamp, shot_order, gpsdata + parsed_gps, desc,
  artist, FlashEC, analogbalance.
- `lens`: MinFocal, MaxFocal, MaxAp4MinFocal, MaxAp4MaxFocal, EXIF_MaxAp, LensMake, Lens, LensSerial,
  InternalLensSerial, FocalLengthIn35mmFormat, nikon/dng/makernotes sub-structs.
- `color`: black, cblack[], maximum, data_maximum, cam_mul (as-shot WB), pre_mul, cmatrix, rgb_cam,
  cam_xyz, WB_Coeffs[256][4] (per-illuminant WB presets), embedded ICC `profile`, dng_color/dng_levels.
- `makernotes`: canon, nikon, sony, fuji, olympus, panasonic, pentax, samsung, kodak, p1, hasselblad,
  ricoh, common (CameraTemperature, exposure calibration shifts, ...).
- `thumbs_list`: up to 8 (`LIBRAW_THUMBNAIL_MAXCOUNT`) entries of {tformat, twidth, theight, tflip,
  tlength, tmisc, toffset}. `unpack_thumb()` picks the default (largest usable); `unpack_thumb_ex(i)` picks
  one.

lightdrift alpha.6 exposes a thin slice of this (`getMetadata`, `getImageSize`, `getLensInfo`,
`getAdvancedMetadata`, `getColorInfo`). lightdrift 1.0.0 claims a "camelCase mirror of the complete safe
LibRaw 0.22.2 public surface". A new binding should generate the mirror from the header (see
[how-to: expose options](../how-to/set-processing-options.md)).

## What costs time

Measured in photoview on a 16 MP Pentax DNG (`IMGP5127.DNG`, benchmark run 2026-07-20, see
[photoview-usage.md](photoview-usage.md)):

| Step | ms (median) | Notes |
|---|---|---|
| `open_buffer + unpack` (lightdrift `loadBuffer`) | ~350 | Paid by *every* lightdrift call path, even thumbnail and metadata |
| `dcraw_process` + `dcraw_make_mem_image` + Buffer copy | ~550–600 | Default AHD demosaic, single-threaded |
| sharp resize + JPEG encode of the RGB buffer | ~170 | Not LibRaw |
| Embedded-thumbnail extraction proper | ~10–30 | Hidden inside the 375 ms "decode-preview" span, the rest is the wasted unpack |

The three levers a binding controls: (1) don't unpack when you don't need pixels, (2) `half_size` (skips
demosaic, quarter the pixels), (3) OpenMP for AHD/PPG/DHT, plus running several instances in parallel.
