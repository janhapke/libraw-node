# How to migrate photoview from lightdrift-libraw 1.0.0-alpha.6 to 1.0.0 (spec input)

Copy of the instruction set handed to the photoview JDD session on 2026-09-03. See the chat transcript of
that date for the version sent; this file is the canonical copy. Facts about 1.0.0 come from its `master`
source (`lib/stable/index.ts`, `lib/stable/metadata.ts`, `src/libraw_wrapper.cpp`, `binding.gyp`,
`docs/API.md`) and are marked "verify" where the running package must confirm them.

---

## Instructions for the photoview spec

### 0. Goal and non-goals

Upgrade `lightdrift-libraw` from `1.0.0-alpha.6` to `1.0.0` so that photoview (a) needs no system
`libraw-dev` and no `electron-rebuild` for this module, (b) stops decoding the full RAW mosaic for
thumbnail and metadata requests, (c) gets a real preview tier via `half_size` for RAWs without a usable
embedded preview, (d) renders full decodes with camera white balance and tier-appropriate demosaic
settings, and (e) can cancel superseded RAW decodes. Everything is measured with the existing benchmark
harness before and after. Non-goals: replacing `sharp` for resize/encode, `thumbs_list` selection
(1.0.0 does not expose it), 16-bit output, OpenMP, Windows arm64.

### 1. Facts about 1.0.0 the implementation relies on (verify each in the session first)

- Package: `lightdrift-libraw@1.0.0`, `engines: node ^22 || ^24`, Node-API prebuilds bundled in the
  tarball under `prebuilds/{linux-x64,linux-arm64,darwin-x64,darwin-arm64,win32-x64}`, loaded by
  `node-gyp-build`; `install` script is `node-gyp-build || node-gyp rebuild` (source fallback only when no
  prebuild matches). Vendored LibRaw 0.22.2 + zlib; **no libjpeg, no LCMS2, no OpenMP** in that build.
  Verify: `LibRaw.capabilities()` after install: bit 6 (64) ZLIB must be set, bit 7 (128) JPEG will be unset.
- Entry: `import { LibRaw } from 'lightdrift-libraw'` (named and default export, ESM + CJS, real
  `.d.ts`). A `lightdrift-libraw/legacy` entry mirrors the alpha API; do not use it.
- Threading: each `new LibRaw()` spawns one `worker_threads` Worker (`dist/processor-worker.cjs`) that
  loads the native addon; every method returns a Promise resolved from that worker; results cross via
  `postMessage` (copied). One in-flight operation per instance (internal FIFO). `close()` terminates the
  worker; the instance cannot be reused afterwards. `recycle()` frees image data and keeps the instance
  usable. Constructor: `new LibRaw({ flags?: number })`.
- Loading: `openBuffer(Uint8Array, { signal? })` and `loadBuffer(...)` both exist; per `docs/API.md`
  "loading does not automatically unpack". **Verify** by timing `openBuffer` on a 16 MP DNG (expect
  single-digit ms) and by checking that `getMetadata()` works after `openBuffer` alone. If `loadBuffer`
  turns out to unpack, use `openBuffer` everywhere.
- Explicit stages: `unpack()`, `unpackThumb()`, `unpackThumbEx(index)`, `dcrawProcess()` (alias
  `processImage()`), `dcrawMakeMemImage()` (alias `createMemoryImage()`) → `ProcessedImage`
  `{ type: 1 jpeg | 2 bitmap (LIBRAW_IMAGE_JPEG = 1), width, height, colors, bits, dataSize, data: Buffer }`, `dcrawMakeMemThumb()`
  (alias `createMemoryThumbnail()`) → same shape (JPEG bytes when the embedded thumb is JPEG),
  `isJpegThumb()`, `thumbOk(maxSize?)`, `adjustSizesInfoOnly()`, `raw2Image()`, `raw2ImageEx(subtractBlack)`,
  `getMemImageFormat()`, `copyMemImage(dest, stride, bgr?)`, `errorCount()`, `getDecoderInfo()`.
