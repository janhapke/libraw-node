# Tutorial 2 — Produce a fast preview with `half_size`, and pick the right embedded thumbnail

Builds on [tutorial 1](01-first-decode.md). You will measure the three preview strategies a viewer has for
a RAW file and see which LibRaw calls cost what. Use a real camera file (e.g.
`/home/jan/dev/photoview/.private/testimages/IMGP5127.DNG`, 16 MP) — the synthetic DNG is too small to show
the differences.

## 1. Extend the addon with `identifySync` and `thumbnailSync`

Add to `src/addon.cc`:

```cpp
// identifySync(buffer) -> { width, height, flip, make, model, thumbs: [{index, format, width, height, length}] }
static Napi::Value IdentifySync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  auto input = info[0].As<Napi::Buffer<uint8_t>>();
  auto raw = std::make_unique<LibRaw>();
  raw->imgdata.rawparams.options |= LIBRAW_RAWOPTIONS_CHECK_THUMBNAILS_KNOWN_VENDORS;  // fixes 0-sized entries
  Check(env, raw->open_buffer(input.Data(), input.Length()), "open_buffer");
  Check(env, raw->adjust_sizes_info_only(), "adjust_sizes_info_only");
  auto& d = raw->imgdata;
  auto r = Napi::Object::New(env);
  r.Set("width", d.sizes.iwidth); r.Set("height", d.sizes.iheight); r.Set("flip", d.sizes.flip);
  r.Set("make", d.idata.make); r.Set("model", d.idata.model);
  auto thumbs = Napi::Array::New(env);
  for (int i = 0; i < d.thumbs_list.thumbcount; i++) {
    auto& t = d.thumbs_list.thumblist[i];
    auto o = Napi::Object::New(env);
    o.Set("index", i); o.Set("format", int(t.tformat)); o.Set("width", t.twidth); o.Set("height", t.theight);
    o.Set("length", t.tlength);
    thumbs.Set(i, o);
  }
  r.Set("thumbs", thumbs);
  return r;                                  // no unpack() happened
}

// thumbnailSync(buffer, index) -> { format: 'jpeg'|'bitmap', width, height, data }
static Napi::Value ThumbnailSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  auto input = info[0].As<Napi::Buffer<uint8_t>>();
  int index = info.Length() > 1 ? info[1].ToNumber().Int32Value() : -1;
  auto raw = std::make_unique<LibRaw>();
  Check(env, raw->open_buffer(input.Data(), input.Length()), "open_buffer");
  Check(env, index < 0 ? raw->unpack_thumb() : raw->unpack_thumb_ex(index), "unpack_thumb");
  int err = 0;
  libraw_processed_image_t* t = raw->dcraw_make_mem_thumb(&err);
  Check(env, err, "dcraw_make_mem_thumb");
  auto data = Napi::Buffer<uint8_t>::Copy(env, t->data, t->data_size);   // Copy, not New: Electron-safe
  auto r = Napi::Object::New(env);
  r.Set("format", t->type == LIBRAW_IMAGE_JPEG ? "jpeg" : "bitmap");   // LIBRAW_IMAGE_JPEG == 1, BITMAP == 2
  r.Set("width", t->width); r.Set("height", t->height); r.Set("data", data);
  LibRaw::dcraw_clear_mem(t);
  return r;
}
```

Register both in `Init`, rebuild with `./scripts/build-linux.sh x64`.

## 2. Measure

`test/preview.js`:

```js
const fs = require('fs');
const libraw = require('..');
const buf = fs.readFileSync(process.argv[2]);

function time(label, fn) { const t = process.hrtime.bigint(); const r = fn(); console.log(label.padEnd(28), (Number(process.hrtime.bigint() - t) / 1e6).toFixed(1), 'ms'); return r; }

const info = time('identify (open only)', () => libraw.identifySync(buf));
console.log(' ', info.make, info.model, info.width + 'x' + info.height, 'flip', info.flip);
console.log('  thumbs:', info.thumbs.map(t => `#${t.index} ${t.width}x${t.height} ${(t.length/1024)|0}KB`).join(', '));

const target = 1620;                                              // e.g. a 1440p screen's long edge
const pick = info.thumbs.filter(t => Math.max(t.width, t.height) >= target)
                        .sort((a, b) => a.length - b.length)[0] ?? info.thumbs.sort((a, b) => b.length - a.length)[0];
const th = time(`thumbnail #${pick.index}`, () => libraw.thumbnailSync(buf, pick.index));
fs.writeFileSync('thumb.jpg', th.data);

const half = time('decode half_size', () => libraw.decodeSync(buf, { half_size: true }));
const full = time('decode full (AHD)', () => libraw.decodeSync(buf, { half_size: false }));
console.log(' ', half.width + 'x' + half.height, 'vs', full.width + 'x' + full.height);
```

```bash
node test/preview.js /home/jan/dev/photoview/.private/testimages/IMGP5127.DNG
```

Typical shape of the output on a 16 MP file (your numbers will differ; the point is the ratios):

```
identify (open only)          3.1 ms
  PENTAX K-5 II 4928x3264 flip 0
  thumbs: #0 160x120 8KB, #1 4928x3264 1550KB
thumbnail #1                  6.4 ms       ← embedded JPEG bytes, no decode
decode half_size            ~450 ms        ← unpack ~350 + binning, no demosaic
decode full (AHD)           ~900 ms        ← unpack ~350 + AHD ~550
```

Compare with photoview today: `decode-preview` 378 ms (because `loadBuffer` unpacks before extracting the
same thumbnail) and `decode-full` 1105 ms (incl. ~170 ms sharp).

## 3. What to take from this

- `identify` is essentially free; call it first and always.
- The embedded preview is the fast path for both `thumbnail` and `preview` tiers; choose by size from
  `thumbs`. Only when no entry is large enough (rare on modern cameras, common on old ones) fall back to
  `half_size`.
- `half_size` halves the pipeline, not the unpack. Unpack is the floor for anything that needs real pixels.
- Next: make these calls asynchronous and cancellable ([how-to](../how-to/implement-async-decode-with-cancellation.md))
  so a worker thread stays responsive while the ~350 ms unpack runs.
