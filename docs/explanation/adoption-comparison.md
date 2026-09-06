# Adoption comparison: alpha.6 (today) vs lightdrift 1.0.0 vs the self-built binding

What photoview would gain at each step. "Measured" refers to the 2026-07-20 benchmark on the 16 MP Pentax
DNG; everything else is an estimate to be confirmed by re-running `benchmark:run`.

## What photoview actually runs today (checked 2026-09-03)

| Platform | LibRaw behind alpha.6 | Features |
|---|---|---|
| Linux (this machine) | Ubuntu `libraw_r.so` 0.21.5 | libjpeg **yes**, LCMS2 **yes**, OpenMP **yes** (libgomp), zlib **no** (`getCapabilities()` = JPEG only) |
| macOS | Homebrew `libraw` | typically libjpeg + LCMS2 + jasper; OpenMP unlikely with Apple clang (verify) |
| Windows | lightdrift's bundled `LibRaw-Win64/0.21.4` DLL | unknown; verify with `getCapabilities()` |

So on Linux the `full` tier already demosaics in parallel, lossy DNG works, and deflate-compressed DNG does
**not** (`LIBRAW_CAPS_ZLIB` unset). This is the baseline any replacement must not regress.

## Step 1: alpha.6 → lightdrift 1.0.0

| Area | Change | Expected effect |
|---|---|---|
| Install | Vendored LibRaw 0.22.2 + zlib compiled in; Node-API prebuilds for linux-x64/arm64, darwin-x64/arm64, win32-x64 | No `libraw-dev`, no `electron-rebuild` for this module; identical binary on every machine and in CI. **Largest practical win of this step.** |
| Formats | 0.21.5 → 0.22.2 (~1284 cameras, DNG 1.7 parsing, 64-bit offsets); zlib on | Newer bodies decode; deflate DNGs (float/HDR DNGs) start working on Linux |
| Formats, regression | No libjpeg in its build | **Lossy DNG stops working** on Linux/macOS where the system LibRaw had it. Check your library for lossy DNGs before switching. |
| Speed, regression | No OpenMP | `full` tier on Linux loses parallel AHD. Estimate: `dcraw_process` from ~550 ms to ~1.0–1.5 s on this 16 MP file unless you also switch to `user_qual: 0/2`. Measure. |
| Preview tier | `setOutputParams({ half_size: true, user_qual, use_camera_wb, ... })` | RAWs without a usable embedded preview get a real preview tier instead of the full decode (estimate 2–3× faster than full for that case); `user_qual: 2` (PPG) for `full` at screen size recovers part of the OpenMP loss |
| Wasted unpack | Low-level mirror exposes `openBuffer`/`unpack` separately | **If** the high-level API lets you open without unpacking, thumbnail path 378 → ~20–60 ms and metadata ~350 → ~5 ms. Must be verified against 1.0.0's `lib/stable/index.ts`; the alpha helper fused them. |
| Async | One `worker_threads` Worker per `LibRaw` instance, `AbortSignal` | Inside photoview's existing 2–6 worker pool this adds a thread per instance and a structured-clone copy per result (~48 MB for 16 MP). Cancellation becomes possible. Reuse instances (`recycle`) rather than `new LibRaw()` per call to avoid a thread spawn per image. Net latency effect ≈ neutral to slightly negative; responsiveness positive. |
| sharp coupling | Still depends on `sharp` 0.35 | `postinstall` `rmSync` hack and the nested-sharp Electron/Linux risk remain |
| Types | Real `.d.ts`, ESM/CJS | Delete the local shim |
| Risk | Single maintainer; API surface renamed between alpha and 1.0 (`./legacy` entry exists) | A migration day plus re-verification of the Electron/Linux crash path |

Net: mostly a **packaging and format-coverage** step with a real risk of two regressions on Linux
(lossy DNG, parallel demosaic). Effort 1–3 days including verification.

## Step 2: lightdrift 1.0.0 → self-built `@janhapke/libraw`

