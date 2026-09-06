# How photoview uses LibRaw today

photoview (`/home/jan/dev/photoview`, Electron 42.5.0, Electron Forge + webpack) pins
`lightdrift-libraw@^1.0.0-alpha.6` as a devDependency, rebuilt with `electron-rebuild -f -w lightdrift-libraw`
(`npm run rebuild`), linking against the system `libraw-dev` (0.21.5 on this machine). File-level detail is in
[reference/photoview-integration-points.md](../reference/photoview-integration-points.md).

## Process topology

```
main process
 └─ utilityProcess "image-decoder"  (src/backend/image-decoder-process/index.ts)
     ├─ DecodeWorkerPool: max(2, min(cpus-1, 6)) worker_threads
     │    └─ worker/index.ts: own ImageFormatRegistry, own plugin instances, own MetadataExtractor
     │         ├─ LibRawPlugin        (decode)          ← lightdrift-libraw + sharp
     │         ├─ LibRawCameraMetadataPlugin            ← lightdrift-libraw
     │         └─ LibRawImageDimensionsPlugin           ← lightdrift-libraw
     └─ MetadataCache, ThumbnailDiskCache
```

Every worker thread loads the `lightdrift-libraw` addon independently, so the addon must be context-aware
(node-addon-api's `NODE_API_MODULE` is). Parallelism today comes only from this pool: each worker runs one
synchronous LibRaw call chain at a time, blocking its own JS thread while doing so (the addon has no
`AsyncWorker`). photoview's spec `2026-07-18-decode-worker-pool-and-cancellation.md` introduced the pool
precisely because "lightdrift-libraw's Promise API is cosmetic".

## The three decode sizes

`src/shared/DecodeSize.ts`:

| Size | Long edge | JPEG quality | Cached on disk | LibRaw path in `LibRawPlugin` |
|---|---|---|---|---|
| `thumbnail` | 400 px | 80 | yes | embedded thumbnail (falls back to `full` if none) |
| `preview` | screen (1024–7680 px, display size × scale factor) | 90 | no | embedded thumbnail (falls back to `full`) |
| `full` | screen | 95 | no | full demosaic |

`LibRawPlugin.decode()` (`plugins/LibRawPlugin.ts`):

- **Thumbnail / preview**: `new LibRaw()` → `loadBuffer(buffer)` → `isJPEGThumb()` →
  `createThumbnailJPEGBuffer()` → if larger than target, `sharp(...).rotate().resize().jpeg()` → `close()`.
- **Full**: `loadBuffer` → `raw2Image()` → `processImage()` → `createMemoryImage()` (8-bit RGB copy) →
  `sharp(raw RGB).resize(fit inside target).jpeg({quality})` → `close()`. The comment in the file records
  that `createJPEGBuffer()` is avoided because the package's nested `sharp` crashes under Electron, and that
  "lightdrift-libraw has no decode-time size/downsampling control".

Metadata plugins (`metadata-plugins/LibRawCameraMetadataPlugin.ts`, `LibRawImageDimensionsPlugin.ts`) each do
`new LibRaw()` → `loadBuffer` → `getMetadata()`/`getLensInfo()` or `getImageSize()` → `close()`.

## The hidden cost: `loadBuffer` always unpacks

In alpha.6 (`src/libraw_wrapper.cpp`, `LoadBuffer`), `loadBuffer()` calls `open_buffer()` **and then
`unpack()`**. So:

- the thumbnail path decodes the entire RAW mosaic and throws it away;
- each metadata plugin decodes the entire RAW mosaic and throws it away;
- for a request that asks for thumbnail + preview + full + two metadata kinds, the mosaic is decoded up to
  five times per photo (the `MetadataCache` and `ThumbnailDiskCache` reduce repeats across sessions, not
  within a first visit).

The benchmark confirms it. From `benchmark/reports/2026-07-20_13-42-57_dataurl-fixed.csv` (5 iterations,
16 MP Pentax K-5 II DNG `IMGP5127.DNG`, 24 MP Nikon JPEG for comparison):

| Image | Span | Median ms |
|---|---|---|
| IMGP5127.DNG | `decode-preview` (embedded thumbnail path) | 378 |
| IMGP5127.DNG | `decode-full` | 1105 |
| IMGP5127.DNG | `raw-resize-encode` (sharp part of decode-full) | 171 |
| DSC_4985.JPG | `decode-preview` (sharp shrink-on-load) | 24 |
| DSC_4985.JPG | `decode-full` | 113 |

A JPEG-thumbnail extraction should cost tens of milliseconds, not 378. The difference is the unpack. The
`.private/epic-progressive-decode-pipeline.md` notes record the same numbers (`decode-full` ~1.1–1.2 s,
`decode-preview` ~370–400 ms) and identified the synchronous native layer as the root cause of pipeline
stalls.

## Other constraints photoview already works around

- **Nested `sharp` inside lightdrift** (`node_modules/lightdrift-libraw/node_modules/@img/sharp-*`) crashes
  under Electron on Linux; photoview's `postinstall` deletes `node_modules/lightdrift-libraw/node_modules`
  so `require('sharp')` falls through to the root, patched `@janhapke/sharp-electron` (knowledge base
  `sharp-electron-linux-crash.md`, "Superseded" section).
- **Broken shipped types**: `lib/index.d.ts` declares `module 'libraw'`; photoview keeps a local shim
  `plugins/lightdrift-libraw.d.ts` covering only the methods it calls.
- **Orientation**: assumed handled by `dcraw_process` (`user_flip = -1`), verified only against a synthetic
  DNG that has no orientation tag (knowledge base `libraw.md`). `tests/unit/LibRawPlugin.rotation.test.ts`
  exists; check what it asserts before relying on it.
- **Crash isolation**: the worker pool respawns a crashed worker up to 3 times in 10 s and drops the task.
  Native crashes (malformed files) are expected to be survivable, not prevented.
- **System dependency**: `libraw-dev` must be installed to build; CI and other machines need it too. This is
  the concrete reason for wanting a vendored, Docker-built binding.

## Fixture

`tests/fixtures/pm5544-768x576.dng` is a synthetic 768×576 RGGB DNG with a 96×72 embedded JPEG thumbnail,
generated by `tests/fixtures/GeneratePm5544Dng.ts` (knowledge base `dng-generation.md`). Real test files
live in `.private/testimages` (NEF, ORF, DNG from a Nikon D60, Olympus, Pentax K-5 II). The new binding's
test suite can reuse the generator and should add real-camera files (not committed) for orientation and
format coverage.
