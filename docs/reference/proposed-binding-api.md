# Proposed API of the new binding (draft for discussion)

> **Design history:** written before implementation; see [README](../../README.md) / the generated reference docs for the shipped API.

Design goals: staged and fused entry points, every call off-thread, options passed up front, one copy
out, LibRaw's own names for parameters, TypeScript-first.

```ts
import { LibRaw, identify, decode, thumbnail } from '@janhapke/libraw';

// --- fused, stateless helpers (one AsyncWorker each; recommended for photoview) ---

const info = await identify(buffer, { rawparams?: RawParams });
// info: { idata, sizes, other, lens, color, gps, makernotes: {...selected}, thumbs: ThumbInfo[],
//         decoder: { name, flags }, warnings: string[], libraw: { version, capabilities } }

const thumb = await thumbnail(buffer, { index?: number /* from info.thumbs */, signal?: AbortSignal });
// thumb: { format: 'jpeg' | 'bitmap' | 'bitmap16' | 'h265' | 'jxl', width, height, flip, data: Buffer }

const img = await decode(buffer, {
  params?: Partial<OutputParams>,       // half_size, user_qual, use_camera_wb, output_bps, cropbox, ...
  rawparams?: Partial<RawParams>,       // shot_select, options, max_raw_memory_mb, ...
  output?: { layout?: 'rgb' | 'bgr', stride?: number, into?: Buffer },  // copy_mem_image target
  signal?: AbortSignal,
  onProgress?: (stage: string, iteration: number, expected: number) => void,
});
// img: { width, height, colors: 1|3, bits: 8|16, stride, data: Buffer, flip, warnings: string[] }

// --- staged object for advanced use (multirender, inspection) ---

const raw = new LibRaw({ flags?: number });
await raw.open(buffer | path, { rawparams? });      // open_buffer / open_file
raw.metadata                                        // sync accessors after open
raw.thumbs                                          // ThumbInfo[]
await raw.unpackThumb(index?)                       // → ThumbResult
await raw.unpack({ signal? })                       // unpack()
raw.params = { ...partial }                         // setter validates & assigns (may re-process later)
await raw.process({ signal?, onProgress? })         // dcraw_process (re-callable after params change)
await raw.image({ output? })                        // copy_mem_image into V8 buffer
await raw.writePpmTiff(path); await raw.writeThumb(path);
raw.errorCount(); raw.warnings; raw.decoderInfo(); raw.isFujiRotated(); raw.color(row, col);
raw.recycle(); raw.close();                          // recycle(); close() also frees the object

// --- static ---
LibRaw.version; LibRaw.versionNumber; LibRaw.capabilities; LibRaw.cameraList(); LibRaw.buildInfo;
```

Rules:

- A `LibRaw` object accepts one in-flight async call at a time; a second call rejects with
  `ERR_LIBRAW_BUSY` rather than queueing (queueing hides bugs; callers that need queues have them).
- Errors are `LibRawError { code: number, name: 'LIBRAW_IO_ERROR' | ..., stage, message }`.
- Output buffers are always V8-allocated (`Napi::Buffer::New(env, n)`), filled by `copy_mem_image`. `into`
  lets a caller reuse a buffer (size checked).
- No image encoding in v1 (return raw RGB; `sharp` encodes). Open question 2 in the roadmap covers adding a
  libjpeg-turbo JPEG encode for thumbnails.
- Parameter keys are LibRaw's C names. A generated `docs/params.md` and `.d.ts` come from a JSON manifest
  of `libraw_output_params_t` and `libraw_raw_unpack_params_t`.

> **Correction (T06):** the class here is called `Processor`, not `LibRaw` (the `LibRaw` name in this
> sketch collides with the vendored C++ class it wraps). All zero-argument introspection calls
> (`errorCount`, `decoderInfo`, `unpackFunctionName`, `isFujiRotated`, `isSraw`, `isNikonSraw`,
> `isCoolscanNef`, `isJpegThumb`, `isFloatingPoint`, `haveFpData`, `srawMidpoint`) are implemented as
> methods (`raw.errorCount()`, not `raw.errorCount`), not accessors -- consistent with the two-argument
> and optional-argument members in the same group (`color(row, col)`, `thumbOK(maxsz?)`) and with the
> native `Napi::ObjectWrap` exposing every one of them as an `InstanceMethod`. `raw.metadata`/`raw.thumbs`/
> `raw.warnings` (true data, not LibRaw method calls) remain properties once implemented (T08/T14a).

