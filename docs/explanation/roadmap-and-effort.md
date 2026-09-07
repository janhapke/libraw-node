# Roadmap and effort

> **Design history:** written before implementation; see [README](../../README.md) / the generated reference docs for the shipped API.

**Goal (confirmed 2026-09-03): `@janhapke/libraw` is a general-purpose open-source binding, not a photoview-only
shim.** photoview is the first consumer and the benchmark, but the scope is the full safe LibRaw surface
(all `params` and `rawparams`, metadata and makernotes mirror, `thumbs_list`, warnings, capabilities), generated
types and docs, and a header-diff parity check, so it stays useful and honest for other users. Do not trim the
surface to what photoview happens to call.

Effort is given as calendar working days for one experienced developer working with an AI assistant, with
a low and a high estimate. "Uncertain" marks steps whose scope depends on toolchain behaviour that has not
been tried on this stack yet.

## The decision: adopt lightdrift 1.0.0, fork it, or build new?

| Option | Gets you | Leaves open | Effort to a usable photoview integration |
|---|---|---|---|
| **Adopt lightdrift 1.0.0** | Vendored 0.22.2, prebuilds for 5 targets, most `params` via `setOutputParams`, worker-per-instance async, AbortSignal, Electron-tested, TypeScript types | Still bundles `sharp` (Electron/Linux crash, postinstall hack stays); worker_thread per instance nested inside photoview's own pool (up to 6 + N threads); triple buffer copies; no libjpeg (no lossy DNG); no `rawparams`/`thumbs_list`; whether `loadBuffer` still fuses unpack must be checked against its low-level mirror; single maintainer whose alpha READMEs overstated features | 1–3 days (upgrade, re-verify Electron crash story, switch to `half_size`) |
| **Fork lightdrift** | Reuse of its ~77-method wrapper and param mapping (MIT) | Inherits its gyp build, JS worker design, sharp coupling, and docs claims you would have to re-audit | 8–14 days |
| **New project, borrowing code** (recommended) | Everything below: native AsyncWorker, single-copy output, `open`/`unpack` split, full `params` + `rawparams` + `thumbs_list`, libjpeg, Docker build, static Electron-safe binary, no `sharp` dependency | Ongoing maintenance of a native package; LibRaw version bumps ~2/year | 13–23 days for phases 0–5 |

Recommendation: new project. Lift lightdrift's mechanical C++ (param setters, metadata struct→object code)
under MIT attribution where it saves typing; replace threading, build, packaging, and the JS layer.
Adopting 1.0.0 is a reasonable **interim** step for photoview (it would remove the `libraw-dev` requirement
immediately) if the new binding is more than a month away; budget a day to re-verify its Electron/Linux
`sharp` behaviour first.

## Phases

### Phase 0 — Scaffold and first decode (3–6 days, incl. OpenMP)

- Repo layout, CMake project, vendored LibRaw 0.22.2 + zlib + libjpeg-turbo (pinned tarballs, SHA-256).
- OpenMP from the start (static libgomp in the Linux container; libomp on macOS/Windows in Phase 3): measured
  2026-09-03 on photoview's 16 MP DNG, Ubuntu's OpenMP-enabled LibRaw runs PPG demosaic in 239 ms vs 520 ms
  single-threaded, and lightdrift 1.0.0's vendored build (no OpenMP, plus two 28–48 MB structured-clone copies)
  totals ~1210 ms vs ~700 ms native. Without OpenMP the binding regresses Linux users against distro builds.
- node-addon-api addon: `identify`, `unpack`, `thumbnail`, `process`, `image` as **synchronous** first;
  static, hidden-visibility Linux build inside Docker (Rocky 8 image).
- Tests with photoview's synthetic DNG generator + a couple of real files from `.private/testimages`.
- Exit: `node -e` decodes `IMGP5127.DNG` to RGB in Docker-built addon; `capabilities()` shows ZLIB+JPEG.

### Phase 1 — Async and cancellation (2–3 days)

- `Napi::AsyncWorker` per operation and a fused `decode(buffer, options)` worker; busy-state guard on the
  JS wrapper; `AbortSignal` → `setCancelFlag()`; progress callback mapped to an optional event.
- Output written by `copy_mem_image` into a pre-allocated V8 `Buffer`.
- Exit: worker JS thread stays responsive during a 1 s decode; abort returns within ~50 ms.