- Metadata (after open only): `getMetadata()` → `{ make?, model?, software?, width, height, rawWidth,
  rawHeight, colors, filters, iso?, shutterSpeed?, aperture?, focalLength?, timestamp? }`;
  `getImageSize()` → `{ width, height, rawWidth, rawHeight, topMargin, leftMargin, iWidth, iHeight }`;
  `getLensInfo()` → `{ lensName?, lensMake?, lensSerial?, internalLensSerial?, minFocal?, maxFocal?,
  maxAp4MinFocal?, maxAp4MaxFocal?, exifMaxAp?, focalLengthIn35mmFormat? }`; `getAdvancedMetadata()`,
  `getColorInfo()`. Same field names as alpha.6, so `ImageMetadata` mapping code stays.
- Params: `setOutputParams(partial, { signal? })` with LibRaw snake_case keys (booleans for flags):
  `half_size, user_qual, use_camera_wb, use_auto_wb, use_camera_matrix, output_color, output_bps,
  no_auto_bright, auto_bright_thr, adjust_maximum_thr, highlight, bright, threshold, fbdd_noiserd,
  med_passes, dcb_iterations, dcb_enhance_fl, four_color_rgb, user_flip, user_black, user_sat,
  user_cblack[4], user_mul[4], gamma[6], greybox[4], cropbox[4], aber[4], exp_correc, exp_shift,
  exp_preser, no_auto_scale, no_interpolation, green_matching, use_fuji_rotate, use_p1_correction,
  output_tiff, output_flags, output_profile, camera_profile, bad_pixels, dark_frame`. Calling it after
  `dcrawProcess` resets state to "unpacked" so `dcrawProcess` can run again on the same unpacked data.
  `getOutputParams()` returns the full struct (use it in tests to assert what was applied).
- Cancellation: every operation accepts `{ signal: AbortSignal }`; queued jobs reject immediately,
  the running job sets a shared cancel flag that LibRaw polls; rejection is a `LibRawError` with
  `code === 'ABORT_ERR'`. `setCancelFlag()`/`clearCancelFlag()` also exist.
- Events (EventEmitter): `progress`, `dataError`, `exifTag`, `makerNote`. Only `dataError` is useful here.
- `sharp` is still a dependency (`^0.35.3`) used by every `create*Buffer()`, `createThumbnailJPEGBuffer()`
  and `processRawThumbnail()`. photoview must **not** call any of those (nested-sharp Electron/Linux crash,
  knowledge base `libraw.md`); keep the `postinstall` `rmSync` of `node_modules/lightdrift-libraw/node_modules`.

### 2. Dependency and build changes

- `package.json`: `"lightdrift-libraw": "1.0.0"` (exact pin), stays a devDependency by project convention.
  Remove the `rebuild` script (`electron-rebuild -f -w lightdrift-libraw`); nothing else uses it. Keep
  `postinstall`. Check `node --version` used by Jest is 22 or 24.
- Delete `src/backend/image-decoder-process/plugins/lightdrift-libraw.d.ts`; use the package types.
- `build/native-modules.ts` discovers `.node` files under `node_modules/lightdrift-libraw/prebuilds/**`
  and externalizes the package; confirm `nativeExternals` still contains `lightdrift-libraw` and that the
  transitive walk includes `node-gyp-build`, `node-addon-api`, `sharp`.
- Forge packaging: `AutoUnpackNativesPlugin` unpacks `**/*.node`; the per-instance worker script
  `dist/processor-worker.cjs` is loaded by path with `new Worker(...)` from inside the package. Add a
  packaged-app test (see §10) that a RAW decodes from the installed `.deb`/`out/` build; if
  `worker_threads` cannot load the `.cjs` from inside `app.asar`, extend `packagerConfig.asar.unpack`
  with `**/node_modules/lightdrift-libraw/dist/**`.
