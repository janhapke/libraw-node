# How to integrate the new binding into photoview

Assumes the API in [reference/proposed-binding-api.md](../reference/proposed-binding-api.md) and the files
in [reference/photoview-integration-points.md](../reference/photoview-integration-points.md).

## 1. Dependencies

```bash
npm rm lightdrift-libraw
npm i -D @janhapke/libraw            # devDependency by project convention
```

- Remove `"rebuild": "electron-rebuild -f -w lightdrift-libraw"` (Node-API prebuild; nothing to rebuild)
  unless other modules need it.
- Remove the `postinstall` `rmSync` hack (no nested sharp any more) once no other dependency bundles sharp.
- Delete `src/backend/image-decoder-process/plugins/lightdrift-libraw.d.ts`.
- `libraw-dev` is no longer required on dev machines or CI.

## 2. `LibRawPlugin`

```ts
import { identify, thumbnail, decode } from '@janhapke/libraw';
import sharp from 'sharp';

export class LibRawPlugin extends AbstractImageFormatPlugin {
  async decode(buffer, _ext, size, ctx) {
    const target = this.requireResolvedLongestEdgePx(size);
    if (size.name === DecodeSizes.THUMBNAIL || size.name === DecodeSizes.PREVIEW) {
      const info = await identify(buffer);                       // ~ms, no unpack
      const pick = chooseThumb(info.thumbs, target);             // smallest JPEG with long edge >= target, else largest
      if (pick === null) {
        if (size.name === DecodeSizes.THUMBNAIL) return null;    // fallbackSize → FULL
        return this.halfSizePreview(buffer, size, ctx);          // preview tier for RAWs without usable preview
      }
      const t = await thumbnail(buffer, { index: pick.index, signal: ctx.signal });
      return this.resizeJpegIfNeeded(t.data, target, size.jpegOptions.quality);   // sharp .rotate().resize()
    }
    const img = await decode(buffer, {
      params: { use_camera_wb: true, user_qual: 2 /* PPG: fast, fine after downscale */ },
      signal: ctx.signal,
    });
    const span = ctx.tracer.startSpan('raw-resize-encode');
    const data = await sharp(img.data, { raw: { width: img.width, height: img.height, channels: img.colors } })
      .resize({ width: target, height: target, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: size.jpegOptions.quality }).toBuffer();
    ctx.tracer.endSpan(span.spanId);
    return { data, mimeType: 'image/jpeg' };
  }
}
```

`halfSizePreview` = `decode(buffer, { params: { half_size: true, use_camera_wb: true } })` + the same sharp
step. Orientation: `decode` applies `user_flip = -1` (file orientation) inside LibRaw, as today; embedded
JPEG thumbnails keep their own EXIF tag, so the `.rotate()` before `.resize()` stays (knowledge base
`sharp.md`).

## 3. Metadata plugins

Both become one `identify()` call each (or share a per-request cache of the `identify` result inside the
worker, keyed by path + mtime, since the decode path calls it too):

```ts
const info = await identify(buffer);
return { cameraMake: info.idata.make ?? null, cameraModel: info.idata.model ?? null,
         lensMake: info.lens.LensMake ?? null, lensModel: info.lens.Lens ?? null,
         focalLengthMm: info.other.focal_len ?? null, apertureFNumber: info.other.aperture ?? null,
         iso: info.other.iso_speed ?? null, exposureTimeSeconds: info.other.shutter ?? null,
         exposureTimeFraction: null, dateTimeOriginal: info.other.timestamp ? info.other.timestamp * 1000 : null };
```

Dimensions: `info.sizes` after `adjust_sizes_info_only` semantics — expose both raw (`width/height`) and
oriented (`iwidth/iheight` swapped when `flip` is 5 or 6) and use the oriented pair for the panel.

## 4. Cancellation through the pool

`DecodeWorkerPool.assignTasks()` already knows when an in-flight path is superseded. Add an RPC
`worker.cancel.<id>` (or reuse the render-task RPC with a cancel message) that the worker maps to the
`AbortController` of its current task; `PluginDecodeContext` gains `signal: AbortSignal`. The worker's
JS thread is free during native work, so the cancel message is handled immediately.

## 5. Threadpool

In `image-decoder-process/index.ts`, before spawning workers:
`process.env.UV_THREADPOOL_SIZE ??= String(resolveWorkerPoolSize() + 2)`. The env var must be set before
the first threadpool use in the process; the utility process starts fresh, so this is early enough.

## 6. Packaging

- Forge `packagerConfig.ignore`: drop `node_modules/@janhapke/libraw/prebuilds/<other platforms>` for the
  target platform to keep the app small (optional).
- `AutoUnpackNativesPlugin` already unpacks `**/*.node`; no `.so` sidecars exist, so the `asar.unpack`
  glob added for sharp is not needed for this module.

## Sharp interop

`sharp` cannot receive a libvips image from another native module, and its prebuilt libvips has no LibRaw
loader, so "return a sharp object from inside the addon" is not possible. What *is* possible, and is the
same thing sharp does internally for raw input: hand sharp the decoded RGB buffer with its dimensions.
sharp wraps that memory as a libvips image without decoding anything, and the raw-pixel-to-JPEG path is the
one already proven safe under Electron/Linux (knowledge base `sharp-electron-linux-crash.md`).

The binding therefore returns `{ width, height, colors, bits, data }` whose `data` is exactly what
`sharp(data, { raw: { width, height, channels: colors } })` expects, and adds a convenience that takes the
caller's own `sharp` module (whatever `require('sharp')` resolves to in the app, i.e. `@janhapke/sharp-electron`
under the alias), so the binding never depends on sharp itself:

```ts
import sharp from 'sharp';
import { decode } from '@janhapke/libraw';

const img = await decode(buffer, { params: { use_camera_wb: true } });
const pipeline = img.toSharp(sharp);      // === sharp(img.data, { raw: { width, height, channels } })
const jpeg = await pipeline.resize({ width: 1620, height: 1620, fit: 'inside' }).jpeg({ quality: 95 }).toBuffer();
```

`toSharp(sharpModule)` is a two-line helper typed against `sharp`'s `Sharp` type via an optional
`peerDependencies` entry; `sharp` is never `require`d by the binding. Two consequences for photoview:
there is still one copy from LibRaw into the V8 buffer, then sharp reads it in place; and `LibRawPlugin`
keeps its current shape (`decode` → sharp resize/encode), only with the thumbnail/metadata paths getting
cheaper and the full path getting options.

## 7. Verify

- `npm test` (update the LibRaw plugin unit tests' mocks to `identify/thumbnail/decode`).
- `PHOTOVIEW_BENCHMARK=1 npm run benchmark:run` then `benchmark:report`; compare with
  `benchmark/reports/2026-07-20_13-42-57_dataurl-fixed.csv`.
- Real portrait NEF/ORF/DNG from `.private/testimages` for orientation in both tiers.
- `npm run make` on Linux; install the `.deb`; open a RAW folder.
