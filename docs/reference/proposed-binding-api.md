# Proposed API of the new binding (draft for discussion)

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
raw.errorCount; raw.warnings; raw.decoderInfo; raw.isFujiRotated(); raw.color(row, col);
raw.abort();                                         // setCancelFlag on the in-flight worker
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
