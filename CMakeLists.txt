# @janhapke/libraw native addon.
#
# T02 built a hello-world Node-API addon. T03 adds the vendored static
# libraries: zlib via add_subdirectory (its upstream CMakeLists.txt builds a
# clean static target once the right cache variables are forced before the
# call), libjpeg-turbo via ExternalProject_Add (its upstream CMakeLists.txt
# refuses add_subdirectory outright -- see the comment at that section below),
# and LibRaw compiled directly from its source list into a static `raw_r`
# target, mirroring scripts/spike-static-libraw.sh (T00) which recorded the
# exact option names and flags verified in a working build. T20 adds the
# macOS link arm (this comment used to say "T19-T21"; T19 was Linux arm64
# only, no macOS/Windows code). T21 adds the Windows (win32-x64) link arm.
cmake_minimum_required(VERSION 3.25)

# CMAKE_OSX_DEPLOYMENT_TARGET must be set before project() to reliably affect
# the implicit -mmacosx-version-min flag CMake adds to every compile/link
# command; scripts/build-native.sh always passes
# -DCMAKE_OSX_DEPLOYMENT_TARGET=11.0 explicitly on the command line (which
# also lands here before project(), since CMake evaluates -D cache entries
# before running the top of the script), so this is only a defensive default
# for a manual `cmake -S .` invocation on macOS without the wrapper script.
if(APPLE AND NOT DEFINED CMAKE_OSX_DEPLOYMENT_TARGET)
  set(CMAKE_OSX_DEPLOYMENT_TARGET "11.0" CACHE STRING "Minimum macOS version" FORCE)
endif()

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

if(WIN32)
  # T21: pin /MD (the dynamic, release UCRT/vcruntime) explicitly for every
  # target configured from here on -- zlib (add_subdirectory, below), LibRaw
  # (raw_r) and the addon all pick this up automatically since
  # CMAKE_MSVC_RUNTIME_LIBRARY seeds each target's MSVC_RUNTIME_LIBRARY
  # property at the time the target is created, so this must be set before
  # any add_library() call. This is also forwarded explicitly into the
  # separately-configured libjpeg-turbo ExternalProject further down (its own
  # CMake cache is independent of this one) so every static piece the addon
  # links uses the same CRT, avoiding an MSVC "LNK2038: mismatch detected for
  # 'RuntimeLibrary'" error. /MD matches Node.exe/Electron.exe's own CRT
  # linkage (docs/reference/build-matrix.md); CMP0091=NEW (required for this
  # variable to have any effect) is already implied by
  # `cmake_minimum_required(VERSION 3.25)` above (policy introduced in 3.15).
  set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>DLL")
endif()

option(LIBRAW_NODE_OPENMP "Compile LibRaw with OpenMP (parallel PPG/AHD/DHT/AAHD demosaic)" ON)
# macOS only (T20): Apple's Xcode clang ships no OpenMP runtime at all (not
# even as a linkable static lib), so this must point at a separately
# installed one -- Homebrew's `libomp` keg, which is keg-only (never
# symlinked into /usr/local or /opt/homebrew's default include/lib paths, to
# avoid clashing with any other OpenMP implementation someone might have
# installed) and so must be located and passed explicitly. CI resolves it
# with `brew --prefix libomp` (see scripts/build-native.sh / build.yml);
# empty here means "not on macOS" or "caller didn't set it", both of which
# fall back to LIBRAW_NODE_OPENMP=OFF further down.
set(LIBRAW_NODE_OMP_ROOT "" CACHE PATH "Prefix of a libomp install providing include/omp.h and lib/libomp.a (macOS only)")

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
if(WIN32)
  # libjpeg-turbo's CMakeLists.txt only applies its Unix-style
  # `set_target_properties(jpeg-static PROPERTIES OUTPUT_NAME jpeg)` when
  # NOT MSVC_LIKE (see vendor/libjpeg-turbo/CMakeLists.txt ~line 770); on
  # MSVC the target keeps its default output name, so the archive is
  # jpeg-static.lib, not libjpeg.a.
  set(LIBJPEG_TURBO_LIBRARY "${LIBJPEG_TURBO_BINARY_DIR}/jpeg-static.lib")
else()
  set(LIBJPEG_TURBO_LIBRARY "${LIBJPEG_TURBO_BINARY_DIR}/libjpeg.a")
endif()

