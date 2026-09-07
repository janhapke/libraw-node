# @janhapke/libraw

A general-purpose, Electron-safe Node.js binding for [LibRaw](https://www.libraw.org/), the RAW image
decoding library. Statically links LibRaw, zlib, and libjpeg-turbo, and no compiler is required on the
consumer's machine — prebuilt binaries ship per platform. On Linux, `libgomp.so.1` (GCC's OpenMP runtime,
used for parallel demosaic) is the one dynamic dependency beyond libc/libm/libpthread/libdl — every Linux
system with a GCC toolchain already has it; see the `target_link_libraries(addon PRIVATE gomp)` comment in
`CMakeLists.txt` for why it cannot be statically linked into a shared object with this toolchain. On
Windows (`win32-x64`), `VCOMP140.dll` (Microsoft's own OpenMP runtime, part of the Visual C++
Redistributable) is the equivalent dynamic dependency for the same reason — MSVC ships no static OpenMP
runtime at all; see [Building from source](#building-from-source) and
`docs/reference/build-matrix.md` for the full picture, including what happens on machines without that
redistributable installed.

This package is not scoped to any single consumer application — see
`docs/explanation/adoption-comparison.md` for the design rationale.

Status: full API implemented, tested (`npm test`, `npm run test:stress`), and built on all five platforms
below in CI (`.github/workflows/build.yml`, including the Electron smoke matrix); not yet published to npm
— see `docs/plan/tasks.md` for the task breakdown and `CHANGELOG.md` for what shipped.

## Install

```bash
npm i @janhapke/libraw
```

Prebuilt native binaries ship inside the npm package under `prebuilds/<platform>-<arch>/`; installing
never runs a compiler on your machine. Requires **Node.js ≥ 22**.

| Platform | Runtime dependency beyond libc | Notes |
|---|---|---|
| `linux-x64` | `libgomp.so.1` (GCC's OpenMP runtime) | Every Linux system with a GCC toolchain already has it |
| `linux-arm64` | `libgomp.so.1` | Same as `linux-x64`; built natively for aarch64 (no cross toolchain) |
| `darwin-x64` | none | OpenMP (`libomp`) linked statically — no extra runtime dependency |
| `darwin-arm64` | none | Same, native Apple Silicon build |
| `win32-x64` | `VCOMP140.dll` (part of the Visual C++ Redistributable) | MSVC ships no static OpenMP runtime at all; any MSVC-built Electron/Node app generally already needs the redistributable |

Linux package names for that runtime: `libgomp1` (Debian, Ubuntu), `libgomp` (Fedora, RHEL, Rocky), part of
`gcc-libs` (Arch). Desktop installs almost always have it; minimal containers (`node:slim` and similar) need
`apt-get install -y libgomp1` first. Electron apps packaged as `.deb` should list `libgomp1` in `depends`.
If it is missing, `require('@janhapke/libraw')` fails with a load error that names the package.

On Linux, `libgomp.so.1` (used for parallel demosaic) is the one dynamic dependency beyond
libc/libm/libpthread/libdl — see the `target_link_libraries(addon PRIVATE gomp)` comment in
`CMakeLists.txt` for why it cannot be statically linked into a shared object with this toolchain. On
Windows, `VCOMP140.dll` is the equivalent dynamic dependency for the same reason — MSVC ships no static
OpenMP runtime at all; see [Building from source](#building-from-source) and
`docs/reference/build-matrix.md` for the full picture, including what happens on machines without that
redistributable installed.

Under **Electron**, the addon needs no special handling beyond what any Node-API native module needs —
see `docs/how-to/make-the-addon-electron-safe.md` for the full checklist and
`docs/how-to/test-under-electron.md` for a smoke-test script. Verify with a display-less check:

```bash
ELECTRON_RUN_AS_NODE=1 npx electron -e "console.log(require('@janhapke/libraw').version())"
```

`sharp` is an **optional peer dependency**, only needed if you use [`toSharp()`](#sharp-interop) — this
package never `require`s it itself.

## Quick start

Both module systems are supported (`package.json`'s `exports` map, see [Module formats](#module-formats)
below). Decode a RAW file and re-encode a preview as JPEG via `sharp`:

**ESM**

<!-- quickstart:esm -->
```js
import { decode } from '@janhapke/libraw';
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';

const file = process.argv[2] ?? 'photo.NEF';
const buffer = await readFile(file);
const image = await decode(buffer, { params: { use_camera_wb: true } });
const jpeg = await image.toSharp(sharp).resize({ width: 1620, fit: 'inside' }).jpeg({ quality: 90 }).toBuffer();
await writeFile('preview.jpg', jpeg);
console.log('PASS', image.width, image.height);
```

**CommonJS**

<!-- quickstart:cjs -->
```js
const { decode } = require('@janhapke/libraw');
const sharp = require('sharp');
const fs = require('node:fs/promises');

(async () => {
  const file = process.argv[2] ?? 'photo.NEF';
  const buffer = await fs.readFile(file);
  const image = await decode(buffer, { params: { use_camera_wb: true } });
  const jpeg = await image.toSharp(sharp).resize({ width: 1620, fit: 'inside' }).jpeg({ quality: 90 }).toBuffer();
  await fs.writeFile('preview.jpg', jpeg);
  console.log('PASS', image.width, image.height);
})();
```

## Module formats

`package.json`'s `exports` map serves an ESM entry point (`lib/index.mjs`, a thin wrapper re-exporting
every name from the CommonJS entry) under the `import` condition and the CommonJS entry point
(`lib/index.cjs`, `main`) under `require`/`default`, plus `types/index.d.ts` under `types`:

```js
import { decode } from '@janhapke/libraw';          // ESM named import
import libraw from '@janhapke/libraw';               // ESM default import
const { decode } = require('@janhapke/libraw');      // CommonJS
```

## API overview

### Module-level functions

Stateless, one-shot helpers — each opens its own LibRaw instance internally and cleans it up when done.
All three accept `{ signal }` (an `AbortSignal`) for cancellation.

| Function | Returns | Notes |
|---|---|---|
| `decode(buffer, options?)` | `Promise<{ width, height, colors, bits, stride, data, flip, warnings }>` | Full pipeline: open → unpack → process → copy. `options.params`/`options.rawparams` accept any key from [`docs/reference/params.md`](docs/reference/params.md) / [`rawparams.md`](docs/reference/rawparams.md). |
| `identify(buffer, options?)` | `Promise<{ sizes, idata, thumbs, decoder, warnings, metadata }>` | Open + size/metadata read only, no pixel decode — cheap. `metadata` is the full manifest-driven mirror, see [`docs/reference/metadata.md`](docs/reference/metadata.md). |
| `thumbnail(buffer, options?)` | `Promise<{ format, width, height, flip, colors, bits, data }>` | Extracts an embedded thumbnail/preview (`options.index` selects among `identify().thumbs`). `format` is `'jpeg' \| 'bitmap' \| 'bitmap16' \| 'jxl' \| 'h265' \| 'unknown'`. |
| `decodeSync(buffer, options?)` | `{ width, height, colors, bits, data }` | Legacy single-shot synchronous decode (predates `Processor`/the fused helpers). Prefer `decode()` for new code; kept for benchmarking (`{ stages: true }`) and simple scripts. Its error shape differs from `LibRawError` — see the JSDoc in `types/index.d.ts`. |
| `version()`, `versionNumber()`, `capabilities()`, `capabilityNames()`, `warningNames(mask)`, `cameraCount()`, `cameraList()` | — | Build/version/capability introspection; no LibRaw instance involved. |
| `buildInfo` | `object` | LibRaw/zlib/libjpeg-turbo versions, whether OpenMP is compiled in, compiler, flags, build date, git commit. |
| `enums` | `object` | Every enum in LibRaw's `libraw_const.h` — see [Enums and flags](#enums-and-flags) below. |
| `progressStages` | `object` | `LibRaw_progress` short stage name → numeric code, for comparing against a `progress` event's `stage`. |

### `Processor` — staged, stateful API

For callers who want to hold a decode session open across steps (inspect metadata before deciding whether
to process, extract a thumbnail without a full decode, reuse cancellation/events, ...). Extends
`EventEmitter`. Every stage has a synchronous (`*Sync`) and a Promise-returning async twin; the async twins
run on libuv's threadpool so the JS thread stays free, accept `{ signal }` for cancellation, and reject
with `LibRawError` (`name: 'ERR_LIBRAW_BUSY'`) if called while another async call on the same `Processor`
is already in flight.

```js
const { Processor } = require('@janhapke/libraw');

const proc = new Processor({ exifTags: true });
proc.on('progress', ({ stage, iteration, expected }) => console.log(stage, iteration, expected));
proc.on('dataError', ({ offset, message }) => console.warn('data error', offset, message));

const controller = new AbortController();
await proc.openBuffer(buffer, { signal: controller.signal });
proc.setParams({ use_camera_wb: true, output_bps: 16 });
await proc.unpack({ signal: controller.signal });
console.log(proc.metadata.idata.make, proc.metadata.sizes.oriented);
await proc.process();
const image = proc.imageSync();          // { width, height, colors, bits, data }
proc.recycle();                           // ready for another open*
proc.close();                             // frees the LibRaw instance
```

Staged methods: `openBufferSync`/`openBuffer`, `openFileSync`/`openFile`, `unpackSync`/`unpack`,
`unpackThumbSync`/`unpackThumb`, `processSync`/`process`, `imageSync`/`image`, `thumbSync`/`thumb`,
`adjustSizesInfoOnlySync`/`adjustSizesInfoOnly`, plus `recycle()`, `close()`, `setParams`/`getParams`,
`setRawParams`/`getRawParams`, the `metadata` getter, and read accessors (`errorCount`, `decoderInfo`,
`unpackFunctionName`, `isFujiRotated`, `isSraw`, `isNikonSraw`, `isCoolscanNef`, `isJpegThumb`,
`isFloatingPoint`, `haveFpData`, `srawMidpoint`, `color(row, col)`, `thumbOK(maxsz?)`). Full signatures and
JSDoc are generated into `types/index.d.ts`.

Cancellation: pass `{ signal }` (a standard `AbortSignal`) to any async method or module-level helper.
Aborting rejects the pending promise with a `LibRawError` (`name: 'LIBRAW_CANCELLED_BY_CALLBACK'`,
`aborted: true`); see `docs/how-to/cancel-and-track-progress.md`.

Events: `'progress'` (`{ stage, iteration, expected }`), `'dataError'` (`{ offset, message }`), and —
only when constructed with `{ exifTags: true }` — `'exifTag'` (`{ tag, type, len, ordering }`). Buffered
during the job and emitted once it settles (not delivered live).

### Parameters and metadata

`setParams`/`getParams` (LibRaw's `libraw_output_params_t`) and `setRawParams`/`getRawParams`
(`libraw_raw_unpack_params_t`) are generated from LibRaw's own header with full validation (type, array
length, enum/range checks — an unknown key throws `TypeError` naming it). Every settable field, its type,
default, and doc string: [`docs/reference/params.md`](docs/reference/params.md) and
[`docs/reference/rawparams.md`](docs/reference/rawparams.md). `decode()`/`identify()` accept the same keys
under `options.params`/`options.rawparams`.

`identify().metadata` / `Processor#metadata` mirror LibRaw's post-open state (`idata`, `sizes` including
`oriented` width/height, `other` including parsed GPS, `lens`, `color` including matrices and
`cam_mul`/`pre_mul`, and per-vendor `makernotes`). Full field reference:
[`docs/reference/metadata.md`](docs/reference/metadata.md).

### Enums and flags

Every enum in LibRaw's `libraw_const.h` (warnings, capabilities, decoder flags, raw-unpack options,
thumbnail/image formats, progress stages, error codes, colorspaces, camera-maker/mount/format indexes,
...) is extracted by `scripts/gen-enums.js` into `api/enums.json` and re-exported from the package as
`enums`, an object of named tables:

```js
const { enums, capabilityNames, warningNames, capabilities, decode } = require('@janhapke/libraw');

enums.WARN.NAME_TO_VALUE.FALLBACK_TO_AHD;        // 32768 (1 << 15)
enums.CAPS.NAME_TO_VALUE.ZLIB;                   // 64    (1 << 6)
enums.all.LibRaw_processing_options.NAME_TO_VALUE.PENTAX_PS_ALLFRAMES; // every enum, by its C type name
```

`enums.all` has one entry per C enum name (e.g. `enums.all.LibRaw_warnings`); `enums.WARN`, `enums.CAPS`,
`enums.DECODER`, `enums.RAWOPTIONS`, `enums.PROGRESS`, `enums.ERRORS`, `enums.THUMBNAIL_FORMATS`,
`enums.INTERNAL_THUMBNAIL_FORMATS`, and `enums.IMAGE_FORMATS` are short aliases for the families most
callers reach for. Each table is `{ kind: 'flags' | 'enum', NAME_TO_VALUE, VALUE_TO_NAME, VALUE_TO_NAMES }`
keyed by the *short* name — the enumerator's C name (e.g. `LIBRAW_WARN_FALLBACK_TO_AHD`) with the enum's
common `LIBRAW_..._` prefix stripped (`FALLBACK_TO_AHD`). Full listing:
[`docs/reference/enums.md`](docs/reference/enums.md).

Two convenience functions built on the CAPS/WARN tables:

- `capabilityNames()` — the short names of `capabilities()`'s set bits, e.g. `['ZLIB', 'JPEG']`.
- `warningNames(mask)` — the short names of a `LIBRAW_WARN_*` bitmask's set bits, e.g.
  `warningNames(1 << 15) === ['FALLBACK_TO_AHD']`.

`decode()`/`identify()` results carry `warnings: string[]` using these same short names (so
`LIBRAW_WARN_FALLBACK_TO_AHD` reports as `'FALLBACK_TO_AHD'`, not the full `LIBRAW_*` name).

### Errors

Every `Processor` method and every async method/fused helper throws/rejects a `LibRawError` on a
LibRaw-level failure: `code` (LibRaw's numeric error code), `name` (the `LIBRAW_*` enumerator name, e.g.
`'LIBRAW_OUT_OF_ORDER_CALL'`, or `'ERR_LIBRAW_BUSY'` for the busy guard), `stage` (which method), and
`aborted: true` only for cancellations. Argument-validation failures (wrong type, wrong-size buffer, ...)
throw a plain `TypeError`/`RangeError` instead. `decodeSync` predates `LibRawError` and keeps its own
shape — see `types/index.d.ts`'s `DecodeSyncResult` doc comment.

### Sharp interop

`sharp`'s prebuilt libvips has no LibRaw loader, so a result object's `toSharp(sharpModule)` method hands
sharp the already-decoded pixel buffer instead — the same thing sharp does internally for raw input, no
extra copy. Available on `decode()` results, `Processor#imageSync()`/`#image()` results, and thumbnail
results (`thumbnail()`, `Processor#thumbSync()`/`#thumb()`) regardless of format:

```js
import sharp from 'sharp';
import { decode } from '@janhapke/libraw';

const image = await decode(buffer, { params: { use_camera_wb: true } });
const pipeline = image.toSharp(sharp);   // sharp(image.data, { raw: { width, height, channels: colors } })
const jpeg = await pipeline.resize({ width: 1620, fit: 'inside' }).jpeg({ quality: 95 }).toBuffer();
```

For a bitmap-format thumbnail/image, `toSharp` wraps the raw pixel buffer the same way (using a
`Uint16Array` view, still no copy, for `bits === 16` — e.g. `output_bps: 16` — since sharp infers raw-input
sample depth from the buffer's typed-array class rather than an option key). For a JPEG-format thumbnail,
`toSharp` hands the JPEG bytes straight to `sharpModule(data)`, letting sharp decode them itself. This
package never `require`s `sharp` — it is an optional peer dependency
(`peerDependenciesMeta.sharp.optional: true`); `toSharp`'s type is a structural
`<S extends (input: Buffer, options?) => any>(sharp: S) => ReturnType<S>`, not sharp's own types. See
`docs/how-to/use-with-sharp-and-worker-threads.md` ("Sharp interop") for the full rationale.

## Concurrency and threads

`decode`, `identify`, and `thumbnail` each run one fused `Napi::AsyncWorker` job on libuv's threadpool;
every call opens and owns its own LibRaw instance for the duration of that call, so any number of calls
can run truly concurrently — there is no shared LibRaw state between them (T17's stress test,
`test/stress.test.ts`, exercises this directly: 6 `worker_threads` each firing 50 concurrent `decode()`
calls, with every result's checksum verified against a single-threaded reference).

- **libuv threadpool size.** Node's threadpool defaults to **4** threads (`UV_THREADPOOL_SIZE`, up to
  1024 — see `docs/how-to/cancel-and-track-progress.md`). More than 4 concurrent
  `decode`/`identify`/`thumbnail` calls (or `Processor` async calls) queue
  behind that limit rather than truly overlapping. `UV_THREADPOOL_SIZE` must be set in the environment
  **before Node's first async call that uses the threadpool** — setting `process.env.UV_THREADPOOL_SIZE`
  from JS after startup has no effect, since libuv reads it once when the pool is first created. Under
  Electron, set it before `app.whenReady()` in the main process (or before the addon is first used in a
  utility process) — see `docs/how-to/make-the-addon-electron-safe.md`.
- **`Processor` is single-job-at-a-time.** A second async call on the same `Processor` instance while one
  is already in flight rejects immediately with a `LibRawError` named `ERR_LIBRAW_BUSY` (a synchronous
  accessor called during that window throws the same) — it does not queue. Run more `Processor` instances
  (or use the stateless `decode`/`identify`/`thumbnail` helpers, which need no such guard since each owns
  its own instance) for concurrent work.
- **OpenMP threads inside `dcraw_process`.** Independently of libuv, LibRaw's own demosaic step parallelises
  with OpenMP (`buildInfo.openmp`); by default each concurrent decode spins up its own OpenMP thread pool
  sized to the host's core count. Running several decodes in parallel therefore **multiplies** thread
  count: total OS threads in flight ≈ (libuv threadpool size, or number of concurrent `Processor`s) ×
  `OMP_NUM_THREADS` (host core count if unset). On a 16-core host, 4 concurrent decodes at the OpenMP
  default already means up to 64 threads contending for 16 cores — oversubscription that slows every
  individual decode down without increasing overall throughput. Set `OMP_NUM_THREADS` explicitly (e.g. to
  `cores / threadpool-size`, or `1` to let libuv-level concurrency be the only parallelism) when running
  many decodes side by side; like `UV_THREADPOOL_SIZE`, it must be set in the process environment before
  the addon's first decode (see the comment in `test/helpers/processor-progress-subprocess.cjs` — once
  libgomp's pool exists, changing `process.env.OMP_NUM_THREADS` from JS no longer has any effect).
- **Memory per in-flight decode.** Each concurrent `decode()`/`Processor` pipeline holds the still-packed
  RAW buffer, LibRaw's internal unpacked sensor data, and the processed output buffer simultaneously at
  points during the pipeline — roughly **3–4× the final output buffer's size** per job (e.g. a
  4950×3284×3-byte ~48 MB RGB output implies on the order of 150–200 MB of peak resident memory for that
  one decode). Budget accordingly when choosing how many decodes to run at once: `RAM ≈ concurrency ×
  4 × expected_output_bytes`, plus per-thread OpenMP overhead. `test/stress.test.ts` measures RSS growth
  across 300 decodes (6 workers × 50 each) directly — see that file for the methodology (`npm run
  test:stress`).

## Building from source

Prebuilt binaries cover the platforms in `docs/reference/build-matrix.md`. On Linux, everything compiles
inside Docker — no compiler is required on the host:

```bash
npm run build:linux        # scripts/build-linux.sh x64 — builds scripts/linux-build.Dockerfile,
                            # compiles LibRaw/zlib/libjpeg-turbo/the addon statically inside it, and
                            # copies the stripped result to prebuilds/linux-x64/node.napi.node
```

macOS and Windows have no Docker/cross-compilation path (Xcode and MSVC are only licensed/available on
their own OS) and build natively instead: `scripts/build-native.sh darwin-x64|darwin-arm64` (macOS,
requires Xcode command line tools and, for OpenMP, `brew install libomp`) and
`scripts/build-native.ps1 -Target win32-x64` (Windows, requires Visual Studio 2022's MSVC toolset — via a
Developer Command Prompt or `ilammy/msvc-dev-cmd` in CI — plus `nasm` on `PATH` for libjpeg-turbo's SIMD
and CMake/Ninja). Both are what `.github/workflows/build.yml`'s `build-macos`/`build-windows` jobs run;
see those scripts' own header comments for the platform-specific details (node.lib synthesis and the
delay-load hook on Windows, static `libomp` linking on macOS).

