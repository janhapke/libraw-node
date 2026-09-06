#!/usr/bin/env bash
# T00 spike: static LibRaw + zlib + libjpeg-turbo + OpenMP, built and run entirely
# inside the Rocky 8 container built from scripts/linux-build.Dockerfile. No Node
# involved. This script is throwaway tooling; everything it produces lands under
# build/spike/ (gitignored). Nothing is installed on the host and the host g++ is
# never invoked -- every compile happens via `docker run` below.
#
# Usage: scripts/spike-static-libraw.sh [path/to/file.DNG] [user_qual]
#   defaults: /home/jan/dev/photoview/.private/testimages/IMGP5127.DNG, user_qual=3
#
# ---------------------------------------------------------------------------
# Recorded facts (T03 reuses these verbatim; versions per scripts/versions.env
# at the time of this spike: LibRaw 0.22.2, zlib 1.3.2, libjpeg-turbo 3.2.0 /
# commit c85e6b90, gcc-toolset-14 (GCC 14.2.1) on rockylinux/rockylinux:8-ubi-init):
#
# zlib (vendor/zlib) CMake options used:
#   -DZLIB_BUILD_SHARED=OFF -DZLIB_BUILD_STATIC=ON -DZLIB_BUILD_TESTING=OFF
#   -DZLIB_INSTALL=OFF -DCMAKE_POSITION_INDEPENDENT_CODE=ON
#   NOTE: this zlib (>=1.3) uses ZLIB_BUILD_SHARED/ZLIB_BUILD_STATIC, not the
#   older single BUILD_SHARED_LIBS toggle some zlib forks use.
#   Static archive produced: build/spike/zlib/libz.a (target name "zlibstatic").
#
# libjpeg-turbo (vendor/libjpeg-turbo) CMake options used:
#   -DENABLE_SHARED=OFF -DENABLE_STATIC=ON -DWITH_JPEG8=ON -DWITH_TURBOJPEG=OFF
#   -DWITH_TOOLS=OFF -DWITH_TESTS=OFF -DWITH_SIMD=ON
#   -DCMAKE_POSITION_INDEPENDENT_CODE=ON
#   WITH_JPEG8=ON is required to match LibRaw's USE_JPEG8 define (libjpeg v8
#   API/ABI). WITH_SIMD needs nasm (installed in the Dockerfile) and produced
#   real SIMD object files (jdcolor-16, jidctint-12, etc). Static archive:
#   build/spike/libjpeg-turbo/libjpeg.a (target "jpeg-static"). Generated
#   headers needed at LibRaw compile time live in the *build* dir, not the
#   source dir: build/spike/libjpeg-turbo/{jconfig.h,jconfigint.h,jversion.h}.
#   jpeglib.h itself is NOT at the libjpeg-turbo repo root -- it is under
#   vendor/libjpeg-turbo/src/jpeglib.h (this repo's libjpeg-turbo layout puts
#   public headers in src/). Both -I's are required:
#     -Ivendor/libjpeg-turbo/src -Ibuild/spike/libjpeg-turbo
#
# LibRaw (vendor/LibRaw) sources needed: every *.cpp under vendor/LibRaw/src,
# recursively (82 files at 0.22.2: top-level libraw_c_api.cpp and
# libraw_datastream.cpp, plus src/{decoders,decompressors,demosaic,
# integration,metadata,postprocessing,preprocessing,tables,utils,write,x3f}/*.cpp).
# `find vendor/LibRaw/src -name '*.cpp'` (equivalently CMake
# file(GLOB_RECURSE ... vendor/LibRaw/src/*.cpp)) is sufficient; no
# Makefile.dist parsing needed. src/integration/{dngsdk_glue,rawspeed_glue}.cpp
# compile to (mostly) empty translation units without complaint because their
# bodies are guarded by #ifdef USE_DNGSDK / USE_RAWSPEED, so no DNG SDK or
# RawSpeed checkout is required for a plain LIBRAW_NODLL+USE_ZLIB+USE_JPEG8
# build. Compile flags used per source file:
#   -std=c++17 -O2 -fopenmp -fPIC -DLIBRAW_NODLL -DUSE_ZLIB -DUSE_JPEG -DUSE_JPEG8
#   -Ivendor/LibRaw -Ivendor/zlib -Ibuild/spike/zlib
#   -Ivendor/libjpeg-turbo/src -Ibuild/spike/libjpeg-turbo
# Never define LIBRAW_NOTHREADS (that disables the internal mutex LibRaw needs
# regardless of OpenMP). Objects are archived with `ar crs libraw_r.a *.o`.
#
# Static libgomp: passing -fopenmp on the *link* line makes the gcc driver
# append a *dynamic* `-lgomp` itself, which silently wins over an earlier
# explicit path to libgomp.a (ldd will still show libgomp.so.1). The fix that
# actually produces a static-libgomp binary: omit -fopenmp from the link
# command (it is only needed at *compile* time, for the OpenMP pragmas) and
# force static resolution explicitly:
#   g++ -std=c++17 -O2 <objects/archives...> \
#       -static-libgcc -static-libstdc++ \
#       -Wl,-Bstatic -lgomp -Wl,-Bdynamic \
#       -lpthread -lm -ldl -o build/spike/timing
# `-Wl,-Bstatic -lgomp -Wl,-Bdynamic` finds libgomp.a via gcc-toolset-14's
# normal library search path (confirmed via `g++ -print-file-name=libgomp.a` ->
# /opt/rh/gcc-toolset-14/root/usr/lib/gcc/x86_64-redhat-linux/14/libgomp.a);
# passing that full path explicitly instead of -lgomp works identically.
# Result `ldd` shows only linux-vdso, libpthread, libdl, libm, libc,
# ld-linux -- no libgomp.so, no libjpeg.so, no libz.so.
# ---------------------------------------------------------------------------

