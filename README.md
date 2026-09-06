# @janhapke/libraw

A general-purpose, Electron-safe Node.js binding for [LibRaw](https://www.libraw.org/), the RAW image
decoding library. Statically links LibRaw, zlib, and libjpeg-turbo, and no compiler is required on the
consumer's machine — prebuilt binaries ship per platform. On Linux, `libgomp.so.1` (GCC's OpenMP runtime,
used for parallel demosaic) is the one dynamic dependency beyond libc/libm/libpthread/libdl — every Linux
system with a GCC toolchain already has it; see the `target_link_libraries(addon PRIVATE gomp)` comment in
`CMakeLists.txt` for why it cannot be statically linked into a shared object with this toolchain.

This package is not scoped to any single consumer application — see
`docs/explanation/adoption-comparison.md` for the design rationale.

Status: early scaffold (see `docs/plan/tasks.md` for the task breakdown driving development).

## Install

```bash
npm i @janhapke/libraw
```

Prebuilt native binaries ship inside the npm package under `prebuilds/<platform>-<arch>/`; installing
never runs a compiler on your machine. Requires **Node.js ≥ 22**.

Under **Electron**, the addon needs no special handling beyond what any Node-API native module needs —
see `docs/how-to/make-the-addon-electron-safe.md` for the full checklist and
`docs/how-to/test-under-electron.md` for a smoke-test script. Verify with a display-less check:

```bash
ELECTRON_RUN_AS_NODE=1 npx electron -e "console.log(require('@janhapke/libraw').version())"
```

`sharp` is an **optional peer dependency**, only needed if you use [`toSharp()`](#sharp-interop) — this
package never `require`s it itself.

## Quick start

Both module systems are supported (`package.json`'s `exports` map, see [Module formats](#module-formats)
below). Decode a RAW file and re-encode a preview as JPEG via `sharp`:

**ESM**

```js
import { decode } from '@janhapke/libraw';
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';

const buffer = await readFile('photo.NEF');
const image = await decode(buffer, { params: { use_camera_wb: true } });
const jpeg = await image.toSharp(sharp).resize({ width: 1620, fit: 'inside' }).jpeg({ quality: 90 }).toBuffer();
await writeFile('preview.jpg', jpeg);
```

**CommonJS**

```js
const { decode } = require('@janhapke/libraw');
const sharp = require('sharp');
const fs = require('node:fs/promises');

(async () => {
  const buffer = await fs.readFile('photo.NEF');
  const image = await decode(buffer, { params: { use_camera_wb: true } });
  const jpeg = await image.toSharp(sharp).resize({ width: 1620, fit: 'inside' }).jpeg({ quality: 90 }).toBuffer();
  await fs.writeFile('preview.jpg', jpeg);
})();
```

## Module formats

`package.json`'s `exports` map serves an ESM entry point (`lib/index.mjs`, a thin wrapper re-exporting
every name from the CommonJS entry) under the `import` condition and the CommonJS entry point
(`lib/index.cjs`, `main`) under `require`/`default`, plus `types/index.d.ts` under `types`:

```js
import { decode } from '@janhapke/libraw';          // ESM named import
import libraw from '@janhapke/libraw';               // ESM default import
const { decode } = require('@janhapke/libraw');      // CommonJS
```

## API overview

### Module-level functions

Stateless, one-shot helpers — each opens its own LibRaw instance internally and cleans it up when done.
All three accept `{ signal }` (an `AbortSignal`) for cancellation.

