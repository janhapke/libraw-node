# @janhapke/libraw native addon.
#
# T02 built a hello-world Node-API addon. T03 adds the vendored static
# libraries: zlib via add_subdirectory (its upstream CMakeLists.txt builds a
# clean static target once the right cache variables are forced before the
# call), libjpeg-turbo via ExternalProject_Add (its upstream CMakeLists.txt
# refuses add_subdirectory outright -- see the comment at that section below),
# and LibRaw compiled directly from its source list into a static `raw_r`
# target, mirroring scripts/spike-static-libraw.sh (T00) which recorded the
# exact option names and flags verified in a working build. macOS/Windows
# link arms are added in T19-T21 -- this file only implements the Linux path
# for now.
cmake_minimum_required(VERSION 3.25)
# C is required for the vendored zlib and libjpeg-turbo subprojects (both are
# plain C libraries); the addon and LibRaw itself are C++.
project(libraw_node CXX C)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Hidden by default; only the two Node-API entry points are re-exposed, on
# Linux, via cmake/napi.map (see below). -fvisibility=hidden is required by
# T02; the version script is the belt-and-suspenders enforcement that
# scripts/check-binary.sh verifies.
set(CMAKE_C_VISIBILITY_PRESET hidden)
set(CMAKE_CXX_VISIBILITY_PRESET hidden)
set(CMAKE_VISIBILITY_INLINES_HIDDEN ON)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

option(LIBRAW_NODE_OPENMP "Compile LibRaw with OpenMP (parallel PPG/AHD/DHT/AAHD demosaic)" ON)

# ---------------------------------------------------------------------------
# zlib (static only) -- option names verified in scripts/spike-static-libraw.sh
# (T00) for this vendored zlib (>=1.3, which uses ZLIB_BUILD_SHARED/
# ZLIB_BUILD_STATIC, not the older single BUILD_SHARED_LIBS toggle).
# ---------------------------------------------------------------------------
set(ZLIB_BUILD_SHARED OFF CACHE BOOL "" FORCE)
set(ZLIB_BUILD_STATIC ON CACHE BOOL "" FORCE)
set(ZLIB_BUILD_TESTING OFF CACHE BOOL "" FORCE)
set(ZLIB_INSTALL OFF CACHE BOOL "" FORCE)
add_subdirectory(vendor/zlib EXCLUDE_FROM_ALL)
# zlibstatic exports its include dirs (source + generated zconf.h) as a
# target-level PUBLIC usage requirement, so linking it is enough -- no
# explicit -I needed.

# ---------------------------------------------------------------------------
# libjpeg-turbo (static only, JPEG8 API to match LibRaw's USE_JPEG8, SIMD via
# nasm) -- option names verified in scripts/spike-static-libraw.sh (T00).
#
# add_subdirectory() does NOT work here: libjpeg-turbo's own CMakeLists.txt
# (line ~70) hard-fails with "cannot be integrated into another build system
# using add_subdirectory(). Use ExternalProject_Add() instead" whenever
# CMAKE_SOURCE_DIR != CMAKE_CURRENT_SOURCE_DIR -- i.e. it actively refuses to
# be add_subdirectory'd (zlib has no such restriction and IS added via
# add_subdirectory above). So libjpeg-turbo is built via ExternalProject_Add
# as its own nested CMake project (matching how scripts/spike-static-libraw.sh
# invoked it with a separate `cmake -S vendor/libjpeg-turbo -B ...`), and its
# resulting static archive is wrapped in an IMPORTED target so raw_r can
# target_link_libraries() it like any in-tree target.
# ---------------------------------------------------------------------------
include(ExternalProject)
include(ProcessorCount)
ProcessorCount(LIBRAW_NODE_NPROC)
if(LIBRAW_NODE_NPROC EQUAL 0)
  set(LIBRAW_NODE_NPROC 1)
endif()

