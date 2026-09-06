# Rocky 8 build image for @janhapke/libraw (Linux prebuilds).
# Pinned by digest so the image is reproducible; re-resolve with:
#   docker manifest inspect rockylinux/rockylinux:8-ubi-init
# and update both the FROM line and this comment when bumping. The pinned
# digest below is a manifest LIST covering both linux/amd64 and linux/arm64
# (verified with `docker manifest inspect` when T19 wired up the arm64
# build), so this one FROM line serves both `docker buildx build --platform
# linux/amd64` and `--platform linux/arm64` -- BuildKit picks the matching
# entry for --platform automatically.
FROM rockylinux/rockylinux@sha256:ae0813ccb1bb83f4e0220acdd1539f52831517de334368e960824db7e37ee210

# TARGETARCH is a BuildKit-populated automatic build arg (amd64/arm64/...)
# reflecting the --platform this stage is being built for; it is set even
# for a plain `docker build` on modern (BuildKit-backed) Docker, but T19's
# scripts/build-linux.sh always builds through `docker buildx build
# --platform ...` explicitly so this is never left to chance.
#
# nasm is x86-only (it assembles libjpeg-turbo's x86_64 SIMD kernels) and is
# not packaged for aarch64 in Rocky 8's repos at all -- on arm64,
# libjpeg-turbo's own CMakeLists.txt selects its NEON SIMD kernels, which are
# plain C intrinsics compiled by gcc, no assembler required. So nasm is only
# installed when TARGETARCH is amd64.
ARG TARGETARCH
RUN dnf install -y epel-release dnf-plugins-core && \
    dnf config-manager --set-enabled powertools && \
    dnf install -y gcc-toolset-14-gcc-c++ make cmake git python3.12 tar xz \
      $( [ "${TARGETARCH}" = "amd64" ] && echo nasm ) && \
    dnf clean all

ENV PATH="/opt/rh/gcc-toolset-14/root/usr/bin:${PATH}"
ENV LD_LIBRARY_PATH="/opt/rh/gcc-toolset-14/root/usr/lib64:/opt/rh/gcc-toolset-14/root/usr/lib"

# Node tarball is per-arch too (nodejs.org publishes -x64/-arm64 builds; the
# BuildKit arch name "arm64" happens to match Node's own, "amd64" maps to
# Node's "x64").
ARG NODE_VERSION=24.11.1
RUN NODE_ARCH="$( [ "${TARGETARCH}" = "arm64" ] && echo arm64 || echo x64 )" && \
    curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" \
    | tar xJC /usr/local --strip-components=1

WORKDIR /work
