# How to build LibRaw and the addon inside Docker

Goal: produce `prebuilds/linux-x64/node.napi.node` (and arm64) with nothing but Docker on the host,
following the pattern of `sharp-electron/scripts/build-sharp.sh` and `scripts/sharp-build.Dockerfile`.

## 1. Repository layout

```
libraw-node/
  CMakeLists.txt            # addon + vendored libs
  cmake/
    napi.map                # version script: export only napi_register_module_v1
    toolchain-aarch64.cmake # cross toolchain for linux-arm64
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
RUN dnf install -y epel-release dnf-plugins-core && dnf config-manager --set-enabled powertools && \
    dnf install -y gcc-toolset-14-gcc-c++ make cmake git python3.12 tar xz nasm && \
    dnf install -y gcc-toolset-14-gcc-c++-aarch64-linux-gnu || true   # arm64 cross, if available
ENV PATH="/opt/rh/gcc-toolset-14/root/usr/bin:$PATH"
ARG NODE_VERSION=24.0.0
RUN curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
    | tar xJC /usr/local --strip-components=1
WORKDIR /work
```

Rocky 8 gives glibc 2.28, the same floor `sharp` and `@janhapke/sharp-electron` ship with. `nasm` lives in the `powertools` (CRB) repo, which must be enabled first (verified in T00). `nasm` is for
libjpeg-turbo's SIMD.

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
source scripts/versions.env
docker build -f scripts/linux-build.Dockerfile --build-arg NODE_VERSION="$NODE_TARGET" -t libraw-node-build scripts/
TOOLCHAIN=""
[ "$ARCH" = arm64 ] && TOOLCHAIN="-DCMAKE_TOOLCHAIN_FILE=cmake/toolchain-aarch64.cmake"
docker run --rm -u "$(id -u):$(id -g)" -v "$PWD:$PWD" -w "$PWD" libraw-node-build sh -c "
  npm ci --ignore-scripts &&
  cmake -S . -B build/linux-$ARCH -DCMAKE_BUILD_TYPE=Release $TOOLCHAIN &&
  cmake --build build/linux-$ARCH -j\$(nproc) &&
  mkdir -p prebuilds/linux-$ARCH && cp build/linux-$ARCH/node.napi.node prebuilds/linux-$ARCH/ &&
  strip --strip-unneeded prebuilds/linux-$ARCH/node.napi.node"
```

`cmake/toolchain-aarch64.cmake`:

```cmake
set(CMAKE_SYSTEM_NAME Linux)
set(CMAKE_SYSTEM_PROCESSOR aarch64)
set(CMAKE_C_COMPILER aarch64-linux-gnu-gcc)
set(CMAKE_CXX_COMPILER aarch64-linux-gnu-g++)
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
```

If the Rocky cross package is unavailable, fall back to `docker buildx build --platform linux/arm64` with
QEMU (slower, ~10× for LibRaw's ~250 k lines).

## 5. Verify

```bash
node -e "const l=require('./'); console.log(l.LibRaw.version, l.LibRaw.capabilities)"
objdump -T prebuilds/linux-x64/node.napi.node | grep -c ' g_\| jpeg_\| inflate'   # expect 0 exported
nm -D --defined-only prebuilds/linux-x64/node.napi.node                             # only napi_register_module_v1 (+ api version)
objdump -p prebuilds/linux-x64/node.napi.node | grep NEEDED                          # libc, libm, libpthread only
```

The two `objdump` checks are the ones `sharp-electron` learned to always run: a clean build does not prove
symbols are hidden.
