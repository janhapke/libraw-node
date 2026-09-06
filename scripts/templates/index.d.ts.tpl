// Public TypeScript surface of @janhapke/libraw.
//
// This is a *template*: scripts/gen-types.js splices the manifest-derived
// sections at the four `/*GEN:...*/` markers below and writes the result to
// types/index.d.ts (banner prepended there, not here). Edit this file for
// every hand-written declaration -- everything below is typed straight off
// the actual runtime source, not aspirational:
//   - Result/option shapes: src/fused.cc (decode/identify/thumbnail),
//     src/processor.cc (Processor's sync/async methods + the `metadata`
//     getter), src/addon.cc (decodeSync, buildInfo, version/versionNumber/
//     capabilities/cameraCount/cameraList/hello/napiVersion), src/events.h
//     (progress/dataError/exifTag event payloads), src/image_format.cc
//     (the *three independent* format-name string sets -- see the comment
//     above ImageFormatType below, do not reuse one for another).
//   - lib/index.cjs: which native properties are re-exported as-is
//     (hello, napiVersion, version, versionNumber, capabilities,
//     cameraCount, cameraList, buildInfo, decodeSync, decode, identify,
//     thumbnail) vs. wrapped (Processor, LibRawError, capabilityNames,
//     warningNames, enums, progressStages).
//   - lib/processor.cjs / lib/fused.cjs / lib/errors.cjs: the
//     LibRawError-throwing wrapping, the `{ signal? }` cancellation
//     option on every async method/helper, and fused helpers' JS-side-only
//     `onProgress`/`onDataError` callback options (Processor has no
//     callback-option equivalent -- its events arrive via the EventEmitter
//     interface once a job settles, see T10's docs/plan/tasks.md section).
//
// Regenerate after editing: `npm run gen:types`. `npm run gen:check` fails
// if types/index.d.ts no longer matches what this template + the manifests
// produce.

import { EventEmitter } from 'node:events';

/*GEN:ENUMS*/

// --- format-name string sets (src/image_format.cc) --------------------------
//
// These three are *hand-written* literal C++ switches, independent of both
// each other and of the libraw_const.h-derived `ImageFormatName`/
// `ThumbnailFormatName`/`InternalThumbnailFormatName` aliases generated
// above (those name enums.json tables for LibRaw_image_formats/
// LibRaw_thumbnail_formats/LibRaw_internal_thumbnail_formats, which use
// different strings and are not what any result field below actually
// carries) -- see src/image_format.h's header comment for why there are
// three of them.

/** `Processor#thumbSync()`/`#thumb()`'s `type` field (src/image_format.cc's ImageFormatName). */
export type ImageFormatType = 'jpeg' | 'bitmap' | 'jpegxl' | 'h265' | 'unknown';

/** The fused `thumbnail()` helper's `format` field (src/image_format.cc's ThumbnailResultFormatName) -- splits LIBRAW_IMAGE_BITMAP into 'bitmap'/'bitmap16' by bit depth and spells LIBRAW_IMAGE_JPEGXL 'jxl', not 'jpegxl'. */
export type ThumbnailResultFormat = 'jpeg' | 'bitmap' | 'bitmap16' | 'jxl' | 'h265' | 'unknown';

/** `identify()`'s `thumbs[].tformat` (src/image_format.cc's InternalThumbnailFormatName, `enum LibRaw_internal_thumbnail_formats`'s own numbering -- distinct from both `ImageFormatType` and `ThumbnailResultFormat` above). */
export type InternalThumbnailFormat =
  | 'kodak_thumb'
  | 'kodak_ycbcr'
  | 'kodak_rgb'
  | 'jpeg'
  | 'layer'
  | 'rollei'
  | 'ppm'
  | 'ppm16'
  | 'x3f'
  | 'dng_ycbcr'
  | 'jpegxl'
  | 'unknown';

/*GEN:PARAMS*/

/*GEN:RAWPARAMS*/

/*GEN:METADATA*/

// --- events (src/events.h's JobEvent, via EventsToArray) --------------------

/** `Processor` 'progress' event / a fused helper's `onProgress` callback payload. */
export interface ProgressEvent {
  readonly stage: ProgressStageName;
  readonly iteration: number;
  readonly expected: number;
}

