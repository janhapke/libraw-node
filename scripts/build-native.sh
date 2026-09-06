#!/usr/bin/env bash
# scripts/build-native.sh <darwin-x64|darwin-arm64>
#
# macOS native build entry point (T20), the counterpart of
# scripts/build-linux.sh for the two Darwin targets. Unlike Linux there is no
# Docker path here: Apple only licenses Xcode/macOS SDK use on Apple
# hardware, so this always runs directly on a GitHub Actions macos-15-intel
# (darwin-x64) or macos-15 (darwin-arm64) runner -- see
# docs/reference/build-matrix.md. This script cannot be exercised on this
# repo's Linux host at all; every change to it is verified through
# `gh run watch` on CI, never locally (docs/plan/tasks.md, T20).
#
# CMAKE_OSX_ARCHITECTURES pins the single target arch per job (no universal
# binary -- prebuildify-style layout ships one prebuild per platform+arch
# directory, so a fat binary would just be dead weight).
#
# OpenMP: Apple clang has no bundled OpenMP runtime, so the caller (this
# repo's build.yml) `brew install libomp` first and exports
# LIBRAW_NODE_OMP_ROOT="$(brew --prefix libomp)"; this script forwards it to
# CMake unchanged. If unset, LIBRAW_NODE_OPENMP stays at CMake's default (ON)
# but CMakeLists.txt's macOS branch immediately disables it again with a
# warning (see the LIBRAW_NODE_OMP_ROOT comment there) -- so leaving the
# variable unset is a safe way to get an OpenMP-off build without also
# passing -DLIBRAW_NODE_OPENMP=OFF explicitly. LIBRAW_NODE_OPENMP itself can
# still be forced OFF via the environment (documented fallback if static
# libomp linking turns out not to work at all on a given runner image; see
# docs/plan/tasks.md T20's state notes).
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"

TARGET="${1:?usage: build-native.sh <darwin-x64|darwin-arm64>}"
case "$TARGET" in
  darwin-x64) OSX_ARCH="x86_64" ;;
  darwin-arm64) OSX_ARCH="arm64" ;;
  *)
    echo "build-native.sh: unknown target '${TARGET}' (expected darwin-x64 or darwin-arm64)" >&2
    exit 1
    ;;
esac

if [ "$(uname -s)" != "Darwin" ]; then
  echo "build-native.sh: must run on macOS (got $(uname -s)); there is no cross-build path for Darwin targets" >&2
  exit 1
fi

BUILD_DIR="build/${TARGET}"
OUT_DIR="prebuilds/${TARGET}"

CMAKE_EXTRA_ARGS=()
if [ -n "${LIBRAW_NODE_OMP_ROOT:-}" ]; then
  CMAKE_EXTRA_ARGS+=("-DLIBRAW_NODE_OMP_ROOT=${LIBRAW_NODE_OMP_ROOT}")
fi
if [ -n "${LIBRAW_NODE_OPENMP:-}" ]; then
  CMAKE_EXTRA_ARGS+=("-DLIBRAW_NODE_OPENMP=${LIBRAW_NODE_OPENMP}")
fi

echo "== configuring (${TARGET}, -DCMAKE_OSX_ARCHITECTURES=${OSX_ARCH}) =="
cmake -S . -B "${BUILD_DIR}" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_OSX_ARCHITECTURES="${OSX_ARCH}" \
  -DCMAKE_OSX_DEPLOYMENT_TARGET=11.0 \
  "${CMAKE_EXTRA_ARGS[@]}"

echo "== building =="
cmake --build "${BUILD_DIR}" -j"$(sysctl -n hw.ncpu)"

mkdir -p "${OUT_DIR}"
cp "${BUILD_DIR}/node.napi.node" "${OUT_DIR}/node.napi.node"
# -x: strip local symbols only, keep the two exported Node-API entry points
# (a full `strip` with no flags can remove the global exported-symbol table
# entries a loadable bundle needs; -x is the Darwin-safe equivalent of
# Linux's `strip --strip-unneeded` here).
strip -x "${OUT_DIR}/node.napi.node"

echo "== done =="
ls -la "${OUT_DIR}/node.napi.node"
