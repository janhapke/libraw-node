# How to test the addon under Electron without a GUI

Same trick the knowledge base uses for sharp (`sharp.md`, "Fast iteration without a full Electron app"):
run a script through Electron's binary in Node mode.

```bash
npm i --no-save electron@42
ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron test/electron-smoke.js
```

`test/electron-smoke.js`:

```js
const path = require('path');
const fs = require('fs');
const { LibRaw, identify, thumbnail, decode } = require('..');

(async () => {
  console.log('electron', process.versions.electron, 'node', process.versions.node, 'napi', process.versions.napi);
  console.log('libraw', LibRaw.version, LibRaw.capabilities);
  const buf = fs.readFileSync(path.join(__dirname, 'fixtures', 'pm5544-768x576.dng'));

  const info = await identify(buf);
  if (info.sizes.width !== 768) throw new Error('identify failed');

  const t = await thumbnail(buf);
  if (t.format !== 'jpeg' || t.data[0] !== 0xff) throw new Error('thumbnail failed');

  const img = await decode(buf, { params: { half_size: true, use_camera_wb: true } });
  if (img.width !== 384 || img.data.length !== 384 * 288 * 3) throw new Error('decode failed');

  // abort path
  const ac = new AbortController();
  const p = decode(buf, { signal: ac.signal });
  ac.abort();
  await p.then(() => { throw new Error('abort did not reject'); }, (e) => { if (e.code !== 'ABORT_ERR') throw e; });

  console.log('PASS');
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
```

What this catches that plain `node` does not:

- External-buffer crashes (V8 memory cage).
- Windows delay-load problems ("Module did not self-register").
- Symbol clashes with Electron's bundled zlib/libjpeg. The synthetic DNG is uncompressed, so add a
  deflate-compressed DNG and a lossy DNG fixture to exercise the zlib and libjpeg code paths.

What it does not catch: asar packaging and code signing. For those, keep a minimal Electron Forge app
(`test/forge-app/`) that depends on the packed tarball, `electron-forge package`, then run
`ELECTRON_RUN_AS_NODE=1 <packaged binary> -e "require('<app.asar path>/...')"` as the knowledge base did
for sharp, and on macOS `codesign --verify --deep --strict`.

Worker-thread variant: `test/electron-workers-smoke.js` spawns 6 `worker_threads`, each requiring the addon
and decoding 20 times; run it under `ELECTRON_RUN_AS_NODE=1` too.