set(LIBJPEG_TURBO_BINARY_DIR "${CMAKE_BINARY_DIR}/vendor/libjpeg-turbo")
set(LIBJPEG_TURBO_LIBRARY "${LIBJPEG_TURBO_BINARY_DIR}/libjpeg.a")

ExternalProject_Add(libjpeg_turbo_ext
  SOURCE_DIR "${CMAKE_SOURCE_DIR}/vendor/libjpeg-turbo"
  BINARY_DIR "${LIBJPEG_TURBO_BINARY_DIR}"
  CMAKE_ARGS
    -DCMAKE_BUILD_TYPE=Release
    -DCMAKE_C_COMPILER=${CMAKE_C_COMPILER}
    -DCMAKE_POSITION_INDEPENDENT_CODE=ON
    -DENABLE_SHARED=OFF
    -DENABLE_STATIC=ON
    -DWITH_JPEG8=ON
    -DWITH_TURBOJPEG=OFF
    -DWITH_TOOLS=OFF
    -DWITH_TESTS=OFF
    -DWITH_SIMD=ON
  BUILD_COMMAND ${CMAKE_COMMAND} --build "${LIBJPEG_TURBO_BINARY_DIR}" --target jpeg-static -- -j${LIBRAW_NODE_NPROC}
  INSTALL_COMMAND ""
  BUILD_BYPRODUCTS "${LIBJPEG_TURBO_LIBRARY}"
  USES_TERMINAL_BUILD TRUE)

add_library(jpeg-static STATIC IMPORTED GLOBAL)
set_target_properties(jpeg-static PROPERTIES IMPORTED_LOCATION "${LIBJPEG_TURBO_LIBRARY}")
add_dependencies(jpeg-static libjpeg_turbo_ext)
# jconfig.h/jconfigint.h/jversion.h are generated into
# LIBJPEG_TURBO_BINARY_DIR by libjpeg-turbo's own configure_file() calls;
# jpeglib.h/jerror.h/jmorecfg.h (the public headers) live in src/, not the
# repo root. Both paths are added explicitly on raw_r below (T00 spike header
# comment) since an IMPORTED target has no compile-time knowledge of them.

# ---------------------------------------------------------------------------
# LibRaw: compile every *.cpp under vendor/LibRaw/src (82 files at 0.22.2,
# recursively -- includes the top-level libraw_c_api.cpp/libraw_datastream.cpp
# and every decoders/decompressors/demosaic/integration/metadata/
# postprocessing/preprocessing/tables/utils/write/x3f source; the
# dngsdk_glue/rawspeed_glue integration files compile fine without their SDKs,
# see T00) into a static "raw_r" target -- reentrant (never LIBRAW_NOTHREADS,
# per docs/explanation/what-is-libraw.md's threading model), never the
# single-threaded libraw.a.
# ---------------------------------------------------------------------------
file(GLOB_RECURSE LIBRAW_SOURCES CONFIGURE_DEPENDS "${CMAKE_SOURCE_DIR}/vendor/LibRaw/src/*.cpp")
add_library(raw_r STATIC ${LIBRAW_SOURCES})

target_include_directories(raw_r PUBLIC
  "${CMAKE_SOURCE_DIR}/vendor/LibRaw"
  "${CMAKE_SOURCE_DIR}/vendor/libjpeg-turbo/src"
  "${LIBJPEG_TURBO_BINARY_DIR}")

# PUBLIC: the addon links raw_r PRIVATE below, so these apply to addon.cc's
# own compilation too. That matters because libraw_types.h's struct layout
# depends on USE_ZLIB/USE_JPEG/USE_JPEG8 -- addon.cc must see the exact same
# defines LibRaw's own translation units were compiled with, or struct
# offsets mismatch between raw_r.a and addon.cc callers.
target_compile_definitions(raw_r PUBLIC
  LIBRAW_NODLL
  USE_ZLIB
  USE_JPEG
  USE_JPEG8)

