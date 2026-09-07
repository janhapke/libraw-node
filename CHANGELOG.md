# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

Everything below is implemented and covered by CI (`.github/workflows/build.yml`, green on all five
platforms) as of T23; nothing has been published to npm yet. See `docs/plan/tasks.md` for the full task
breakdown this summarizes.

### Phase 0 — Scaffold, Linux build in Docker, first decode, OpenMP

- Repository scaffold: package metadata (`@janhapke/libraw`, MIT), pinned vendor submodules (LibRaw
  `0.22.2`, zlib `v1.3.2`, libjpeg-turbo `3.2.0`, versions recorded in `scripts/versions.env`), third-party
  notices, and the JS toolchain (TypeScript, vitest).
- Linux Docker build (Rocky 8, gcc-toolset-14) producing a stripped, Electron-safe `.node` addon with no
  compiler required on the host or the consumer's machine.
- LibRaw, zlib, and libjpeg-turbo statically compiled in; OpenMP-accelerated demosaic (`libgomp.so.1`
  linked dynamically on Linux — GCC's static `libgomp.a` cannot be linked into a shared object with this
  toolchain, see `docs/explanation/licensing.md`).
- Synchronous `decodeSync()`, a synthetic PM5544 DNG test fixture, and a stage-timing benchmark tool
  confirming OpenMP's effect.

### Phase 1 — Real asynchronous API with cancellation

- `Processor` (context-aware `ObjectWrap`), a `LibRawError` class mapping every `LIBRAW_*` code, and
  synchronous staged methods (`openBufferSync`, `unpackSync`, `processSync`, `imageSync`, etc.).
- `AsyncWorker`-based promise APIs for every staged method, a busy guard (`ERR_LIBRAW_BUSY`) against
  concurrent calls on one `Processor`, and fused one-call helpers `decode()`, `identify()`, `thumbnail()`.
- `AbortSignal` cancellation on every async method and helper.
- `Processor` as an `EventEmitter`: `progress`, `dataError`, and (opt-in) `exifTag` events.

### Phase 2 — Full option and metadata surface, types, docs

- A parameter manifest (`api/params.json`) generated from LibRaw's own headers, with generated,
  validated C++ application code (`setParams`/`setRawParams`/`getParams`/`getRawParams`) — no
  hand-maintained parameter subset left.
- Generated flag/enum tables (`api/enums.json`, `capabilityNames()`, `warningNames()`).
- A manifest-driven, read-only metadata mirror (`idata`, `sizes`, `other`, `lens`, `color`, and per-vendor
  `makernotes` for Canon/Nikon/Sony/Fuji/Olympus/Panasonic/Pentax) exposed via `identify().metadata` and
  `Processor.metadata`.
- Generated TypeScript types (`types/index.d.ts`) and reference docs (`docs/reference/*.md`) from the same
  manifests, checked for staleness by `npm run gen:check`.
- ESM (`lib/index.mjs`) and CommonJS (`lib/index.cjs`) entry points via `package.json`'s `exports` map,
  `toSharp()` interop (`sharp` as an optional peer dependency, never a hard dependency), and a
  concurrency/memory stress test (`npm run test:stress`).

### Phase 3 — Prebuilds and CI for five targets

- GitHub Actions (`.github/workflows/build.yml`) building and testing all five targets: `linux-x64`,
  `linux-arm64` (Docker/QEMU cross build), `darwin-x64`, `darwin-arm64` (OpenMP statically linked via
  Homebrew `libomp`), and `win32-x64` (MSVC 2022, delay-load hook for Electron, OpenMP via MSVC `/openmp`
  and dynamically-linked `VCOMP140.dll`).
- Every test job also runs the full suite under Electron 42 and the current Electron `latest`
  (`ELECTRON_RUN_AS_NODE=1`), on all five platforms.
- Packaging: a `package` CI job assembling the publishable tarball from all five platforms' prebuilds,
  deterministically-regenerated `THIRD_PARTY_NOTICES.md` (`scripts/gen-notices.js`), a `verify-package`
  step proving the packed tarball's prebuild actually loads after a fresh install, and
  `npm publish --provenance --access public` gated on `v*` tags (`scripts/release.sh` drives the local
  side of a release: version bump, CHANGELOG check, commit, tag).
