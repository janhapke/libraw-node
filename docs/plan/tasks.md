# `@janhapke/libraw` — task breakdown for agent execution

Each task is self-contained: paste the **Common rules** block plus one task into a fresh Claude Code session.
Tasks are ordered; each assumes the previous ones are merged. Every task ends with acceptance criteria an
agent can verify from a terminal without a display. macOS and Windows work is verified through GitHub
Actions results (`gh run view`), never locally.

---

## Common rules (paste with every task)

- Repository: `/home/jan/dev/libraw-node`, published as npm package `@janhapke/libraw`, GitHub repo
  `janhapke/libraw-node` (the research docs under `docs/` are the design; read the files the
  task names before coding, and keep them accurate: if you learn something that contradicts a doc, fix the
  doc in the same change).
- The package is a **general-purpose open-source Node.js binding for LibRaw** (`@janhapke/libraw`, MIT,
  LibRaw under CDDL 1.0). photoview is the first consumer, not the scope. Never trim the API to what
  photoview uses.
- Host machine rules: never install compilers, headers or system libraries on the host and never use the
  host's `g++`; every native build runs inside Docker via the repo's scripts. Node 24 and npm are available
  on the host. Docker is available.
- No display is available: never launch an Electron window. Electron checks use
  `ELECTRON_RUN_AS_NODE=1 npx electron <script>`.
- Verification means running the listed commands and quoting their actual output in your final report.
  If a criterion cannot be met, say so explicitly; do not weaken the criterion.
- Keep changes in one commit per task on a branch named after the task id (`task/T03-cmake-libraw`), with a
  message that starts with the task id. Do not push unless the task says so.
- Pin every third-party input (tarball SHA-256 or git tag). No `latest` anywhere.
- Style: TypeScript for JS-side code, C++17 with node-addon-api for the addon, CMake for the build,
  `NAPI_VERSION=8`, `-DNODE_API_NO_EXTERNAL_BUFFERS_ALLOWED`. Parameter and field names mirror LibRaw's C
  names (snake_case) verbatim.

---

## Risk ratings (read before scheduling)

| Rating | Tasks | Meaning |
|---|---|---|
| green | T01, T02, T04, T06, T07, T09, T11, T12, T13, T15, T16, T17, T18, T22, T25, T26 | Expected to pass in one session; all verification is local. |
| amber | T00, T03, T08, T10, T14a, T19, T24 | One or two build/test iterations expected; keep the session to this task only. |
| red | T14b, T20, T21, T28 | Needs a platform the agent cannot touch locally, or open research; expect several CI rounds and human attention. For T20/T21 the first pass may ship with `openmp: false` (see task text). |

## Phase 0 — Scaffold, Linux build in Docker, first decode, OpenMP

### T00 — Spike: static LibRaw + zlib + libjpeg-turbo + OpenMP in the Rocky container (no Node)

Read: `docs/how-to/build-libraw-addon-in-docker.md` §2–§3, `docs/explanation/adoption-comparison.md`.

Do: with only the Dockerfile from T02's description (create it now; T02 reuses it), build the three vendored
libraries statically inside the container and compile `vendor/LibRaw/samples/simple_dcraw.cpp` (or a
20-line timing program) against them with `-fopenmp` and static `libgomp`. No Node-API code in this task.
Throwaway output under `build/spike/`, committed as a script `scripts/spike-static-libraw.sh` only.

Acceptance:
- The binary runs `IMGP5127.DNG` (real-files dir: `/home/jan/dev/photoview/.private/testimages`) and prints per-stage timings; `ldd` on it shows no
  `libgomp`, `libjpeg`, `libz`; `OMP_NUM_THREADS=1` makes `dcraw_process` with `user_qual=3` at least 2×
  slower than the default run (paste both).
- Record in the script header which libjpeg-turbo/zlib CMake option names and which LibRaw source
  directories were needed; T03 reuses them verbatim.

### T01 — Repository scaffold and pinned vendor inputs

Read: `docs/explanation/build-and-distribution-strategy.md`, `docs/explanation/licensing.md`,
`docs/reference/build-matrix.md` ("Inputs (pinned)").

Do:
1. `git init` if needed. Create `package.json` (`name: @janhapke/libraw`, `repository: github:janhapke/libraw-node`, `version: 0.0.0`, `license: MIT`,
   `engines.node: ">=22"`, `main: lib/index.cjs`, `types: types/index.d.ts`, `files: [lib, types, prebuilds,
   THIRD_PARTY_NOTICES.md, LICENSE]`, scripts placeholders `build:linux`, `test`), `.gitignore`
   (`node_modules`, `build/`, `prebuilds/`, `dist/`), `LICENSE` (MIT), `README.md` stub, `CHANGELOG.md`.