if(LIBRAW_NODE_OPENMP)
  if(NOT CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    message(WARNING "LIBRAW_NODE_OPENMP requested but compiler is ${CMAKE_CXX_COMPILER_ID}; disabling")
    set(LIBRAW_NODE_OPENMP OFF)
  else()
    # Compile-time only: -fopenmp turns LibRaw's OpenMP pragmas (PPG/AHD/DHT/
    # AAHD demosaic) into calls into libgomp. It must NOT also be added to the
    # addon's *link* line -- see the static-libgomp note below.
    target_compile_options(raw_r PRIVATE -fopenmp)
  endif()
endif()

target_link_libraries(raw_r PUBLIC zlibstatic jpeg-static)
# target_link_libraries() alone does not guarantee jconfig.h/jconfigint.h/
# jversion.h (generated by the libjpeg-turbo ExternalProject at *its* build
# time) exist before raw_r's own .cpp files are *compiled* (as opposed to
# linked) -- e.g. under `make -jN` these could race. This add_dependencies()
# makes the whole libjpeg_turbo_ext step a prerequisite of raw_r's build, not
# just of its link step.
add_dependencies(raw_r libjpeg_turbo_ext)

# ---------------------------------------------------------------------------
# build_info.h: configure-time generated header backing the addon's
# buildInfo export (LibRaw/zlib/libjpeg-turbo versions, OpenMP on/off,
# compiler id+version, flags, build date, git commit).
# ---------------------------------------------------------------------------
file(STRINGS "${CMAKE_SOURCE_DIR}/scripts/versions.env" LIBRAW_NODE_VERSIONS_ENV_LINES REGEX "^[A-Z_]+=.*$")
foreach(_line IN LISTS LIBRAW_NODE_VERSIONS_ENV_LINES)
  string(REGEX MATCH "^([A-Z_]+)=(.*)$" _matched "${_line}")
  if(_matched)
    set(LIBRAW_NODE_VERSIONS_ENV_${CMAKE_MATCH_1} "${CMAKE_MATCH_2}")
  endif()
endforeach()

set(LIBRAW_NODE_BUILDINFO_LIBRAW_VERSION "${LIBRAW_NODE_VERSIONS_ENV_LIBRAW_TAG}")
set(LIBRAW_NODE_BUILDINFO_ZLIB_VERSION "${LIBRAW_NODE_VERSIONS_ENV_ZLIB_TAG}")
set(LIBRAW_NODE_BUILDINFO_LIBJPEG_TURBO_VERSION "${LIBRAW_NODE_VERSIONS_ENV_LIBJPEG_TURBO_TAG}")

if(LIBRAW_NODE_OPENMP)
  set(LIBRAW_NODE_BUILDINFO_OPENMP_BOOL "true")
else()
  set(LIBRAW_NODE_BUILDINFO_OPENMP_BOOL "false")
endif()

string(TIMESTAMP LIBRAW_NODE_BUILDINFO_BUILD_DATE "%Y-%m-%dT%H:%M:%SZ" UTC)

find_package(Git QUIET)
set(LIBRAW_NODE_BUILDINFO_GIT_COMMIT "unknown")
if(Git_FOUND)
  execute_process(
    COMMAND "${GIT_EXECUTABLE}" rev-parse HEAD
    WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}"
    OUTPUT_VARIABLE LIBRAW_NODE_GIT_REV_PARSE_OUT
    OUTPUT_STRIP_TRAILING_WHITESPACE
    RESULT_VARIABLE LIBRAW_NODE_GIT_REV_PARSE_RESULT
    ERROR_QUIET)
  if(LIBRAW_NODE_GIT_REV_PARSE_RESULT EQUAL 0 AND NOT LIBRAW_NODE_GIT_REV_PARSE_OUT STREQUAL "")
    set(LIBRAW_NODE_BUILDINFO_GIT_COMMIT "${LIBRAW_NODE_GIT_REV_PARSE_OUT}")
  endif()
endif()

