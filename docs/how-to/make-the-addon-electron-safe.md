# How to make the addon Electron-safe

Checklist derived from [explanation/electron-compatibility.md](../explanation/electron-compatibility.md).
Each item has a test.

| # | Rule | Implementation | Test |
|---|---|---|---|
| 1 | Node-API only | `#include <napi.h>` only; no `node.h`, `v8.h`, `uv.h`; `NAPI_VERSION=8` | grep CI step; `ELECTRON_RUN_AS_NODE=1 electron smoke.js` |
| 2 | No external buffers | `-DNODE_API_NO_EXTERNAL_BUFFERS_ALLOWED`; outputs via `Napi::Buffer::New(env, n)` + `copy_mem_image` | decode a 16 MP file under Electron 42; must not abort |
| 3 | Windows delay-load | `win_delay_load_hook.cc` + `/DELAYLOAD:node.exe` (node-gyp default; add manually for CMake); T24 adds a `DllMain(DLL_PROCESS_ATTACH)` that eagerly resolves every `node.exe` import via `__HrLoadAllImportsForDll` once, before any thread can make its first N-API call | `dumpbin /DEPENDENTS node.napi.node` shows `node.exe` as delay-loaded; Electron smoke on Windows; `test/electron-workers-cold-smoke.cjs` (no warm-up, N concurrent first-`require()`s) |
| 4 | Context-aware, no globals | `NODE_API_MODULE`; per-env state via `Napi::Addon<T>` or `env.SetInstanceData`; no static `FunctionReference` | load in 6 `worker_threads` concurrently, 50 decodes each |
| 5 | Reentrant LibRaw | never define `LIBRAW_NOTHREADS` | same test as 4 |
| 6 | Static, sidecar-free | LibRaw/zlib/jpeg static; `-static-libstdc++ -static-libgcc` on Linux | `objdump -p \| grep NEEDED` = libc/libm/libpthread only; `otool -L` on macOS = libSystem/libc++ only; `dumpbin /DEPENDENTS` = kernel32/vcruntime/msvcp only |
| 7 | Hidden symbols | `-fvisibility=hidden` + version script / exported symbols list | `nm -D --defined-only` shows only `napi_register_module_v1` (+ api version symbol) |
| 8 | glibc floor | build in Rocky 8 | `objdump -T \| grep GLIBC_` max ≤ 2.28 |
| 9 | macOS floor | `MACOSX_DEPLOYMENT_TARGET=11.0` | `otool -l \| grep minos` |
| 10 | asar | `.node` under `prebuilds/` gets unpacked by Forge's `packagerConfig.asar.unpack: '**/*.node'` (`test/forge-app/forge.config.js`, T24 -- set directly rather than via the `AutoUnpackNativesPlugin`, since nothing else needs unpacking); `node-gyp-build` itself has **no** asar-specific handling (confirmed empirically, T24 -- it always resolves a path inside `app.asar`), but Electron's `require()`/`process.dlopen` patch silently redirects that path to `app.asar.unpacked` at load time, so the addon loads either way. `lib/binding.cjs` does the same `app.asar` -> `app.asar.unpacked` rewrite itself before calling `require()`, so the *reported* module path (and this package's own asar test) reflects the real on-disk location too | package a minimal Forge app; `find app.asar.unpacked -name '*.node'`; `scripts/forge-asar-check.sh` (`test/forge-app/asar-check.cjs` asserts the loaded path contains `app.asar.unpacked`) |
| 11 | Signing | nothing at build time; Forge/osx-sign signs the unpacked `.node` | `codesign -dv --verbose=2 <app>/Contents/Resources/app.asar.unpacked/.../node.napi.node` |
| 12 | Crash surface | `rawparams.max_raw_memory_mb` default 2048; catch C++ exceptions at the N-API boundary | fuzz with truncated files in a worker; process survives with rejected promises |
| 13 | Threadpool | document `UV_THREADPOOL_SIZE` | see async how-to |

## Electron version pins for CI

Test with the Electron photoview uses (42.x) and the latest stable. `npm i -D electron@42` in the test
project; the smoke script is in [test-under-electron.md](test-under-electron.md).

## Things that are *not* needed

- `electron-rebuild` / `@electron/rebuild` for this module (Node-API prebuild).
- `patchelf`, RPATH, `$ORIGIN`, SONAME juggling (no shared sidecars).
- `disable-library-validation` entitlement (same Team ID signs everything at package time).
- Any glib wrapper machinery from `sharp-electron` (LibRaw does not use glib).
