# Build and distribution strategy

Goal: no compilers, headers, or LibRaw on the developer machine; one command that produces the same
binaries on any machine or CI runner; artifacts that work in Node and Electron on Windows, macOS, Linux.

## What can be built in Docker, honestly

| Target | Docker on a Linux host | How | Confidence |
|---|---|---|---|
| linux-x64 (glibc) | Yes | Rocky 8 / manylinux_2_28 image, gcc-toolset, native build | High (sharp-electron does this today) |
| linux-arm64 (glibc) | Yes | Same image with `aarch64-linux-gnu` cross toolchain, or `docker buildx --platform linux/arm64` under QEMU (slower) | High |
| win32-x64 | Yes, with caveats | `llvm-mingw` or Zig cross toolchain; the addon must import from `node.exe` via an import library generated from Node's `node.lib`/`.def`, plus a delay-load hook. MSVC-built is the ecosystem norm and what `sharp`/lightdrift do (on Windows runners). | Medium |
| win32-arm64 | Same as above | Rarely needed for photoview | Low priority |
| darwin-x64 / darwin-arm64 | Possible, not standard | Zig (`zig cc`) ships macOS libc headers and `lld` can link Mach-O with `-undefined dynamic_lookup`; LibRaw needs no Apple frameworks. `cargo-zigbuild` publishes Docker images that do this for Rust; `solarwinds/zig-build` does it for Node addons (52 stars, young). Code signing happens later at app packaging, so unsigned cross-built `.node` files are fine. | Medium-low (unproven for this exact stack) |

`sharp-libvips` is the reference point: it builds **all Linux and all Windows** libvips binaries inside
Docker (Windows via llvm-mingw cross toolchain) and only macOS natively on macOS runners. `sharp`'s own
thin addon is then built per OS on GitHub runners (windows-2022, macos-15, Rocky 8 container on Ubuntu).
lightdrift 1.0.0 builds everything on native runners (ubuntu-24.04, ubuntu-24.04-arm, macos-15-intel,
macos-15, windows-2022) with `prebuildify --napi`.

## Recommendation

**Phase A (v1): Docker for Linux, GitHub-hosted native runners for macOS and Windows, one CMake project
for all three.**

- A single `CMakeLists.txt` builds LibRaw from vendored source (0.22.2 tarball or git submodule of
  `LibRaw/LibRaw` at the release tag) plus vendored zlib and libjpeg-turbo, straight into the addon target.
  Reason for CMake over `binding.gyp`: toolchain files make cross-compiling in Docker a one-flag change,
  and `cmake-js` gives the usual `npm run build` ergonomics locally. LibRaw-cmake (community, Maik Riechert)
  is a usable starting point for the LibRaw part; it already models `raw_r`, `USE_ZLIB`, `USE_JPEG8`,
  `ENABLE_OPENMP`, `ENABLE_LCMS`.
- `scripts/build-linux.sh <arch>` runs `docker build`/`docker run` with a pinned image
  (`rockylinux/rockylinux:8-ubi-init` + `gcc-toolset-14`, mirroring `sharp-electron/scripts/sharp-build.Dockerfile`),
  cross toolchain for arm64, output to `prebuilds/linux-<arch>/node.napi.node`.
- `scripts/build-native.sh` runs the same CMake on macOS/Windows runners (Xcode clang, MSVC 2022).
- CI matrix produces five artifacts (linux-x64, linux-arm64, darwin-x64, darwin-arm64, win32-x64), runs the
  Node test suite and the `ELECTRON_RUN_AS_NODE` smoke test on each, then packages.
- Developer laptop (Linux): only Docker needed to produce the Linux binary and run all tests. macOS/Windows
  binaries come from CI artifacts; `act` or a fork's Actions can be used to iterate.

**Not pursued (decision 2026-09-03): everything in Docker via Zig.** Kept here as the record of why it was considered. One container with `zig` cross-compiles
LibRaw + zlib + libjpeg-turbo + the addon for all five targets. Windows needs an import library for
`node.exe` (`gendef node.exe` → `dlltool`, or reuse the `.def` approach napi-rs uses for its
`x86_64-pc-windows-gnu` target) and the delay-load hook compiled with mingw. macOS needs nothing beyond Zig's
bundled headers as long as no frameworks are linked. Validate each cross-built binary in CI on the real OS
(the runners still exist, they just run tests instead of builds). This is a research task with a real
chance of subtle CRT/exception-handling issues on Windows; keep Phase A as the shipping path until Phase B
passes the same test gates twice in a row.

## Distribution layout

Two proven options:

1. **prebuildify bundle** — all platform binaries inside one npm tarball under `prebuilds/`, loaded by
   `node-gyp-build`. Zero install scripts, zero network at `npm install`, works offline and in locked-down
   CI, ideal for reproducibility. Cost: tarball size (five static LibRaw addons ≈ 5 × 4–8 MB) and shipping
   other platforms' binaries into the Electron app unless ignored at package time. This is what lightdrift
   1.0.0 does.
2. **Per-platform optional dependencies** (`@janhapke/libraw-linux-x64`, ... as `optionalDependencies`,
   like `sharp`/`@img/*` and napi-rs) — npm installs only the matching one. Cost: six packages to publish,
   a small JS dispatcher, and the knowledge base's Forge externals script must walk `optionalDependencies`
   (it already does).

Recommendation: start with (1) for simplicity and reproducibility; move to (2) if tarball size or Electron
package size becomes annoying. Both keep the `.node` static and sidecar-free.

## Reproducibility rules

- Pin everything: base image digest, gcc-toolset version, Node headers version (`--target 24.0.0` for
  prebuildify or `NODE_API_HEADERS` version), LibRaw/zlib/libjpeg-turbo tarball SHA-256, CMake version.
- Build inside the container as a non-root user with the repo bind-mounted, outputs written to
  `prebuilds/` only.
- Record `LibRaw::version()`, `capabilities()`, compiler, and flags into a generated `build-info.json`
  shipped with the package and exposed as `libraw.buildInfo`.
- Keep the `THIRD_PARTY_NOTICES.md` generated from the vendored versions ([licensing.md](licensing.md)).

## Why not a shared `libraw.so`/`.dll` sidecar

It would allow LGPL relinking and smaller multi-addon setups, but it reintroduces every asar/RPATH/SONAME
problem the knowledge base documents for `sharp`, and needs `patchelf`/install-name tooling per platform.
CDDL makes static linking licence-clean ([licensing.md](licensing.md)); static wins.

## Why not napi-rs (Rust) or WebAssembly

- napi-rs has the best cross-compile story (Zig/cargo-xwin, first-class Electron support, platform
  packages generated for you), but LibRaw is C++ and would sit behind a `libraw-sys` FFI layer; every struct
  mirror and callback becomes unsafe glue. The C++ wrapper already exists (lightdrift, MIT) and node-addon-api
  is mature. Rust only pays off if the team is Rust-first.
- WebAssembly (`libraw-wasm`) removes all ABI risk and works in the renderer, but is single-threaded per
  instance in practice, cannot use OpenMP, and is 2–4x slower for demosaic. Keep as a fallback idea if native
  distribution ever becomes untenable, not as the main path.
