# Where photoview would gain: more options, more speed

> **Design history:** written before implementation; see [README](../../README.md) / the generated reference docs for the shipped API.

Ordered by expected payoff for a photo viewer. Numbers refer to the 16 MP DNG in the 2026-07-20 benchmark
([photoview-usage.md](photoview-usage.md)). Estimates marked "expected" are not yet measured; the roadmap
puts a benchmark gate before each.

## 1. Stop unpacking when only metadata or a thumbnail is needed

Expose `open` and `unpack` separately (or a single-call `identify(buffer)` and `thumbnail(buffer, i)`).

- Thumbnail / preview path: 378 ms → expected 20–60 ms (JPEG extraction + sharp resize).
- Each metadata plugin: ~350 ms → expected 2–10 ms (`open_buffer` parses headers only).
- Grid view of 100 RAWs: from ~40 s of pure unpack to ~2–5 s, before any caching.

This is the single largest win and needs no new LibRaw feature. It only needs a binding that does not fuse
`open_buffer + unpack`.

## 2. Pick the right embedded preview via `thumbs_list`

Most cameras embed two or three previews (a ~160 px EXIF thumbnail, a ~1–2 MP preview, often a full-size
JPEG). `unpack_thumb()` takes the default (largest usable). For the 400 px `thumbnail` size, decoding a
6000 px embedded JPEG then resizing wastes ~100+ ms in sharp; picking the ~1.5 MP entry from
`imgdata.thumbs_list` and, for `preview`, the entry closest above the screen target, cuts that. LibRaw 0.21+
lists them; 0.22 additionally handles H.265 (Canon) and JPEG-XL thumbnails in `dcraw_make_mem_thumb`.

## 3. `half_size` as the "preview" tier for RAWs without a usable preview

`params.half_size = 1` makes LibRaw bin each 2×2 Bayer block into one RGB pixel during `raw2image` and
**skip demosaic entirely** (dcraw documents `-h` as "twice as fast as `-q 0`", and `-q 0` is itself the
fastest interpolation). On the 16 MP DNG, expected `dcraw_process` time drops from ~550 ms to roughly
100–200 ms, and the output is 4 MP, which is at or above screen resolution for most displays. Unpack cost
(~350 ms) stays. This gives a real "fast preview" tier that lightdrift alpha lacks; lightdrift 1.0.0's
`setOutputParams({ half_size: true })` also offers it.

## 4. Choose the demosaic and quality knobs per tier

`user_qual`: 0 linear (fastest), 1 VNG, 2 PPG, 3 AHD (LibRaw default), 4 DCB, 11 DHT, 12 modified AHD.
For the `full` size at screen resolution (the image is downscaled anyway), `user_qual = 0` or `2` is
visually indistinguishable after resize and 2–4x faster than AHD. Also worth exposing: `use_camera_wb`,
`no_auto_bright` / `auto_bright_thr`, `highlight` (0 clip vs 2 blend), `output_bps` (16-bit for an HDR
pipeline later), `user_flip`, `output_color`, `fbdd_noiserd`, `threshold`, `exp_correc/exp_shift`,
`cropbox` (crop before scale, e.g. for zoom-to-region), `greybox` (WB from region), `four_color_rgb`,
`med_passes`, `dcb_iterations`, `no_interpolation` (raw mosaic out), `adjust_maximum_thr`, `user_black/user_sat`.
Full table: [reference/libraw-output-params.md](../reference/libraw-output-params.md).

## 5. Real off-thread decode with cancellation

