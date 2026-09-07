# Tutorial 1 — Decode your first RAW file

You will install `@janhapke/libraw`, decode a RAW file into raw pixels, and save it as a viewable image —
first as a hand-written PPM (no extra dependencies), then via `sharp` (the way you'd actually do it in an
app). Every command below runs as written from a checkout of this repository; if you're using the package
from `npm i @janhapke/libraw` instead, swap the `require('../lib/index.cjs')`/`require('../../lib/index.cjs')`
lines for `require('@janhapke/libraw')`.

## 0. What you need

- Node.js ≥ 22. No compiler, no Docker, no LibRaw installation — `@janhapke/libraw` ships prebuilt binaries.
- A RAW file. This repository commits a small synthetic one for exactly this purpose:
  `test/fixtures/pm5544-768x576.dng` (768×576, a demosaicable test-card pattern plus a 96×72 embedded JPEG
  thumbnail — see `test/fixtures/README.md`). Any real camera RAW file works too.

## 1. Install and check the build

```bash
npm i @janhapke/libraw
node -e "const l = require('@janhapke/libraw'); console.log(l.version(), l.buildInfo)"
```

```
0.22.2-Release { libraw: '0.22.2-Release', ... openmp: true, ... }
```

`buildInfo` records exactly what this prebuild has compiled in (LibRaw/zlib/libjpeg-turbo versions, whether
OpenMP is available, compiler, flags) — useful when something behaves differently across platforms.

## 2. `identify()` — read metadata, no pixels decoded

`identify()` opens the file and parses its container/EXIF/MakerNote data without unpacking any pixel data —
cheap, and always the first call worth making:

```js
// identify.js
const fs = require('node:fs');
const libraw = require('@janhapke/libraw'); // or '../lib/index.cjs' inside this repo

(async () => {
  const buffer = fs.readFileSync(process.argv[2] ?? 'test/fixtures/pm5544-768x576.dng');
  const info = await libraw.identify(buffer);
  console.log(info.idata.make, info.idata.model);
  console.log(info.sizes.width, 'x', info.sizes.height, 'oriented', info.sizes.oriented);
  console.log('thumbnails:', info.thumbs.map((t) => `${t.twidth}x${t.theight} (${t.tformat})`));
  console.log('warnings:', info.warnings);
})();
```

```bash
node identify.js test/fixtures/pm5544-768x576.dng
# janhapke/libraw PM5544 Synthetic
# 768 x 576 oriented { width: 768, height: 576 }
# thumbnails: [ '96x72 (jpeg)' ]
# warnings: []
```

`info.metadata` (not printed above) carries the full generated metadata mirror — every `idata`/`sizes`/
`other`/`lens`/`color`/`makernotes.*` field LibRaw exposes; see
[`docs/reference/metadata.md`](../reference/metadata.md).

## 3. `decode()` — full pipeline to RGB pixels

```js
// decode.js
const fs = require('node:fs');
const libraw = require('@janhapke/libraw');

(async () => {
  const path = process.argv[2] ?? 'test/fixtures/pm5544-768x576.dng';
  const buffer = fs.readFileSync(path);

  console.time('decode');
  const image = await libraw.decode(buffer, { params: { use_camera_wb: true } });
  console.timeEnd('decode');

  console.log(image.width, 'x', image.height, image.colors, 'ch', image.bits, 'bit');

  const ppmHeader = Buffer.from(`P6\n${image.width} ${image.height}\n255\n`);
  fs.writeFileSync('out.ppm', Buffer.concat([ppmHeader, image.data]));
})();
```

```bash
node decode.js test/fixtures/pm5544-768x576.dng
# decode: ~35ms (varies by machine; this file is tiny — a 16 MP camera RAW takes hundreds of ms, see tutorial 2)
# 768 x 576 3 ch 8 bit
```

Open `out.ppm` (GIMP, ImageMagick's `display`, or `magick out.ppm out.png`) — you should see the PM5544 test
card. `decode()` is the fused helper: it opens the file, unpacks the mosaic, runs the full postprocessing
pipeline (demosaic, white balance, color conversion — everything `params` controls), and copies the result
into one `Buffer`. It's a `Promise`, running off the JS thread on libuv's threadpool, so your app stays
responsive while it runs; pass `{ signal }` (an `AbortSignal`) to cancel it — see
[Cancel a decode and track progress](../how-to/cancel-and-track-progress.md).

## 4. The same thing via `sharp`

Writing a PPM by hand is fine for a first look; a real app wants JPEG/PNG output, resizing, and orientation
handling — that's `sharp`'s job, not this package's. `image.toSharp(sharp)` hands sharp the decoded buffer
directly, no extra copy:

```bash
npm i sharp
```

```js
// decode-to-jpeg.js
const fs = require('node:fs');
const sharp = require('sharp');
const libraw = require('@janhapke/libraw');

(async () => {
  const path = process.argv[2] ?? 'test/fixtures/pm5544-768x576.dng';
  const buffer = fs.readFileSync(path);
  const image = await libraw.decode(buffer, { params: { use_camera_wb: true } });

  await image.toSharp(sharp)
    .resize({ width: 640, fit: 'inside' })
    .jpeg({ quality: 90 })
    .toFile('preview.jpg');

  console.log('wrote preview.jpg from', image.width, 'x', image.height, 'source');
})();
```

```bash
node decode-to-jpeg.js test/fixtures/pm5544-768x576.dng
# wrote preview.jpg from 768 x 576 source
```

## 5. Confirm it also works under Electron (no display needed)

```bash
npm i --no-save electron@42
ELECTRON_RUN_AS_NODE=1 npx electron identify.js test/fixtures/pm5544-768x576.dng
```

If this prints the same output as plain `node`, the addon is loading through Node-API inside Electron's
runtime with no rebuild — see [Test the addon under Electron without a GUI](../how-to/test-under-electron.md)
for the full smoke-test scripts this package ships. Continue with
[tutorial 2](02-fast-preview-with-half-size.md) to see the cheaper preview paths (`identify` + embedded
thumbnails, `half_size`) before reaching for a full decode.
