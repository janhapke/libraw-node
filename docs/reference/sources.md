# Sources

Checked 2026-09-03.

## Local

- `/home/jan/dev/_jdd/knowledge-base/`: `libraw.md`, `processing-raw-images.md`, `electron-native-modules.md`,
  `sharp-electron-linux-crash.md`, `sharp.md`, `electron-workers.md`, `electron-image-rendering-perf.md`,
  `dng-generation.md`, `exif.md`, `index.md`.
- `/home/jan/dev/photoview`: `package.json`, `src/backend/image-decoder-process/**` (`index.ts`,
  `DecodeWorkerPool.ts`, `worker/index.ts`, `plugins/LibRawPlugin.ts`, `plugins/lightdrift-libraw.d.ts`,
  `metadata-plugins/LibRaw*.ts`), `src/shared/DecodeSize.ts`, `specs/2026-07-14-image-pipeline-benchmarking.md`,
  `specs/2026-07-18-decode-worker-pool-and-cancellation.md`, `specs/2026-07-18-progressive-render-pipeline.md`,
  `benchmark/reports/2026-07-20_13-42-57_dataurl-fixed.csv`, `.private/epic-progressive-decode-pipeline.md`,
  `tests/fixtures/README.md`, `tests/unit/LibRawPlugin.integration.test.ts`.
- `/home/jan/dev/photoview/node_modules/lightdrift-libraw` (1.0.0-alpha.6): `package.json`, `binding.gyp`,
  `src/libraw_wrapper.{h,cpp}`, `lib/index.js`, `README.md`, `CHANGELOG.md`.
- `/home/jan/dev/sharp-electron`: `README.md`, `package.json`, `scripts/*.sh`, `scripts/sharp-build.Dockerfile`,
  `.github/workflows/ci.yml`, `.gitmodules`.
- `/usr/include/libraw/` (LibRaw 0.21.5): `libraw.h`, `libraw_types.h`, `libraw_const.h`, `libraw_version.h`.

## LibRaw

- https://www.libraw.org/docs/API-CXX.html — C++ API
- https://www.libraw.org/docs/API-datastruct.html — data structures (`imgdata.params`, `rawparams`, `thumbs_list`)
- https://www.libraw.org/docs/API-notes.html — thread safety, memory
- https://www.libraw.org/docs/Samples-LibRaw.html — `half_mt`, `mem_image`, `multirender_test`
- https://www.libraw.org/node/2093 — "Demosaicing seems not multi-threaded" (OpenMP covers PPG, AHD)
- https://www.libraw.org/node/2167, https://www.libraw.org/news/libraw-0-16-release — OpenMP notes (DHT)
- https://github.com/LibRaw/LibRaw/releases — 0.22.2 (2026-07-16), 0.22.1, 0.22.0 (2026-01-13), 0.21.5
- https://raw.githubusercontent.com/LibRaw/LibRaw/master/Changelog.txt
- https://raw.githubusercontent.com/LibRaw/LibRaw/master/Makefile.dist — `USE_*` defines, `libraw` vs `libraw_r`
- https://github.com/LibRaw/LibRaw-cmake — community CMake build (options, `raw`/`raw_r` targets)
- https://www.libraw.org/ — licence statement (LGPL 2.1 / CDDL 1.0)

## lightdrift-libraw and derivatives

- https://github.com/unique01082/lightdrift-libraw — repo metadata, forks, `master`: `README.md`, `CHANGELOG.md`,
  `package.json`, `binding.gyp`, `src/libraw_wrapper.cpp`, `lib/index.js`, `lib/stable/processor-worker.ts`,
  `docs/api-mapping.md`, `docs/platform-support.md`, `docs/lifecycle.md`, `WORKER_THREAD_IMPLEMENTATION.md`,
  `.github/workflows/release.yml`
- https://github.com/pixFlowTeam/librawspeed, https://github.com/bookyo/librawspeed-full
- https://github.com/julianberger/libraw.js, https://github.com/ybouane/LibRaw-Wasm
- https://registry.npmjs.org/-/v1/search?text=libraw

## Electron and Node-API

- https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules
- https://www.electronjs.org/blog/v8-memory-cage
- https://github.com/nodejs/abi-stable-node/issues/441 — Electron 21 external buffers
- https://github.com/prebuild/prebuildify, https://github.com/prebuild/node-gyp-build
- https://github.com/solarwinds/zig-build, https://github.com/rust-cross/cargo-zigbuild, https://napi.rs/docs/cross-build.en
- https://github.com/lovell/sharp-libvips/blob/main/build.sh, https://raw.githubusercontent.com/lovell/sharp/main/.github/workflows/ci.yml
- https://www.electron.build/docs/features/code-signing/notarization/ (signing of unpacked native modules)