| Function | Returns | Notes |
|---|---|---|
| `decode(buffer, options?)` | `Promise<{ width, height, colors, bits, stride, data, flip, warnings }>` | Full pipeline: open → unpack → process → copy. `options.params`/`options.rawparams` accept any key from [`docs/reference/params.md`](docs/reference/params.md) / [`rawparams.md`](docs/reference/rawparams.md). |
| `identify(buffer, options?)` | `Promise<{ sizes, idata, thumbs, decoder, warnings, metadata }>` | Open + size/metadata read only, no pixel decode — cheap. `metadata` is the full manifest-driven mirror, see [`docs/reference/metadata.md`](docs/reference/metadata.md). |
| `thumbnail(buffer, options?)` | `Promise<{ format, width, height, flip, colors, bits, data }>` | Extracts an embedded thumbnail/preview (`options.index` selects among `identify().thumbs`). `format` is `'jpeg' \| 'bitmap' \| 'bitmap16' \| 'jxl' \| 'h265' \| 'unknown'`. |
| `decodeSync(buffer, options?)` | `{ width, height, colors, bits, data }` | Legacy single-shot synchronous decode (predates `Processor`/the fused helpers). Prefer `decode()` for new code; kept for benchmarking (`{ stages: true }`) and simple scripts. Its error shape differs from `LibRawError` — see the JSDoc in `types/index.d.ts`. |
| `version()`, `versionNumber()`, `capabilities()`, `capabilityNames()`, `warningNames(mask)`, `cameraCount()`, `cameraList()` | — | Build/version/capability introspection; no LibRaw instance involved. |
| `buildInfo` | `object` | LibRaw/zlib/libjpeg-turbo versions, whether OpenMP is compiled in, compiler, flags, build date, git commit. |
| `enums` | `object` | Every enum in LibRaw's `libraw_const.h` — see [Enums and flags](#enums-and-flags) below. |
| `progressStages` | `object` | `LibRaw_progress` short stage name → numeric code, for comparing against a `progress` event's `stage`. |

### `Processor` — staged, stateful API

For callers who want to hold a decode session open across steps (inspect metadata before deciding whether
to process, extract a thumbnail without a full decode, reuse cancellation/events, ...). Extends
`EventEmitter`. Every stage has a synchronous (`*Sync`) and a Promise-returning async twin; the async twins
run on libuv's threadpool so the JS thread stays free, accept `{ signal }` for cancellation, and reject
with `LibRawError` (`name: 'ERR_LIBRAW_BUSY'`) if called while another async call on the same `Processor`
is already in flight.

```js
const { Processor } = require('@janhapke/libraw');

const proc = new Processor({ exifTags: true });
proc.on('progress', ({ stage, iteration, expected }) => console.log(stage, iteration, expected));
proc.on('dataError', ({ offset, message }) => console.warn('data error', offset, message));

const controller = new AbortController();
await proc.openBuffer(buffer, { signal: controller.signal });
proc.setParams({ use_camera_wb: true, output_bps: 16 });
await proc.unpack({ signal: controller.signal });
console.log(proc.metadata.idata.make, proc.metadata.sizes.oriented);
await proc.process();
const image = proc.imageSync();          // { width, height, colors, bits, data }
proc.recycle();                           // ready for another open*
proc.close();                             // frees the LibRaw instance
```

Staged methods: `openBufferSync`/`openBuffer`, `openFileSync`/`openFile`, `unpackSync`/`unpack`,
`unpackThumbSync`/`unpackThumb`, `processSync`/`process`, `imageSync`/`image`, `thumbSync`/`thumb`,
`adjustSizesInfoOnlySync`/`adjustSizesInfoOnly`, plus `recycle()`, `close()`, `setParams`/`getParams`,
`setRawParams`/`getRawParams`, the `metadata` getter, and read accessors (`errorCount`, `decoderInfo`,
`unpackFunctionName`, `isFujiRotated`, `isSraw`, `isNikonSraw`, `isCoolscanNef`, `isJpegThumb`,
`isFloatingPoint`, `haveFpData`, `srawMidpoint`, `color(row, col)`, `thumbOK(maxsz?)`). Full signatures and
JSDoc are generated into `types/index.d.ts`.

Cancellation: pass `{ signal }` (a standard `AbortSignal`) to any async method or module-level helper.
Aborting rejects the pending promise with a `LibRawError` (`name: 'LIBRAW_CANCELLED_BY_CALLBACK'`,
`aborted: true`); see `docs/how-to/implement-async-decode-with-cancellation.md`.

