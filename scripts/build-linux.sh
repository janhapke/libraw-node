#!/usr/bin/env bash
# scripts/build-linux.sh <x64|arm64>
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
# T19 (arm64): Rocky 8's own repos + EPEL only ship a *bare* aarch64 cross
# compiler driver (gcc-c++-aarch64-linux-gnu, EPEL, gcc 12.1.1) with no
# target sysroot package at all -- no aarch64 glibc-devel, libstdc++-devel or
# libgomp-devel is available anywhere in BaseOS/AppStream/PowerTools/EPEL for
# el8 (verified with `dnf provides '*aarch64-linux-gnu*glibc*'` and `dnf list
# available` inside the image: nothing matches), and gcc-toolset-14 itself
# has no "-aarch64-linux-gnu" cross sub-package in the SCL repos at all. A
# full C++ link (glibc + libstdc++ + libgomp all needed) is therefore not
# possible via a Rocky-hosted cross toolchain, so a hand-built cross sysroot
# was ruled out per this task's instructions rather than hand-assembled.
#
# Instead this script builds the *same* Dockerfile natively for arm64: on a
# host with QEMU user-mode emulation registered (`docker run --privileged
# --rm tonistiigi/binfmt --install arm64` -- a one-time, host-package-free
# kernel binfmt registration, not a host install of any compiler) `docker
# buildx build --platform linux/arm64` runs an actual aarch64 Rocky 8
# container under emulation, so gcc-toolset-14-gcc-c++ there *is* the native
# aarch64 package with a matching sysroot -- no cross toolchain needed, no
# glibc/libstdc++/libgomp availability gap. This is slow under QEMU (tens of
# minutes) but produces a byte-for-byte-equivalent build to what CI does
# natively on an arm64 runner (no QEMU there). See
# docs/how-to/build-libraw-addon-in-docker.md §6 for the fuller writeup.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"

ARCH="${1:-x64}"
case "$ARCH" in
  x64) PLATFORM="linux/amd64" ;;
  arm64) PLATFORM="linux/arm64" ;;
  *)
    echo "build-linux.sh: unknown arch '${ARCH}' (expected x64 or arm64)" >&2
    exit 1
    ;;
esac

source scripts/versions.env

IMAGE_TAG="libraw-node-build:linux-${ARCH}"
BUILD_DIR="build/linux-${ARCH}"
OUT_DIR="prebuilds/linux-${ARCH}"

echo "== docker buildx build --platform ${PLATFORM} -t ${IMAGE_TAG} (scripts/linux-build.Dockerfile) =="
docker buildx build \
  --platform "${PLATFORM}" \
  --load \
  -f scripts/linux-build.Dockerfile \
  --build-arg NODE_VERSION="${NODE_VERSION}" \
  -t "${IMAGE_TAG}" \
  scripts/

echo "== configuring + building inside ${IMAGE_TAG} (as uid $(id -u):$(id -g)) =="
docker run --rm \
  --platform "${PLATFORM}" \
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
