'use strict';

// T08: JS-side wrappers for the fused, stateless helpers (decode, identify,
// thumbnail -- src/fused.cc/.h). Same rationale as lib/processor.cjs's
// ASYNC_METHODS wrapping: the native functions reject with a plain
// Napi::Error (code numeric, librawName string, stage string, and -- only
// for the pre-aborted-signal case -- aborted: true), and every JS-visible
// caller of this package should see a LibRawError (lib/errors.cjs) instead.

const FUSED_METHODS = ['decode', 'identify', 'thumbnail'];

/**
 * @param {Record<string, (...args: unknown[]) => Promise<unknown>>} native
 * @param {typeof import('./errors.cjs').LibRawError} LibRawError
 */
function wrapFused(native, LibRawError) {
  const wrapped = {};
  for (const method of FUSED_METHODS) {
    wrapped[method] = function (...args) {
      return native[method](...args).catch((err) => {
        throw LibRawError.fromNative(err, method);
      });
    };
  }
  return wrapped;
}

module.exports = { wrapFused, FUSED_METHODS };
