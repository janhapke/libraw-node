# Using this package from photoview

photoview is `@janhapke/libraw`'s first consumer, not its scope — see
[Use with sharp and worker_threads](use-with-sharp-and-worker-threads.md) for the parts of this guide that
apply to any consumer (sharp interop, `worker_threads`, `UV_THREADPOOL_SIZE`/`OMP_NUM_THREADS`, memory
budgeting). This page covers what is specific to photoview's existing `LibRawPlugin`/decode-worker-pool
architecture, migrating from `lightdrift-libraw`. The actual migration is executed as its own JDD spec in
the photoview repository (`docs/plan/tasks.md`'s T27); this page is what that spec follows.

## Dependencies

```bash
npm rm lightdrift-libraw
npm i -D @janhapke/libraw            # devDependency by project convention
```

- Remove `"rebuild": "electron-rebuild -f -w lightdrift-libraw"` (this package prebuilds for Node-API;
  nothing to rebuild) unless another dependency still needs it.
- Remove the `postinstall` `rmSync` hack for a nested `sharp` install, once no other dependency still
  bundles one.
- Delete `src/backend/image-decoder-process/plugins/lightdrift-libraw.d.ts`.
- `libraw-dev` is no longer required on dev machines or CI — this package ships prebuilt binaries.

## `LibRawPlugin`

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
    const data = await img.toSharp(sharp)
      .resize({ width: target, height: target, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: size.jpegOptions.quality }).toBuffer();
    return { data, mimeType: 'image/jpeg' };
  }
}
```

`halfSizePreview` = `decode(buffer, { params: { half_size: true, use_camera_wb: true } })` followed by the
same sharp step.

## Metadata plugins

Both existing metadata plugins collapse into one `identify()` call each (or share a per-request cache of
the `identify()` result inside the worker, keyed by path + mtime, since the decode path calls it too):

```ts
const info = await identify(buffer);
return {
  cameraMake: info.idata.make ?? null,
  cameraModel: info.idata.model ?? null,
  lensMake: info.lens.LensMake ?? null,
  lensModel: info.lens.Lens ?? null,
  focalLengthMm: info.other.focal_len ?? null,
  apertureFNumber: info.other.aperture ?? null,
  iso: info.other.iso_speed ?? null,
  exposureTimeSeconds: info.other.shutter ?? null,
  dateTimeOriginal: info.other.timestamp ? info.other.timestamp * 1000 : null,
};
```

Dimensions: `info.sizes` — expose both raw (`width`/`height`) and oriented (`sizes.oriented.width/height`,
swapped when `flip` is 5 or 6) and use the oriented pair for the UI.

## Cancellation through the pool

`DecodeWorkerPool.assignTasks()` already knows when an in-flight path is superseded. Add an RPC
`worker.cancel.<id>` (or reuse the render-task RPC with a cancel message) that the worker maps to the
`AbortController` of its current task; `PluginDecodeContext` gains `signal: AbortSignal`. The worker's JS
thread stays free during native work (see
[Cancel a decode and track progress](cancel-and-track-progress.md)), so the cancel message is handled
immediately.

## Packaging

- Forge's `packagerConfig.ignore` can drop `node_modules/@janhapke/libraw/prebuilds/<other platforms>` for
  the build target to keep the app small (optional).
- `AutoUnpackNativesPlugin` already unpacks `**/*.node`; this package ships no `.so`/`.dylib`/`.dll`
  sidecars, so no extra `asar.unpack` glob is needed for it (unlike `sharp`'s `libvips-cpp.so`).

## Verify

- `npm test` (update the LibRaw plugin's unit test mocks to `identify`/`thumbnail`/`decode`).
- Rerun the benchmark harness and compare against the pre-migration CSVs.
- Real portrait NEF/ORF/DNG files from `.private/testimages` for orientation in both tiers.
- `npm run make` on Linux; install the `.deb`; open a RAW folder (the one step needing a display).