See `docs/how-to/build-from-source.md` for what the Docker image contains and why, and
`docs/explanation/build-and-distribution-strategy.md` for the overall prebuild strategy.

## Testing

`npm test` runs the vitest suite (`test/`) against the committed synthetic PM5544 DNG fixture
(`test/fixtures/pm5544-768x576.dng` — see `test/fixtures/README.md`), no real camera files needed.

Real-camera-file tests are gated on the `LIBRAW_TEST_IMAGES` environment variable (a directory of RAW
files) and skip themselves when it is unset:

```bash
LIBRAW_TEST_IMAGES=/path/to/raw/files npm test
```

On this development machine, `/home/jan/dev/photoview/.private/testimages` is a valid value.

`npm run test:stress` (`test/stress.test.ts`, `vitest.stress.config.mts`) runs the T17 concurrency/memory
stress suite — 6 `worker_threads` × 50 `decode()` calls each against a real RAW file, checksum-verified
against a single-threaded reference, with an RSS-growth assertion. It needs `LIBRAW_TEST_IMAGES`, takes
several minutes, and is excluded from the default `npm test` run (`vitest.config.mts`) for that reason —
see the [Concurrency and threads](#concurrency-and-threads) section above:

```bash
LIBRAW_TEST_IMAGES=/path/to/raw/files npm run test:stress
```

## Benchmark

`scripts/bench.cjs` (T25) times `identify()`, `thumbnail()`, and `decode()` at three settings
(`half_size + user_qual: 2`, `user_qual: 2`, `user_qual: 3`) against every RAW file in a directory, plus a
`decodeSync(..., { stages: true })` per-stage breakdown at `user_qual: 2`. Each operation runs once as a
warm-up, then `--iterations` times (default 5) sequentially — never overlapping, so the reported numbers
are single-job latencies, not throughput:

```bash
LIBRAW_TEST_IMAGES=/path/to/raw/files npm run bench -- "$LIBRAW_TEST_IMAGES"
npm run bench -- <dir-or-file...> [--iterations N] [--json <path>] [--no-write] [--host <name>]
```

The printed table shows, per file, its dimensions and the median time for each operation, followed by the
per-stage breakdown table (`open`/`unpack`/`process`/`copy`); an environment header above both records the
package and LibRaw versions, `buildInfo.openmp`/compiler, CPU count and model, `OMP_NUM_THREADS`,
`UV_THREADPOOL_SIZE`, and the Node/platform/arch this run used. Unless `--no-write` is given, the full
results (median/min/max and every raw sample, paths anonymised to basenames) are also written to
`bench/<date>-<host>.json`. See [`bench/`](./bench/) for committed results from this project's development
machine, and `docs/explanation/adoption-comparison.md` for how these numbers compare to the
pre-migration estimates.

## Releasing

Releases are cut from a clean `main` with `scripts/release.sh` (T23), then published by CI:

```bash
scripts/release.sh 0.1.0             # interactive: gen:check, npm test, version bump, CHANGELOG
                                      # confirmation, commit "release: v0.1.0", tag v0.1.0
git push origin main --follow-tags   # printed by the script, never run automatically
```

Pushing the `vX.Y.Z` tag triggers `.github/workflows/build.yml`'s `package` job (after every platform's
build + test jobs are green), which regenerates and checks `THIRD_PARTY_NOTICES.md`
(`scripts/gen-notices.js --check`), verifies the tag matches `package.json`'s version, and runs
`npm publish --provenance --access public` using the `NPM_TOKEN` secret. See
[`docs/how-to/set-up-prebuilds-and-ci.md`](./docs/how-to/set-up-prebuilds-and-ci.md) §5 for the full
checklist, including bumping `scripts/versions.env`/submodules first when the release includes a vendored
version bump.

