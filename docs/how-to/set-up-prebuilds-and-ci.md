# How to set up prebuilds and CI for Linux, macOS, Windows

## 1. Package layout (prebuildify style)

```
package.json      "main": "lib/index.js", "types": "types/index.d.ts",
                  "files": ["lib","types","prebuilds","THIRD_PARTY_NOTICES.md"],
                  "scripts": { "install": "node-gyp-build" }   // no compile at install if a prebuild matches
prebuilds/
  linux-x64/node.napi.node
  linux-arm64/node.napi.node
  darwin-x64/node.napi.node
  darwin-arm64/node.napi.node
  win32-x64/node.napi.node
lib/index.js      const binding = require('node-gyp-build')(path.join(__dirname, '..'));
```

`node-gyp-build` picks `prebuilds/<platform>-<arch>/node.napi.node` regardless of runtime (Node or
Electron) because the file is tagged `napi`. Keep a `binding.gyp`-free repo if you build with CMake; then
set `"install": "node-gyp-build"` only (it errors clearly when no prebuild matches instead of trying to
compile), or ship a `cmake-js` fallback for source builds.

If you prefer sharp-style per-platform packages later, the CI below only changes in the `package` job.

## 2. GitHub Actions workflow

```yaml
name: build
on: { push: { branches: [main], tags: ['v*'] }, pull_request: {} }
jobs:
  linux:
    strategy: { matrix: { arch: [x64, arm64] } }
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
        with: { submodules: recursive }
      - run: ./scripts/build-linux.sh ${{ matrix.arch }}          # Docker, Rocky 8, cross for arm64
      - uses: actions/upload-artifact@v7
        with: { name: prebuild-linux-${{ matrix.arch }}, path: prebuilds/linux-${{ matrix.arch }} }

  darwin:
    strategy: { matrix: { include: [ { os: macos-15-intel, arch: x64 }, { os: macos-15, arch: arm64 } ] } }
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v7
        with: { submodules: recursive }
      - uses: actions/setup-node@v6
        with: { node-version: 24 }
      - run: npm ci --ignore-scripts && ./scripts/build-native.sh    # cmake + Xcode clang, MACOSX_DEPLOYMENT_TARGET=11.0
      - uses: actions/upload-artifact@v7
        with: { name: prebuild-darwin-${{ matrix.arch }}, path: prebuilds/darwin-${{ matrix.arch }} }

  win32:
    runs-on: windows-2022
    steps:
      - uses: actions/checkout@v7
        with: { submodules: recursive }
      - uses: actions/setup-node@v6
        with: { node-version: 24 }
      - run: npm ci --ignore-scripts; ./scripts/build-native.ps1      # cmake + MSVC 2022, /DELAYLOAD:node.exe
      - uses: actions/upload-artifact@v7
        with: { name: prebuild-win32-x64, path: prebuilds/win32-x64 }

  test:
    needs: [linux, darwin, win32]
    strategy:
      fail-fast: false
      matrix:
        include:
          - { os: ubuntu-24.04,      plat: linux-x64 }
          - { os: ubuntu-24.04-arm,  plat: linux-arm64 }
          - { os: macos-15-intel,    plat: darwin-x64 }
          - { os: macos-15,          plat: darwin-arm64 }
          - { os: windows-2022,      plat: win32-x64 }
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v6
        with: { node-version: 24 }
      - uses: actions/download-artifact@v7
        with: { name: prebuild-${{ matrix.plat }}, path: prebuilds/${{ matrix.plat }} }
      - run: npm ci --ignore-scripts && npm test
      - run: npm i --no-save electron@42 && npx cross-env ELECTRON_RUN_AS_NODE=1 electron test/electron-smoke.js
      - run: npm i --no-save electron@latest && npx cross-env ELECTRON_RUN_AS_NODE=1 electron test/electron-smoke.js

  package:
    needs: [test]
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - uses: actions/download-artifact@v7
        with: { pattern: prebuild-*, path: prebuilds, merge-multiple: false }
      - run: node scripts/flatten-prebuilds.js && node scripts/write-third-party-notices.js && npm pack
      - uses: actions/upload-artifact@v7
        with: { name: npm-package, path: '*.tgz' }
      - if: startsWith(github.ref, 'refs/tags/v')
        run: npm publish --provenance --access public
        env: { NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }} }
```

Runner names follow what `sharp` and lightdrift use in 2026 (`macos-15-intel`, `macos-15`,
`ubuntu-24.04-arm`, `windows-2022`); use `-latest` aliases only where version does not matter
(knowledge base note on retired pinned images).

## 3. Local development on Linux

- `./scripts/build-linux.sh x64` then `npm test` — everything through Docker.
- For macOS/Windows: push a branch; download artifacts; or use `gh run download`. No local toolchain.

## 4. Static OpenMP (Phase 6)

- Linux (gcc-toolset-14): **not achievable as originally planned.** T04 found that linking `-fopenmp` with
  `-Wl,-Bstatic -lgomp -Wl,-Bdynamic` fails at link time (`relocation R_X86_64_TPOFF32 against hidden symbol
  'gomp_tls_data' can not be used when making a shared object`) once any code path that actually uses
  `#pragma omp parallel` (e.g. `dcraw_process`'s demosaic) is linked in: gcc-toolset-14's `libgomp.a` was
  built without `-fPIC`, so its internal thread-local state uses the local-exec TLS model, which only works
  when linked into the main executable, never into a `dlopen`'d shared object like a Node addon `.node`
  file — confirmed this is a hard binutils restriction (reordering the link line and `-Wl,-z,notext` both
  fail to work around it), not something fixable from this repo's build flags alone. The addon links
  `libgomp.so.1` dynamically instead (see the long comment above
  `target_link_libraries(addon PRIVATE gomp)` in `CMakeLists.txt`); `scripts/check-binary.sh`'s NEEDED
  allowlist permits it. A real static-PIC libgomp would require rebuilding libgomp from GCC source with an
  appropriate TLS model — out of scope unless revisited.
- macOS: `brew install libomp`; link `libomp.a` (Homebrew builds it), `-Xpreprocessor -fopenmp`.
- Windows: MSVC `/openmp` links `vcomp140.dll` dynamically (present with the VC++ redistributable that
  Electron itself needs, but avoid the dependency): prefer clang-cl with `libomp` static, or skip OpenMP on
  Windows in the first iteration and measure.

## 5. Release checklist

1. Bump `scripts/versions.env` and submodules; update `api/params.json` if the header diff script fails.
2. Tag `vX.Y.Z`; CI builds, tests on five targets, publishes with provenance.
3. Update `THIRD_PARTY_NOTICES.md` (generated) and the CHANGELOG (LibRaw version, capabilities).
4. In photoview: `npm i @janhapke/libraw@X.Y.Z`, run the benchmark harness, compare the CSVs.
