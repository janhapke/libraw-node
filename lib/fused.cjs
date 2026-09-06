'use strict';

// T08: JS-side wrappers for the fused, stateless helpers (decode, identify,
// thumbnail -- src/fused.cc/.h). Same rationale as lib/processor.cjs's
// ASYNC_METHODS wrapping: the native functions reject with a plain
// Napi::Error (code numeric, librawName string, stage string, and -- only
// for the pre-aborted-signal case -- aborted: true), and every JS-visible
// caller of this package should see a LibRawError (lib/errors.cjs) instead.
//
// T09: the native functions now return `{ promise, cancel }`
// (src/cancel.h's WrapPromiseWithCancel) instead of a bare Promise. `cancel`
// is never exposed to package callers -- it is wired here to the `signal`
// option (always the second, options, argument -- decode/identify/
// thumbnail all take `(buffer, options?)`) via a one-shot 'abort' listener,
// removed as soon as the job settles either way, and every method below
// still returns a plain Promise, matching its pre-T09 signature.

const FUSED_METHODS = ['decode', 'identify', 'thumbnail'];

/**
 * @param {Record<string, (...args: unknown[]) => { promise: Promise<unknown>, cancel: () => void }>} native
 * @param {typeof import('./errors.cjs').LibRawError} LibRawError
 */
function wrapFused(native, LibRawError) {
  const wrapped = {};
  for (const method of FUSED_METHODS) {
    wrapped[method] = function (...args) {
      const { promise, cancel } = native[method](...args);
      const opts = args[1];
      const signal = opts && typeof opts === 'object' ? opts.signal : undefined;

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
  return wrapped;
}

module.exports = { wrapFused, FUSED_METHODS };
