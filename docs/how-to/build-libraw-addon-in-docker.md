# How to build LibRaw and the addon inside Docker

Goal: produce `prebuilds/linux-x64/node.napi.node` (and arm64) with nothing but Docker on the host,
following the pattern of `sharp-electron/scripts/build-sharp.sh` and `scripts/sharp-build.Dockerfile`.

## 1. Repository layout

```
libraw-node/
  CMakeLists.txt            # addon + vendored libs
  cmake/
    napi.map                # version script: export only napi_register_module_v1
                             # (no cross-toolchain file: T19 found no viable Rocky-hosted
                             # aarch64 cross toolchain -- see §6)
  src/                      # addon sources (node-addon-api)
  vendor/
    LibRaw-0.22.2/          # git submodule at tag 0.22.2, or unpacked tarball (pinned SHA in scripts/versions.env)
    zlib/                   # submodule
    libjpeg-turbo/          # submodule
  scripts/
    versions.env            # LIBRAW=0.22.2 ZLIB=... JPEGTURBO=... NODE_TARGET=24.0.0
    linux-build.Dockerfile
    build-linux.sh          # host entry point: docker build + run
    build-native.sh         # used on macOS/Windows runners
  prebuilds/                # output (gitignored)
```

## 2. Dockerfile (mirrors sharp's CI baseline)

```dockerfile
FROM rockylinux/rockylinux:8-ubi-init
ARG TARGETARCH   # BuildKit auto arg: amd64 | arm64, set by `docker buildx build --platform ...`
RUN dnf install -y epel-release dnf-plugins-core && dnf config-manager --set-enabled powertools && \
    dnf install -y gcc-toolset-14-gcc-c++ make cmake git python3.12 tar xz \
      $( [ "$TARGETARCH" = "amd64" ] && echo nasm )   # nasm is x86-only; NEON on arm64 needs no assembler
ENV PATH="/opt/rh/gcc-toolset-14/root/usr/bin:$PATH"
ARG NODE_VERSION=24.0.0
RUN NODE_ARCH="$( [ "$TARGETARCH" = "arm64" ] && echo arm64 || echo x64 )" && \
    curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" \
    | tar xJC /usr/local --strip-components=1
WORKDIR /work
```

Rocky 8 gives glibc 2.28, the same floor `sharp` and `@janhapke/sharp-electron` ship with. `nasm` lives in the `powertools` (CRB) repo, which must be enabled first (verified in T00). `nasm` is for
libjpeg-turbo's SIMD. There is no `gcc-toolset-14-gcc-c++-aarch64-linux-gnu` cross package to install on
Rocky 8 at all -- see §6, this Dockerfile instead gets built once per target platform via
`docker buildx build --platform linux/amd64` / `linux/arm64`, and `dnf install` inside each pulls that
platform's *native* `gcc-toolset-14-gcc-c++` package (with a matching sysroot, by construction).

## 3. CMakeLists.txt sketch