> **Correction (T09):** there is no `raw.abort()` method -- the sketch's `raw.abort();` line above was
> removed. Every Promise-returning `Processor` method already accepts `{ signal? }` (its last argument;
> `image()` folds it into its existing options object) and is cancelled the normal `AbortController`/
> `AbortSignal` way: `const controller = new AbortController(); const p = raw.unpack({ signal:
> controller.signal }); controller.abort();`. Internally the native side returns `{ promise, cancel }`
> (`src/cancel.h`) and `lib/processor.cjs` wires `cancel` to the `signal` itself, but that is never
> JS-visible -- `raw.unpack(...)` still returns a plain `Promise`, exactly as sketched above. A cancelled
> call rejects with `LibRawError { code: -100010, name: 'LIBRAW_CANCELLED_BY_CALLBACK', stage, aborted:
> true }`, same shape whether the signal was already aborted before the call or fired mid-flight.
>
> A cancelled stage leaves `Processor`'s underlying LibRaw instance in a state that is not necessarily
> safe to keep decoding through (LibRaw's own decoders/demosaic loops can be interrupted mid-loop, with
> `imgdata`/`rawdata` partially mutated -- see `docs/how-to/implement-async-decode-with-cancellation.md`
> §3 for exactly which stages actually get interrupted and how). So: **the next call that would advance or
> re-run a stage (`unpack`, `unpackThumb`, `process`, `image`, `thumb`, `adjustSizesInfoOnly`, and every
> zero-argument introspection method that requires "opened", such as `errorCount()`/`decoderInfo()`/
> `color()`) throws/rejects `LIBRAW_OUT_OF_ORDER_CALL` after a cancelled stage, until `recycle()`,
> `close()`, or a fresh `open()`/`openBuffer()`/`openFile()` call** (those three are the only calls exempt
> -- `recycle()`/`close()` clear the condition, and `open*` resets the object's state anyway). This applies
> even to retrying the *same* stage that was cancelled, not just to advancing further.

> **Correction (T12):** `raw.params = { ...partial }` in the sketch above is not how parameter assignment
> actually works -- there is no plain-property setter. `Processor` instead gets four methods, generated
> from `api/params.json` (`src/params.h`, `src/generated/params.gen.cc`, `scripts/gen-params-cc.js`):
> `setParams(partial)` / `getParams()` for `imgdata.params` (`libraw_output_params_t`) and
> `setRawParams(partial)` / `getRawParams()` for `imgdata.rawparams` (`libraw_raw_unpack_params_t`). Both
> setters validate every key against the manifest (unknown key -> `TypeError` naming it and listing the
> supported keys; wrong JS type -> `TypeError`; wrong array length, an enum value outside its allowed set,
> a number outside its `min`/`max`, or an unknown `flags` name -> `RangeError`; a field annotated
> `unsupported` in `api/params.json`, currently only `rawparams.custom_camera_strings` -> `TypeError`). A
> `flags`-typed field (e.g. `rawparams.options`) accepts either a plain number or an array of
> `LIBRAW_*` flag-name strings, OR'd together. The getters return every manifest field of the struct with
> its current value (bools as booleans, enums/flags as numbers, arrays as arrays, strings as strings or
> `null`).
>
> State rule, enforced by the same `LIBRAW_OUT_OF_ORDER_CALL` state machine as the rest of `Processor`:
> **`setRawParams` is only allowed before the Processor has been opened** (rawparams affects raw parsing
> LibRaw does at `open_buffer()`/`open_file()`/`unpack()` time; a change after `opened_` would be silently
> ignored by LibRaw), and **`setParams` is only allowed before `process()`/`processSync()` has run** (params
> are only read by `dcraw_process()`; T12 does not support re-running `process()` with updated params). Both
> reset to "allowed again" after `recycle()`, `close()`, or a fresh `open*()` call, matching the cancellation
> rule above. `getParams()`/`getRawParams()` have no such restriction -- they read `imgdata.params`/
> `imgdata.rawparams`, which are valid (zero-/default-initialised) in every state short of `close()`d.
>
> The fused `decode(buffer, { params?, rawparams? })` and `identify(buffer, { rawparams? })` helpers apply
> `params`/`rawparams` the same validated way, on the JS thread, before their worker starts -- `rawparams`
> first, then `params`, matching the ordering rule above.