/** `Processor` 'dataError' event / a fused helper's `onDataError` callback payload. */
export interface DataErrorEvent {
  /** The data_callback's own offset argument; -1 for an EOF condition. */
  readonly offset: number;
  /** The file name LibRaw reported, or "data error" if it reported none. */
  readonly message: string;
}

/** `Processor` 'exifTag' event payload -- only fires when constructed with `{ exifTags: true }`. */
export interface ExifTagEvent {
  /**
   * Not a bare EXIF/TIFF tag number in general -- the call site ORs the real
   * tag into the low 16 bits with an IFD/GPS marker in the high bits.
   * `tag & 0xffff` recovers the plain tag number for an ordinary TIFF/DNG IFD.
   */
  readonly tag: number;
  readonly type: number;
  readonly len: number;
  readonly ordering: number;
}

// --- result shapes ------------------------------------------------------------

/** `decode()`'s resolved value (src/fused.cc's DecodeWorker::OnOK). */
export interface DecodeResult {
  readonly width: number;
  readonly height: number;
  readonly colors: number;
  readonly bits: number;
  readonly stride: number;
  readonly data: Buffer;
  readonly flip: number;
  /** Short `LIBRAW_WARN_*` names accumulated during this decode (see `enums.WARN`). */
  readonly warnings: readonly WarningName[];
}

/** One entry of `identify()`'s `thumbs` array (src/fused.cc's IdentifyWorker::OnOK, `imgdata.thumbs_list`). */
export interface ThumbsListEntry {
  readonly tformat: InternalThumbnailFormat;
  readonly twidth: number;
  readonly theight: number;
  readonly tflip: number;
  readonly tlength: number;
  readonly tmisc: number;
}

/** `identify()`'s `decoder` field -- note the key names differ from `Processor#decoderInfo()`'s `DecoderInfo` below. */
export interface IdentifyDecoderInfo {
  readonly name: string | null;
  readonly flags: number;
}

/** `identify()`'s resolved value (src/fused.cc's IdentifyWorker::OnOK). */
export interface IdentifyResult {
  readonly sizes: ImageSizes;
  readonly idata: Iparams;
  readonly thumbs: readonly ThumbsListEntry[];
  readonly decoder: IdentifyDecoderInfo;
  readonly warnings: readonly WarningName[];
  readonly metadata: Metadata;
}

/** The fused `thumbnail()` helper's resolved value (src/fused.cc's ThumbnailWorker::OnOK). */
export interface ThumbnailResult {
  readonly format: ThumbnailResultFormat;
  readonly width: number;
  readonly height: number;
  readonly flip: number;
  readonly colors: number;
  readonly bits: number;
  readonly data: Buffer;
}

/** `Processor#imageSync()`/`#image()`'s resolved value (src/processor.cc). */
export interface ImageResult {
  readonly width: number;
  readonly height: number;
  readonly colors: number;
  readonly bits: number;
  readonly data: Buffer;
}

/** `Processor#thumbSync()`/`#thumb()`'s resolved value (src/processor.cc). */
export interface ThumbResult {
  readonly type: ImageFormatType;
  readonly width: number;
  readonly height: number;
  readonly colors: number;
  readonly bits: number;
  readonly data: Buffer;
}

/** `Processor#decoderInfo()`'s return value -- note the key names differ from `identify()`'s `IdentifyDecoderInfo` above. */
export interface DecoderInfo {
  readonly decoder_name: string | null;
  /** Raw `LibRaw_decoder_flags` bitmask -- decode short names via `enums.DECODER`. */
  readonly decoder_flags: number;
}

// --- options ------------------------------------------------------------------

/** `decode()`'s `output` option (copy_mem_image target). */
export interface DecodeOutputOptions {
  /** @default 'rgb' */
  layout?: 'rgb' | 'bgr';
  /** Row stride in bytes; default is `width * colors * (bits / 8)`. */
  stride?: number;
  /** Caller-supplied output buffer; must be at least the required size or a RangeError is thrown. */
  into?: Buffer;
}

