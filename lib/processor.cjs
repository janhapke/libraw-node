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
//
// T10: Processor now extends EventEmitter. Each ASYNC_METHODS call buffers
// progress/dataError/exifTag events natively during the job (src/events.h)
// and, once its promise settles (either way -- see src/async_workers.h's
// SettleCancelState), this wrapper pulls them via the native, undocumented
// `_drainEvents()` (processor.h) and emits 'progress'/'dataError'/'exifTag'
// on `this`, in order, before resolving/rejecting -- "after the job
// completes", per docs/plan/tasks.md's T10 section, not live (see that
// section: live delivery via ThreadSafeFunction is optional and, per this
// task's final report, was skipped). `exifTag` events only ever appear when
// this Processor was constructed with `{ exifTags: true }` (src/
// async_workers.h only installs that callback then). Events fire for every
// ASYNC_METHODS call, not only the ones a caller might think of as
// "decoding" (e.g. unpack() alone already emits LOAD_RAW). The *Sync
// methods do not emit events at all (T10 scopes event recording to the
// async path, matching T09's cancellation support -- see processor.h's
// pendingEvents_ comment).

const { EventEmitter } = require('node:events');

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
  class Processor extends EventEmitter {
    /** @param {{ flags?: number, exifTags?: boolean }} [options] */
    constructor(options) {
      super();
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

      // T10: drain and emit this job's buffered events (in order) before
      // resolving/rejecting -- see the class comment above.
      const emitEvents = () => {
        const events = this._native._drainEvents();
        for (const event of events) {
          if (event.kind === 'progress') {
            this.emit('progress', { stage: event.stage, iteration: event.iteration, expected: event.expected });
          } else if (event.kind === 'dataError') {
            this.emit('dataError', { offset: event.offset, message: event.message });
          } else if (event.kind === 'exifTag') {
            this.emit('exifTag', { tag: event.tag, type: event.type, len: event.len, ordering: event.ordering });
          }
        }
      };

      return promise.then(
        (value) => {
          removeListener();
          emitEvents();
          return value;
        },
        (err) => {
          removeListener();
          emitEvents();
          throw LibRawError.fromNative(err, method);
        },
      );
    };
  }

  return Processor;
}

module.exports = { wrapProcessor };