- README / dev-setup docs: drop the `apt-get install libraw-dev` requirement; note that `npm install`
  with no compiler now works; GitHub Actions workflow: remove the `libraw-dev` apt step.

### 3. Rendering settings (shared constants module)

Create `src/backend/image-decoder-process/plugins/librawParams.ts` exporting typed partials for
`setOutputParams`, one per tier. Every value below is deliberate; document each in a comment.

```ts
export const BASE_PARAMS = {
  use_camera_wb: true,      // as-shot WB from the camera (fixes the wrong colour cast on full decodes:
                            // LibRaw's default is dcraw's fixed daylight multipliers, not the camera's)
  use_camera_matrix: 1,     // camera colour matrix when camera WB is used (LibRaw default; explicit)
  output_color: 1,          // sRGB
  output_bps: 8,
  user_flip: -1,            // honour the file's orientation (current behaviour, explicit)
  no_auto_bright: false,    // keep auto-brightness; auto_bright_thr 0.01 default
  highlight: 0,             // clip; cheapest. (2 = blend is the candidate if highlights look bad; measure)
  fbdd_noiserd: 0, threshold: 0, med_passes: 0, dcb_iterations: -1, four_color_rgb: false,
} as const;

export const FULL_SCREEN_PARAMS = { ...BASE_PARAMS, half_size: false, user_qual: 2 }; // PPG: near-AHD quality after downscale, ~2x faster single-threaded
export const FULL_1TO1_PARAMS   = { ...BASE_PARAMS, half_size: false, user_qual: 3 }; // AHD, for a future 100% zoom tier
export const PREVIEW_HALF_PARAMS = { ...BASE_PARAMS, half_size: true };               // 2x2 binning, no demosaic
```

