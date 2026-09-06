# @janhapke/libraw native addon.
#
# T02 scope: a hello-world Node-API addon (src/addon.cc) built entirely inside
# the Docker image from scripts/linux-build.Dockerfile via scripts/build-linux.sh.
# LibRaw/zlib/libjpeg-turbo static subprojects are added starting T03 (see
# docs/how-to/build-libraw-addon-in-docker.md §3); macOS/Windows link arms are
# added in T19-T21 -- this file only implements the Linux path for now.
cmake_minimum_required(VERSION 3.25)
project(libraw_node CXX)

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

add_library(addon SHARED src/addon.cc)
set_target_properties(addon PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "node.napi")

target_include_directories(addon PRIVATE "${NAPI_INC}" "${NODE_API_HEADERS_INC}")

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
elseif(APPLE)
  # T20 adds the macOS-specific link arm (-undefined dynamic_lookup, an
  # exported-symbols list, MACOSX_DEPLOYMENT_TARGET).
  message(WARNING "macOS link flags are not implemented yet; see T20.")
elseif(WIN32)
  # T21 adds the Windows-specific link arm (win_delay_load_hook.cc,
  # /DELAYLOAD:node.exe, node.lib).
  message(WARNING "Windows link flags are not implemented yet; see T21.")
endif()