| Area | Change | Expected effect |
|---|---|---|
| No wasted work, guaranteed | `identify` / `thumbnail(i)` / `decode` are separate; `thumbs_list` exposed | Thumbnail tier: extract the ~1–2 MP embedded preview instead of the full-size JPEG when 400 px is requested → smaller sharp resize (estimate 378 → 15–40 ms). Metadata: ~5 ms. Grid of 100 RAWs: ~40 s of unpack → ~2–4 s. |
| Threading | `Napi::AsyncWorker` on the libuv pool; no worker-per-instance; instance per call is cheap | Removes the per-instance thread and the structured-clone copy; worker JS threads stay free for cancel/RPC. Estimate 30–60 ms saved per full decode from copy/thread overhead. |
| Output path | `copy_mem_image` straight into a V8 `Buffer`; result is a drop-in `sharp` raw input | One copy instead of three (lightdrift 1.0.0) or two (alpha.6): ~48–96 MB less memory traffic per 16 MP decode (~20–40 ms), lower peak RSS per worker |
| Features | libjpeg-turbo + zlib + (optional) LCMS2 vendored | Lossy **and** deflate DNG everywhere, identical on all three OSes |
| OpenMP (Phase 6) | Static libgomp/libomp | Restores parallel AHD on Linux; **adds** it on macOS/Windows where it was likely missing (estimate 2–4× on the demosaic stage there) |
| Options | Full `params` + `rawparams` (`shot_select`, `max_raw_memory_mb`, DNG stage bits) + `warnings` + `capabilities` | Multi-frame files, memory guard on malformed input, visible fallbacks |
| Cancellation | `AbortSignal` → `setCancelFlag` + progress callback | Superseded decodes stop within tens of ms instead of running to completion |
| Electron | Static, symbol-hidden, sidecar-free `.node`; `NODE_API_NO_EXTERNAL_BUFFERS_ALLOWED`; Electron 42 smoke in CI; no `sharp` dependency | No nested-sharp crash, no `postinstall` hack, no asar sidecar concerns; upgrades of Electron need no action |
| Reproducibility | Docker (Rocky 8) for Linux, pinned tarballs, `build-info.json` | Same binary from any machine; LibRaw bumps are a version pin + CI run |
| Cost | 13–23 days (+2–4 for OpenMP), then maintenance | |

## Measured after the migration (2026-09-03, `IMGP5127.DNG`, this machine, 16 cores)

| Stage | Ubuntu LibRaw 0.21.5, OpenMP | same, `OMP_NUM_THREADS=1` | lightdrift 1.0.0 (vendored 0.22.2) |
|---|---|---|---|
| open | ~1 ms | ~1 ms | 50–68 ms (28 MB input cloned into its worker) |
| unpack | 360–400 ms | 354 ms | 440–490 ms |
| dcraw_process, PPG | 239 ms | 520 ms | 530–570 ms |
| make_mem_image | 60 ms | 66 ms | 150–170 ms (48 MB result cloned back) |
| total | ~700 ms | ~940 ms | ~1210 ms |
| half_size total | 486 ms | 486 ms | 600–680 ms |
| AHD dcraw_process | 378 ms | 1330 ms | (not used) |

Embedded-JPEG thumbnail extraction after `openBuffer` costs 1–2 ms in 1.0.0; the old 378 ms was the wasted unpack.

## Summary per tier (16 MP DNG, this machine, medians)

| Tier | Today (alpha.6 + Ubuntu LibRaw) | lightdrift 1.0.0 (if open-without-unpack works) | Self-built v1 (no OpenMP) | Self-built + OpenMP |
|---|---|---|---|---|
| metadata (per plugin) | ~350 ms (est., unpack) | ~5 ms | ~5 ms | ~5 ms |
| thumbnail 400 px | 378 ms (measured) | ~40–80 ms (default largest thumb + resize) | ~15–40 ms (right-sized thumb) | same |
| preview (screen) | 378 ms (measured, embedded) or full | ~40–80 ms embedded; `half_size` fallback ~500 ms | ~40–80 ms; `half_size` fallback ~450 ms | ~40–80 ms; fallback ~400 ms |
| full (screen, AHD) | 1105 ms (measured, OpenMP AHD) | ~1.4–1.9 s (single-thread AHD) or ~1.0 s with `user_qual: 2` | ~1.3–1.7 s AHD / ~0.9 s PPG (single-thread, fewer copies) | ~0.9–1.0 s AHD / ~0.7 s PPG |
| lossy DNG | works (Linux/macOS) | fails | works | works |
| deflate DNG | fails on Linux | works | works | works |
| install on a fresh machine | apt + rebuild | `npm install` | `npm install` | `npm install` |

The numbers in the last three columns are estimates; the first benchmark run after Phase 0 replaces them.
