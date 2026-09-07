# Build matrix: platforms, toolchains, artifacts

| Target | Where built (Phase A) | Toolchain | Baseline | Artifact |
|---|---|---|---|---|
| linux-x64 | Docker on any host | `rockylinux/rockylinux:8-ubi-init` + `gcc-toolset-14`, CMake ≥ 3.25 | glibc 2.28 | `prebuilds/linux-x64/node.napi.node` |
| linux-arm64 | Docker on any host | same image, built natively for arm64 via `buildx --platform linux/arm64` (QEMU locally, native on `ubuntu-24.04-arm` in CI) -- no cross toolchain: Rocky 8/gcc-toolset-14 ships no aarch64 cross sysroot (T19, see `docs/how-to/build-libraw-addon-in-docker.md` §6) | glibc 2.28 | `prebuilds/linux-arm64/node.napi.node` |
| darwin-x64 | GitHub `macos-15-intel` | Xcode clang, `MACOSX_DEPLOYMENT_TARGET=11.0` | macOS 11 | `prebuilds/darwin-x64/node.napi.node` |
| darwin-arm64 | GitHub `macos-15` | same | macOS 11 | `prebuilds/darwin-arm64/node.napi.node` |
| win32-x64 | GitHub `windows-2022` | MSVC 2022, `/EHsc /MD` (dynamic release CRT, matches Node/Electron), Ninja + CMake (`scripts/build-native.ps1`) | Windows 10 | `prebuilds/win32-x64/node.napi.node` |
| win32-arm64 | not in v1 | `windows-11-arm` runner exists | | |
| linux-musl | not in v1 (not needed for Electron) | `node:alpine` | | |

Phase B (Zig) would move darwin-* and win32-* into the same Docker image; the runners then only test.

## Inputs (pinned)

| Component | Version | Source |
|---|---|---|
| LibRaw | 0.22.2 | https://www.libraw.org/data/LibRaw-0.22.2.tar.gz (record SHA-256) or git tag `0.22.2` |
| zlib | 1.3.1 (or 1.3.2 as lightdrift vendors) | zlib.net |
| libjpeg-turbo | 3.x | github.com/libjpeg-turbo |
| node-addon-api | ^8 | npm |
| node-api-headers | matching `--target` | npm |
| Node headers target | 24.x | for prebuildify |
| NAPI_VERSION | 8 | |
| CMake | ≥ 3.25 | |

## Compiler flags (all targets)

- `-std=c++17 -O2 -fvisibility=hidden -fvisibility-inlines-hidden -fexceptions -DNAPI_VERSION=8`
  `-DNODE_API_NO_EXTERNAL_BUFFERS_ALLOWED -DNAPI_CPP_EXCEPTIONS` (or `NAPI_DISABLE_CPP_EXCEPTIONS` and
  check `Maybe` results; pick one project-wide). Windows (MSVC) spells the same intent
  `/EHsc /MD /O2 /DNAPI_VERSION=8 /DNODE_API_NO_EXTERNAL_BUFFERS_ALLOWED /DNAPI_CPP_EXCEPTIONS`
  (`-fvisibility=hidden` has no MSVC equivalent -- Windows exports go through
  `__declspec(dllexport)`/`dllimport` instead, which node-api-headers already applies via
  `NAPI_MODULE_EXPORT`/`NAPI_EXTERN`; see `BUILDING_NODE_EXTENSION` below).
- LibRaw defines: `USE_ZLIB USE_JPEG8 LIBRAW_NODLL` (never `LIBRAW_NOTHREADS`); optional `USE_LCMS2`,
  `-fopenmp` (MSVC: `/openmp`).
- OpenMP runtime per platform: Linux dynamic `libgomp.so.1` (T04, gcc-toolset-14's `libgomp.a` cannot be
  statically linked into a shared object -- a binutils TLS-model limitation, not a choice); macOS static
  `libomp.a` from Homebrew's keg-only `libomp` (T20); Windows dynamic `VCOMP140.dll` via MSVC's `/openmp`
  (T21) -- MSVC ships no static OpenMP runtime at all (neither `/openmp`'s `vcomp140.dll` nor
  `/openmp:llvm`'s `libomp140.x86_64.dll` has a static archive), so "static on Windows" is not achievable
  with this toolchain; `VCOMP140.dll` ships with the Visual C++ Redistributable, which any MSVC-built
  Electron/Node consumer's machine generally already needs, and is documented as a runtime dependency
  here and in `README.md`.
- Windows also pulls in `WS2_32.dll` (Winsock) as a load-time dependency -- not chosen, but inherited: `vendor/LibRaw/libraw/libraw_datastream.h` includes `<winsock2.h>` on `_WIN32` purely for the
  `htonl()`/`ntohl()` byte-swap macros several decoders use (LibRaw's own `Makefile.msvc` links every
  sample against `ws2_32.lib` for the same reason). `WS2_32.dll` ships with every Windows install since
  XP -- an OS component, not a redistributable sidecar -- so `scripts/check-binary-windows.ps1` allows it
  alongside `KERNEL32.dll`/`ADVAPI32.dll`/`USER32.dll`.
- Link: static LibRaw/zlib/jpeg; Linux `-Wl,--version-script=napi.map` exporting `napi_register_module_v1`
  and `node_api_module_get_api_version_v1`; `-static-libstdc++ -static-libgcc` on Linux; macOS
  `-undefined dynamic_lookup`; Windows `delayimp.lib /DELAYLOAD:node.exe` + `win_delay_load_hook.cc`
  (copied from `node-gyp/src`, MIT, see `THIRD_PARTY_NOTICES.md`) +
  `BUILDING_NODE_EXTENSION`/`HOST_BINARY="node.exe"` defines, linked against a `node.lib` import library
  synthesized at build time with `lib.exe /def:... /out:node.lib` from node-api-headers'
  `def/node_api.def` + `def/js_native_api.def` (merged into one de-duplicated `.def`; see
  `scripts/build-native.ps1`) rather than downloading Node's prebuilt `node.lib`.

## CI jobs

1. `build-linux` (matrix x64/arm64): Docker build → artifact.
2. `build-darwin` (matrix): native → artifact.
3. `build-win32`: native → artifact.
4. `test` (matrix of all five, on ubuntu/ubuntu-arm/macos-intel/macos/windows): download artifact, `npm test`,
   Electron smoke (`ELECTRON_RUN_AS_NODE=1`) with Electron 42 and current stable.
5. `package`: merge `prebuilds/`, `npm pack`, upload; on tag: `npm publish --provenance`.