/** Options for the fused `decode()` helper (src/fused.cc's Decode, lib/fused.cjs). */
export interface DecodeOptions {
  params?: OutputParams;
  rawparams?: RawParams;
  output?: DecodeOutputOptions;
  signal?: AbortSignal;
  /** JS-side only (lib/fused.cjs) -- invoked once per buffered event, after the job settles, not live. */
  onProgress?: (event: ProgressEvent) => void;
  /** JS-side only (lib/fused.cjs) -- invoked once per buffered event, after the job settles, not live. */
  onDataError?: (event: DataErrorEvent) => void;
}

/** Options for the fused `identify()` helper. */
export interface IdentifyOptions {
  rawparams?: RawParams;
  signal?: AbortSignal;
  onProgress?: (event: ProgressEvent) => void;
  onDataError?: (event: DataErrorEvent) => void;
}

/** Options for the fused `thumbnail()` helper. */
export interface ThumbnailOptions {
  /** Index into `identify()`'s `thumbs` array; defaults to LibRaw's own `unpack_thumb()` choice. */
  index?: number;
  signal?: AbortSignal;
  onProgress?: (event: ProgressEvent) => void;
  onDataError?: (event: DataErrorEvent) => void;
}

/** `new Processor(options)` (src/processor.cc's ParseFlags/ParseExifTags). */
export interface ProcessorOptions {
  /**
   * Raw `LibRaw_constructor_flags` bitmask (a plain number only -- unlike
   * `RawParams`'s flags fields, this one does not accept an array of flag
   * names). Build it from `enums.all.LibRaw_constructor_flags.NAME_TO_VALUE`
   * if needed.
   */
  flags?: number;
  /** Installs the exif-tag callback so 'exifTag' events are recorded (T10). @default false */
  exifTags?: boolean;
}

/** Trailing options object accepted by every `Processor` async stage method. */
export interface ProcessorAsyncOptions {
  signal?: AbortSignal;
}

/** `Processor#imageSync()`/`#image()`'s options. */
export interface ProcessorImageOptions {
  into?: Buffer;
  /** @default false (rgb) */
  bgr?: boolean;
  /** Row stride in bytes; default is `width * colors * (bits / 8)`. */
  stride?: number;
}

/** `Processor#image()`'s options (ProcessorImageOptions plus cancellation). */
export interface ProcessorImageAsyncOptions extends ProcessorImageOptions {
  signal?: AbortSignal;
}

/** `decodeSync()`'s options (src/addon.cc's DecodeSync -- the legacy, single-shot decode path). */
export interface DecodeSyncOptions {
  /** @default false */
  half_size?: boolean;
  /** -1 (the default) leaves LibRaw's own default quality in place. */
  user_qual?: number;
  /** @default true */
  use_camera_wb?: boolean;
  /** Adds per-stage millisecond timings to the result. @default false */
  stages?: boolean;
}

/** Per-stage millisecond timings, present on `decodeSync()`'s result iff `{ stages: true }` was passed. */
export interface DecodeSyncStages {
  readonly open: number;
  readonly unpack: number;
  readonly process: number;
  readonly copy: number;
}

/**
 * `decodeSync()`'s return value. Note: on failure, `decodeSync` throws a
 * plain `Error` with a *string* `code` property (e.g. `"LIBRAW_IO_ERROR"`),
 * predating and distinct from `LibRawError` (whose `code` is numeric) --
 * see lib/errors.cjs's header comment. Every other error path in this
 * package throws/rejects a `LibRawError`.
 */
export interface DecodeSyncResult {
  readonly width: number;
  readonly height: number;
  readonly colors: number;
  readonly bits: number;
  readonly data: Buffer;
  readonly stages?: DecodeSyncStages;
}

// --- buildInfo ------------------------------------------------------------

/** `buildInfo` (src/addon.cc's MakeBuildInfo, from the CMake-generated build_info.h). */
export interface BuildInfo {
  readonly libraw: string;
  readonly zlib: string;
  readonly libjpegTurbo: string;
  /** Whether LibRaw was compiled with `-fopenmp` (parallel PPG/AHD/DHT/AAHD demosaic). */
  readonly openmp: boolean;
  /** `"<CMAKE_CXX_COMPILER_ID> <CMAKE_CXX_COMPILER_VERSION>"`, e.g. `"GNU 14.2.1"`. */
  readonly compiler: string;
  /** The full compiler flags string the addon was built with, space-separated. */
  readonly flags: string;
  readonly buildDate: string;
  readonly gitCommit: string;
}