set(LIBRAW_NODE_BUILDINFO_FLAGS "-std=c++17 -O2 -fvisibility=hidden -fvisibility-inlines-hidden -fexceptions -DLIBRAW_NODLL -DUSE_ZLIB -DUSE_JPEG -DUSE_JPEG8 -DNAPI_VERSION=8 -DNODE_API_NO_EXTERNAL_BUFFERS_ALLOWED -DNAPI_CPP_EXCEPTIONS")
if(LIBRAW_NODE_OPENMP)
  string(APPEND LIBRAW_NODE_BUILDINFO_FLAGS " -fopenmp")
endif()

configure_file(
  "${CMAKE_SOURCE_DIR}/cmake/build_info.h.in"
  "${CMAKE_BINARY_DIR}/generated/build_info.h"
  @ONLY)

# node-addon-api and node-api-headers ship as npm packages, not system
# headers; ask the Node running inside the build container for their
# locations (node-addon-api's include_dir is returned relative to the
# process cwd, so pin the working directory and resolve it against the
# source tree -- CMake's execute_process defaults to CMAKE_CURRENT_BINARY_DIR,
# which is the out-of-tree build/ directory and would resolve wrong).
find_program(NODE_EXECUTABLE node REQUIRED)

execute_process(
  COMMAND "${NODE_EXECUTABLE}" -p "require('node-addon-api').include_dir"
  WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}"
  OUTPUT_VARIABLE NAPI_INC
  OUTPUT_STRIP_TRAILING_WHITESPACE
  COMMAND_ERROR_IS_FATAL ANY)
get_filename_component(NAPI_INC "${NAPI_INC}" ABSOLUTE BASE_DIR "${CMAKE_SOURCE_DIR}")

execute_process(
  COMMAND "${NODE_EXECUTABLE}" -p "require('node-api-headers').include_dir"
  WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}"
  OUTPUT_VARIABLE NODE_API_HEADERS_INC
  OUTPUT_STRIP_TRAILING_WHITESPACE
  COMMAND_ERROR_IS_FATAL ANY)
get_filename_component(NODE_API_HEADERS_INC "${NODE_API_HEADERS_INC}" ABSOLUTE BASE_DIR "${CMAKE_SOURCE_DIR}")

message(STATUS "node-addon-api include dir: ${NAPI_INC}")
message(STATUS "node-api-headers include dir: ${NODE_API_HEADERS_INC}")
message(STATUS "LIBRAW_NODE_OPENMP: ${LIBRAW_NODE_OPENMP}")

add_library(addon SHARED
  src/addon.cc
  src/cancel.cc
  src/enums.cc
  src/errors.cc
  src/events.cc
  src/fused.cc
  src/generated/metadata.gen.cc
  src/generated/params.gen.cc
  src/image_format.cc
  src/processor.cc
  src/progress_stage.cc)
set_target_properties(addon PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "node.napi")

target_include_directories(addon PRIVATE
  "${NAPI_INC}"
  "${NODE_API_HEADERS_INC}"
  "${CMAKE_BINARY_DIR}/generated")

target_link_libraries(addon PRIVATE raw_r)

# NAPI_VERSION pins the Node-API surface targeted (task requirement: 8).
# NODE_API_NO_EXTERNAL_BUFFERS_ALLOWED makes Napi::Buffer::New with external
# data a compile error, which is what keeps the addon Electron-safe (no
# buffers backed by memory Node/Electron didn't allocate).
# NAPI_CPP_EXCEPTIONS enables node-addon-api's C++ exception wrapping.
# NODE_GYP_MODULE_NAME is only consumed by the NODE_API_ADDON() macro name
# plumbing; it is not part of the exported ABI (see cmake/napi.map).
target_compile_definitions(addon PRIVATE
  NAPI_VERSION=8
  NODE_API_NO_EXTERNAL_BUFFERS_ALLOWED
  NAPI_CPP_EXCEPTIONS
  NODE_GYP_MODULE_NAME=addon)

if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
  # CMAKE_CXX_VISIBILITY_PRESET already adds -fvisibility=hidden; -fexceptions
  # is needed because NAPI_CPP_EXCEPTIONS assumes C++ exceptions are enabled.
  target_compile_options(addon PRIVATE -fexceptions)