set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"

FILE="${1:-/home/jan/dev/photoview/.private/testimages/IMGP5127.DNG}"
USER_QUAL="${2:-3}"

IMAGE_TAG="libraw-node-build:t00-spike"
NPROC_HOST="$(nproc)"

echo "== building image ${IMAGE_TAG} from scripts/linux-build.Dockerfile =="
source scripts/versions.env
docker build -f scripts/linux-build.Dockerfile \
  --build-arg NODE_VERSION="${NODE_VERSION}" \
  -t "${IMAGE_TAG}" scripts/

mkdir -p build/spike

cat > build/spike/timing.cpp <<'EOF'
// Throwaway timing spike for T00. Not shipped: build/ is gitignored.
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <libraw/libraw.h>

using clk = std::chrono::steady_clock;
static double ms_since(clk::time_point t0) {
  return std::chrono::duration<double, std::milli>(clk::now() - t0).count();
}

int main(int argc, char **argv) {
  if (argc < 2) {
    fprintf(stderr, "usage: %s <file> [user_qual]\n", argv[0]);
    return 2;
  }
  const char *path = argv[1];
  int user_qual = argc > 2 ? atoi(argv[2]) : 3;

  LibRaw raw;
  raw.imgdata.params.user_qual = user_qual;

  auto t0 = clk::now();
  int ret = raw.open_file(path);
  if (ret != LIBRAW_SUCCESS) {
    fprintf(stderr, "open_file failed: %s\n", libraw_strerror(ret));
    return 1;
  }
  printf("open_file:            %8.2f ms\n", ms_since(t0));

  auto t1 = clk::now();
  ret = raw.unpack();
  if (ret != LIBRAW_SUCCESS) {
    fprintf(stderr, "unpack failed: %s\n", libraw_strerror(ret));
    return 1;
  }
  printf("unpack:               %8.2f ms\n", ms_since(t1));

  auto t2 = clk::now();
  ret = raw.dcraw_process();
  if (ret != LIBRAW_SUCCESS) {
    fprintf(stderr, "dcraw_process failed: %s\n", libraw_strerror(ret));
    return 1;
  }
  printf("dcraw_process:        %8.2f ms (user_qual=%d)\n", ms_since(t2), user_qual);

  auto t3 = clk::now();
  int err = 0;
  libraw_processed_image_t *img = raw.dcraw_make_mem_image(&err);
  printf("dcraw_make_mem_image: %8.2f ms\n", ms_since(t3));
  if (!img) {
    fprintf(stderr, "dcraw_make_mem_image failed: %d\n", err);
    return 1;
  }
  printf("image: %dx%d, %d bytes/pixel component, %d colors\n", img->width,
         img->height, img->bits / 8, img->colors);
  printf("total:                %8.2f ms\n", ms_since(t0));

  LibRaw::dcraw_clear_mem(img);
  return 0;
}
EOF

