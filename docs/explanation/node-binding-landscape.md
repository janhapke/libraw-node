# The Node binding landscape

> **Design history:** written before implementation; see [README](../../README.md) / the generated reference docs for the shipped API.

Checked 2026-09-03 via the npm registry search API, the GitHub API, and the packages' own sources.

## The lightdrift lineage (one author, three forks, two derivative packages)

`unique01082/lightdrift-libraw` (author Bao LE, MIT, created 2025-08-23, 8 stars, 3 forks, last push
2026-08-15) is the original. It is **not** itself a fork. Its GitHub forks:

| Fork | Last push | Notes |
|---|---|---|
| `pixFlowTeam/lightdrift-libraw` | 2025-09-10 | pixFlowTeam then published the copy as **`librawspeed`** (npm, last publish 2025-10-12, README in Chinese, bundles LibRaw 0.21.4 source + prebuilt binaries, 3 stars). |
| `tsekiguchi/lightdrift-libraw` | 2025-08-30 | Dormant. |
| `arc0social1slaver/lightdrift-libraw` | 2026-02-22 | Dormant since; branch `dev`; nothing published. |

`bookyo/librawspeed-full` is a fork of `librawspeed` (npm `librawspeed-full`, last publish 2026-06-10,
1 star, LibRaw 0.21.4, prebuilds for win-x64 / mac x64+arm64 / linux-x64). Same code shape, same `sharp`
dependency, same synchronous native layer.

So the "chain" is: lightdrift → librawspeed (pixFlowTeam fork) → librawspeed-full (bookyo fork). None of the
derivatives add capabilities beyond bundling LibRaw source and prebuilds; the knowledge base's 2026-07-03
assessment ("copy-paste derivatives") still holds.

## What changed upstream since photoview adopted alpha.6

`lightdrift-libraw` moved fast after photoview pinned `1.0.0-alpha.6` (published 2026-01-06):

| Version | Date | Relevant changes (from CHANGELOG and source on `master`) |
|---|---|---|
| 1.0.0-beta.1 | 2026-01-06 | "Context-aware N-API initialization per worker" (worker_threads safe), `processRawThumbnail()`, parallel benchmarks. |
| 1.0.0-rc.1 | 2026-08-15 | Vendored LibRaw **0.22.2** and zlib 1.3.2 (no more system `libraw-dev`), Node-API prebuilds (`prebuildify --napi`, bundled in the tarball, `node-gyp-build` loader), "per-instance async worker queues and AbortSignal cancellation", typed ESM/CJS API, "camelCase mirror of the complete safe LibRaw 0.22.2 public surface" with a machine-readable `api/libraw-0.22.2.json`, sharp bumped to 0.35.3, Node 22/24 only, fixed an OOB read in colour-matrix transposition, removed the "AI-powered" marketing claims. |
| 1.0.0 | 2026-08-15 | Same contract, `latest` tag. Prebuilds: linux-x64, linux-arm64, darwin-x64, darwin-arm64, win32-x64 (all built on native GitHub runners, no Docker). CI has an "electron-consumer" job loading the prebuild in Electron 36.9.5 on Windows. |

Verified details of 1.0.0's design, because they matter for the build-vs-adopt decision:

- The native layer (`src/libraw_wrapper.cpp`, ~77 instance + 8 static methods) is still **fully synchronous**:
  no `Napi::AsyncWorker`, no native threads. Every pixel result is `Napi::Buffer::Copy`.
- The "async worker per processor" is a **JavaScript `worker_threads` Worker per `LibRaw` instance**
  (`lib/stable/processor-worker.ts`): the worker loads the addon, runs the synchronous calls, and posts
  results back with `port.postMessage({ id, result })` (structured clone, no transfer list, so every
  pixel buffer is copied a second time). Cancellation is a `SharedArrayBuffer`-backed `Int32Array` polled
  from LibRaw's progress callback. This works, but it means one OS thread and one addon context per
  RAW instance, and two full copies of every decoded image.
- `setOutputParams` now accepts nearly all of `imgdata.params` with LibRaw's snake_case names:
  `half_size`, `user_qual`, `use_camera_wb`, `output_bps`, `cropbox`, `greybox`, `user_flip`,
  `fbdd_noiserd`, `threshold`, `dcb_iterations`, `exp_correc`, `no_interpolation`, ... (full list in
  [reference](../reference/lightdrift-libraw-versions.md)). `imgdata.rawparams` (shot_select, options,
  max_raw_memory_mb) is **not** exposed. `thumbs_list` is not exposed; `unpack_thumb_ex(i)` is.
- `binding.gyp` compiles LibRaw from vendored source with only `USE_ZLIB`. **No libjpeg** (lossy DNG and
  JPEG-compressed DNG previews are unsupported), no LCMS2, no OpenMP, `NAPI_VERSION=8`, C++17.
- `sharp` (0.35.3) is still a hard dependency and still runs on the calling thread for all `create*Buffer()`
  methods. photoview's nested-sharp Electron/Linux crash (knowledge base `libraw.md`) and its `postinstall`
  `rmSync` workaround therefore still apply.
- Docs claim "Electron 36 can load the same Node-API prebuild in a Node-enabled main or utility process; no
  `@electron/rebuild` step is required." Consistent with Node-API design; see
  [electron-compatibility.md](electron-compatibility.md) for the caveats.

## Other packages on npm (not lightdrift-derived)

| Package | Status | Why not |
|---|---|---|
| `libraw` (m0g/node-libraw) | 0.1.4, 2017 | Dead; pre-N-API (NAN), old LibRaw. |
| `libraw.js` (justinkambic) / `@julianberger/libraw.js` | 3.0.0 (2023) / 3.3.1 (2025-10) | Metadata + thumbnail subset only (`openFile`, `getMetadata`, `unpackThumb`, `getThumbnail`), LGPL-2.1, prebuildify for Ubuntu/macOS only, 0 stars on the fork. No full decode. |
| `libraw-wasm` (ybouane/LibRaw-Wasm) | 1.6.0, 2026-07-02 | Emscripten build, supports most output params incl. `half_size`, runs in Node. No native threads/SIMD in the published build; single-threaded wasm is typically 2–4x slower than native for demosaic. Interesting as a zero-ABI-risk fallback, not as the primary path. |
| `libraw-mini`, `@colorhythm/libraw-wasm`, `rawconvert-wasm`, `@lumaforge/*` | 2025–2026 | Browser-focused wasm variants. Same trade-off. |
| `rawler` (Rust) | active | No Node binding, no production demosaic (knowledge base `processing-raw-images.md`). |

## Conclusion for the project decision

There is still no binding that gives all four of: (a) native off-thread decode without a JS worker per
instance, (b) `open`-without-`unpack` for cheap metadata/thumbnails, (c) the full option surface including
`rawparams` and `thumbs_list`, (d) a reproducible Docker build with libjpeg and (later) OpenMP, packaged for
Electron. `lightdrift-libraw` 1.0.0 gets closest on (c) and on prebuilds. Its C++ wrapper is MIT and its
param-mapping code is mechanically reusable; its threading, build, and packaging are the parts to replace.
See [roadmap-and-effort.md](roadmap-and-effort.md) for the recommendation.
