# Rocky 8 build image for @janhapke/libraw (Linux prebuilds).
# Pinned by digest so the image is reproducible; re-resolve with:
#   docker manifest inspect rockylinux/rockylinux:8-ubi-init
# and update both the FROM line and this comment when bumping.
FROM rockylinux/rockylinux@sha256:ae0813ccb1bb83f4e0220acdd1539f52831517de334368e960824db7e37ee210

RUN dnf install -y epel-release dnf-plugins-core && \
    dnf config-manager --set-enabled powertools && \
    dnf install -y gcc-toolset-14-gcc-c++ make cmake git python3.12 tar xz nasm && \
    dnf clean all

ENV PATH="/opt/rh/gcc-toolset-14/root/usr/bin:${PATH}"
ENV LD_LIBRARY_PATH="/opt/rh/gcc-toolset-14/root/usr/lib64:/opt/rh/gcc-toolset-14/root/usr/lib"

ARG NODE_VERSION=24.11.1
RUN curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
    | tar xJC /usr/local --strip-components=1

WORKDIR /work