2. Add vendored sources as git submodules pinned to release tags, recorded in `scripts/versions.env`:
   `vendor/LibRaw` (https://github.com/LibRaw/LibRaw, tag `0.22.2`), `vendor/zlib`
   (https://github.com/madler/zlib, latest `v1.3.x` tag), `vendor/libjpeg-turbo`
   (https://github.com/libjpeg-turbo/libjpeg-turbo, latest `3.x` tag). Record each tag and commit hash in
   `versions.env`.
3. Create `THIRD_PARTY_NOTICES.md` listing LibRaw (CDDL 1.0 election, with the LGPL alternative
   mentioned), zlib, libjpeg-turbo (IJG + BSD-3 + zlib), node-addon-api (MIT), each with version and a
   copy of (or path to) the licence text from the submodule.
4. `npm i node-addon-api@^8 node-api-headers node-gyp-build` and `npm i -D typescript vitest` (or jest;
   pick one and keep it).

Acceptance:
- `git submodule status` shows three submodules at the tags recorded in `scripts/versions.env`
  (paste output).
- `grep -c CDDL THIRD_PARTY_NOTICES.md` ≥ 1; `grep -n "LIBRAW_MINOR_VERSION 22" vendor/LibRaw/libraw/libraw_version.h`
  matches.
- `node -p "require('./package.json').name"` prints `@janhapke/libraw`.

### T02 — Docker build image and a hello-world Node-API addon built in it

Read: `docs/how-to/build-libraw-addon-in-docker.md` (§2, §4, §5), `docs/how-to/make-the-addon-electron-safe.md`.

Do:
1. `scripts/linux-build.Dockerfile`: `rockylinux/rockylinux:8-ubi-init`, `gcc-toolset-14-gcc-c++`, `cmake`
   (≥ 3.25; install from Kitware tarball if the dnf one is older), `make`, `git`, `nasm`, `python3`, Node
   `24.x` from nodejs.org (version from `versions.env`). Pin the base image by digest.
2. `scripts/build-linux.sh <x64>`: builds the image, runs CMake configure + build inside the container as
   the host uid, copies the result to `prebuilds/linux-x64/node.napi.node`, strips it.
3. `CMakeLists.txt` building `src/addon.cc` (exports `hello() → 'ok'` and `napiVersion`), with
   `-fvisibility=hidden`, `cmake/napi.map` version script exporting only `napi_register_module_v1` and
   `node_api_module_get_api_version_v1`, `-static-libstdc++ -static-libgcc`.
4. `lib/index.cjs` loading via `node-gyp-build`.
5. `scripts/check-binary.sh <file>`: prints `NEEDED` entries, exported dynamic symbols, and max `GLIBC_`
   version; exits non-zero if NEEDED contains anything other than libc/libm/libpthread/libdl/ld-linux, if
   exported symbols other than the two napi ones exist, or if glibc > 2.28.

Acceptance:
- `./scripts/build-linux.sh x64` succeeds with no compiler on the host (`which g++` may exist but must not
  appear in the build log).
- `node -p "require('./lib/index.cjs').hello()"` prints `ok`.
- `./scripts/check-binary.sh prebuilds/linux-x64/node.napi.node` exits 0 (paste its output).

### T03 — Compile LibRaw, zlib, libjpeg-turbo and OpenMP statically into the addon

Read: `docs/how-to/build-libraw-addon-in-docker.md` §3, `docs/reference/build-matrix.md`
("Compiler flags"), `docs/explanation/what-is-libraw.md` (dependencies table, threading model),
`docs/explanation/adoption-comparison.md` (measured table: why OpenMP is required).

Do:
1. CMake: add zlib and libjpeg-turbo as static subprojects (no shared, no turbojpeg, no programs); compile
   LibRaw's `src/**/*.cpp` (mirror `vendor/LibRaw/Makefile.dist`'s directory list; exclude samples and
   x3f if not needed) into a static `raw_r` target with `LIBRAW_NODLL USE_ZLIB USE_JPEG8`, **never**
   `LIBRAW_NOTHREADS`, `-fopenmp`, and link `libgomp` statically (`-Wl,-Bstatic -lgomp -Wl,-Bdynamic`
   or CMake's `OpenMP::OpenMP_CXX` plus static flags). Provide `-DLIBRAW_NODE_OPENMP=ON` default ON.
2. Addon exports `version()`, `versionNumber()`, `capabilities()` (number), `cameraCount()`,
   `cameraList()`, `buildInfo` (object: LibRaw version, zlib, libjpeg-turbo, OpenMP on/off, compiler,
   flags, build date, git commit) written at configure time into a generated header.
3. Extend `scripts/check-binary.sh` to also fail if `libgomp`, `libjpeg`, `libz` appear in NEEDED.

Acceptance:
- `node -e "const l=require('./lib/index.cjs');console.log(l.version(), l.capabilities(), l.buildInfo)"`
  prints a version starting with `0.22.2` and a capabilities value with bits 64 (ZLIB) and 128 (JPEG) set
  (`(caps & 192) === 192`).
- `./scripts/check-binary.sh prebuilds/linux-x64/node.napi.node` exits 0 and its NEEDED list has no gomp,
  jpeg or z.
- `node -p "require('./lib/index.cjs').cameraCount()"` ≥ 1200.

### T04 — Test fixtures and a synchronous first decode

Read: `docs/tutorials/01-first-decode.md`, `/home/jan/dev/photoview/tests/fixtures/README.md` and
`GeneratePm5544Dng.ts` / `TiffIfdWriter.ts` (copy the generator, keep its attribution), knowledge base
`/home/jan/dev/_jdd/knowledge-base/dng-generation.md`.

Do:
1. `test/fixtures/`: port the synthetic DNG generator (TypeScript, run with `tsx` or compiled) and commit
   the generated `pm5544-768x576.dng` plus a second, deflate-compressed variant if the generator can be
   extended cheaply (else note it as a follow-up in T10). Add a real-files hook: tests read
   `LIBRAW_TEST_IMAGES` (a directory) and skip real-file cases when unset. Document that
   `/home/jan/dev/photoview/.private/testimages` is a valid value on this machine.
2. Addon: `decodeSync(buffer, { half_size?, user_qual?, use_camera_wb? })` as in the tutorial, writing
   through `copy_mem_image` into a V8-allocated `Buffer` (no external buffers).
3. Test: decode the synthetic DNG; assert 768×576×3, and assert a few known PM5544 colour-bar pixels are
   within tolerance of the source PNG (use the committed `pm5544-source.png` and a tiny PNG decoder or
   `sharp` as a devDependency).

Acceptance:
- `npm test` passes and prints the synthetic-decode timing.
- With `LIBRAW_TEST_IMAGES=/home/jan/dev/photoview/.private/testimages npm test`, real-file tests run and
  pass for `IMGP5127.DNG`, `DSC_4985.NEF`, `P3210619.ORF` (dimensions 4950×3284, 3900×2613, 4014×3016
  after flip handling as reported by LibRaw).

### T05 — OpenMP effect verification and stage timing tool

Read: `docs/explanation/adoption-comparison.md` (measured table).

Do:
1. `scripts/bench-stages.cjs <file> [user_qual] [half_size]`: times open, unpack, dcraw_process,
   copy separately (addon exposes a `decodeSyncTimed` variant or a `stages` option that returns per-stage
   ms), prints a one-line JSON.
2. Run with `OMP_NUM_THREADS=1` and unset on `IMGP5127.DNG`, `user_qual` 2 and 3.

Acceptance:
- On this 16-core machine, `dcraw_process` with `user_qual=3` is at least 2× faster with OpenMP on than
  with `OMP_NUM_THREADS=1` (reference: 378 ms vs 1330 ms in the system LibRaw); paste both JSON lines.
- Total `open+unpack+process+copy` for `user_qual=2` is ≤ 800 ms (reference: ~700 ms native, ~1210 ms via
  lightdrift 1.0.0).

---

## Phase 1 — Real asynchronous API with cancellation

### T06 — Processor object, error model, synchronous staged methods

Read: `docs/reference/proposed-binding-api.md`, `docs/reference/libraw-processing-methods.md`,
`docs/how-to/implement-async-decode-with-cancellation.md` §1.

Do:
1. `Processor` (`Napi::ObjectWrap`) holding `std::unique_ptr<LibRaw>`, created with optional
   `{ flags }`; per-env instance data via `Napi::Addon<T>` (no static `FunctionReference`).
2. `LibRawError` (JS class, exported) with `code` (numeric LibRaw code), `name` (e.g.
   `LIBRAW_IO_ERROR`), `stage`, `message`; the C++ side maps every `LIBRAW_*` error enum to its name via a
   generated table from `vendor/LibRaw/libraw/libraw_const.h` (script `scripts/gen-errors.js`).
3. Synchronous staged methods first (async comes in T07): `openBufferSync`, `openFileSync`, `unpackSync`,
   `unpackThumbSync(index?)`, `processSync`, `imageSync({ into?, bgr?, stride? })`, `thumbSync`,
   `adjustSizesInfoOnlySync`, `recycle`, `close`, plus read accessors `errorCount`, `decoderInfo`,
   `unpackFunctionName`, `isFujiRotated`, `isSraw`, `isNikonSraw`, `isCoolscanNef`, `isJpegThumb`,
   `isFloatingPoint`, `haveFpData`, `srawMidpoint`, `color(row,col)`, `thumbOK(maxsz?)`.
4. Out-of-order calls surface as `LibRawError` with `LIBRAW_OUT_OF_ORDER_CALL`.

Acceptance:
- Unit tests cover each method on the synthetic DNG, including an out-of-order call producing
  `name === 'LIBRAW_OUT_OF_ORDER_CALL'`.
- `node -e` loading the addon in three `worker_threads` simultaneously and constructing a `Processor` in
  each succeeds (context-aware check).

### T07 — AsyncWorker versions of the staged methods and the busy guard

Read: `docs/how-to/implement-async-decode-with-cancellation.md` §1, §5, §6.

Do:
1. Promise-returning `openBuffer`, `openFile`, `unpack`, `unpackThumb`, `process`, `image`, `thumb`,
   `adjustSizesInfoOnly` implemented with `Napi::AsyncWorker`; the input `Buffer` is kept alive with a
   `Napi::Reference` for the lifetime of the open session.
2. Busy guard: a second async call while one is in flight rejects immediately with a `LibRawError` whose
   `name` is `ERR_LIBRAW_BUSY`; sync accessors throw the same while busy.
3. `image()` allocates the output `Buffer` on the JS thread from `get_mem_image_format` (after
   `process`) or `adjust_sizes_info_only`, and the worker fills it via `copy_mem_image`.

Acceptance:
- Test: during `unpack()` of `IMGP5127.DNG` (real-files env) a `setInterval(…, 10)` on the same thread
  ticks at least 20 times before the promise resolves (proves the JS thread is free).
- Test: concurrent second call rejects with `ERR_LIBRAW_BUSY` in < 5 ms.
- Test: the async pipeline's output buffer equals `decodeSync`'s output byte-for-byte for the synthetic DNG.

### T08 — Fused `decode()`, `identify()`, `thumbnail()` helpers

Read: `docs/reference/proposed-binding-api.md`, `docs/reference/libraw-raw-params-thumbnails-flags.md`
(thumbnails section), `docs/tutorials/02-fast-preview-with-half-size.md`.

Do:
1. Module-level `decode(buffer, { params?, rawparams?, output?: { layout, stride, into }, signal? })`:
   one AsyncWorker doing open → (apply params) → unpack → process → copy → recycle. Returns
   `{ width, height, colors, bits, stride, data, flip, warnings }`. Params/rawparams application uses a
   temporary hand-written subset for now (`half_size`, `user_qual`, `use_camera_wb`, `output_bps`,
   `shot_select`); T12/T13 replace it with the generated table.
2. `identify(buffer, { rawparams? })`: open only (+ `adjust_sizes_info_only`), returns sizes, idata,
   `thumbs` (from `thumbs_list`, with `CHECK_THUMBNAILS_KNOWN_VENDORS` applied), decoder info, warnings,
   and a placeholder `metadata` object filled fully in T14.
3. `thumbnail(buffer, { index?, signal? })`: open → `unpack_thumb_ex(index)` (or default) →
   `dcraw_make_mem_thumb` → `{ format: 'jpeg'|'bitmap'|'bitmap16'|'h265'|'jxl'|'unknown', width, height,
   flip, data }` (`LIBRAW_IMAGE_JPEG === 1`).
4. `data` for `decode` is a fresh V8 `Buffer` unless `into` is given (size-checked).

Acceptance:
- Tests on the synthetic DNG: `identify().thumbs.length === 1`, `thumbnail().format === 'jpeg'` and data
  starts with `ff d8`; `decode({ params: { half_size: true } })` gives 384×288.
- Real files: for `IMGP5127.DNG`, `identify` ≤ 15 ms, `thumbnail` ≤ 15 ms (paste timings).

### T09 — Cancellation via AbortSignal

Read: `docs/how-to/implement-async-decode-with-cancellation.md` §3, §7.

Do:
1. `signal` support on every async method and helper: at enqueue time, reject if already aborted; on
   abort, set an atomic flag and call `setCancelFlag()`; LibRaw's progress callback returns non-zero when
   the flag is set. Rejections are `LibRawError` with `name: 'LIBRAW_CANCELLED_BY_CALLBACK'` and
   `code === -8`, plus a JS-visible `aborted: true`.
2. Clear the flag before each new job; `recycle()` after a cancelled fused job.

Acceptance:
- Test (real files): abort 50 ms into `decode(IMGP5127.DNG)`; the promise rejects within 200 ms of
  `abort()`; a subsequent `decode` on a new call succeeds and matches an uncancelled decode byte-for-byte.
- Test: abort before start rejects in < 5 ms without touching LibRaw (assert via a counter in a mock or
  via timing).

### T10 — Events: progress, data errors, EXIF tag callback

Read: `docs/reference/libraw-processing-methods.md` ("Control and callbacks", "Progress stages").

Do:
1. `Processor` extends `EventEmitter` on the JS side; native buffers stage events during a job and the
   wrapper emits `progress` `{ stage: string, iteration, expected }` (stage names via a generated table
   from `enum LibRaw_progress`), `dataError` `{ offset, message }`, and, when constructed with
   `{ exifTags: true }`, `exifTag` `{ tag, type, len, ordering }` after the job completes (no JS calls from
   worker threads). Live delivery via `ThreadSafeFunction` is optional; if implemented, gate it behind
   `{ liveProgress: true }`.
2. Fused helpers accept `onProgress` and `onDataError` callbacks.

Acceptance:
- Test: a full `decode` of the synthetic DNG emits a `progress` sequence that includes `LOAD_RAW`,
  `INTERPOLATE` (unless `half_size`), `CONVERT_RGB` in that order.
- Test: a truncated copy of the synthetic DNG (cut at 60 %) either rejects with a data error or emits at
  least one `dataError`; either outcome is asserted explicitly, not both allowed silently.

---

## Phase 2 — Full option and metadata surface, types, docs

### T11 — Parameter manifest generated from the LibRaw header

Read: `docs/how-to/expose-libraw-options.md`, `docs/reference/libraw-output-params.md`.

Do:
1. `scripts/gen-manifest.js`: parses `libraw_output_params_t` and `libraw_raw_unpack_params_t` from
   `vendor/LibRaw/libraw/libraw_types.h` (field name, C type, array length) and merges with a
   hand-maintained `api/params.annotations.json` (doc string, enum/min/max, default) into
   `api/params.json`. Fails if a header field has no annotation or an annotation has no header field.
2. Commit `api/params.json` and the annotations file, fully filled from the reference doc.

Acceptance:
- `node scripts/gen-manifest.js --check` exits 0 and reports the field counts for both structs (paste).
- Deliberately adding a fake field to the annotations makes `--check` exit non-zero (show it, then revert).

### T12 — Generated parameter application in C++ with validation

Read: same as T11.

Do:
1. `scripts/gen-params-cc.js` emits `src/params.gen.cc`: a table-driven `applyParams(Napi::Object,
   libraw_output_params_t&)` and `applyRawParams(...)` with type checks, array-length checks, enum/range
   checks, string fields copied into `Processor`-owned storage. Unknown keys throw `TypeError` naming the
   key. `getParams()` / `getRawParams()` return the current structs as objects.
2. Replace the T08 subset with the generated code. `rawparams.options` accepts a number or an array of
   `LIBRAW_RAWOPTIONS_*` names.

Acceptance:
- Test: every key in `api/params.json` can be set and read back with `getParams()` (round-trip test
  generated from the manifest).
- Test: `setParams({ halfSize: true })` throws `TypeError` mentioning `halfSize`; `gamm` with 5 elements
  throws; `user_qual: 7` throws (not in enum).

### T13 — Flag and enum tables

Read: `docs/reference/libraw-raw-params-thumbnails-flags.md`.

Do:
1. `scripts/gen-enums.js` extracts `LIBRAW_RAWOPTIONS_*`, `LIBRAW_WARN_*`, `LIBRAW_CAPS_*`,
   `LIBRAW_DECODER_*`, `LibRaw_thumbnail_formats`, `LibRaw_progress`, error codes from `libraw_const.h`
   into `api/enums.json` and generated JS `const` objects plus reverse maps.
2. `capabilities()` gains a `capabilityNames()` companion; `decode`/`identify` results carry
   `warnings: string[]` derived from `process_warnings`.

Acceptance:
- `node -p "require('./lib/index.cjs').capabilityNames()"` prints an array containing `ZLIB` and `JPEG`.
- Test: requesting `user_qual: 5` (GPL pack, unavailable) on a real Bayer file yields
  `warnings` containing `FALLBACK_TO_AHD`.

### T14a — Metadata mirror: core structs

Read: `docs/explanation/libraw-api-surface.md` ("The metadata you get after open"),
`docs/how-to/expose-libraw-options.md` §3.

Do:
1. Manifest-driven read-only mirror of `imgdata.idata`, `sizes` (incl. `flip`, `raw_inset_crops`),
   `other` (incl. parsed GPS), `lens` (incl. `makernotes`, `nikon`, `dng` sub-structs), `color` (matrices,
   `cam_mul`, `pre_mul`, black/maximum, `WB_Coeffs` as a compact list of set entries, embedded ICC profile
   as `Buffer` when present), and `makernotes.common`. Unset sentinels become `undefined`. Per-vendor
   makernotes are **T14b**, not this task.
2. `identify()` returns this as `metadata`; `Processor.metadata` getter after open.

Acceptance:
- Test: synthetic DNG reports `idata.make`, `sizes.width === 768`, `color.cam_mul` present;
  real `P3210620.ORF` reports `sizes.flip !== 0` and oriented dimensions 3016×4014 via
  `identify().sizes.oriented` (add that convenience: swap when flip is 5 or 6).
- `node scripts/gen-manifest.js --check` still exits 0 (metadata structs now included in the check).

### T14b — Metadata mirror: per-vendor makernotes (amber/red)

Do: extend the T14a generator to `imgdata.makernotes.{canon,nikon,sony,fuji,olympus,panasonic,pentax,
samsung,kodak,p1,hasselblad,ricoh}`. Rules the generator must apply: skip pointer fields; `char[N]` fields
that are documented as strings become trimmed strings, others (`uchar[N]` used as bytes) become `Buffer`;
numeric arrays become arrays; nested structs recurse; fields whose value equals the header-documented
"unset" initialiser (`0xffff`, `0xffffffff`, `-1`, `0x7f`) become `undefined`. Decide representation
per field in `api/metadata.annotations.json` (the check script fails on unannotated fields, as in T11).
If the full set does not fit one session, land vendors in the order Canon, Nikon, Sony, Fuji, Olympus,
Panasonic, Pentax and record the remainder here.

Acceptance: `gen-manifest --check` exits 0 for the vendors landed; real-file test: `DSC_4985.NEF` exposes
`makernotes.nikon` with at least three defined numeric fields; `P3210620.ORF` exposes `makernotes.olympus`.

### T15 — TypeScript types and reference docs generated from the manifests

Do:
1. `scripts/gen-types.js` → `types/index.d.ts` (`OutputParams`, `RawParams`, `Metadata`, enums, result
   shapes, `Processor`, helpers, `LibRawError`) with JSDoc from annotations.
2. `scripts/gen-docs.js` → `docs/reference/params.md`, `docs/reference/rawparams.md`,
   `docs/reference/metadata.md`, `docs/reference/enums.md` (tables). `npm run gen` runs all generators;
   `npm run gen:check` fails if generated files differ from committed ones.
3. `examples/consumer-ts/`: a tiny `tsc --noEmit` project importing the package types.

Acceptance:
- `npm run gen:check` exits 0; `cd examples/consumer-ts && npx tsc --noEmit` exits 0.
- `grep -c "half_size" types/index.d.ts` ≥ 1 and the JSDoc for it mentions "2x2".

### T16 — JavaScript wrapper polish: ESM/CJS, `toSharp`, exports

Read: `docs/how-to/integrate-into-photoview.md` ("Sharp interop").

Do:
1. `lib/index.cjs` + `lib/index.mjs` (thin wrapper) with `exports` map; `Processor`, `decode`,
   `identify`, `thumbnail`, `LibRawError`, enums, `buildInfo`, `version`, `capabilities`.
2. Result objects from `decode` and bitmap thumbnails get `toSharp(sharpModule)` returning
   `sharpModule(data, { raw: { width, height, channels: colors } })` (typed against `sharp`'s types via
   `peerDependenciesMeta.optional`, never required by the package).
3. README: install, quick start, API overview, licence statement.

Acceptance:
- `node --input-type=module -e "import { decode } from '@janhapke/libraw'; console.log(typeof decode)"` (via
  `npm link` or a `file:` install in a temp dir) prints `function`; same with `require`.
- Test with `sharp` as a devDependency: `(await decode(dng)).toSharp(sharp).jpeg().toBuffer()` yields a
  JPEG (`ff d8`).

### T17 — Concurrency and memory stress

Do:
1. `test/stress.test.js` (gated on real files): 6 `worker_threads`, each running 50 `decode` calls with
   `user_qual` alternating; compare each result's checksum with a single-threaded reference.
2. Record RSS before/after; assert growth < 200 MB after GC (`--expose-gc`).
3. Document `UV_THREADPOOL_SIZE` guidance in README.

Acceptance:
- `LIBRAW_TEST_IMAGES=… npm run test:stress` passes; paste the RSS numbers and total wall time.

---

## Phase 3 — Prebuilds and CI for five targets

### T18 — GitHub Actions: Linux x64 build and test

Read: `docs/how-to/set-up-prebuilds-and-ci.md`.

Do:
1. `.github/workflows/build.yml` with a `linux-x64` job running `scripts/build-linux.sh x64` (Docker),
   uploading `prebuilds/linux-x64`, and a `test-linux-x64` job downloading it and running `npm test`
   (synthetic fixtures only) and `scripts/check-binary.sh`.
2. Push the branch; the task includes `git push` for this branch only.

Acceptance:
- `gh run list --workflow build.yml --limit 1` shows success; `gh run view <id> --log` contains the
  `check-binary` output with exit 0 (paste the relevant lines).

### T19 — Linux arm64 cross build

Do:
1. `cmake/toolchain-aarch64.cmake`; Dockerfile gains the aarch64 cross gcc (Rocky `gcc-toolset-14`
   cross package, or fall back to `docker buildx --platform linux/arm64` under QEMU, documented).
2. Matrix `arch: [x64, arm64]` in the build job; test job for arm64 on `ubuntu-24.04-arm`.

Acceptance:
- `file prebuilds/linux-arm64/node.napi.node` reports `ARM aarch64` (locally after `./scripts/build-linux.sh arm64`).
- CI: the arm64 test job passes (paste `gh run view` summary).

### T20 — macOS x64 and arm64 builds (red: first pass may ship with OpenMP off)

Read: `docs/reference/build-matrix.md`, `docs/how-to/set-up-prebuilds-and-ci.md` §4.

Do:
1. `scripts/build-native.sh` (CMake with Xcode clang, `MACOSX_DEPLOYMENT_TARGET=11.0`,
   `-undefined dynamic_lookup`, `-exported_symbols_list`), OpenMP via Homebrew `libomp` linked
   statically (`libomp.a`), fall back to `-DLIBRAW_NODE_OPENMP=OFF` with a loud CI warning if static
   linking fails; record which in `buildInfo`.
2. Jobs on `macos-15-intel` and `macos-15`; test jobs run `npm test` and an `otool -L` check
   (only `libSystem`, `libc++`).

Acceptance:
- Both macOS test jobs green; `gh run view --log` shows `buildInfo.openmp` value for each and the `otool -L`
  output (paste).

### T21 — Windows x64 build (red: expect several CI rounds; first pass ships with OpenMP off)

Read: `docs/explanation/electron-compatibility.md` §3, `docs/reference/build-matrix.md`.

Do:
1. `scripts/build-native.ps1`: CMake + MSVC 2022, `/EHsc /MD`, `node.lib` for the pinned Node version,
   `win_delay_load_hook.cc` (copied from `node-gyp/src`, attribution kept) + `/DELAYLOAD:node.exe`,
   static zlib/libjpeg-turbo/LibRaw. OpenMP: try `/openmp:llvm` with static libomp; if not achievable in
   this task, build with OpenMP off, record in `buildInfo`, and open a follow-up note in `docs/plan/tasks.md`.
2. Job on `windows-2022`; test job runs `npm test` and `dumpbin /DEPENDENTS` (only kernel32/vcruntime/
   msvcp/api-ms) and `dumpbin /IMPORTS node.napi.node | findstr node.exe` shows it under delay-load.

Acceptance:
- Windows test job green; paste the `dumpbin` excerpts from the log.

### T22 — Electron smoke matrix

Read: `docs/how-to/test-under-electron.md`.

Do:
1. `test/electron-smoke.cjs` and `test/electron-workers-smoke.cjs` as described in the how-to.
2. In every test job, after `npm test`: install `electron@42` and `electron@latest` (one after the other)
   and run both smoke scripts with `ELECTRON_RUN_AS_NODE=1`.

Acceptance:
- All five test jobs green with both Electron versions; paste the `PASS` lines with the printed
  `process.versions.electron` for each platform.
- Locally: `ELECTRON_RUN_AS_NODE=1 npx electron test/electron-smoke.cjs` prints `PASS`.

### T23 — Packaging, provenance, release dry run

Do:
1. `package` job: download all five artifacts into `prebuilds/`, `node scripts/gen-notices.js`
   (regenerates `THIRD_PARTY_NOTICES.md` from `versions.env`), `npm pack`, upload the tarball;
   on `v*` tags `npm publish --provenance --access public` (secret `NPM_TOKEN`).
2. `scripts/release.sh` with a checklist (bump version, CHANGELOG, tag). `npm publish --dry-run` locally.

Acceptance:
- `npm pack --dry-run` output lists `prebuilds/{linux-x64,linux-arm64,darwin-x64,darwin-arm64,win32-x64}/node.napi.node`,
  `lib/`, `types/`, `THIRD_PARTY_NOTICES.md`, and nothing from `vendor/` or `build/`.
- Tarball size reported (target < 40 MB); CI package job green.

---

## Phase 4 — Electron hardening and packaging proof

### T24 — Electron safety checks as a script, and an asar packaging test

Read: `docs/how-to/make-the-addon-electron-safe.md` (table rows 1–12), knowledge base
`/home/jan/dev/_jdd/knowledge-base/electron-native-modules.md`.

Do:
1. `scripts/electron-safety.sh`: runs `check-binary.sh`, greps the sources for forbidden includes
   (`node.h`, `v8.h`, `uv.h`), confirms `NODE_API_NO_EXTERNAL_BUFFERS_ALLOWED` in compile flags
   (from `buildInfo.flags`), and runs the two smoke scripts.
2. `test/forge-app/`: a minimal Electron Forge app (main process only, no window) depending on the packed
   tarball via `file:`; `electron-forge package` on Linux; then, without a display,
   `ELECTRON_RUN_AS_NODE=1 out/<app>/<binary> test/forge-app/asar-check.cjs` which `require`s the
   addon from the packaged `app.asar` path and decodes the synthetic DNG.

Acceptance:
- `./scripts/electron-safety.sh` exits 0 locally (paste output).
- The asar check prints `PASS` and the path it loaded from contains `app.asar.unpacked` (paste).

---

## Phase 5 — Benchmark tool, docs, photoview integration hand-off

### T25 — Benchmark command and results file

Do:
1. `npm run bench -- <dir> [--iterations 5]`: for each RAW in `<dir>` prints median ms for `identify`,
   `thumbnail`, `decode(half_size)`, `decode(user_qual 2)`, `decode(user_qual 3)` and writes
   `bench/<date>.json`; prints CPU count and `OMP_NUM_THREADS`.
2. Commit one results file from this machine under `bench/` (real files, paths anonymised to basenames).

Acceptance:
- `LIBRAW_TEST_IMAGES=… npm run bench -- $LIBRAW_TEST_IMAGES` runs; for `IMGP5127.DNG` the `decode(user_qual 2)`
  median is ≤ 800 ms and `identify` ≤ 15 ms (paste the table).

### T26 — Documentation pass

Do:
1. Move the applicable parts of `docs/` into user-facing docs for the package: `README.md` (quick start,
   API table, params link, Electron notes, licence), `docs/tutorials/*` adapted to the real API,
   `docs/how-to/*` (Electron, worker_threads, cancellation, sharp interop), generated references.
2. Mark research-only docs (adoption comparison, roadmap, photoview usage) as "design history" in
   `docs/README.md`.
3. `CHANGELOG.md` entry for `0.1.0`.

Acceptance:
- `npm run gen:check` exits 0; every relative link in `docs/**` and `README.md` resolves (add
  `scripts/check-links.js`; paste its "broken links: none" output).
- The README quick-start snippet is executed by a test (`test/readme-snippet.test.js`) and passes.

### T27 — photoview integration spec (hand-off, executed in the photoview repo)

Do (in `/home/jan/dev/photoview`, as a JDD spec, not in this repo): replace `lightdrift-libraw` with
`@janhapke/libraw` following `docs/how-to/integrate-into-photoview.md`; keep the `LibRawInstanceHolder`
only if needed (the new binding has no per-instance thread); use `identify` for both metadata plugins,
`thumbnail` with `thumbs` selection for thumbnail/preview, `decode` with `FULL_SCREEN_PARAMS` for full,
`AbortSignal` from the existing cancel RPC; remove the `postinstall` `rmSync` if nothing else bundles
`sharp`.

Acceptance (photoview): unit and integration suites pass; the ad-hoc stage timing from the 1.0.0 migration
notes rerun shows `decode-full` ≤ 800 ms and `decode-preview` ≤ 60 ms on `IMGP5127.DNG`; `.deb` built;
the human installs it and confirms RAW folders render (the only step needing a display).

---

## Phase 6 — OpenMP on macOS and Windows (only if T20/T21 shipped without it)

### T28 — Static OpenMP runtimes on macOS and Windows

Do: revisit `buildInfo.openmp === false` platforms; macOS `libomp.a` from Homebrew or built from LLVM
source in the job; Windows clang-cl + `libomp` static or MSVC `/openmp` with `vcomp` static if licensing
and availability allow. Benchmark via CI-run `npm run bench` on the synthetic large DNG (add a 6000×4000
synthetic fixture generated at test time, not committed).

Acceptance: `buildInfo.openmp === true` on all five targets in CI, and the CI bench shows `user_qual 3`
process time at least 1.5× faster than with `OMP_NUM_THREADS=1` on runners with ≥ 4 cores (paste).