endif()

if(LINUX)
  target_link_options(addon PRIVATE
    "-Wl,--version-script=${CMAKE_SOURCE_DIR}/cmake/napi.map"
    -static-libstdc++
    -static-libgcc)
  # LibRaw's reentrant build uses pthread mutexes regardless of OpenMP
  # (docs/explanation/what-is-libraw.md, threading model); on Rocky 8's glibc
  # 2.28, pthread is still a separate shared object (merged into libc only in
  # glibc 2.34), so link it explicitly. libpthread.so/libm.so/libdl.so are all
  # in scripts/check-binary.sh's NEEDED allowlist.
  #
  # T04 found two problems with the static-libgomp plan recorded by T00/T03
  # (docs/how-to/build-libraw-addon-in-docker.md, docs/how-to/set-up-prebuilds-and-ci.md):
  #
  # 1. Ordering: target_link_options()'s LINK_OPTIONS property is placed on
  #    the link line ahead of LINK_LIBRARIES regardless of call order, so the
  #    original target_link_options(addon PRIVATE -Wl,-Bstatic -lgomp
  #    -Wl,-Bdynamic) put "-lgomp" *before* raw_r.a on the command line -- ld
  #    only pulls archive members to satisfy symbols already undefined at the
  #    point the archive is scanned, so an archive appearing before its only
  #    referrer contributes nothing (version()/capabilities()/cameraList()
  #    never touch OpenMP code paths, so T03's link never surfaced this --
  #    decodeSync, added in T04, is the first call into the OpenMP-compiled
  #    demosaic code). Fixed by moving to target_link_libraries(), which
  #    appends to one ordered list in call order; calling it after the
  #    addon->raw_r link (near the top of this file) places it correctly.
  # 2. Once correctly ordered, the *static* link (-Wl,-Bstatic -lgomp
  #    -Wl,-Bdynamic) fails outright: gcc-toolset-14's libgomp.a was built
  #    without -fPIC, so its object files use the local-exec TLS model for
  #    libgomp's internal `gomp_tls_data` (visible as an
  #    "R_X86_64_TPOFF32 ... can not be used when making a shared object"
  #    linker error from barrier.o, pulled in by any #pragma omp parallel
  #    region's implicit barrier). Local-exec TLS relocations assume the
  #    referencing module owns the process's static TLS block, which is only
  #    true for the main executable -- never true for a dlopen'd Node addon
  #    .node file. This is a known GCC/binutils limitation (this exact
  #    archive cannot be statically linked into *any* shared object, not
  #    specific to this project), confirmed by testing that neither
  #    reordering alone nor `-Wl,-z,notext` (which does not relax this
  #    particular TLS-relocation check) works around it. Only rebuilding
  #    libgomp from source with a PIC-safe TLS model would allow static
  #    linking; that is a follow-up (see docs/how-to/build-libraw-addon-in-docker.md),
  #    not part of T04. For now OpenMP is linked dynamically, like
  #    pthread/m/dl below: libgomp.so.1 ships with every GCC/glibc Linux
  #    install (same ubiquity argument as those three), so
  #    scripts/check-binary.sh's NEEDED allowlist now permits it explicitly
  #    while still forbidding libjpeg/libz (which remain fully static, no
  #    such constraint applies to them).
  if(LIBRAW_NODE_OPENMP)
    target_link_libraries(addon PRIVATE gomp)
  endif()
  target_link_libraries(addon PRIVATE pthread m dl)
elseif(APPLE)
  # T20 adds the macOS-specific link arm (-undefined dynamic_lookup, an
  # exported-symbols list, MACOSX_DEPLOYMENT_TARGET).
  message(WARNING "macOS link flags are not implemented yet; see T20.")
elseif(WIN32)
  # T21 adds the Windows-specific link arm (win_delay_load_hook.cc,
  # /DELAYLOAD:node.exe, node.lib).
  message(WARNING "Windows link flags are not implemented yet; see T21.")
endif()
