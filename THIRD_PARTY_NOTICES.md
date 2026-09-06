# Third-party notices

`@janhapke/libraw` is MIT-licensed. It statically links the vendored components below into the
prebuilt native addon. This file is regenerated from `scripts/versions.env` by `scripts/gen-notices.js`
(added in T23); for now it is hand-written and must be kept in sync with that file.

## LibRaw

- Version: `0.22.2` (git commit `b93f6e45c194f5df9b02a43b1af9a54b4f41f33f`)
- Source: https://github.com/LibRaw/LibRaw
- Licence: LibRaw is dual-licensed. This package elects the **CDDL 1.0** (Common Development and
  Distribution License, Version 1.0) for the vendored copy; an alternative **GNU LGPL 2.1** licence is
  also offered upstream — see `vendor/LibRaw/LICENSE.LGPL` if you require that election instead. The CDDL
  election permits static linking into this closed- or open-source addon without requiring relinkability;
  see `docs/explanation/licensing.md` for the reasoning.
- Licence text: `vendor/LibRaw/LICENSE.CDDL` (also `vendor/LibRaw/LICENSE.LGPL` for the alternative
  election and `vendor/LibRaw/COPYRIGHT` for per-file attributions).
- Note: LibRaw's GPL-2/3 "demosaic packs" (`user_qual` 5–10) are excluded from this build.

## zlib

- Version: `1.3.2` (git tag `v1.3.2`, commit `da607da739fa6047df13e66a2af6b8bec7c2a498`)
- Source: https://github.com/madler/zlib
- Licence: zlib licence (permissive, static linking is fine).
- Licence text: `vendor/zlib/LICENSE`.

## libjpeg-turbo

- Version: `3.2.0` (git tag `3.2.0`, commit `c85e6b905bf237038faa936dab160ebfc5da0344`)
- Source: https://github.com/libjpeg-turbo/libjpeg-turbo
- Licence: a combination of the IJG (Independent JPEG Group) licence, the modified BSD licence (BSD-3
  clause, for the SIMD extensions and other libjpeg-turbo-specific code), and the zlib licence (for a small
  number of files). Static linking is fine under all three; notices must be kept.
- Licence text: `vendor/libjpeg-turbo/LICENSE.md` (aggregates all three licences),
  `vendor/libjpeg-turbo/README.ijg` (IJG readme).

## node-addon-api

- Version: `^8` (npm; pinned exact version recorded in `package.json`/`package-lock.json`)
- Source: https://github.com/nodejs/node-addon-api
- Licence: MIT.

---

Not vendored/linked yet but reserved by the build strategy (`docs/explanation/build-and-distribution-strategy.md`):

- **libgomp** (GCC OpenMP runtime), used on Linux for OpenMP support (`T03`): GPL-3 with the GCC Runtime
  Library Exception. Static linking is permitted under that exception when compiled with GCC; this will
  be documented here again once T03 lands.
- **libomp** (LLVM OpenMP runtime), used on macOS/Windows if enabled (`T20`/`T21`): Apache-2.0 with LLVM
  exception.