Events: `'progress'` (`{ stage, iteration, expected }`), `'dataError'` (`{ offset, message }`), and —
only when constructed with `{ exifTags: true }` — `'exifTag'` (`{ tag, type, len, ordering }`). Buffered
during the job and emitted once it settles (not delivered live).

### Parameters and metadata

`setParams`/`getParams` (LibRaw's `libraw_output_params_t`) and `setRawParams`/`getRawParams`
(`libraw_raw_unpack_params_t`) are generated from LibRaw's own header with full validation (type, array
length, enum/range checks — an unknown key throws `TypeError` naming it). Every settable field, its type,
default, and doc string: [`docs/reference/params.md`](docs/reference/params.md) and
[`docs/reference/rawparams.md`](docs/reference/rawparams.md). `decode()`/`identify()` accept the same keys
under `options.params`/`options.rawparams`.

`identify().metadata` / `Processor#metadata` mirror LibRaw's post-open state (`idata`, `sizes` including
`oriented` width/height, `other` including parsed GPS, `lens`, `color` including matrices and
`cam_mul`/`pre_mul`, and per-vendor `makernotes`). Full field reference:
[`docs/reference/metadata.md`](docs/reference/metadata.md).

### Enums and flags

Every enum in LibRaw's `libraw_const.h` (warnings, capabilities, decoder flags, raw-unpack options,
thumbnail/image formats, progress stages, error codes, colorspaces, camera-maker/mount/format indexes,
...) is extracted by `scripts/gen-enums.js` into `api/enums.json` and re-exported from the package as
`enums`, an object of named tables:

```js
const { enums, capabilityNames, warningNames, capabilities, decode } = require('@janhapke/libraw');

enums.WARN.NAME_TO_VALUE.FALLBACK_TO_AHD;        // 32768 (1 << 15)
enums.CAPS.NAME_TO_VALUE.ZLIB;                   // 64    (1 << 6)
enums.all.LibRaw_processing_options.NAME_TO_VALUE.PENTAX_PS_ALLFRAMES; // every enum, by its C type name
```

`enums.all` has one entry per C enum name (e.g. `enums.all.LibRaw_warnings`); `enums.WARN`, `enums.CAPS`,
`enums.DECODER`, `enums.RAWOPTIONS`, `enums.PROGRESS`, `enums.ERRORS`, `enums.THUMBNAIL_FORMATS`,
`enums.INTERNAL_THUMBNAIL_FORMATS`, and `enums.IMAGE_FORMATS` are short aliases for the families most
callers reach for. Each table is `{ kind: 'flags' | 'enum', NAME_TO_VALUE, VALUE_TO_NAME, VALUE_TO_NAMES }`
keyed by the *short* name — the enumerator's C name (e.g. `LIBRAW_WARN_FALLBACK_TO_AHD`) with the enum's
common `LIBRAW_..._` prefix stripped (`FALLBACK_TO_AHD`). Full listing:
[`docs/reference/enums.md`](docs/reference/enums.md).

Two convenience functions built on the CAPS/WARN tables:

- `capabilityNames()` — the short names of `capabilities()`'s set bits, e.g. `['ZLIB', 'JPEG']`.
- `warningNames(mask)` — the short names of a `LIBRAW_WARN_*` bitmask's set bits, e.g.
  `warningNames(1 << 15) === ['FALLBACK_TO_AHD']`.

`decode()`/`identify()` results carry `warnings: string[]` using these same short names (so
`LIBRAW_WARN_FALLBACK_TO_AHD` reports as `'FALLBACK_TO_AHD'`, not the full `LIBRAW_*` name).

### Errors

Every `Processor` method and every async method/fused helper throws/rejects a `LibRawError` on a
LibRaw-level failure: `code` (LibRaw's numeric error code), `name` (the `LIBRAW_*` enumerator name, e.g.
`'LIBRAW_OUT_OF_ORDER_CALL'`, or `'ERR_LIBRAW_BUSY'` for the busy guard), `stage` (which method), and
`aborted: true` only for cancellations. Argument-validation failures (wrong type, wrong-size buffer, ...)
throw a plain `TypeError`/`RangeError` instead. `decodeSync` predates `LibRawError` and keeps its own
shape — see `types/index.d.ts`'s `DecodeSyncResult` doc comment.