### Phase 2 — Full option and metadata surface (2–4 days)

- Generated mirror of `imgdata.params` and `imgdata.rawparams` (snake_case keys matching LibRaw docs, plus
  TypeScript types with doc comments), `thumbs_list`, sizes/idata/other/lens/color/gps, selected makernotes,
  `warnings` from `process_warnings`, `error_count`.
- Exit: `api-parity.json` diff against `libraw.h` is empty for the "safe" set; docs generated from it.

### Phase 3 — Prebuilds and CI (4–7 days)

- GitHub Actions: Docker linux-x64 + linux-arm64 (cross), macos-15 x64/arm64, windows-2022 x64;
  `prebuildify --napi --strip`; artifacts merged into `prebuilds/`; Electron smoke job per OS
  (`ELECTRON_RUN_AS_NODE=1`, Electron 42); `npm publish --provenance`.
- Exit: `npm install @janhapke/libraw` on all three OSes needs no compiler; Electron 42 loads it.

### Phase 4 — Electron hardening (1–2 days)

- `NODE_API_NO_EXTERNAL_BUFFERS_ALLOWED`, delay-load hook verified on Windows, symbol export list,
  `Addon<T>` instance data, worker_threads stress test (6 threads × 50 decodes), asar packaging test with a
  minimal Forge app.

### Phase 5 — photoview integration (2–3 days)

- Replace `LibRawPlugin`, `LibRawCameraMetadataPlugin`, `LibRawImageDimensionsPlugin`; add a `preview` tier
  based on `thumbs_list` selection with `half_size` fallback; wire cancellation into `DecodeWorkerPool`;
  drop `libraw-dev`, `electron-rebuild` for this module, and the `postinstall` `rmSync`.
- Re-run the benchmark harness; expected: `decode-preview` on RAW ≲ 60 ms, metadata ≲ 10 ms, `decode-full`
  ~15–30 % faster from copy savings and `user_qual` choice (before OpenMP).

### Phase 6 — OpenMP on macOS and Windows (1–3 days, uncertain)

- Linux is covered in Phase 0. macOS: Homebrew libomp static; Windows: clang-cl + libomp or MSVC `/openmp`.
  Benchmark `full` tier per platform; keep a build flag to disable.

### Phase 7 — Optional extras

- LCMS2 (`output_profile`/`camera_profile`): 1–2 days.
- 16-bit / float output path for an HDR viewer: 1–2 days.
- `open_bayer`, custom camera strings, DNG SDK: not planned.

## Total

Phases 0–5 (OpenMP on Linux included): **14–25 days**. Phase 6 (OpenMP on macOS/Windows) adds 1–3 uncertain
days. The full API surface (Phase 2) is not optional; see the goal statement at the top and
[adoption-comparison.md](adoption-comparison.md) for the measured numbers behind the OpenMP decision. Maintenance afterwards: a LibRaw bump is a
tarball pin + CI run; expect two per year.

## Risks

- Windows toolchain quirks (exceptions across the addon/LibRaw boundary with MSVC, delay-load) — mitigated
  by building on a real Windows runner first.
- LibRaw crashes on malformed files remain possible; keep photoview's worker crash budget.
- Benchmark expectations for `half_size` and OpenMP are estimates; measure before promising.
- Single-maintainer bus factor is now yours instead of lightdrift's.

## Decisions (Jan, 2026-09-03)

1. Package name: **`@janhapke/libraw`** (`libraw` on npm is taken by the 2017 package); GitHub repository
   **`janhapke/libraw-node`**.
2. Output interop: **return plain RGB buffers and make them drop-in `sharp` inputs**; no native JPEG encoder
   in v1. See [sharp interop](../how-to/use-with-sharp-and-worker-threads.md#sharp-interop). A vendored
   libjpeg-turbo *encoder* stays a possible later extra (~1 day) if profiling shows the sharp encode step matters.
3. Windows arm64: **not a target**.
4. Build hosting: **Docker for Linux, GitHub runners for macOS and Windows** is the final state. No Zig
   experiment.
5. 16-bit output: **not designed for now** (`output_bps` stays exposed, but the result API is 8-bit RGB;
   16-bit can be added later as a `bits: 16` variant of the same buffer shape).