set(LIBRAW_NODE_LIBJPEG_TURBO_EXTRA_CMAKE_ARGS "")
if(WIN32)
  # Forward the same static-CRT-linkage policy this file sets for the addon
  # (T21, see the WIN32 addon link arm below) into the nested libjpeg-turbo
  # configure so its objects use the matching /MD runtime -- a mismatch here
  # is a classic MSVC "LNK2038: mismatch detected for 'RuntimeLibrary'" link
  # error waiting to happen once raw_r links jpeg-static.lib.
  list(APPEND LIBRAW_NODE_LIBJPEG_TURBO_EXTRA_CMAKE_ARGS
    -DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreaded$<$<CONFIG:Debug>:Debug>DLL
    -DCMAKE_POLICY_DEFAULT_CMP0091=NEW)
endif()

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
    ${LIBRAW_NODE_LIBJPEG_TURBO_EXTRA_CMAKE_ARGS}
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
#
# EXCLUDED (T20): src/postprocessing/postprocessing_ph.cpp,
# src/preprocessing/preprocessing_ph.cpp and src/write/write_ph.cpp are not
# alternative translation units for the normal sources -- they are LibRaw's
# own "Placeholder functions to build LibRaw w/o postprocessing tools" (see
# each file's header comment): no-op/NULL/LIBRAW_NOT_IMPLEMENTED stand-ins
# for dcraw_process, dcraw_make_mem_image, dcraw_make_mem_thumb,
# scale_colors_loop, convert_to_rgb_loop, lin_interpolate_loop, copy_bayer,
# raw2image_start, copy_fuji_uncropped and fuji_rotate, meant to replace
# (never join) the real implementations in a build configuration that wants
# no postprocessing at all. `vendor/LibRaw/Makefile.dist` never references
# these three files (verified: diffing its `object/*.o` list against this
# glob's source list turns up exactly these three and nothing else); the
# original, unfiltered glob compiled all 82 .cpp files it found, silently
# including these 3, so every one of the ten symbols above had two
# definitions in libraw_r.a.
#
# On Linux this went unnoticed: GNU ld's archive resolution only pulls an
# archive member to satisfy a symbol still undefined at the point it's
# scanned, and (by luck of this glob's alphabetical member order) every real
# implementation happened to already be pulled in for some *other* symbol
# before the matching _ph.cpp stub was ever reached, so the stubs were
# simply never linked in at all. Apple's ld64 does not behave the same way:
# it reported "duplicate symbol" warnings (not errors) for all ten symbols
# and resolved each one independently by archive member index, which for
# five of them -- raw2image_start, copy_bayer, scale_colors_loop,
# convert_to_rgb_loop, copy_fuji_uncropped -- picked the *stub* over the
# real implementation (their stub source happens to sort to a lower archive
# index than the real one). The result on macOS was a fully "successful"
# decode (dcraw_process() itself resolved to the real function, so nothing
# threw) that silently produced all-zero pixel data, because raw2image_start
# /copy_bayer (which move sensor data into the working image buffer before
# demosaic) and convert_to_rgb_loop (final color conversion) had all quietly
# become no-ops -- discovered via CI round 2's `npm test` failures on both
# darwin-x64 and darwin-arm64 (identical failures on both, and unaffected by
# also disabling OpenMP in round 3, which ruled out the initial OpenMP/TLS
# theory recorded -- and since corrected -- in docs/plan/tasks.md's T20
# section). Excluding the three stub files removes the duplicate symbols
# entirely (clean link, no more ld64 warnings) on every platform.
# ---------------------------------------------------------------------------
file(GLOB_RECURSE LIBRAW_SOURCES CONFIGURE_DEPENDS "${CMAKE_SOURCE_DIR}/vendor/LibRaw/src/*.cpp")
list(FILTER LIBRAW_SOURCES EXCLUDE REGEX "/(postprocessing_ph|preprocessing_ph|write_ph)\\.cpp$")
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
  if(APPLE)
    # Apple clang (the Xcode-shipped compiler, not upstream LLVM clang) does
    # not accept a bare -fopenmp on its driver -- it needs
    # `-Xpreprocessor -fopenmp` instead, which tells only the *preprocessor*
    # to lower `#pragma omp` into calls against an OpenMP runtime; Apple
    # supplies no such runtime (see LIBRAW_NODE_OMP_ROOT above and the link
    # arm below, which supplies Homebrew's libomp statically). If the root
    # isn't configured or doesn't actually have a static archive, OpenMP is
    # disabled for this build rather than left half-wired (T20's documented
    # fallback; see docs/plan/tasks.md's T20 section for when this triggers).
    if(NOT LIBRAW_NODE_OMP_ROOT)
      message(WARNING "LIBRAW_NODE_OPENMP=ON on macOS requires -DLIBRAW_NODE_OMP_ROOT=<libomp prefix> (e.g. $(brew --prefix libomp)); disabling OpenMP for this build")
      set(LIBRAW_NODE_OPENMP OFF)
    elseif(NOT EXISTS "${LIBRAW_NODE_OMP_ROOT}/lib/libomp.a")
      message(WARNING "LIBRAW_NODE_OMP_ROOT (${LIBRAW_NODE_OMP_ROOT}) has no lib/libomp.a (static archive missing from this libomp install); disabling OpenMP for this build")
      set(LIBRAW_NODE_OPENMP OFF)
    else()
      target_compile_options(raw_r PRIVATE -Xpreprocessor -fopenmp "-I${LIBRAW_NODE_OMP_ROOT}/include")
    endif()
  elseif(WIN32)
    # T21: MSVC ships no static OpenMP runtime at all (neither the classic
    # /openmp `vcomp140.dll` nor clang-cl's /openmp:llvm `libomp140.x86_64.dll`
    # have a static archive variant) -- unlike Linux (dynamic libgomp.so.1,
    # T04) or macOS (static libomp.a from Homebrew, T20), "static OpenMP on
    # Windows" is simply not an option MSVC offers. Per the decision rule in
    # docs/plan/tasks.md's T21 section: use plain MSVC `/openmp` (not
    # `/openmp:llvm`, which needs clang-cl, a separate toolchain not set up
    # here) and accept VCOMP140.dll as one documented dynamic dependency --
    # scripts/check-binary-windows.ps1 allows exactly this DLL and nothing
    # else beyond the CRT/kernel32 baseline; README.md and
    # docs/reference/build-matrix.md record it as a runtime requirement.
    if(NOT MSVC)
      message(WARNING "LIBRAW_NODE_OPENMP requested on Windows but compiler is not MSVC (${CMAKE_CXX_COMPILER_ID}); disabling")
      set(LIBRAW_NODE_OPENMP OFF)
    else()
      target_compile_options(raw_r PRIVATE /openmp)
    endif()
  elseif(NOT CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
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

if(WIN32)
  # MSVC's own flag spelling (T21) -- genuinely different from the GNU/Clang
  # style used on Linux/macOS below, not just a cosmetic rename.
  set(LIBRAW_NODE_BUILDINFO_FLAGS "/EHsc /MD /O2 /DLIBRAW_NODLL /DUSE_ZLIB /DUSE_JPEG /DUSE_JPEG8 /DNAPI_VERSION=8 /DNODE_API_NO_EXTERNAL_BUFFERS_ALLOWED /DNAPI_CPP_EXCEPTIONS")
else()
  set(LIBRAW_NODE_BUILDINFO_FLAGS "-std=c++17 -O2 -fvisibility=hidden -fvisibility-inlines-hidden -fexceptions -DLIBRAW_NODLL -DUSE_ZLIB -DUSE_JPEG -DUSE_JPEG8 -DNAPI_VERSION=8 -DNODE_API_NO_EXTERNAL_BUFFERS_ALLOWED -DNAPI_CPP_EXCEPTIONS")
endif()
if(LIBRAW_NODE_OPENMP)
  if(APPLE)
    # Reflects the actual macOS OpenMP compile line (see the LIBRAW_NODE_OMP_ROOT
    # block above) rather than the GNU/Clang -fopenmp used on Linux.
    string(APPEND LIBRAW_NODE_BUILDINFO_FLAGS " -Xpreprocessor -fopenmp -I${LIBRAW_NODE_OMP_ROOT}/include")
  elseif(WIN32)
    # /openmp (T21): dynamically links VCOMP140.dll -- the one documented
    # sidecar exception on Windows; see the CMAKE_CXX_COMPILER_ID MATCHES
    # block above and README.md / docs/reference/build-matrix.md for why.
    string(APPEND LIBRAW_NODE_BUILDINFO_FLAGS " /openmp")
  else()
    string(APPEND LIBRAW_NODE_BUILDINFO_FLAGS " -fopenmp")
  endif()
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

# MODULE, not SHARED: a Node native addon is loaded exclusively via dlopen()
# by absolute path (never linked against by name at build time), which is
# exactly what CMake's MODULE library type is for. On ELF/PE this compiles
# identically to SHARED (same -shared/DLL flags), but on Apple platforms it
# changes the underlying linker invocation from `-dynamiclib` to `-bundle`,
# producing a Mach-O MH_BUNDLE instead of MH_DYLIB. That distinction matters
# on macOS (T20): an MH_DYLIB carries an LC_ID_DYLIB load command (its own
# install name, e.g. "@rpath/node.napi.node") that `otool -L` prints as if it
# were a linked dependency of itself -- harmless (nothing ever resolves a
# bundle's own ID; Node/Electron dlopen() it by path) but it fails
# scripts/check-binary-macos.sh's "only libSystem.B.dylib/libc++.1.dylib"
# otool -L allowlist, and more importantly it just isn't the right Mach-O
# file kind for a dlopen-only plugin. MH_BUNDLE has no ID entry at all, which
# is also what node-gyp itself produces for every other .node file.
add_library(addon MODULE
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
elseif(MSVC)
  # T21: /EHsc is MSVC's equivalent of -fexceptions (standard C++ exception
  # unwinding, no extern "C" functions assumed noexcept) -- required for the
  # same NAPI_CPP_EXCEPTIONS reason as the GNU/Clang branch above.
  # CMAKE_CXX_VISIBILITY_PRESET (hidden) is a no-op on MSVC (that property
  # only affects ELF/Mach-O); Windows symbol export instead goes through
  # __declspec(dllexport)/dllimport, which node-api-headers already applies
  # automatically via NAPI_MODULE_EXPORT/NAPI_EXTERN -- see BUILDING_NODE_EXTENSION
  # below for why that resolves to dllimport for the *imported* napi_*
  # functions and dllexport only for our own two module-registration entry
  # points, matching Linux's version-script/macOS's exported-symbols-list
  # intent without needing an explicit .def file of our own.
  target_compile_options(addon PRIVATE /EHsc)
  target_compile_options(raw_r PRIVATE /EHsc)
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
  # T20: no libnode/node.lib exists to link against on macOS (unlike Windows),
  # so unresolved `napi_*`/`node_api_*` symbols the addon's own code calls are
  # left undefined at link time and resolved at load time against whichever
  # process loaded the addon (Node or Electron) -- the same trick prebuildify
  # addons use everywhere on Darwin.
  #
  # -Wl,-exported_symbols_list restricts what the addon itself re-exports to
  # exactly the two Node-API entry points (cmake/napi.exports), the Darwin
  # equivalent of Linux's --version-script=napi.map.
  #
  # -Wl,-dead_strip drops unreferenced code/data at link time; combined with
  # -fvisibility=hidden (set globally above) and the exported-symbols list,
  # this keeps LibRaw's own large symbol table (raw_r pulls in ~80 translation
  # units) from bloating or leaking through the final .node.
  target_link_options(addon PRIVATE
    -undefined dynamic_lookup
    "-Wl,-exported_symbols_list,${CMAKE_SOURCE_DIR}/cmake/napi.exports"
    -Wl,-dead_strip)

  if(LIBRAW_NODE_OPENMP)
    # Static, by absolute path to the .a -- deliberately not `-lomp`, which
    # would let the linker pick Homebrew's libomp.dylib instead (present
    # alongside libomp.a in the same keg) and silently reintroduce exactly
    # the sidecar dependency this task exists to avoid.
    # scripts/check-binary-macos.sh's otool -L allowlist (libSystem.B.dylib +
    # libc++.1.dylib only) is what catches a regression here.
    target_link_libraries(addon PRIVATE "${LIBRAW_NODE_OMP_ROOT}/lib/libomp.a")
  endif()
elseif(WIN32)
  # T21: unlike macOS (no libnode/node.lib exists there at all, so unresolved
  # napi_*/node_api_* symbols are left for the loading process to resolve --
  # see the APPLE branch above), Windows DLLs cannot have unresolved imports:
  # the loader refuses to load a DLL whose import table cannot be satisfied
  # at load time. A native addon therefore always needs *some* import library
  # to link against. node-gyp solves this by downloading the pinned Node
  # version's prebuilt node.lib from nodejs.org; this project avoids that
  # extra pinned download by synthesizing an equivalent import library from
  # node-api-headers' own .def files (added for exactly this purpose, see
  # node-api-headers' CHANGELOG "Provide def file for windows import lib")
  # with `lib.exe /def:... /out:node.lib` -- see scripts/build-native.ps1.
  # LIBRAW_NODE_NODE_LIB is that generated import library's path, passed in
  # via -D by the script; there is no sane default to fall back to.
  if(NOT LIBRAW_NODE_NODE_LIB)
    message(FATAL_ERROR "WIN32 build requires -DLIBRAW_NODE_NODE_LIB=<path to node.lib> (see scripts/build-native.ps1, T21)")
  endif()
  if(NOT EXISTS "${LIBRAW_NODE_NODE_LIB}")
    message(FATAL_ERROR "LIBRAW_NODE_NODE_LIB (${LIBRAW_NODE_NODE_LIB}) does not exist")
  endif()

  # BUILDING_NODE_EXTENSION flips node-api-headers' NAPI_EXTERN macro from
  # its unconditional-on-Windows default of __declspec(dllexport) (meant for
  # node.exe's own build, which *defines* these functions) to
  # __declspec(dllimport) (what every native addon needs: napi_* symbols are
  # *implemented* in node.exe/electron.exe and merely imported here, resolved
  # against LIBRAW_NODE_NODE_LIB above). This is exactly the define node-gyp
  # injects into every Windows addon build via its common.gypi; see
  # node_modules/node-api-headers/include/node_api.h's NAPI_EXTERN block.
  # HOST_BINARY names the module win_delay_load_hook.cc's load_exe_hook()
  # intercepts (must match the /DELAYLOAD:node.exe linker flag below and the
  # "LIBRARY NODE.EXE" statement in the generated node.lib's def).
  target_sources(addon PRIVATE src/win_delay_load_hook.cc)
  target_compile_definitions(addon PRIVATE
    BUILDING_NODE_EXTENSION
    HOST_BINARY="node.exe"
    _CRT_SECURE_NO_WARNINGS
    NOMINMAX
    WIN32_LEAN_AND_MEAN)
  target_compile_definitions(raw_r PRIVATE
    _CRT_SECURE_NO_WARNINGS
    NOMINMAX
    WIN32_LEAN_AND_MEAN)
  # Matches Makefile.msvc's own /W0 for LibRaw's sources (vendor/LibRaw is
  # not our code to keep warning-clean; this only silences raw_r, not
  # addon.cc and friends, which stay at MSVC's default warning level).
  target_compile_options(raw_r PRIVATE /W0)

  # delayimp.lib + /DELAYLOAD:node.exe defer resolving node.exe's imports
  # until first use, and win_delay_load_hook.cc's __pfnDliNotifyHook2
  # intercepts that resolution to redirect it at the *current* process image
  # instead of literally looking for a file named node.exe on disk -- the fix
  # for Electron (electron.exe, not node.exe) described in
  # docs/explanation/electron-compatibility.md §3 /
  # docs/how-to/make-the-addon-electron-safe.md row 3.
  target_link_libraries(addon PRIVATE "${LIBRAW_NODE_NODE_LIB}" delayimp.lib)
  target_link_options(addon PRIVATE "/DELAYLOAD:node.exe")

  # T24b round 5: also delay-load VCOMP140.DLL (the /openmp runtime -- see
  # win_delay_load_hook.cc's DllMain for the full round-4/5 writeup). Round
  # 4 set OMP_NUM_THREADS=1 via SetEnvironmentVariableA in that same DllMain
  # but it had zero effect (run 34140957966's variant table was
  # byte-identical to round 1's un-fixed baseline) -- the leading theory is
  # that VCOMP140.DLL, as an ordinary (non-delay-loaded) dependency, gets
  # loaded and runs its own DllMain -- reading OMP_NUM_THREADS once, then
  # -- as part of node.napi.node's own load, which happens *before*
  # node.napi.node's own DllMain (this file's) ever gets a chance to run and
  # set that variable. Delay-loading VCOMP140.DLL defers its LoadLibrary
  # (and therefore its DllMain, and therefore whenever it reads
  # OMP_NUM_THREADS, if it does so at load time) until LibRaw's first actual
  # OpenMP call -- by which point this file's DllMain (running at
  # DLL_PROCESS_ATTACH for node.napi.node itself, always the *first* load
  # event for this addon) has already set the environment variable. No
  # custom notify hook is needed here (unlike node.exe/HOST_BINARY above):
  # VCOMP140.DLL is a real on-disk DLL, found via the ordinary DLL search
  # path exactly as it already is today as a normal dependency, so the
  # default delay-load resolution (plain LoadLibrary + GetProcAddress) is
  # correct as-is.
  if(LIBRAW_NODE_OPENMP)
    target_link_options(addon PRIVATE "/DELAYLOAD:VCOMP140.DLL")
  endif()
endif()
