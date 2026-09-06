# Build matrix: platforms, toolchains, artifacts

| Target | Where built (Phase A) | Toolchain | Baseline | Artifact |
|---|---|---|---|---|
| linux-x64 | Docker on any host | `rockylinux/rockylinux:8-ubi-init` + `gcc-toolset-14`, CMake ≥ 3.25 | glibc 2.28 | `prebuilds/linux-x64/node.napi.node` |
| linux-arm64 | Docker on any host | same image + `gcc-toolset-14-gcc-c++-aarch64-linux-gnu` (or `buildx --platform linux/arm64` under QEMU) | glibc 2.28 | `prebuilds/linux-arm64/node.napi.node` |
| darwin-x64 | GitHub `macos-15-intel` | Xcode clang, `MACOSX_DEPLOYMENT_TARGET=11.0` | macOS 11 | `prebuilds/darwin-x64/node.napi.node` |
| darwin-arm64 | GitHub `macos-15` | same | macOS 11 | `prebuilds/darwin-arm64/node.napi.node` |
| win32-x64 | GitHub `windows-2022` | MSVC 2022, `/EHsc`, `/MT` static CRT optional (`/MD` matches Node/Electron; prefer `/MD`) | Windows 10 | `prebuilds/win32-x64/node.napi.node` |
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
  check `Maybe` results; pick one project-wide).
- LibRaw defines: `USE_ZLIB USE_JPEG8 LIBRAW_NODLL` (never `LIBRAW_NOTHREADS`); optional `USE_LCMS2`,
  `-fopenmp`.
- Link: static LibRaw/zlib/jpeg; Linux `-Wl,--version-script=napi.map` exporting `napi_register_module_v1`
  and `node_api_module_get_api_version_v1`; `-static-libstdc++ -static-libgcc` on Linux; macOS
  `-undefined dynamic_lookup`; Windows `delayimp.lib /DELAYLOAD:node.exe` + `win_delay_load_hook.cc`.

## CI jobs

1. `build-linux` (matrix x64/arm64): Docker build → artifact.
2. `build-darwin` (matrix): native → artifact.
3. `build-win32`: native → artifact.
4. `test` (matrix of all five, on ubuntu/ubuntu-arm/macos-intel/macos/windows): download artifact, `npm test`,
   Electron smoke (`ELECTRON_RUN_AS_NODE=1`) with Electron 42 and current stable.
5. `package`: merge `prebuilds/`, `npm pack`, upload; on tag: `npm publish --provenance`.