`scripts/release.sh <version> --dry-run` rehearses steps 2–5 (checks, version bump, CHANGELOG check)
without committing, tagging, or leaving any change in the working tree — useful to validate a version
string and confirm the CHANGELOG entry exists before doing it for real. `--yes` skips the interactive
CHANGELOG confirmation (fails instead of prompting if the section is missing); `--push` runs the `git
push` above automatically instead of only printing it.

Locally, `npm pack --dry-run` and `npm publish --dry-run` are useful sanity checks before tagging — see
`docs/how-to/set-up-prebuilds-and-ci.md` for what each is expected to report (only the Linux prebuilds
present locally, so the reported size is smaller than what CI's `package` job reports with all five).

## License

MIT for the binding itself. Vendored/linked components carry their own licences:

- **LibRaw** — dual-licensed upstream; this package elects the **CDDL 1.0** (Common Development and
  Distribution License, Version 1.0) for the vendored copy (an alternative **GNU LGPL 2.1** election is
  also available upstream, see `vendor/LibRaw/LICENSE.LGPL`). CDDL permits static linking into this addon
  without requiring relinkability.
- **zlib** — zlib licence.
- **libjpeg-turbo** — a combination of the IJG (Independent JPEG Group) licence, the modified BSD licence
  (BSD-3-Clause), and the zlib licence.
- **libgomp** (GCC's OpenMP runtime, linked dynamically on Linux — see the note at the top of this file) —
  GPL-3 with the GCC Runtime Library Exception, which permits this use.
- **libomp** (LLVM's OpenMP runtime, linked statically on macOS from Homebrew's `libomp` keg) —
  Apache-2.0 with the LLVM exception.
- **VCOMP140.dll** (Microsoft's own OpenMP runtime, linked dynamically on Windows — see the note at the
  top of this file) — not vendored or redistributed by this package; ships with the Visual C++
  Redistributable, which any MSVC-built consumer (Electron included) generally already requires.

Full texts and per-component versions: [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) and
[`docs/explanation/licensing.md`](./docs/explanation/licensing.md).