// --- errors -----------------------------------------------------------------

/**
 * Thrown by every `Processor` method and rejected by every async
 * method/fused helper on a LibRaw-level failure (lib/errors.cjs). Argument
 * validation failures (wrong type, wrong-size buffer, ...) throw/reject a
 * plain `TypeError`/`RangeError` instead -- not a `LibRawError` -- see
 * lib/errors.cjs's `fromNative` header comment.
 */
export class LibRawError extends Error {
  constructor(
    message: string,
    details?: { code?: number; name?: string; stage?: string; aborted?: boolean },
  );
  /** LibRaw's own numeric error code, or `LibRawError.ERR_LIBRAW_BUSY_CODE` for the busy guard. `undefined` only if constructed without one. */
  readonly code: number | undefined;
  /** The `LIBRAW_*` enumerator name (e.g. `"LIBRAW_OUT_OF_ORDER_CALL"`), `"ERR_LIBRAW_BUSY"`, or `"LibRawError"` as a last resort -- *not* the JS class name. */
  readonly name: string;
  /** The method/helper name the error occurred in (e.g. `"unpack"`, `"decode"`). */
  readonly stage: string | undefined;
  /** `true` only for a cancellation (an already-aborted or mid-call-aborted `signal`); otherwise absent, never `false`. */
  readonly aborted?: true;
  /** Numeric code of the `ERR_LIBRAW_BUSY` guard error (a second concurrent call on the same `Processor`). */
  static readonly ERR_LIBRAW_BUSY_CODE: number;
}

// --- Processor ----------------------------------------------------------------

/**
 * Stateful, long-lived wrapper around one `LibRaw` instance (src/processor.cc/.h,
 * lib/processor.cjs). Accepts one in-flight async call at a time -- a second
 * call while one is pending rejects with `LibRawError.ERR_LIBRAW_BUSY_CODE`.
 * Emits 'progress' / 'dataError' / 'exifTag' after each async call settles
 * (buffered during the call, not delivered live -- see T10's docs/plan/tasks.md
 * section); the `*Sync` methods emit nothing.
 */
export class Processor extends EventEmitter {
  constructor(options?: ProcessorOptions);

  // --- input ---
  openBufferSync(buffer: Buffer): void;
  openFileSync(path: string): void;
  openBuffer(buffer: Buffer, options?: ProcessorAsyncOptions): Promise<void>;
  openFile(path: string, options?: ProcessorAsyncOptions): Promise<void>;

  // --- decode pipeline ---
  unpackSync(): void;
  unpackThumbSync(index?: number): void;
  processSync(): void;
  adjustSizesInfoOnlySync(): void;
  unpack(options?: ProcessorAsyncOptions): Promise<void>;
  unpackThumb(index?: number, options?: ProcessorAsyncOptions): Promise<void>;
  unpackThumb(options?: ProcessorAsyncOptions): Promise<void>;
  process(options?: ProcessorAsyncOptions): Promise<void>;
  adjustSizesInfoOnly(options?: ProcessorAsyncOptions): Promise<void>;

  // --- output ---
  imageSync(options?: ProcessorImageOptions): ImageResult;
  thumbSync(): ThumbResult;
  image(options?: ProcessorImageAsyncOptions): Promise<ImageResult>;
  thumb(options?: ProcessorAsyncOptions): Promise<ThumbResult>;

  // --- lifecycle ---
  /** Resets to the pre-open state (same instance, ready for a fresh open*Sync/open*). */
  recycle(): void;
  /** Idempotent; frees the underlying LibRaw instance. Every other method throws LIBRAW_OUT_OF_ORDER_CALL afterwards. */
  close(): void;