### Sharp interop

`sharp`'s prebuilt libvips has no LibRaw loader, so a result object's `toSharp(sharpModule)` method hands
sharp the already-decoded pixel buffer instead — the same thing sharp does internally for raw input, no
extra copy. Available on `decode()` results, `Processor#imageSync()`/`#image()` results, and thumbnail
results (`thumbnail()`, `Processor#thumbSync()`/`#thumb()`) regardless of format:

```js
import sharp from 'sharp';
import { decode } from '@janhapke/libraw';

const image = await decode(buffer, { params: { use_camera_wb: true } });
const pipeline = image.toSharp(sharp);   // sharp(image.data, { raw: { width, height, channels: colors } })
const jpeg = await pipeline.resize({ width: 1620, fit: 'inside' }).jpeg({ quality: 95 }).toBuffer();
```

For a bitmap-format thumbnail/image, `toSharp` wraps the raw pixel buffer the same way (using a
`Uint16Array` view, still no copy, for `bits === 16` — e.g. `output_bps: 16` — since sharp infers raw-input
sample depth from the buffer's typed-array class rather than an option key). For a JPEG-format thumbnail,
`toSharp` hands the JPEG bytes straight to `sharpModule(data)`, letting sharp decode them itself. This
package never `require`s `sharp` — it is an optional peer dependency
(`peerDependenciesMeta.sharp.optional: true`); `toSharp`'s type is a structural
`<S extends (input: Buffer, options?) => any>(sharp: S) => ReturnType<S>`, not sharp's own types. See
`docs/how-to/integrate-into-photoview.md` ("Sharp interop") for the full rationale.

## Building from source

Prebuilt binaries cover the platforms in `docs/reference/build-matrix.md`. To build the native addon
yourself (e.g. an unsupported platform), everything compiles inside Docker — no compiler is required on
the host:

```bash
npm run build:linux        # scripts/build-linux.sh x64 — builds scripts/linux-build.Dockerfile,
                            # compiles LibRaw/zlib/libjpeg-turbo/the addon statically inside it, and
                            # copies the stripped result to prebuilds/linux-x64/node.napi.node
```

See `docs/how-to/build-libraw-addon-in-docker.md` for what the Docker image contains and why, and
`docs/explanation/build-and-distribution-strategy.md` for the overall prebuild strategy.

## Testing

`npm test` runs the vitest suite (`test/`) against the committed synthetic PM5544 DNG fixture
(`test/fixtures/pm5544-768x576.dng` — see `test/fixtures/README.md`), no real camera files needed.

Real-camera-file tests are gated on the `LIBRAW_TEST_IMAGES` environment variable (a directory of RAW
files) and skip themselves when it is unset:

```bash
LIBRAW_TEST_IMAGES=/path/to/raw/files npm test
```

On this development machine, `/home/jan/dev/photoview/.private/testimages` is a valid value.

## License

MIT for the binding itself. Vendored/linked components carry their own licences:

- **LibRaw** — dual-licensed upstream; this package elects the **CDDL 1.0** (Common Development and
  Distribution License, Version 1.0) for the vendored copy (an alternative **GNU LGPL 2.1** election is
  also available upstream, see `vendor/LibRaw/LICENSE.LGPL`). CDDL permits static linking into this addon
  without requiring relinkability.
- **zlib** — zlib licence.
- **libjpeg-turbo** — a combination of the IJG (Independent JPEG Group) licence, the modified BSD licence
  (BSD-3-Clause), and the zlib licence.
- **libgomp** (GCC's OpenMP runtime, linked dynamically on Linux — see the note at the top of this file) —
  GPL-3 with the GCC Runtime Library Exception, which permits this use.

Full texts and per-component versions: [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) and
[`docs/explanation/licensing.md`](./docs/explanation/licensing.md).
