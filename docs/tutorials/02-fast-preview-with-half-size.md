# Tutorial 2 — Fast previews: embedded thumbnails vs `half_size`

Builds on [tutorial 1](01-first-decode.md). A photo viewer showing a grid of thumbnails, or a quick preview
before a user commits to a full-resolution view, should almost never pay for a full demosaic. This tutorial
walks the three tiers `@janhapke/libraw` gives you — `identify()`, the embedded thumbnail via
`thumbnail()`, and `decode()` with `half_size` — and when to reach for each.

## 0. What you need

Same as tutorial 1: Node.js ≥ 22, `@janhapke/libraw` installed (or run inside this repo's checkout). The
committed synthetic fixture (`test/fixtures/pm5544-768x576.dng`) is used below so every snippet runs
unmodified — it's small (768×576) with one 96×72 embedded JPEG thumbnail, so the *timings* won't be
dramatic. For timings that actually matter, pass a real camera RAW file as `process.argv[2]` instead; the
"Typical shape on a real file" section below shows numbers from a 16 MP Pentax DNG for comparison.

## 1. `identify()` first, always

```js
// preview.js
const fs = require('node:fs');
const libraw = require('@janhapke/libraw'); // or '../lib/index.cjs' inside this repo

function time(label, fn) {
  const t0 = process.hrtime.bigint();
  return Promise.resolve(fn()).then((r) => {
    console.log(label.padEnd(28), (Number(process.hrtime.bigint() - t0) / 1e6).toFixed(2), 'ms');
    return r;
  });
}

(async () => {
  const path = process.argv[2] ?? 'test/fixtures/pm5544-768x576.dng';
  const buffer = fs.readFileSync(path);

  const info = await time('identify (open only)', () => libraw.identify(buffer));
  console.log(' ', info.idata.make, info.idata.model, `${info.sizes.width}x${info.sizes.height}`, 'flip', info.sizes.flip);
  console.log('  thumbs:', info.thumbs.map((t, i) => `#${i} ${t.twidth}x${t.theight} ${t.tformat}`).join(', '));

  // Pick the smallest embedded thumbnail whose long edge covers the target,
  // falling back to the largest available one.
  const target = 640;
  const withIndex = info.thumbs.map((t, index) => ({ ...t, index }));
  const pick =
    withIndex.filter((t) => Math.max(t.twidth, t.theight) >= target).sort((a, b) => a.tlength - b.tlength)[0] ??
    withIndex.sort((a, b) => b.tlength - a.tlength)[0];

  const th = await time(`thumbnail #${pick.index}`, () => libraw.thumbnail(buffer, { index: pick.index }));
  fs.writeFileSync('thumb.jpg', th.data);
  console.log('  wrote thumb.jpg:', th.format, `${th.width}x${th.height}`, th.data.length, 'bytes');

  const half = await time('decode half_size', () => libraw.decode(buffer, { params: { half_size: true, use_camera_wb: true } }));
  const full = await time('decode full (AHD)', () => libraw.decode(buffer, { params: { use_camera_wb: true } }));
  console.log(' ', `${half.width}x${half.height}`, 'vs', `${full.width}x${full.height}`);
})();
```

```bash
node preview.js test/fixtures/pm5544-768x576.dng
```

Output on the synthetic fixture (your exact milliseconds will vary; the point is the *shape*: `identify` and
`thumbnail` are near-instant regardless of file size, `decode` is not):

```
identify (open only)         ~0.3 ms
  janhapke/libraw PM5544 Synthetic 768x576 flip 0
  thumbs: #0 96x72 jpeg
thumbnail #0                 ~0.5 ms
  wrote thumb.jpg: jpeg 96x72 3826 bytes
decode half_size            ~15 ms
decode full (AHD)           ~35 ms
  384x288 vs 768x576
```

## 2. Typical shape on a real file

The synthetic fixture is too small to show the real cost difference between these tiers. Run the same
script against a real camera RAW (`node preview.js /path/to/photo.DNG`) and the gap opens up — this is what
it looked like on a 16 MP Pentax K-5 II DNG on the machine this package was developed on:

```
identify (open only)          1.9 ms
  Pentax K-5 II 4950x3284 flip 0
  thumbs: #0 160x120 jpeg, #1 4928x3264 jpeg
thumbnail #1                  2.9 ms      ← embedded JPEG bytes, no demosaic
decode half_size             485.3 ms      ← unpack + 2x2 binning, no demosaic
decode full (AHD)            758.5 ms      ← unpack + full AHD demosaic
  2475x1642 vs 4950x3284
```

`identify` and `thumbnail` cost single-digit milliseconds regardless of sensor size — they never touch the
demosaic pipeline. `decode` pays for the full unpack either way; `half_size` skips the demosaic step but not
the unpack itself, which is why it's faster than a full decode but still far from free.

## 3. What to take from this

- **Call `identify()` first, always.** It's essentially free and tells you what thumbnails are available
  before you decide anything else.
- **The embedded thumbnail is the fast path for both thumbnail and preview tiers.** Pick by size from
  `info.thumbs`, as the snippet above does; only fall back to a real decode when no entry is large enough
  (common on old cameras, rare on modern ones).
- **`half_size` halves the pipeline, not the unpack.** Unpack is the floor for anything that needs real
  pixels from the sensor — `half_size` only skips the (expensive) demosaic step and returns a quarter as
  many pixels.
- **Both `thumbnail()` and `decode()` are async and cancellable.** If a user scrolls past a thumbnail
  before it's ready, or requests a different size mid-flight, pass `{ signal }` and abort the stale request
  — see [Cancel a decode and track progress](../how-to/cancel-and-track-progress.md).
- Next: [Set processing options](../how-to/set-processing-options.md) covers every `params`/`rawparams`
  field these examples only scratch the surface of (demosaic algorithm, output color space, white balance,
  ...).
