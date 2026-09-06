'use strict';

// T06: JS-side Processor class. Delegates every call to the native
// ObjectWrap instance (binding.Processor, src/processor.cc) and rethrows any
// native error as a LibRawError (lib/errors.cjs) -- the "simplest" approach
// named in the T06 task text ("C++ throws, JS Processor class in
// lib/processor.cjs delegates to the native object and rethrows as
// LibRawError"). Kept as a flat method list (not a Proxy) so each method
// name is grep-able and easy to extend with JSDoc in T15.

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

  return Processor;
}

module.exports = { wrapProcessor };