```cmake
cmake_minimum_required(VERSION 3.25)
project(libraw_node CXX C)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
set(CMAKE_C_VISIBILITY_PRESET hidden)
set(CMAKE_CXX_VISIBILITY_PRESET hidden)
set(CMAKE_VISIBILITY_INLINES_HIDDEN ON)

# vendored deps, all static
set(ZLIB_BUILD_SHARED OFF CACHE BOOL "" FORCE)      # zlib 1.3.x option names vary; check the version
add_subdirectory(vendor/zlib EXCLUDE_FROM_ALL)

# libjpeg-turbo CANNOT be add_subdirectory'd (verified in T03): its own
# CMakeLists.txt hard-fails with "cannot be integrated into another build
# system using add_subdirectory(). Use ExternalProject_Add() instead"
# whenever CMAKE_SOURCE_DIR != CMAKE_CURRENT_SOURCE_DIR. Build it as a nested
# CMake project via ExternalProject_Add and wrap the resulting archive as an
# IMPORTED target instead (see the real CMakeLists.txt for the full version,
# including the add_dependencies() needed so generated headers exist before
# raw_r's sources compile):
include(ExternalProject)
set(LIBJPEG_TURBO_BINARY_DIR ${CMAKE_BINARY_DIR}/vendor/libjpeg-turbo)
ExternalProject_Add(libjpeg_turbo_ext
  SOURCE_DIR ${CMAKE_SOURCE_DIR}/vendor/libjpeg-turbo
  BINARY_DIR ${LIBJPEG_TURBO_BINARY_DIR}
  CMAKE_ARGS -DCMAKE_BUILD_TYPE=Release -DCMAKE_POSITION_INDEPENDENT_CODE=ON
             -DENABLE_SHARED=OFF -DENABLE_STATIC=ON -DWITH_JPEG8=ON
             -DWITH_TURBOJPEG=OFF -DWITH_TOOLS=OFF -DWITH_TESTS=OFF -DWITH_SIMD=ON
  BUILD_COMMAND ${CMAKE_COMMAND} --build ${LIBJPEG_TURBO_BINARY_DIR} --target jpeg-static
  INSTALL_COMMAND ""
  BUILD_BYPRODUCTS ${LIBJPEG_TURBO_BINARY_DIR}/libjpeg.a)
add_library(jpeg-static STATIC IMPORTED GLOBAL)
set_target_properties(jpeg-static PROPERTIES IMPORTED_LOCATION ${LIBJPEG_TURBO_BINARY_DIR}/libjpeg.a)
add_dependencies(jpeg-static libjpeg_turbo_ext)

# LibRaw: compile the sources directly (Makefile.dist lists src/{decoders,decompressors,demosaic,
# integration,metadata,postprocessing,preprocessing,tables,utils,write,x3f}/*.cpp + libraw_c_api/datastream)
file(GLOB_RECURSE LIBRAW_SOURCES CONFIGURE_DEPENDS vendor/LibRaw-0.22.2/src/*.cpp)
add_library(raw_r STATIC ${LIBRAW_SOURCES})
target_include_directories(raw_r PUBLIC vendor/LibRaw-0.22.2)
target_compile_definitions(raw_r PUBLIC LIBRAW_NODLL USE_ZLIB USE_JPEG8)   # never LIBRAW_NOTHREADS
target_link_libraries(raw_r PUBLIC zlibstatic jpeg-static)
option(LIBRAW_NODE_OPENMP "Enable OpenMP demosaic" OFF)
if(LIBRAW_NODE_OPENMP)
  find_package(OpenMP REQUIRED)
  target_link_libraries(raw_r PUBLIC OpenMP::OpenMP_CXX)   # compile-time only (-fopenmp); the addon links
    # libgomp dynamically, not statically -- see how-to/set-up-prebuilds-and-ci.md §4 (T04 finding)
endif()

# addon
execute_process(COMMAND node -p "require('node-addon-api').include_dir" OUTPUT_VARIABLE NAPI_INC OUTPUT_STRIP_TRAILING_WHITESPACE)
execute_process(COMMAND node -p "require('node-api-headers').include_dir" OUTPUT_VARIABLE NODE_INC OUTPUT_STRIP_TRAILING_WHITESPACE)
add_library(addon SHARED src/addon.cc src/identify.cc src/decode.cc src/thumbnail.cc src/params.cc src/metadata.cc)
set_target_properties(addon PROPERTIES PREFIX "" SUFFIX ".node" OUTPUT_NAME "node.napi")
target_include_directories(addon PRIVATE ${NAPI_INC} ${NODE_INC})
target_compile_definitions(addon PRIVATE NAPI_VERSION=8 NODE_API_NO_EXTERNAL_BUFFERS_ALLOWED NAPI_CPP_EXCEPTIONS)
target_link_libraries(addon PRIVATE raw_r)
if(LINUX)
  target_link_options(addon PRIVATE -Wl,--version-script=${CMAKE_SOURCE_DIR}/cmake/napi.map -static-libstdc++ -static-libgcc)
elseif(APPLE)
  target_link_options(addon PRIVATE -undefined dynamic_lookup)
elseif(WIN32)
  target_sources(addon PRIVATE src/win_delay_load_hook.cc)   # copy from node-gyp/src
  target_link_libraries(addon PRIVATE delayimp)
  target_link_options(addon PRIVATE /DELAYLOAD:node.exe)
  target_link_libraries(addon PRIVATE ${NODE_LIB})           # node.lib from nodejs.org/dist/v24.x/win-x64/node.lib
endif()
```

`cmake/napi.map`:

```
{ global: napi_register_module_v1; node_api_module_get_api_version_v1; local: *; };
```

Alternative: use `cmake-js` (`npm i -D cmake-js`) which injects `CMAKE_JS_INC`/`CMAKE_JS_LIB` and handles
`node.lib` and the delay-load hook via `CMAKE_JS_SRC`. Keep the plain-CMake path working too so the Docker
cross build does not need Node inside the container beyond the headers.

## 4. Host script

```bash
#!/usr/bin/env bash
# scripts/build-linux.sh <x64|arm64>
set -euo pipefail
cd "$(dirname "$0")/.."
ARCH=${1:-x64}
case "$ARCH" in
  x64) PLATFORM=linux/amd64 ;;
  arm64) PLATFORM=linux/arm64 ;;
esac
source scripts/versions.env
docker buildx build --platform "$PLATFORM" --load \
  -f scripts/linux-build.Dockerfile --build-arg NODE_VERSION="$NODE_VERSION" \
  -t "libraw-node-build:linux-$ARCH" scripts/
docker run --rm --platform "$PLATFORM" -u "$(id -u):$(id -g)" -v "$PWD:$PWD" -w "$PWD" \
  "libraw-node-build:linux-$ARCH" bash -c "
    cmake -S . -B build/linux-$ARCH -DCMAKE_BUILD_TYPE=Release &&
    cmake --build build/linux-$ARCH -j\$(nproc) &&
    mkdir -p prebuilds/linux-$ARCH && cp build/linux-$ARCH/node.napi.node prebuilds/linux-$ARCH/ &&
    strip --strip-unneeded prebuilds/linux-$ARCH/node.napi.node"
```

