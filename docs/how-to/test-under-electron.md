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

What it does not catch: asar packaging and code signing. For those, keep a minimal Electron Forge app
(`test/forge-app/`) that depends on the packed tarball, `electron-forge package`, then run
`ELECTRON_RUN_AS_NODE=1 <packaged binary> -e "require('<app.asar path>/...')"` as the knowledge base did
for sharp, and on macOS `codesign --verify --deep --strict`. (This is T24, not T22.)

Worker-thread variant: `test/electron-workers-smoke.cjs` spawns 3 `worker_threads`, each requiring the
addon and running one `decode()`, then posts its output checksum (SHA-256) back to the main thread, which
asserts all three match -- proving the addon's `Napi::Addon` context-aware state does not leak or collide
across worker instances under Electron. Run it under `ELECTRON_RUN_AS_NODE=1` too; it prints
`PASS workers=3 electron=<version>`.

CI (`.github/workflows/build.yml`) runs both scripts in every `test-*` job (Linux x64/arm64, macOS
x64/arm64, Windows x64), twice: once against `electron@42` (photoview's pinned version) and once against
`electron@latest` (the current Electron stable at CI run time) -- `electron` is installed with
`npm i --no-save` in the job itself, never added to `package.json`.
