# How to verify the addon is Electron-safe

`@janhapke/libraw` is built Electron-safe by default — nothing extra to configure. This page lists what the
package already does for each Electron-specific hazard, and how to verify it yourself; background on *why*
each rule exists is in [Electron compatibility](../explanation/electron-compatibility.md).

`scripts/electron-safety.sh` (`npm run electron:safety`) runs every check below in one go, for whichever
platform it's run on: the platform binary check, a forbidden-include grep, `buildInfo` sanity checks, and
the three Electron smoke scripts (under the locally installed `electron` package if present, else under
plain `node` with a warning). It exits non-zero and prints a `PASS`/`FAIL` line per check if anything fails.

| # | Hazard | What this package does | How to verify it yourself |
|---|---|---|---|
| 1 | Node internals leak into the ABI | Only `napi.h` (node-addon-api) is included anywhere under `src/`; never `node.h`/`v8.h`/`uv.h`. `NAPI_VERSION=8`. | `scripts/electron-safety.sh`'s forbidden-include grep; `ELECTRON_RUN_AS_NODE=1 npx electron test/electron-smoke.cjs` |
| 2 | V8 memory cage (Electron ≥ 21 disallows external buffers) | Compiled with `-DNODE_API_NO_EXTERNAL_BUFFERS_ALLOWED`; every output buffer is `Napi::Buffer<T>::New(env, n)` (V8-owned memory) that LibRaw writes into via `copy_mem_image`, never an externally-owned buffer wrapped in place. | `scripts/electron-safety.sh` checks `buildInfo.flags` contains the define; decode a real file under `electron@42`/`electron@latest` — a cage violation aborts the process outright, it doesn't throw a catchable error |
| 3 | Windows: no `node.exe` inside Electron | `src/win_delay_load_hook.cc` + `/DELAYLOAD:node.exe` redirect the import at load time; a `DllMain(DLL_PROCESS_ATTACH)` eagerly resolves every import once, before any thread can make its first N-API call (fixes an MSVC delay-load-runtime race under concurrent first `require()`s from several `worker_threads` — see the explanation doc §3a) | `dumpbin /DEPENDENTS`/`/IMPORTS` show `node.exe` delay-loaded (CI does this on every Windows build); `test/electron-workers-cold-smoke.cjs` (no warm-up, N concurrent first `require()`s) |
| 4 | Context-aware, `worker_threads`-safe | `NODE_API_MODULE` (context-aware by construction); no static `Napi::FunctionReference`/mutable process-global state | `test/electron-workers-smoke.cjs` — 3 `worker_threads`, each `require`s the addon and decodes once, checksums compared |
| 5 | Reentrant LibRaw | `LIBRAW_NOTHREADS` is never defined (the reentrant `raw_r` build) | same test as #4; `test/stress.test.ts` (6 workers × 50 decodes) |
| 6 | Static, sidecar-free binary | LibRaw/zlib/libjpeg-turbo compiled in statically; `-static-libstdc++ -static-libgcc` on Linux | `scripts/check-binary.sh`/`-macos.sh`/`-windows.ps1` assert the `NEEDED`/`otool -L`/`dumpbin /DEPENDENTS` list matches an allowlist (libc/libm/libpthread/libdl + `libgomp.so.1` on Linux; libSystem/libc++ on macOS; kernel32/vcruntime/msvcp + `VCOMP140.dll` on Windows) |
| 7 | Hidden symbols | `-fvisibility=hidden` everywhere, plus a linker version script on Linux exporting only the two Node-API entry points | `nm -D --defined-only` shows only `napi_register_module_v1` (+ the API-version symbol) |
| 8 | Linux glibc floor | Built inside the Rocky Linux 8 image (glibc 2.28) | `scripts/check-binary.sh`'s `GLIBC_` version check |
| 9 | macOS floor | `MACOSX_DEPLOYMENT_TARGET=11.0` | `scripts/check-binary-macos.sh` checks `otool -l`'s `minos` |
| 10 | asar packaging | `.node` files can't be `require`d from inside `app.asar`; Forge's `packagerConfig.asar.unpack: '**/*.node'` (set directly in `test/forge-app/forge.config.js`) unpacks it, and `lib/binding.cjs` rewrites an `app.asar` path to `app.asar.unpacked` itself before `require()`-ing, so the reported module path matches where the file actually loaded from | `scripts/forge-asar-check.sh` — packages a minimal Forge app, runs it under `ELECTRON_RUN_AS_NODE=1`, asserts the addon's resolved path contains `app.asar.unpacked` |
| 11 | Code signing | Nothing needed at build time; Forge/`@electron/osx-sign` signs the unpacked `.node` at package time (same Team ID as the app, so no `disable-library-validation` entitlement is needed) | `codesign -dv --verbose=2 <app>/Contents/Resources/app.asar.unpacked/.../node.napi.node` on a signed, packaged app (not automated here — needs real signing credentials) |
| 12 | Crash surface on malformed input | `rawparams.max_raw_memory_mb` defaults to 2048; C++ exceptions are caught at the N-API boundary and surfaced as rejected promises / thrown `LibRawError`, never left to propagate as a native exception | fuzz with truncated/malformed files in a worker; the process should survive with rejected promises, never crash |
| 13 | libuv threadpool sizing | Documented, not enforced by the addon (an app-level environment setting) | see [Use with sharp and worker_threads](use-with-sharp-and-worker-threads.md) |

## Electron versions tested

Every CI test job runs the full smoke matrix against both `electron@42` (photoview's pinned version) and
`electron@latest` (current stable at CI run time) — see
[Set up prebuilds and CI](set-up-prebuilds-and-ci.md).

## Things that are *not* needed

- `electron-rebuild`/`@electron/rebuild` for this module — it ships Node-API prebuilds, nothing to rebuild.
- `patchelf`, RPATH, `$ORIGIN`, or SONAME juggling — no shared-library sidecars exist to relocate.
- Any glib wrapper machinery from libraries like `sharp` — LibRaw does not use glib.
