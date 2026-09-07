# How to set up prebuilds and CI for Linux, macOS, Windows

This describes the pipeline as it actually ships (`.github/workflows/build.yml`, `scripts/release.sh`), not
a sketch — see [Build from source](build-from-source.md) for what each platform's build script does.

## Package layout

```
package.json     "main": "lib/index.cjs", "types": "types/index.d.ts",
                 "exports": { ".": { "types": ..., "import": "./lib/index.mjs", "require": "./lib/index.cjs" } },
                 "files": ["lib", "types", "prebuilds", "THIRD_PARTY_NOTICES.md", "LICENSE"]
prebuilds/
  linux-x64/node.napi.node
  linux-arm64/node.napi.node
  darwin-x64/node.napi.node
  darwin-arm64/node.napi.node
  win32-x64/node.napi.node
lib/binding.cjs  const binding = require('node-gyp-build')(path.join(__dirname, '..'));
```

`node-gyp-build` picks `prebuilds/<platform>-<arch>/node.napi.node` regardless of runtime (Node or
Electron) because the file is tagged `napi`. There is no `install` script that compiles — a missing prebuild
for the consumer's platform is a hard, clear error rather than a silent attempt to invoke a compiler that
isn't there.

## CI pipeline (`.github/workflows/build.yml`)

Triggers on every branch push, every pull request, and `v*` tags (`concurrency` cancels a stale run on the
same ref). Jobs, in dependency order:

1. **`build-linux`** (matrix `x64`/`arm64`) — `npm ci`, `npm run gen:check`, `./scripts/build-linux.sh
   <arch>` (Docker), `./scripts/check-binary.sh`, uploads `prebuilds-linux-<arch>`.
2. **`build-macos`** (matrix `darwin-x64`/`darwin-arm64`, on `macos-15-intel`/`macos-15`) — `npm ci`,
   `npm run gen:check`, `brew install libomp` (+ `nasm` on x64), `./scripts/build-native.sh <target>`,
   `./scripts/check-binary-macos.sh`, uploads `prebuilds-<target>`.
3. **`build-windows`** (on `windows-2022`) — `npm ci`, `npm run gen:check`, `ilammy/msvc-dev-cmd` +
   `ilammy/setup-nasm` + Ninja, `./scripts/build-native.ps1 -Target win32-x64`, `dumpbin` diagnostics,
   `./scripts/check-binary-windows.ps1`, uploads `prebuilds-win32-x64`.
4. **`test-linux`** / **`test-macos`** / **`test-windows`** (each `needs` its matching `build-*` job) —
   download the prebuild, `npm test`, the Electron smoke matrix (below), then re-run the platform binary
   check against the same prebuild the tests just exercised. `test-linux` additionally typechecks
   `examples/consumer-ts` against the published types and, on the `x64` leg only, runs
   `scripts/electron-safety.sh` and `scripts/forge-asar-check.sh`.
5. **`package`** (`needs: [test-linux, test-macos, test-windows]`, on `ubuntu-24.04`) — downloads all five
   `prebuilds-*` artifacts, re-checks `THIRD_PARTY_NOTICES.md` (`node scripts/gen-notices.js --check`),
   `npm pack`, installs the resulting tarball into a fresh temp directory and sanity-checks the ESM/CJS
   entry points plus `decodeSync` (proving the *packed* prebuild loads, not just that files are present),
   uploads the `npm-package` artifact, then — only on a `refs/tags/v*` ref, and only after confirming the
   tag's version matches `package.json`'s — runs `npm publish --provenance --access public` with
   `id-token: write`/`contents: read` permissions and the `NPM_TOKEN` secret.

### Electron smoke matrix (every `test-*` job)

Runs twice, once against `electron@42` (photoview's pinned version) and once against `electron@latest` (the
current stable at CI run time) — `electron` is installed with `npm i --no-save` inside the job, never added
to `package.json`:

- `test/electron-smoke.cjs` — `identify`/`thumbnail`/`decode` (default and `half_size`), plus the
  `Processor` staged async pipeline with `AbortSignal` cancellation.
- `test/electron-workers-smoke.cjs` — 3 `worker_threads`, each `require`s the addon and runs one `decode()`,
  checksums compared.
- `test/electron-workers-cold-smoke.cjs` — the same, but with **no** single-threaded warm-up `require()`
  first (all workers race their first `require()` concurrently). This is a permanent regression guard for a
  Windows-specific MSVC delay-load race found in T22/fixed in T24 (`src/win_delay_load_hook.cc`) — the
  Windows job runs it under both plain Node and Electron, with 3 and 6 workers, before and after both
  Electron installs.

See [Test the addon under Electron without a GUI](test-under-electron.md) for what each script actually
does and [Make the addon Electron-safe](make-the-addon-electron-safe.md) for the full checklist these
scripts exist to verify.

## Local development on Linux

- `./scripts/build-linux.sh x64` then `npm test` — everything through Docker, no host toolchain.
- macOS/Windows binaries only come from CI (or a machine of that OS) — push a branch and watch the run
  (`gh run watch`), or download artifacts with `gh run download`.

## Release checklist (`scripts/release.sh`, T23)

1. If this release bumps a vendored version: update `scripts/versions.env` and the matching submodule pin
   first, and re-run `npm run gen` (regenerates `THIRD_PARTY_NOTICES.md` among everything else) — commit
   that separately from the release commit.
2. Add a `## [X.Y.Z]` section to `CHANGELOG.md` (move the `Unreleased` content under it, or write a new one)
   — `scripts/release.sh` checks for this heading and refuses to proceed without it (interactively
   confirmable, or a hard failure with `--yes`).
3. On a clean `main`: `scripts/release.sh X.Y.Z`. This runs `npm run gen:check`, `npm test`, bumps
   `package.json`/`package-lock.json` (`npm version X.Y.Z --no-git-tag-version`, no commit/tag from npm
   itself), checks the CHANGELOG section from step 2, then commits `release: vX.Y.Z` and creates the
   annotated tag `vX.Y.Z`. It never pushes on its own (pass `--push` to do so, or run the printed
   `git push origin main --follow-tags` by hand) and never runs `npm publish` — publishing only happens in
   CI. `scripts/release.sh X.Y.Z --dry-run` rehearses the checks and version bump without committing,
   tagging, or leaving any change in the working tree.
4. `git push origin main --follow-tags` pushes both the release commit and the tag, which triggers the
   `package` job's publish path (step 5 of the CI pipeline above) once every platform's build *and* test
   jobs are green.
5. In a consumer project: `npm i @janhapke/libraw@X.Y.Z`.

Locally, `npm pack --dry-run` and `npm publish --dry-run` are useful sanity checks before tagging — expect a
smaller reported size than CI's `package` job reports, since only the Linux prebuilds are present locally.

## What's not in v1

- `win32-arm64` — a `windows-11-arm` GitHub-hosted runner exists but is not wired up.
- `linux-musl` (Alpine) — not needed for Electron desktop distribution.

See [`docs/reference/build-matrix.md`](../reference/build-matrix.md) for the full platform/toolchain/flags
table.