Rationale to record in the spec: alpha.6 never called `setOutputParams`, so full decodes used LibRaw
defaults (`use_camera_wb = 0`): that is the "WB looks wrong" bug. `user_qual` 2 vs 3 is a speed trade
that matters more now because the vendored 1.0.0 build has no OpenMP (Ubuntu's LibRaw had it), so AHD
becomes single-threaded; PPG at screen size is the mitigation. If a 100 %-zoom tier is ever added, use
`FULL_1TO1_PARAMS`.

### 4. `LibRawPlugin` redesign

Keep the plugin interface (`decode(buffer, ext, size, ctx)`), keep sharp for resize/encode, change the
LibRaw call sequences:

- **thumbnail (400 px) and preview (screen)**:
  1. `openBuffer(buffer, { signal })` (no unpack).
  2. `const ok = await raw.thumbOk()`; if `ok > 0` and `await raw.isJpegThumb()`: `unpackThumb()` →
     `dcrawMakeMemThumb()` → JPEG bytes in `.data`. Then, as today, `sharp(jpeg).metadata()` and, if the
     long edge exceeds the target, `sharp(jpeg).rotate().resize({fit:'inside', withoutEnlargement:true}).jpeg({quality})`.
     For a non-JPEG bitmap thumbnail (`type === 1`), feed `sharp(data, { raw: { width, height, channels: colors } })`.
  3. If there is no usable thumbnail: `thumbnail` returns `null` (fallback to `full`, as today);
     `preview` runs the **half-size path**: `setOutputParams(PREVIEW_HALF_PARAMS)` → `unpack()` →
     `dcrawProcess()` → `dcrawMakeMemImage()` → sharp resize/encode. Expected ~2x faster than full.
  4. Optional heuristic to spec: if the embedded JPEG's long edge is smaller than half the requested
     `preview` target (tiny 160 px EXIF thumbs on old bodies), prefer the half-size path for `preview`;
     always accept it for `thumbnail`.
- **full (screen)**: `openBuffer` → `setOutputParams(FULL_SCREEN_PARAMS)` → `unpack()` →
  `dcrawProcess()` → `dcrawMakeMemImage()` → `sharp(raw RGB).resize(...).jpeg({quality})`. Drop
  `raw2Image()` (dcraw_process does it). Keep the `raw-resize-encode` span.
- Shared: the three sizes of one request currently arrive as one task with `sizes[]`; when a task asks
  for `preview`+`full` (or `thumbnail`+`full`), reuse one instance and one `openBuffer` across them; for
  `full` after a half-size `preview`, call `setOutputParams(FULL_SCREEN_PARAMS)` then `unpack()` again
  (half_size affects unpack/raw2image, so the unpacked data cannot be shared between the two tiers).
- Always `recycle()` after a task and `close()` only when the instance is retired (see §5).
- Surface `errorCount()` > 0 and `dataError` events as `console.warn` with the path (no user-facing change).

### 5. Instance lifecycle inside the worker pool

Each `new LibRaw()` costs a thread spawn (tens of ms) and ~50–200 MB peak. Rule: **one long-lived
`LibRaw` instance per decode worker thread**, created lazily on first RAW task, reused with `recycle()`
between tasks, closed on worker shutdown. Wrap it in a small `LibRawInstanceHolder` in the worker that:
recreates the instance if any call rejects with a worker-failure/`INSTANCE_CLOSED` error (the per-instance
worker died on a malformed file), and guarantees a task always starts from a recycled state (call
`recycle()` in `finally`, ignore its errors). This keeps thread count at pool size + pool size, not per
image. Note in the spec that the FIFO inside the instance serialises calls, so the plugin must never
interleave two tasks on one instance (it does not today: one task per worker at a time).

### 6. Cancellation

- Add `signal: AbortSignal` to `PluginDecodeContext` (default `new AbortController().signal` in tests).
- Worker: create one `AbortController` per render task; pass `signal` into every lightdrift call.
- Pool → worker: when `DecodeWorkerPool.assignTasks()` supersedes a path that is in flight on a worker,
  send a cancel message (new RPC method per worker, e.g. `renderTaskCancelMethod(workerId)`, same naming
  rule as `renderTaskMethod`) carrying the path; the worker aborts the controller if it matches its
  current task. The worker's JS thread is free during native work (the addon runs in lightdrift's own
  worker), so the message is handled immediately.
- Treat `LibRawError` with `code === 'ABORT_ERR'` as a silent outcome: no `PHOTO_RENDER_ERROR`, no log
  above debug level; `recycle()` afterwards.
- Tests: aborting during `unpack` of a 16 MP file rejects within 200 ms; the instance is reusable after.

### 7. Metadata plugins

`LibRawCameraMetadataPlugin` and `LibRawImageDimensionsPlugin`: replace `loadBuffer` with `openBuffer`
(no `unpack`), keep the field mapping. Dimensions: after `openBuffer`, call `adjustSizesInfoOnly()` and
read `getImageSize()`; use `iWidth`/`iHeight` if they reflect orientation (verify with a real portrait
NEF/ORF from `.private/testimages`: if the file is portrait and `iWidth < iHeight`, use them; otherwise
keep `width`/`height`). Both plugins should reuse the worker's shared instance from §5 and, if the
`MetadataExtractor` runs in the same task as a decode, share the already-open instance instead of
reopening (an `openBuffer` is cheap, so this is optional).

### 8. Expected gains and regressions to state in the spec

Baseline (2026-07-20 CSV, 16 MP `IMGP5127.DNG`): `decode-preview` 378 ms, `decode-full` 1105 ms
(of which `raw-resize-encode` 171 ms), JPEG for reference 24 / 113 ms.

