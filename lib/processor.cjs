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
//
// T09: the native side now returns `{ promise, cancel }`
// (src/cancel.h's WrapPromiseWithCancel) instead of a bare Promise for
// every method in ASYNC_METHODS. `cancel` is never exposed to package
// callers -- it is wired here to the last argument's `.signal` (every async
// stage method takes its `{ signal? }` options object last: openBuffer(buf,
// opts?), unpack(opts?), unpackThumb(index?, opts?), image({ ..., signal?
// }), ...) via a one-shot 'abort' listener, removed once the job settles
// either way, and each method below still returns a plain Promise (the
// `expect(p.unpack()).toBeInstanceOf(Promise)` shape T07's tests already
// rely on is unchanged).

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
      const { promise, cancel } = this._native[method](...args);

      // The signal, if any, is always on the last argument's `.signal`
      // (Buffer/string/number arguments never carry it, so this check never
      // misfires on e.g. openBuffer(buf) or unpackThumb(0)).
      const last = args[args.length - 1];
      const signal = last && typeof last === 'object' && !Buffer.isBuffer(last) ? last.signal : undefined;

      let onAbort;
      if (signal) {
        onAbort = () => cancel();
        signal.addEventListener('abort', onAbort, { once: true });
      }
      const removeListener = () => {
        if (signal && onAbort) signal.removeEventListener('abort', onAbort);
      };

      return promise.then(
        (value) => {
          removeListener();
          return value;
        },
        (err) => {
          removeListener();
          throw LibRawError.fromNative(err, method);
        },
      );
    };
  }

  return Processor;
}

module.exports = { wrapProcessor };
