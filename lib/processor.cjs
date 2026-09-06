'use strict';

// T06: JS-side Processor class. Delegates every call to the native
// ObjectWrap instance (binding.Processor, src/processor.cc) and rethrows any
// native error as a LibRawError (lib/errors.cjs) -- the "simplest" approach
// named in the T06 task text ("C++ throws, JS Processor class in
// lib/processor.cjs delegates to the native object and rethrows as
// LibRawError"). Kept as a flat method list (not a Proxy) so each method
// name is grep-able and easy to extend with JSDoc in T15.
//
// T07 adds the Promise-returning versions of the staged methods (same
// names, no "Sync" suffix). The native side (src/processor.cc) never throws
// synchronously for these -- every precondition/argument failure, including
// the ERR_LIBRAW_BUSY guard, is surfaced by rejecting the promise it already
// returned (see processor.cc's "Async (Promise-returning) stage methods"
// comment) -- so wrapping only needs a `.catch()`, not a try/catch.

const METHODS = [
  'openBufferSync',
  'openFileSync',
  'unpackSync',
  'unpackThumbSync',
  'processSync',
  'imageSync',
  'thumbSync',
  'adjustSizesInfoOnlySync',
  'recycle',
  'close',
  'errorCount',
  'decoderInfo',
  'unpackFunctionName',
  'isFujiRotated',
  'isSraw',
  'isNikonSraw',
  'isCoolscanNef',
  'isJpegThumb',
  'isFloatingPoint',
  'haveFpData',
  'srawMidpoint',
  'color',
  'thumbOK',
];

const ASYNC_METHODS = [
  'openBuffer',
  'openFile',
  'unpack',
  'unpackThumb',
  'process',
  'image',
  'thumb',
  'adjustSizesInfoOnly',
];

/**
 * @param {new (options?: { flags?: number }) => object} NativeProcessor
 * @param {typeof import('./errors.cjs').LibRawError} LibRawError
 */
function wrapProcessor(NativeProcessor, LibRawError) {
  class Processor {
    /** @param {{ flags?: number }} [options] */
    constructor(options) {
      this._native = new NativeProcessor(options);
    }
  }

  for (const method of METHODS) {
    Processor.prototype[method] = function (...args) {
      try {
        return this._native[method](...args);
      } catch (err) {
        throw LibRawError.fromNative(err, method);
      }
    };
  }

  for (const method of ASYNC_METHODS) {
    Processor.prototype[method] = function (...args) {
      return this._native[method](...args).catch((err) => {
        throw LibRawError.fromNative(err, method);
      });
    };
  }

  return Processor;
}

module.exports = { wrapProcessor };
