# How to build from source

Prebuilt binaries cover the platforms listed in [`docs/reference/build-matrix.md`](../reference/build-matrix.md)
— `npm install` never needs a compiler. Building from source is for working on this package itself, or for
a platform this project doesn't prebuild for. `CMakeLists.txt` compiles LibRaw, zlib, and libjpeg-turbo
statically into the addon, then links it against Node-API only; no system LibRaw, zlib, or libjpeg is ever
used.

## Linux: entirely inside Docker

Nothing but Docker is required on the host — the host's own compiler (if any) is never invoked:

```bash
npm run build:linux        # scripts/build-linux.sh x64
./scripts/build-linux.sh arm64
```

What it does: builds `scripts/linux-build.Dockerfile` (a pinned-by-digest `rockylinux/rockylinux:8-ubi-init`
image with `gcc-toolset-14-gcc-c++`, `cmake`, `nasm` — nasm only on x64, since libjpeg-turbo's aarch64 SIMD
is plain C intrinsics, no assembler needed), then runs `cmake -S . -B build/linux-<arch>` and
`cmake --build` inside that container as the host's own `uid:gid` (so `build/`/`prebuilds/` come out
owned by you, not root), and copies the stripped result to `prebuilds/linux-<arch>/node.napi.node`.

For `arm64` specifically: `docker buildx build --platform linux/arm64` runs the **same** Dockerfile as a
native aarch64 container — under QEMU user-mode emulation on an x86_64 host (register it once with
`docker run --privileged --rm tonistiigi/binfmt --install arm64`), or natively on an arm64 host/CI runner.
This is deliberate, not a fallback: Rocky Linux 8's repositories (including EPEL) ship no usable aarch64
cross-toolchain sysroot at all (no aarch64 `glibc-devel`/`libstdc++-devel`/`libgomp-devel` package exists
for el8), so a real cross build isn't possible here — running the real Rocky 8 image natively for the target
architecture sidesteps the gap entirely, at the cost of QEMU being slow locally (tens of minutes; CI's
`ubuntu-24.04-arm` runner is native, so it's as fast as the x64 build there).

Rocky 8 gives glibc 2.28 as the floor, the same baseline `sharp` ships with, so the resulting binary runs on
essentially any Linux distribution.

## macOS: native, no Docker path

Apple only licenses Xcode/macOS SDK use on Apple hardware, so this always runs directly on a Mac (locally,
or a `macos-15-intel`/`macos-15` GitHub Actions runner in CI — this script cannot be exercised from this
repo's Linux development host at all):

```bash
scripts/build-native.sh darwin-x64      # or darwin-arm64
```

Requires Xcode command line tools. For OpenMP-enabled demosaic (`buildInfo.openmp === true`), also
`brew install libomp` first and export `LIBRAW_NODE_OMP_ROOT="$(brew --prefix libomp)"` — Apple's clang
ships no OpenMP runtime of its own, and `LIBRAW_NODE_OMP_ROOT` points CMake at Homebrew's keg-only static
`libomp.a`. Without it, `LIBRAW_NODE_OPENMP` (CMake option, default `ON`) is silently turned back off with a
warning rather than failing the build — a documented way to get an OpenMP-off build on demand. The addon
compiles for one architecture per invocation (`CMAKE_OSX_ARCHITECTURES`, set from the `darwin-x64`/
`darwin-arm64` target) and targets `MACOSX_DEPLOYMENT_TARGET=11.0`.

## Windows: native, MSVC only

Also native-only, on Windows (locally or the `windows-2022` GitHub Actions runner):

```powershell
./scripts/build-native.ps1 -Target win32-x64
```

Requires Visual Studio 2022's MSVC toolset (a Developer Command Prompt, or `ilammy/msvc-dev-cmd` in CI, so
`cl.exe`/`lib.exe`/`link.exe` are on `PATH`), `nasm` on `PATH` (libjpeg-turbo's x64 SIMD), and Ninja (the
single-config generator this script uses, so build output is flat like the other two platforms' — no
per-config `Release/` subdirectory to special-case). Two things this platform needs that Linux/macOS don't:
a `node.lib` import library, synthesized at build time from `node-api-headers`' `.def` files via
`lib.exe /def:...` (rather than downloading Node's prebuilt one), and `src/win_delay_load_hook.cc` +
`/DELAYLOAD:node.exe` so the addon can load under `electron.exe` too, not only `node.exe` — see
[Electron compatibility](../explanation/electron-compatibility.md) §3.

## What the build actually links

- **LibRaw**: every `.cpp` under `vendor/LibRaw/src` compiled directly into a static `raw_r` target (the
  reentrant configuration — `LIBRAW_NOTHREADS` is never defined), **except**
  `src/postprocessing/postprocessing_ph.cpp`, `src/preprocessing/preprocessing_ph.cpp`, and
  `src/write/write_ph.cpp` — LibRaw's own no-op "placeholder" stand-ins for a no-postprocessing build, which
  duplicate ten real symbols (`dcraw_process`, `raw2image_start`, `copy_bayer`, `convert_to_rgb_loop`, ...)
  and, unlike on Linux where GNU ld's archive resolution happens to skip them, get silently linked in
  *instead of* the real implementations on Apple's `ld64` — producing a "successful" decode that quietly
  returns all-zero pixels. `CMakeLists.txt` excludes all three by name from the source glob.
- **zlib** via `add_subdirectory` (its own CMakeLists.txt builds cleanly once `ZLIB_BUILD_SHARED=OFF` is
  forced) and **libjpeg-turbo** via `ExternalProject_Add` as a nested CMake project — libjpeg-turbo's own
  CMakeLists.txt explicitly refuses `add_subdirectory()` ("cannot be integrated into another build system
  using add_subdirectory(); use ExternalProject_Add() instead") whenever it isn't the top-level project, so
  it's built as a separate configure+build step and the resulting static archive wrapped as an `IMPORTED`
  target.
- **The addon itself is a CMake `MODULE` library**, not `SHARED`: a Node native addon is loaded exclusively
  via `dlopen()`/`LoadLibrary`, never linked against at build time by anything else, which is exactly what
  `MODULE` is for. On ELF/PE this compiles identically to `SHARED`; on Apple platforms `MODULE` produces a
  loadable bundle rather than a `dylib`, avoiding an otool-visible self-reference a `dylib` would carry.
- **OpenMP runtime, one dynamic dependency per platform, never avoidable with these toolchains**: Linux links
  `libgomp.so.1` dynamically (gcc-toolset-14's `libgomp.a` was built without `-fPIC`, so its internal
  thread-local state can't be statically linked into a `dlopen`'d shared object — a binutils TLS-model
  restriction, not a choice; every GCC/glibc Linux system already has `libgomp.so.1`). macOS links
  Homebrew's `libomp.a` **statically** (no dynamic dependency there). Windows links `VCOMP140.dll`
  dynamically via MSVC's `/openmp` — MSVC ships no static OpenMP runtime at all, for either the classic
  `/openmp` runtime or clang-cl's `/openmp:llvm`; `VCOMP140.dll` ships with the Visual C++ Redistributable,
  which any MSVC-built Electron/Node consumer's machine generally already needs.
- **Symbol visibility**: `-fvisibility=hidden` everywhere, plus a linker version script on Linux
  (`cmake/napi.map`, exporting only `napi_register_module_v1`/`node_api_module_get_api_version_v1`) so
  nothing from the vendored LibRaw/zlib/libjpeg-turbo copies can collide with Electron's own bundled
  versions of the same libraries.

See `CMakeLists.txt` itself for the full, current version — every fact above is a direct comment in that
file, kept next to the code it explains rather than duplicated in prose that could drift.

## Verify a build

```bash
node -e "const l = require('./lib/index.cjs'); console.log(l.version(), l.buildInfo)"
./scripts/check-binary.sh prebuilds/linux-x64/node.napi.node       # Linux: NEEDED allowlist, hidden symbols, glibc floor
./scripts/check-binary-macos.sh prebuilds/darwin-arm64/node.napi.node   # macOS: otool -L allowlist, minos
pwsh -File ./scripts/check-binary-windows.ps1 -FilePath prebuilds/win32-x64/node.napi.node  # Windows: dumpbin checks
```

`npm test` then exercises the freshly built prebuild the same way any consumer would (`node-gyp-build`
resolves `prebuilds/<platform>-<arch>/node.napi.node` regardless of how it got there).

## CI

`.github/workflows/build.yml` runs exactly the scripts above — `build-linux` (matrix x64/arm64, via Docker),
`build-macos` (matrix darwin-x64/darwin-arm64, native), `build-windows` (native) — each followed by its
platform's `check-binary*` script and, in the matching `test-*` job, `npm test` plus the Electron smoke
matrix. See [Set up prebuilds and CI](set-up-prebuilds-and-ci.md) for the full pipeline through packaging
and publishing.