  // --- introspection (require an opened instance; `color`/`getParams`/`getRawParams` have their own narrower state rules -- see src/processor.cc) ---
  errorCount(): number;
  decoderInfo(): DecoderInfo;
  /** Read-only snapshot of `imgdata` after open (idata/sizes/other/lens/color/makernotes.*). Throws before opening. */
  readonly metadata: Metadata;
  unpackFunctionName(): string | null;
  isFujiRotated(): boolean;
  isSraw(): boolean;
  isNikonSraw(): boolean;
  isCoolscanNef(): boolean;
  isJpegThumb(): boolean;
  isFloatingPoint(): boolean;
  haveFpData(): boolean;
  srawMidpoint(): number;
  /** Requires `unpack()`/`unpackSync()` to have run. */
  color(row: number, col: number): number;
  thumbOK(maxsz?: number): number;

  // --- parameters (T12) ---
  /** Allowed until `process()`/`processSync()` has run; throws LIBRAW_OUT_OF_ORDER_CALL after. */
  setParams(params: OutputParams): void;
  /** Allowed only before opening; throws LIBRAW_OUT_OF_ORDER_CALL once opened. */
  setRawParams(rawparams: RawParams): void;
  getParams(): Required<OutputParams>;
  getRawParams(): Required<RawParams>;

  // --- events ---
  on(event: 'progress', listener: (event: ProgressEvent) => void): this;
  on(event: 'dataError', listener: (event: DataErrorEvent) => void): this;
  on(event: 'exifTag', listener: (event: ExifTagEvent) => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  once(event: 'progress', listener: (event: ProgressEvent) => void): this;
  once(event: 'dataError', listener: (event: DataErrorEvent) => void): this;
  once(event: 'exifTag', listener: (event: ExifTagEvent) => void): this;
  once(event: string | symbol, listener: (...args: any[]) => void): this;
  off(event: 'progress', listener: (event: ProgressEvent) => void): this;
  off(event: 'dataError', listener: (event: DataErrorEvent) => void): this;
  off(event: 'exifTag', listener: (event: ExifTagEvent) => void): this;
  off(event: string | symbol, listener: (...args: any[]) => void): this;
}

// --- module functions and values ---------------------------------------------

/** Fused, stateless helper: open + unpack + process + copy in one call, its own LibRaw instance (src/fused.cc). */
export function decode(buffer: Buffer, options?: DecodeOptions): Promise<DecodeResult>;
/** Fused, stateless helper: open + adjust_sizes_info_only, full metadata mirror, its own LibRaw instance. */
export function identify(buffer: Buffer, options?: IdentifyOptions): Promise<IdentifyResult>;
/** Fused, stateless helper: open + unpack_thumb + dcraw_make_mem_thumb, its own LibRaw instance. */
export function thumbnail(buffer: Buffer, options?: ThumbnailOptions): Promise<ThumbnailResult>;

/**
 * Legacy single-shot synchronous decode (predates `Processor`/the fused
 * helpers -- T04). Prefer `decode()` or `Processor` for new code; kept for
 * benchmarking (`{ stages: true }`) and simple scripts. See
 * `DecodeSyncResult`'s doc comment for its distinct error shape.
 */
export function decodeSync(buffer: Buffer, options?: DecodeSyncOptions): DecodeSyncResult;

export function version(): string;
export function versionNumber(): number;
/** Raw `LibRaw_runtime_capabilities` bitmask; decode short names via `capabilityNames()` or `enums.CAPS`. */
export function capabilities(): number;
/** Short names of `capabilities()`'s set bits, e.g. `['ZLIB', 'JPEG']`. */
export function capabilityNames(): readonly CapabilityName[];
/** Short names of a `LIBRAW_WARN_*` bitmask's set bits, e.g. `warningNames(1 << 15) => ['FALLBACK_TO_AHD']`. */
export function warningNames(mask: number): readonly WarningName[];
export function cameraCount(): number;
export function cameraList(): readonly string[];

/** Diagnostic addon self-check; always returns `"ok"`. */
export function hello(): string;
/** The Node-API version this addon was compiled against (not the host runtime's maximum supported version). */
export const napiVersion: number;

export const buildInfo: BuildInfo;

/** `LibRaw_progress` short stage name -> numeric code (scripts/gen-progress.js). Compare a 'progress' event's `stage` against this, or look up LibRaw's own numeric constant. */
export const progressStages: { readonly [K in ProgressStageName]: number };

/** Every enum in `libraw_const.h`, plus short documented aliases -- see README.md's "Enums and flags" section. */
export const enums: LibRawEnums;