With `Napi::AsyncWorker`, each worker thread's JS loop stays free while LibRaw runs, so a worker can receive
"cancel this path" messages and call `setCancelFlag()` on the running instance. LibRaw checks the flag inside
its decoders and demosaic loops and aborts with `LIBRAW_CANCELLED_BY_CALLBACK`. Today a superseded decode
runs to completion (photoview's pool only drops the result). Expected effect: faster response when
flicking through a folder, fewer wasted CPU seconds; no change to single-image latency.

Design note: doing `open → unpack → process → copy` in **one** AsyncWorker per request (with all options
passed up front) avoids four thread hops and keeps the LibRaw object off the JS thread entirely. Keep a
staged API too for advanced users.

## 6. Fewer copies on the way out

lightdrift copies pixels twice (`dcraw_make_mem_image` allocates and copies, then `Napi::Buffer::Copy`
copies again; 1.0.0 adds a third structured-clone copy across its per-instance worker). The binding can
allocate the output `Napi::Buffer` on the JS thread before the worker starts and have LibRaw's
`copy_mem_image(ptr, stride, bgr)` write straight into it: one copy. For a 16 MP 8-bit RGB image that is
48 MB less memory traffic per decode. Electron's V8 sandbox forbids wrapping external memory, so "zero copy"
is not available, but "one copy" is (see [electron-compatibility.md](electron-compatibility.md)).

## 7. Parallelism inside a single decode (OpenMP)

**Status today:** on Linux photoview already gets this, because Ubuntu's `libraw_r.so` is built with
libgomp (checked with `ldd` on 2026-09-03). The ~550 ms `dcraw_process` in the benchmark is therefore
already the parallel AHD number on this machine; single-threaded AHD would be slower. macOS (Homebrew
libraw) and Windows (lightdrift's bundled 0.21.4 DLL) need checking with `capabilities()`/thread
observation. Consequence: a vendored build **without** OpenMP (lightdrift 1.0.0, or the new binding's v1)
would regress the `full` tier on Linux; OpenMP moves from "nice to have" to "parity".

LibRaw's PPG and AHD demosaic (and DHT/AAHD) contain OpenMP pragmas; VNG does not. Compiled with `-fopenmp`,
a single AHD demosaic scales across cores (expected 2–4x on the demosaic stage on a 6–8 core machine; unpack
stays single-threaded). Cost: shipping an OpenMP runtime statically per platform (libgomp on Linux, libomp
on macOS via Homebrew, vcomp/libomp on Windows). Because photoview already runs 2–6 decodes in parallel via
its worker pool, OpenMP mainly helps the *latency* of the one photo the user is looking at, at the expense
of throughput fairness. Worth it for the `full` tier; schedule after the items above and gate on a benchmark.

## 8. Format coverage

- Vendoring LibRaw 0.22.2 adds ~1284 cameras vs 0.21.5 (Canon R1/R5 II, Nikon Z6 III/Z8/Zf, Sony A9 III,
  Fuji X-T50/GFX 100S II, ...).
- Linking libjpeg-turbo adds lossy-compressed DNG (phones, Lightroom "lossy DNG") which lightdrift 1.0.0
  lacks. Check `LibRaw::capabilities() & LIBRAW_CAPS_JPEG` at runtime and expose it.
- `rawparams.shot_select` selects a frame in multi-frame files (Pentax pixel shift, Sony ARQ, dual-pixel
  Canon); `rawparams.options` bits control DNG stage 2/3 opcodes, thumbnail vendor checks, JPEG-XL previews.

## 9. Robustness

- `rawparams.max_raw_memory_mb` (default 2048) bounds allocations on malformed files.
- `LibRaw::error_count()` and `imgdata.process_warnings` bits (e.g. `LIBRAW_WARN_FALLBACK_TO_AHD`,
  `LIBRAW_WARN_NO_JPEGLIB`) should surface as a `warnings` array so silent degradations are visible.
- `set_dataerror_handler` reports truncated/corrupt data; expose as an event or a result field.

## What does not get faster

- The unpack stage (Canon CR3 CRX, Fuji compressed, Nikon HE) is single-threaded in LibRaw. Only
  RawSpeed (out of scope) or hardware paths would change that.
- Very small thumbnails from RAWs without an embedded preview still need a full unpack; cache them (photoview
  already does on disk).
