'use strict';

// T16: toSharp(sharpModule) -- attached as a non-enumerable method on result
// objects that carry a pixel buffer sharp can consume directly, so a caller
// that already holds its own `sharp` module (this package never `require`s
// it; this package declares no dependency on sharp at all, not even an
// optional peer one, so forks such as @janhapke/sharp-electron work unchanged) can turn a decode()/image() bitmap or a thumbnail
// into a `sharp()` pipeline with no extra copy beyond the one LibRaw already
// made into the returned Buffer. See docs/how-to/integrate-into-photoview.md
// ("Sharp interop") for the rationale: sharp's prebuilt libvips has no
// LibRaw loader, so handing it the already-decoded RGB buffer is the only
// path, and it is the same thing sharp does internally for raw input.
//
// Two shapes of source data reach here:
//   - Raw pixels (decode() results, Processor.image()/imageSync() results,
//     and bitmap-format thumbnails): sharp's `raw` input option
//     (node_modules/sharp/lib/index.d.ts's `CreateRaw`) takes width/height/
//     channels but, as of sharp 0.32-0.35, carries no `depth` key at all --
//     sharp infers the sample depth from the JS *typed-array class* of the
//     input itself (sharp/dist/input.cjs's constructor switch: `Uint8Array`
//     -> `uchar`, `Uint16Array` -> `ushort`, ..., anything else -> `uchar`).
//     A plain `Buffer` (a `Uint8Array` subclass) is therefore always read as
//     8-bit even when the underlying bytes are 16-bit samples and a `{
//     raw: { depth: 'ushort' } }` option is passed -- verified against the
//     peer-range sharp version: it silently truncates to the low byte of
//     each sample instead of erroring. For `bits === 16` (`output_bps: 16`)
//     data, this module instead wraps the *same* bytes in a `Uint16Array`
//     view (no copy) so sharp's own type-based inference reads it as
//     16-bit.
//   - JPEG-encoded pixels (JPEG-format thumbnails): sharp decodes the JPEG
//     itself, so the buffer is handed to `sharpModule(data)` with no `raw`
//     option at all.
//
// Attached via Object.defineProperty (enumerable: false) rather than a
// plain assignment so `Object.keys(result)`/JSON.stringify/structuredClone
// of a decode()/image()/thumbnail() result are unaffected by this
// convenience -- the result stays exactly the documented data shape.

/**
 * @param {{ width: number, height: number, colors: number, bits: number, data: Buffer }} result
 * @returns {(sharpModule: (input: Buffer, options?: unknown) => unknown) => unknown}
 */
function makeRawToSharp(result) {
  return function toSharp(sharpModule) {
    const raw = { width: result.width, height: result.height, channels: result.colors };
    // See the header comment: sharp infers raw-input depth from the typed
    // array class, not from a `raw.depth` option, so 16-bit data needs a
    // Uint16Array view (same underlying bytes, no copy) rather than the
    // plain Buffer.
    const data =
      result.bits === 16
        ? new Uint16Array(result.data.buffer, result.data.byteOffset, result.data.length / 2)
        : result.data;
    return sharpModule(data, { raw });
  };
}

/**
 * @param {{ data: Buffer }} result
 * @returns {(sharpModule: (input: Buffer, options?: unknown) => unknown) => unknown}
 */
function makeJpegToSharp(result) {
  return function toSharp(sharpModule) {
    return sharpModule(result.data);
  };
}

function define(result, fn) {
  Object.defineProperty(result, 'toSharp', {
    value: fn,
    enumerable: false,
    writable: true,
    configurable: true,
  });
  return result;
}

/**
 * decode()/Processor.image()/imageSync() results: always raw pixels.
 */
function attachRawToSharp(result) {
  return define(result, makeRawToSharp(result));
}

/**
 * Thumbnail-shaped results (thumbnail()'s `format`, Processor.thumb()/
 * thumbSync()'s `type`): dispatches on that field at call time (not at
 * attach time), since the same helper wraps every thumbnail() result
 * regardless of format. `bitmap`/`bitmap16` use the raw path; `jpeg` uses
 * the JPEG path (sharp/libvips decodes it); every other format (`jxl`,
 * `jpegxl`, `h265`, `unknown`) has no raw pixels and is not a format this
 * helper hands to sharp, so calling `toSharp()` on one throws a descriptive
 * `TypeError` instead of silently producing a broken sharp pipeline.
 *
 * @param {Record<string, unknown>} result
 * @param {string} formatKey the property name holding the format string
 *   ('format' for thumbnail(), 'type' for Processor.thumb()/thumbSync())
 */
function attachThumbnailToSharp(result, formatKey) {
  return define(result, function toSharp(sharpModule) {
    const format = result[formatKey];
    if (format === 'bitmap' || format === 'bitmap16') {
      return makeRawToSharp(result)(sharpModule);
    }
    if (format === 'jpeg') {
      return makeJpegToSharp(result)(sharpModule);
    }
    throw new TypeError(
      `toSharp() cannot convert a '${format}' thumbnail: it is neither a raw bitmap nor a JPEG, so sharp cannot decode it from this buffer alone`,
    );
  });
}

module.exports = { attachRawToSharp, attachThumbnailToSharp };
