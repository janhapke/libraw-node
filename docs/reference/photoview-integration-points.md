# photoview integration points

All paths relative to `/home/jan/dev/photoview`. Versions from `package.json` on 2026-09-03.

## Dependencies

| Package | Version | Role |
|---|---|---|
| `electron` | 42.5.0 | runtime |
| `lightdrift-libraw` | ^1.0.0-alpha.6 (devDependency, project convention) | RAW decode + RAW metadata |
| `sharp` | `npm:@janhapke/sharp-electron@0.35.4-electron.1` | resize/encode; patched for Electron/Linux |
| `@janhapke/exiv2` | ^0.2808.2 | EXIF/MakerNote metadata (lens names, shutter count) |
| `exifr` | ^7.1.3 | EXIF for non-RAW |
| `@electron-forge/*` | ^7.11.2 | packaging; `plugin-auto-unpack-natives` |

Scripts: `rebuild` = `electron-rebuild -f -w lightdrift-libraw`; `postinstall` deletes
`node_modules/lightdrift-libraw/node_modules` (nested sharp removal).

## Files that touch LibRaw

| File | What it does | Change when swapping the binding |
|---|---|---|
| `src/backend/image-decoder-process/plugins/LibRawPlugin.ts` | `decode(buffer, ext, size, ctx)`: thumbnail/preview via embedded JPEG, full via demosaic + sharp | Rewrite: `identify` → choose thumb from `thumbs_list` → `thumbnail(i)`; full via `decode({half_size?, user_qual, ...})` into a Buffer → sharp resize/encode |
| `src/backend/image-decoder-process/plugins/lightdrift-libraw.d.ts` | Local type shim | Delete (new binding ships types) |
| `src/backend/image-decoder-process/metadata-plugins/LibRawCameraMetadataPlugin.ts` | make/model/lens/exposure via `getMetadata`+`getLensInfo` | Use `identify()` result (no unpack) |
| `src/backend/image-decoder-process/metadata-plugins/LibRawImageDimensionsPlugin.ts` | width/height via `getImageSize` | Use `identify()` result; use `sizes.flip` to report oriented dimensions |
| `src/backend/image-decoder-process/ImageFormatRegistry.ts`, `ImageFormat.ts` | extension → plugin, mime | Unchanged (maybe extend the extension list from `LibRaw.cameraList()`-independent constants) |
| `src/backend/image-decoder-process/DecodeWorkerPool.ts` | pool of `max(2, min(cpus-1, 6))` workers, crash budget 3/10 s, RPC timeout 60 s | Add cancel message per path → worker calls `abort()` on the in-flight decode |
| `src/backend/image-decoder-process/worker/index.ts` | worker entry: own registry, plugins, metadata extractor, disk cache | Set `UV_THREADPOOL_SIZE` is process-wide; nothing else |
| `src/shared/DecodeSize.ts` | sizes thumbnail 400/q80/cached, preview screen/q90, full screen/q95 | Possibly add a `preview` strategy flag (embedded vs half_size) |
| `build/native-modules.ts`, `build/forge.config.ts` (per knowledge base) | externals + asar unpack whitelist | Prebuildify layout: nothing; add ignore for foreign `prebuilds/*` |
| `tests/unit/LibRawPlugin*.test.ts`, `LibRawCameraMetadataPlugin.test.ts`, `LibRawImageDimensionsPlugin.test.ts` | unit + integration (real addon) tests | Update mocks to the new API |
| `tests/fixtures/pm5544-768x576.dng`, `GeneratePm5544Dng.ts` | synthetic DNG with embedded JPEG | Reuse in the binding's own tests |
| `benchmark/run.ts`, `report.ts`, `gap-report.ts` | eimer-trace benchmark harness | Use to measure before/after (`PHOTOVIEW_BENCHMARK=1`) |

## Benchmark baseline to beat (2026-07-20, 5 iterations, medians)

| Image | decode-preview | decode-full | raw-resize-encode (inside full) |
|---|---|---|---|
| IMGP5127.DNG (Pentax K-5 II, 16 MP) | 378 ms | 1105 ms | 171 ms |
| DSC_4985.JPG (Nikon, JPEG) | 24 ms | 113 ms | — |

Test images (not committed): `.private/testimages/` — `DSC_4985.NEF`, `DSC_4986.NEF` (Nikon D60),
`IMGP5127–5129.DNG` (Pentax), `P3210619–20.ORF` (Olympus), plus JPEG/GIF/PNG.

## Process constraints to respect

- Decode runs in `worker_threads` inside a `utilityProcess`; the addon is loaded once per worker.
- Results are published over eimer as `Buffer`/`Uint8Array` (structured clone); keep raw bytes out of React
  state (knowledge base `electron-image-rendering-perf.md`).
- The renderer never touches the addon.