echo "== building zlib, libjpeg-turbo, LibRaw and the timing binary inside the container =="
docker run --rm -u "$(id -u):$(id -g)" -v "${ROOT}:${ROOT}" -w "${ROOT}" "${IMAGE_TAG}" bash -c '
set -euo pipefail
source /opt/rh/gcc-toolset-14/enable

# --- zlib, static only ---
cmake -S vendor/zlib -B build/spike/zlib \
  -DCMAKE_BUILD_TYPE=Release \
  -DZLIB_BUILD_SHARED=OFF \
  -DZLIB_BUILD_STATIC=ON \
  -DZLIB_BUILD_TESTING=OFF \
  -DZLIB_INSTALL=OFF \
  -DCMAKE_POSITION_INDEPENDENT_CODE=ON
cmake --build build/spike/zlib -j'"${NPROC_HOST}"'

# --- libjpeg-turbo, static only, JPEG8 API, SIMD via nasm ---
cmake -S vendor/libjpeg-turbo -B build/spike/libjpeg-turbo \
  -DCMAKE_BUILD_TYPE=Release \
  -DENABLE_SHARED=OFF \
  -DENABLE_STATIC=ON \
  -DWITH_JPEG8=ON \
  -DWITH_TURBOJPEG=OFF \
  -DWITH_TOOLS=OFF \
  -DWITH_TESTS=OFF \
  -DWITH_SIMD=ON \
  -DCMAKE_POSITION_INDEPENDENT_CODE=ON
cmake --build build/spike/libjpeg-turbo -j'"${NPROC_HOST}"'

# --- LibRaw, compiled directly from its source list (see header above) ---
rm -rf build/spike/libraw/obj
mkdir -p build/spike/libraw/obj
for f in $(find vendor/LibRaw/src -name "*.cpp"); do
  obj="build/spike/libraw/obj/$(echo "$f" | tr "/" "_").o"
  g++ -std=c++17 -O2 -fopenmp -fPIC \
    -DLIBRAW_NODLL -DUSE_ZLIB -DUSE_JPEG -DUSE_JPEG8 \
    -Ivendor/LibRaw -Ivendor/zlib -Ibuild/spike/zlib \
    -Ivendor/libjpeg-turbo/src -Ibuild/spike/libjpeg-turbo \
    -c "$f" -o "$obj" &
  while [ "$(jobs -r | wc -l)" -ge '"${NPROC_HOST}"' ]; do wait -n; done
done
wait
ar crs build/spike/libraw/libraw_r.a build/spike/libraw/obj/*.o

# --- timing binary, statically linked incl. libgomp (see header above) ---
g++ -std=c++17 -O2 \
  -Ivendor/LibRaw \
  build/spike/timing.cpp \
  build/spike/libraw/libraw_r.a \
  build/spike/libjpeg-turbo/libjpeg.a \
  build/spike/zlib/libz.a \
  -static-libgcc -static-libstdc++ \
  -Wl,-Bstatic -lgomp -Wl,-Bdynamic \
  -lpthread -lm -ldl \
  -o build/spike/timing
'

echo
echo "== ldd build/spike/timing =="
ldd build/spike/timing

echo
echo "== run: OMP_NUM_THREADS unset (default) =="
env -u OMP_NUM_THREADS build/spike/timing "${FILE}" "${USER_QUAL}"

echo
echo "== run: OMP_NUM_THREADS=1 =="
OMP_NUM_THREADS=1 build/spike/timing "${FILE}" "${USER_QUAL}"
