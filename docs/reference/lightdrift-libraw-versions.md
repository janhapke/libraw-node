# lightdrift-libraw: alpha.6 (installed in photoview) vs 1.0.0 (npm `latest`)

> **Design history:** written before implementation; see [README](../../README.md) / the generated reference docs for the shipped API.

| Aspect | 1.0.0-alpha.6 (2026-01-06) | 1.0.0 (2026-08-15) |
|---|---|---|
| LibRaw | System `libraw-dev` on Linux/macOS (0.21.5 here); bundled 0.21.4 DLL on Windows | Vendored 0.22.2 source compiled into the addon, `USE_ZLIB` only (no libjpeg, no LCMS, no OpenMP) |
| Build | `node-gyp rebuild` at install; `-lraw` | `node-gyp-build || node-gyp rebuild`; prebuilds via `prebuildify --napi --strip --target 24.0.0` bundled in the tarball for linux-x64/arm64, darwin-x64/arm64, win32-x64 (built on native GitHub runners) |
| Native threading | None (synchronous) | None in C++ (synchronous); JS spawns one `worker_threads` Worker per `LibRaw` instance (`lib/stable/processor-worker.ts`) |
| Async API | Promise wrappers around sync calls | Promises resolved from the per-instance worker via `postMessage` (structured clone) |
| Cancellation | `setCancelFlag()`/`clearCancelFlag()` only | `AbortSignal` → `SharedArrayBuffer` `Int32Array` polled in LibRaw's progress callback; queued jobs rejected with `LibRawError` code `ABORT_ERR` |
| Pixel buffers | `Napi::Buffer::Copy` (1 copy) + `dcraw_make_mem_image` alloc (2 copies) | Same + structured clone across the worker (3 copies) |
| `loadBuffer` / `loadFile` | `open_buffer` **and** `unpack()` fused | Low-level mirror exposes `openFile/openBuffer` and `unpack` separately; whether the high-level helpers still fuse them is not verified here |
| `setOutputParams` keys | `gamma`, `bright`, `output_color`, `output_bps`, `user_mul`, `no_auto_bright`, `highlight`, `output_tiff` | `bright, threshold, highlight, auto_bright_thr, adjust_maximum_thr, exp_shift, exp_preser, user_black, user_sat, user_qual, user_flip, output_color, output_bps, dcb_iterations, fbdd_noiserd, med_passes, half_size, four_color_rgb, use_auto_wb, use_camera_wb, use_camera_matrix, output_tiff, no_auto_bright, use_fuji_rotate, use_p1_correction, green_matching, dcb_enhance_fl, exp_correc, no_auto_scale, no_interpolation, gamma[6], greybox[4], cropbox[4], aber[4], user_mul[4], user_cblack[4], output_profile, camera_profile, bad_pixels, dark_frame` |
| `rawparams` | Not exposed | Not exposed |
| Thumbnails | `unpackThumbnail`, `createMemoryThumbnail`, `isJPEGThumb`, `thumbOK(maxSize)`, `createThumbnailJPEGBuffer` (sharp) | Adds `unpackThumbnailEx(index)`; no `thumbs_list` |
| Metadata | `getMetadata`, `getImageSize`, `getAdvancedMetadata`, `getLensInfo`, `getColorInfo` | Claims a camelCase mirror of the "complete safe" 0.22.2 surface; `api/libraw-0.22.2.json` is the manifest; excluded: `open_datastream`, `get_internal_data_pointer`, `set_dng_host`, `output_params_ptr`, `dcraw_clear_mem`, `set_rawspeed_camerafile` |
| Events | none | `progress`, `dataError`, `exifTag`, `makerNote` (drained after each call) |
| `sharp` | Dependency `^0.33.5`, used by every `create*Buffer` | Dependency `^0.35.3`, same role |
| Types | `lib/index.d.ts` declares `module 'libraw'` (broken) | `dist/index.d.ts`, ESM + CJS exports, `./legacy` entry |
| Node | ≥ 14 | 22 or 24 only (`NAPI_VERSION=8`) |
| Electron | Not mentioned; photoview found `createJPEGBuffer` crashes under Electron/Linux via nested sharp | "Electron 36 can load the same Node-API prebuild ... no `@electron/rebuild`"; CI job on Windows with Electron 36.9.5 |
| Worker threads | Works because `NODE_API_MODULE` is context-aware; static `constructor` reference | beta.1 "context-aware N-API initialization per worker"; docs recommend one instance per task |
| Licence | MIT (LibRaw's licence not addressed) | MIT + `THIRD_PARTY_NOTICES.md` for LibRaw/zlib |

## alpha.6 methods photoview calls

`new LibRaw()`, `loadBuffer`, `close`, `isJPEGThumb`, `createThumbnailJPEGBuffer`, `raw2Image`,
`processImage`, `createMemoryImage`, `getMetadata`, `getImageSize`, `getLensInfo`. Everything else in the
~50-method surface is unused.

## alpha.6 native method list (`src/libraw_wrapper.cpp`)

loadFile, loadBuffer, close, getLastError, strerror, getMetadata, getImageSize, getAdvancedMetadata,
getLensInfo, getColorInfo, unpackThumbnail, processImage, subtractBlack, raw2Image, adjustMaximum,
createMemoryImage, createMemoryThumbnail, writePPM, writeTIFF, writeThumbnail, setOutputParams,
getOutputParams, isFloatingPoint, isFujiRotated, isSRAW, isJPEGThumb, errorCount, isNikonSRAW,
isCoolscanNEF, haveFPData, srawMidpoint, thumbOK, unpackFunctionName, getDecoderInfo, unpack, raw2ImageEx,
adjustSizesInfoOnly, freeImage, convertFloatToInt, getMemImageFormat, copyMemImage, getColorAt,
setCancelFlag, clearCancelFlag, version, versionNumber; static getVersion, getCapabilities, getCameraList,
getCameraCount. JS-only (sharp-based): createJPEGBuffer, createPNGBuffer, createTIFFBuffer, createWebPBuffer,
createAVIFBuffer, createPPMBuffer, createThumbnailJPEGBuffer, convertToJPEG, batchConvertToJPEG,
getOptimalJPEGSettings, convertToJPEGFast, convertToJPEGMultiSize, batchConvertToJPEGParallel.
