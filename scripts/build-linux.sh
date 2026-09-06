#!/usr/bin/env bash
# scripts/build-linux.sh <x64>
#
# Host entry point for the Linux native build. Builds the Rocky 8 image from
# scripts/linux-build.Dockerfile (docker build is a local no-op once cached)
# then runs CMake configure + build *inside* that container, as the host
# uid:gid so build/ and prebuilds/ come out owned by the calling user, not
# root. Every compiler invocation happens inside the container via the
# gcc-toolset-14 toolchain baked into the image (already on PATH there) --
# nothing on the host is ever installed or invoked to compile anything; the
# host g++ (if present) is never on the PATH of the `docker run` command
# below.
#
# Usage: scripts/build-linux.sh [x64]   (arm64 lands in T19)
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"

ARCH="${1:-x64}"
if [ "$ARCH" != "x64" ]; then
  echo "build-linux.sh: only x64 is implemented in T02; arm64 lands in T19" >&2
  exit 1
fi

source scripts/versions.env

IMAGE_TAG="libraw-node-build:linux-x64"
BUILD_DIR="build/linux-${ARCH}"
OUT_DIR="prebuilds/linux-${ARCH}"

echo "== docker build -t ${IMAGE_TAG} (scripts/linux-build.Dockerfile) =="
docker build \
  -f scripts/linux-build.Dockerfile \
  --build-arg NODE_VERSION="${NODE_VERSION}" \
  -t "${IMAGE_TAG}" \
  scripts/

echo "== configuring + building inside ${IMAGE_TAG} (as uid $(id -u):$(id -g)) =="
docker run --rm \
  -u "$(id -u):$(id -g)" \
  -v "${ROOT}:${ROOT}" \
  -w "${ROOT}" \
  "${IMAGE_TAG}" \
  bash -c "
    set -euo pipefail
    cmake -S . -B '${BUILD_DIR}' -DCMAKE_BUILD_TYPE=Release
    cmake --build '${BUILD_DIR}' -j\$(nproc)
    mkdir -p '${OUT_DIR}'
    cp '${BUILD_DIR}/node.napi.node' '${OUT_DIR}/node.napi.node'
    strip --strip-unneeded '${OUT_DIR}/node.napi.node'
  "

echo "== done =="
ls -la "${OUT_DIR}/node.napi.node"