Expected after this spec (estimates; the benchmark decides):
- thumbnail/preview via embedded JPEG: 378 → 40–80 ms (no unpack; still full-size embedded JPEG + resize).
- preview via half_size when no embedded JPEG: ~500 ms instead of ~1100 ms.
- metadata per kind: ~350 → ~5 ms.
- full: with PPG single-threaded, roughly 0.9–1.1 s on Linux; with AHD single-threaded 1.4–1.9 s (that
  would be a regression vs the OpenMP-enabled Ubuntu LibRaw, hence PPG). On macOS/Windows, where the old
  builds were most likely single-threaded already, expect a small improvement from 0.22.2.
- Correct white balance on full/half decodes (`use_camera_wb`).
- Cancellation stops wasted decodes when flicking through a folder.

Regressions to accept and document:
- Lossy-compressed DNG (phones, Lightroom "lossy DNG") no longer decodes on Linux/macOS (no libjpeg in
  the vendored build; the system LibRaw had it). Detect via `LibRaw.capabilities() & 128 === 0`; log once
  at worker start; test with a lossy DNG if one exists in the library, otherwise note as untested.
- Deflate-compressed DNG (float/HDR) starts working on Linux (zlib now present).
- OpenMP demosaic parallelism is gone on Linux (mitigated by `user_qual: 2`).
- 1.0.0 is a single-maintainer package; pin exactly.

### 9. Knowledge base updates (`/home/jan/dev/_jdd/knowledge-base/libraw.md` and `processing-raw-images.md`)

Rewrite `libraw.md` for 1.0.0: real API names, `openBuffer` vs `unpack`, params keys, per-instance
worker model and the one-instance-per-thread rule, `ABORT_ERR`, capabilities bits and the lossy-DNG gap,
the `postinstall` hack still needed, types now shipped. Update the package table in
`processing-raw-images.md` (1.0.0 published 2026-08-15, prebuilds, LibRaw 0.22.2) and add the row for
the planned `@janhapke/libraw` with a pointer to `/home/jan/dev/libraw-node/docs`.

### 10. Tests and gates

- Unit tests: update mocks for `LibRawPlugin`, both metadata plugins, `DecodeWorker*` to the new call
  sequences; assert `setOutputParams` was called with `FULL_SCREEN_PARAMS` / `PREVIEW_HALF_PARAMS` per tier;
  assert no `unpack()` on thumbnail/metadata paths; assert abort handling.
- Integration (real addon, synthetic DNG `tests/fixtures/pm5544-768x576.dng`): thumbnail is the embedded
  JPEG; full decodes to a JPEG of the expected size; half-size preview yields 384×288 before resize
  (assert via `dcrawMakeMemImage().width` in a plugin-level test or a dedicated test); `getOutputParams()`
  after `setOutputParams` reflects `use_camera_wb: true`.
- Real files (not committed, from `.private/testimages`): portrait orientation on NEF/ORF/DNG for
  thumbnail, half-size and full tiers; a visual check that full-decode colours now match the embedded
  JPEG's white balance.
- Electron: run the `LibRawPlugin` integration script under `ELECTRON_RUN_AS_NODE=1 electron` (knowledge
  base `sharp.md` recipe) on Linux; then `npm run make`, install the `.deb`, open a RAW folder
  (covers asar + `worker_threads` + prebuild loading in a packaged app).
- Benchmark: `PHOTOVIEW_BENCHMARK=1 npm run benchmark:run` before (current HEAD) and after; commit both
  CSVs under `benchmark/reports/` with names `..._pre-lightdrift-1.0.0.csv` / `..._lightdrift-1.0.0.csv`;
  gate: `decode-preview` on `IMGP5127.DNG` ≤ 100 ms median and `decode-full` not worse than +10 % vs
  baseline with `user_qual: 2`. If `full` misses the gate, try `user_qual: 0` for the screen tier and
  report.

### 11. Out of scope (goes to `@janhapke/libraw`)

Choosing among multiple embedded previews (`thumbs_list`), single-copy output, libjpeg (lossy DNG),
OpenMP, `rawparams` (`shot_select`, memory cap), removing the `sharp` dependency and the `postinstall`
hack, 16-bit output.
