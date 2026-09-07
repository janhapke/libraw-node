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

## libomp (macOS only)

- Used on `darwin-x64`/`darwin-arm64` for OpenMP support (`T20`): Homebrew's `libomp` keg, linked
  statically (`lib/libomp.a`) into the addon.
- Source: https://github.com/llvm/llvm-project (`openmp` subproject)
- Licence: Apache-2.0 with LLVM exception.
- Licence text: `LICENSE.TXT` inside the Homebrew `libomp` keg's `share/doc/libomp` (not vendored in this
  repository; the CI runner installs the keg at build time).

## node-gyp (Windows delay-load hook only)

- `src/win_delay_load_hook.cc` is copied verbatim (with its original header comment kept) from
  [`nodejs/node-gyp`](https://github.com/nodejs/node-gyp) at tag `v11.2.0`
  (`src/win_delay_load_hook.cc`), compiled into the `win32-x64` addon only (`T21`). It is the same
  delay-load hook `node-gyp`/`cmake-js` addons get automatically; this project's CMake build wires it in
  by hand since it does not use `node-gyp`. See `docs/how-to/make-the-addon-electron-safe.md` row 3.
- Source: https://github.com/nodejs/node-gyp
- Licence: MIT.

---

Not vendored/linked, but relevant to note:

- **libgomp** (GCC OpenMP runtime), used on Linux for OpenMP support (`T03`/`T04`): GPL-3 with the GCC
  Runtime Library Exception, linked **dynamically** (`libgomp.so.1`, ships with every GCC/glibc Linux
  install) rather than statically, so no GPL obligations attach to this MIT package.
- **vcomp140.dll** (Microsoft's own OpenMP runtime, part of the Visual C++ Redistributable), used on
  `win32-x64` for OpenMP support (`T21`, MSVC's `/openmp`): linked dynamically only, never bundled or
  redistributed by this package -- it is a runtime dependency documented in `README.md` and
  `docs/reference/build-matrix.md`, not a vendored component, so no notice/licence text applies here.
