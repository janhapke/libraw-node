# Electron compatibility

What it takes for a Node native addon to load and run correctly inside Electron's main process, a
`utilityProcess`, and `worker_threads` spawned from either, on Windows, macOS, and Linux. Facts checked
against Electron's native-modules tutorial, Electron's V8 memory cage blog post, `nodejs/abi-stable-node`
issue 441, lightdrift 1.0.0's CI, and the knowledge base's Electron notes.

## 1. Use Node-API only, then one binary per platform serves Node and Electron

Electron's ABI differs from Node's for anything that touches V8 or Node internals directly (NAN-style
addons), which is why `@electron/rebuild` exists. Node-API (N-API) is a C ABI kept stable across Node
versions and Node "flavours". An addon that uses **only** Node-API symbols (node-addon-api is a header-only
C++ wrapper over it) can be built once against Node's headers and loaded by any Electron whose embedded Node
supports that `NAPI_VERSION`. This is how `sharp`, `better-sqlite3` (napi builds), `classic-level`, and
lightdrift 1.0.0 ship: prebuilt `.node` files tagged `napi`, and Electron consumers do not rebuild.
lightdrift 1.0.0's release workflow loads its Node-built prebuild in Electron 36.9.5 as a CI gate.

Practical rules:

- Define `NAPI_VERSION` at 8 (Node ≥ 12.22 / Electron ≥ 15 era) or 9; do not chase the newest.
- Never include `node.h`, `v8.h`, or `uv.h`. Use `napi.h` from node-addon-api only. Async work goes through
  `Napi::AsyncWorker` / `napi_create_async_work` (libuv threadpool, reachable through Node-API without
  including libuv).
- Prebuild with `prebuildify --napi --strip` (or equivalent), load with `node-gyp-build`, which ignores the
  runtime and picks `prebuilds/<platform>-<arch>/node.napi.node`.
- Still add an Electron smoke job in CI: `ELECTRON_RUN_AS_NODE=1 electron test.js` on each OS
  ([how-to](../how-to/test-under-electron.md)). That is the guard against the two Electron-specific
  deviations below.

## 2. The V8 memory cage: no external buffers (Electron ≥ 21)

Electron enables V8's sandbox ("memory cage"). `napi_create_external_buffer` / `napi_create_external_arraybuffer`
(wrapping memory the addon allocated) **crash** because the backing store must live inside the cage.
Consequences and rules:

- Never use `Napi::Buffer<T>::New(env, data, length, finalizer)` for output pixels. Use
  `Napi::Buffer<T>::NewOrCopy(...)` (node-addon-api ≥ 6; copies when external buffers are disallowed) or,
  better, allocate `Napi::Buffer<T>::New(env, length)` (V8 memory) and let LibRaw write into it via
  `copy_mem_image`. Compile with `-DNODE_API_NO_EXTERNAL_BUFFERS_ALLOWED` so node-addon-api refuses the
  external path at build time.
- "Zero-copy" output is impossible under Electron; "one copy into a V8 buffer" is the floor. Design the API
  around that (see [opportunities §6](opportunities-for-photoview.md)).
- Input buffers are fine: `Napi::Buffer` passed from JS is V8 memory; read it in place (keep a `Napi::Reference`
  alive while the AsyncWorker reads it, or copy it into the worker before starting; LibRaw's `open_buffer`
  reads lazily during `unpack`, so the reference must outlive the whole job).

## 3. Windows: the delay-load hook

On Windows the addon imports Node-API symbols from `node.exe`. Inside Electron there is no `node.exe`;
symbols come from `electron.exe`. The fix is a delay-load hook that redirects the `node.exe` import to the
running executable. `node-gyp` adds `win_delay_load_hook.cc` and `/DELAYLOAD:node.exe` by default
(`win_delay_load_hook: 'true'` in its common.gypi), so a node-gyp/prebuildify Windows build is covered
automatically. With CMake (`cmake-js`), enable its delay-load option (cmake-js has `CMAKE_JS_...` support
that adds the hook) or add `win_delay_load_hook.cc` from `node-gyp/src` to the sources and link with
`delayimp.lib /DELAYLOAD:node.exe`. Missing it yields "Module did not self-register" or "The specified
procedure could not be found" only inside Electron, never in Node, which is why the Electron smoke test is
mandatory.

## 4. Context-aware and worker_threads-safe

photoview loads the addon in up to six `worker_threads` inside a `utilityProcess`. Requirements:

- Register with `NODE_API_MODULE(...)` (node-addon-api; context-aware by construction). Do not use
  `NODE_MODULE`.
- No mutable process-global state in the addon (no static `Napi::FunctionReference constructor` that
  leaks across contexts; use `Napi::Env::SetInstanceData` / `Addon<T>` for per-context state). lightdrift
  alpha.6 stores its constructor in a static `Napi::FunctionReference` with `SuppressDestruct()`; it
  happens to work because each worker gets a fresh module instance, but `Addon<T>` is the correct form.
- Build LibRaw **without** `LIBRAW_NOTHREADS` (the reentrant `libraw_r` configuration) so two instances can
  run on two threads. This is the default of LibRaw-cmake's `raw_r` target and of lightdrift's gyp build
  (which never defines `LIBRAW_NOTHREADS`).
- AsyncWorkers run on the libuv threadpool of the *thread's own* event loop. Each `worker_threads` Worker
  has its own loop but they share the process-wide libuv threadpool (`UV_THREADPOOL_SIZE`, default 4). For
  photoview this is fine because the pool already bounds concurrency to ≤ 6 workers; set
  `UV_THREADPOOL_SIZE` ≥ pool size before the first async op if you want all of them to run at once.

## 5. Packaging: static, sidecar-free, unpacked from asar

- `.node` files cannot be `require`d from inside `app.asar`; Forge's `AutoUnpackNativesPlugin` unpacks
  `**/*.node` only. Any shared-library sidecar (`.so`, `.dylib`, `.dll`) next to the addon stays trapped
  unless you extend `packagerConfig.asar.unpack` (knowledge base `electron-native-modules.md`, found the
  hard way with `libvips-cpp.so`).
- Therefore build the addon **fully static**: LibRaw, zlib, libjpeg-turbo, (LCMS2, libomp) all linked into
  the single `.node`. No RPATH tricks, no `patchelf`, no `$ORIGIN`, no SONAME collisions.
- Hide symbols: `-fvisibility=hidden` and export only `napi_register_module_v1` (a linker version script on
  Linux, `-exported_symbols_list` on macOS, `/EXPORT` implicitly on Windows). LibRaw does not use glib, so
  the `sharp` glib collision (knowledge base `sharp-electron-linux-crash.md`) cannot happen, but Electron
  does bundle its own zlib and libjpeg-turbo; hidden visibility guarantees the addon's copies never
  interpose Chromium's or vice versa.
- Keep the knowledge base's `native-modules.ts` externals script in mind: it discovers `.node` files and
  walks `dependencies` + `optionalDependencies`. A prebuildify layout (`prebuilds/` inside one package)
  needs nothing extra; a `@scope/libraw-<platform>` optional-dependency layout also works with that script.
  Add an `ignore` rule to drop other platforms' prebuilds from the packaged app.

## 6. macOS signing and notarization

Every Mach-O in the bundle must be signed with the hardened runtime, including `.node` files under
`app.asar.unpacked`. `@electron/osx-sign` (used by Forge) walks the bundle and signs nested binaries, so a
static `.node` needs no special step. Build the darwin binaries with `MACOSX_DEPLOYMENT_TARGET` ≥ 11.0
(Electron's own floor moves; 11.0 matches lightdrift and sharp's arm64 baseline). If the addon were ever
signed with a different Team ID than the app, `com.apple.security.cs.disable-library-validation` would be
needed; avoid that by signing at package time, not at build time.

## 7. Linux glibc baseline

Electron's bundled Node loads the addon with the system glibc. Build linux-x64/arm64 in an old-glibc
container (Rocky Linux 8 / glibc 2.28, as `sharp` and `sharp-electron` do, or a `manylinux_2_28` image) so
the binary runs on any distro Electron itself supports. Musl (Alpine) is irrelevant for Electron desktop
apps; skip it in v1.

## 8. Process placement inside photoview

Nothing changes: the addon lives in the image-decoder `utilityProcess` workers, not in the renderer. Keep it
out of the renderer regardless (context isolation, and a native crash there takes the window down).
Crash isolation stays at the worker level; a decoder bug in LibRaw on a malformed file will still SIGSEGV
the worker, which photoview's pool respawns.

## 9. What photoview's Electron version needs

photoview is on Electron 42.5.0 (Node 24-class). lightdrift 1.0.0 targets `NAPI_VERSION=8` and prebuilds
against Node 24 headers; the same choice is right for the new binding. Test matrix: Electron 42 (photoview)
plus the current Electron stable at release time.
