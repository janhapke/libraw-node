# How to test the addon under Electron without a GUI

Same trick the knowledge base uses for sharp (`sharp.md`, "Fast iteration without a full Electron app"):
run a script through Electron's binary in Node mode.

```bash
npm i --no-save electron@42
ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron test/electron-smoke.cjs
```

Cross-platform (works from `npm run test:electron` too, including on Windows where the bash
`FOO=1 cmd` env-var-prefix syntax does not apply): `scripts/run-electron.cjs` resolves the installed
`electron` package's binary and spawns it with `ELECTRON_RUN_AS_NODE=1` set in Node itself.

```bash
npm i --no-save electron@42
node scripts/run-electron.cjs test/electron-smoke.cjs test/electron-workers-smoke.cjs
# or: npm run test:electron
```

`test/electron-smoke.cjs` (T22; committed, not just this doc's sketch -- see the file for the exact,
current version): loads the real package entry point (`lib/index.cjs`), then exercises `identify()`,
`thumbnail()`, `decode()` (default params and `{ half_size: true }`), and the `Processor` staged async
pipeline (`openBuffer`/`unpack`/`process`/`image`) with `AbortSignal` cancellation, on the synthetic
`test/fixtures/pm5544-768x576.dng`:

```js
const path = require('path');
const fs = require('fs');
const libraw = require('../lib/index.cjs');

(async () => {
  console.log('electron', process.versions.electron, 'node', process.versions.node, 'napi', process.versions.napi);
  const buf = fs.readFileSync(path.join(__dirname, 'fixtures', 'pm5544-768x576.dng'));

  const info = await libraw.identify(buf);
  if (info.sizes.width !== 768) throw new Error('identify failed');

  const t = await libraw.thumbnail(buf);
  if (t.format !== 'jpeg' || t.data[0] !== 0xff) throw new Error('thumbnail failed');

  const img = await libraw.decode(buf, { params: { half_size: true } });
  if (img.width !== 384 || img.data.length !== 384 * 288 * 3) throw new Error('decode failed');

  // abort path -- rejections from this package are LibRawError instances
  // with `aborted: true` (lib/errors.cjs), not a DOMException with
  // code === 'ABORT_ERR'.
  const ac = new AbortController();
  const p = libraw.decode(buf, { signal: ac.signal });
  ac.abort();
  await p.then(() => { throw new Error('abort did not reject'); }, (e) => { if (e.aborted !== true) throw e; });

  console.log(`PASS electron=${process.versions.electron || 'none'} arch=${process.arch} openmp=${!!libraw.buildInfo.openmp}`);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
```

The package has no `LibRaw` named export; `decode`/`identify`/`thumbnail`/`Processor`/`buildInfo` are
top-level exports of `lib/index.cjs` (see README.md's API table).

The script also runs unmodified under plain `node test/electron-smoke.cjs` (`process.versions.electron`
is `undefined` then, so the `PASS` line reads `electron=none`) -- useful to confirm a failure is
Electron-specific before spending a CI round on it.

What this catches that plain `node` does not:

- External-buffer crashes (V8 memory cage).
- Windows delay-load problems ("Module did not self-register").
- Symbol clashes with Electron's bundled zlib/libjpeg. The synthetic DNG is uncompressed, so add a
  deflate-compressed DNG and a lossy DNG fixture to exercise the zlib and libjpeg code paths.

What it does not catch: asar packaging. For that, `test/forge-app/` (T24) is a minimal Electron Forge app
that depends on the packed tarball via `file:../../janhapke-libraw-0.0.0.tgz`; `scripts/forge-asar-check.sh`
runs `npm pack`, installs the app, `electron-forge package --platform linux --arch x64` (no display needed),
then `ELECTRON_RUN_AS_NODE=1 out/<app>/<binary> test/forge-app/asar-check.cjs`, which `require`s
`@janhapke/libraw` from inside the packaged `resources/app.asar`, decodes the synthetic DNG, and prints
`PASS loadedFrom=<path>` where `<path>` must contain `app.asar.unpacked` -- proof the native `.node` file
was actually pulled out of the archive (Forge's `packagerConfig.asar.unpack: '**/*.node'`) and genuinely
loaded from there, not merely present. Not covered even by T24: code signing (macOS `codesign --verify
--deep --strict` needs a signed, packaged app; nothing here signs one).

Worker-thread variants: `test/electron-workers-smoke.cjs` spawns 3 `worker_threads`, each requiring the
addon and running one `decode()`, then posts its output checksum (SHA-256) back to the main thread, which
asserts all three match -- proving the addon's `Napi::Addon` context-aware state does not leak or collide
across worker instances under Electron. Run it under `ELECTRON_RUN_AS_NODE=1` too; it prints
`PASS workers=3 electron=<version>`.

`test/electron-workers-cold-smoke.cjs` (T24 Part A) is the same idea but explicitly documents that no
main-thread warm-up `require()` happens before the workers spawn (both scripts are "cold" the same way since
T24 removed the old warm-up workaround -- see below): 3 (or more, via `argv[2]`) `worker_threads` each do
their *first* `require()` of the addon concurrently. This script exists because, on `windows-2022`, cold
worker_threads used to crash (`STATUS_ACCESS_VIOLATION`) or silently exit the process with code 1 shortly
after a successful decode -- see `docs/plan/tasks.md`'s T24 and T24b sections for the full investigation and
fix (a Windows `/openmp` runtime crash on cold worker threads, not anything Electron-specific in the addon
itself, and not the MSVC delay-load-runtime race T24's first fix targeted). It prints
`PASS workers=<N> cold=true electron=<version>`. `test/helpers/run-variants.cjs` (T24b) is a further
Windows-only diagnostic step, kept permanently in CI, that runs ten lettered variants of this same scenario
(worker count, `decode`/`require`-only/`version`-only, various env overrides, a warm-up, `worker.terminate()`
ordering, and a no-`worker_threads` control) and prints a compact `VARIANT <letter> exit=<code>` table.

`scripts/electron-safety.sh` (T24 Part B) runs the platform binary check, a forbidden-include grep,
`buildInfo` sanity checks, and all three scripts above (under the installed `electron` package if present)
as one entry point; `npm run electron:safety` runs it.

CI (`.github/workflows/build.yml`) runs the smoke scripts in every `test-*` job (Linux x64/arm64, macOS
x64/arm64, Windows x64), twice: once against `electron@42` (photoview's pinned version) and once against
`electron@latest` (the current Electron stable at CI run time) -- `electron` is installed with
`npm i --no-save` in the job itself, never added to `package.json`. The cold script runs permanently in
every `test-*` job too (Windows additionally runs it with 6 workers, and under plain Node, as a permanent
regression guard for the race described above). The Linux x64 job alone also runs `electron-safety.sh` and
`forge-asar-check.sh`.