No `CMAKE_TOOLCHAIN_FILE` is involved: this is not a cross build. `--platform linux/arm64` makes BuildKit
build and run an actual aarch64 container (native on an arm64 host/runner, under QEMU user-mode emulation
on an x86_64 host), so CMake configures and compiles *natively* for aarch64 inside it -- gcc-toolset-14's
compiler, sysroot and libgomp are all the real aarch64 packages, not cross artifacts. See §6 for why this
was chosen over a cross toolchain.

## 5. Verify

```bash
node -e "const l=require('./'); console.log(l.LibRaw.version, l.LibRaw.capabilities)"
objdump -T prebuilds/linux-x64/node.napi.node | grep -c ' g_\| jpeg_\| inflate'   # expect 0 exported
nm -D --defined-only prebuilds/linux-x64/node.napi.node                             # only napi_register_module_v1 (+ api version)
objdump -p prebuilds/linux-x64/node.napi.node | grep NEEDED                          # libc, libm, libpthread only
```

The two `objdump` checks are the ones `sharp-electron` learned to always run: a clean build does not prove
symbols are hidden.

## 6. arm64 (T19): cross toolchain vs. native container under QEMU/`ubuntu-24.04-arm`

Two approaches were on the table, in this order of preference:

**(a) Cross gcc in the Rocky 8 image** (`cmake/toolchain-aarch64.cmake` with `CMAKE_SYSTEM_NAME Linux`,
`CMAKE_SYSTEM_PROCESSOR aarch64`, `aarch64-linux-gnu-g++`, `CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER`).
Rejected: Rocky 8 / gcc-toolset-14 does not ship a usable aarch64 cross toolchain at all.

- `gcc-toolset-14` (the SCL that supplies gcc 14 on Rocky 8) has **no** `-aarch64-linux-gnu` cross
  sub-package in any of BaseOS/AppStream/PowerTools -- confirmed by installing it inside the pinned x64
  image and running `dnf list available 'gcc-toolset-14*aarch64*'`, which returned nothing.
- The only aarch64 cross compiler available anywhere in Rocky 8's repos (BaseOS/AppStream/PowerTools) plus
  EPEL is EPEL's plain `gcc-c++-aarch64-linux-gnu` (gcc **12.1.1**, not gcc-toolset-14/gcc 14 -- a
  different, older compiler from a different vendor stream). Installing it only pulls the compiler driver
  and `cc1plus` (`rpm -ql gcc-c++-aarch64-linux-gnu` lists `aarch64-linux-gnu-{gcc,g++}` and the
  `cc1plus` binary, nothing else) -- there is **no target sysroot package**: `dnf provides
  '*aarch64-linux-gnu*glibc*'` and `dnf list available '*aarch64-linux-gnu*'` both come back empty for any
  glibc-devel/libstdc++-devel/libgomp-devel aarch64 package. Without a target glibc + libstdc++ + libgomp,
  a full C++ link (LibRaw needs all three) is not possible, exactly as this task's brief predicted. Per the
  task's own instructions, this rules out (a) without hand-assembling a sysroot (explicitly out of scope).

**(b) Native arm64 container, chosen.** `scripts/build-linux.sh arm64` now runs
`docker buildx build --platform linux/arm64 --load` on the *same* `linux-build.Dockerfile`, so
`dnf install gcc-toolset-14-gcc-c++` inside that container installs the real
`gcc-toolset-14-gcc-c++.aarch64` package (verified present: `14.2.1-11.el8_10`, same gcc-toolset-14 version
as the x64 build, from the same `appstream` repo) with a matching native sysroot -- no cross toolchain, no
sysroot gap. Locally, `--platform linux/arm64` runs under QEMU user-mode emulation (registered once via
`docker run --privileged --rm tonistiigi/binfmt --install arm64` -- a kernel binfmt-table registration
only, no host package install); in CI, the same script runs on the `ubuntu-24.04-arm` GitHub-hosted runner,
which is natively arm64, so no QEMU is involved there at all and the build is exactly as fast as the x64
one. `cmake/toolchain-aarch64.cmake` was therefore never created -- there is no cross-compilation step to
configure a toolchain file for.

The Dockerfile's two arch-sensitive bits (§2) are conditioned on BuildKit's automatic `TARGETARCH` build
arg rather than on a build script parameter, so the same `Dockerfile` serves both platforms verbatim:
`nasm` (x86-only; libjpeg-turbo uses NEON C intrinsics on aarch64, no assembler needed) and the Node.js
tarball URL (`-linux-x64.tar.xz` vs. `-linux-arm64.tar.xz`).

`scripts/check-binary.sh` needed no changes for arm64: its `NEEDED` allowlist regex
(`ld-linux[a-zA-Z0-9_-]*\.so(\.[0-9]+)?`) already matches `ld-linux-aarch64.so.1` as well as
`ld-linux-x86-64.so.2`, and the host's `objdump`/`nm`/`file` (stock Ubuntu binutils, `binutils-x86-64-linux-gnu`
package) correctly parse foreign-arch ELF files -- verified directly by copying an aarch64 `libc.so` out of
the arm64 Rocky container and running `file`/`objdump -p`/`nm -D` on it from the x86_64 host without error.
