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
//
// T10: each native function also attaches this job's buffered
// progress/dataError events (src/events.h) to the resolved result object /
// rejected error, as an `events` array property (src/fused.cc's
// AttachEvents) -- "Fused helpers accept onProgress and onDataError
// callbacks" (docs/plan/tasks.md's T10 "Do" list). This wrapper pulls that
// array off (either way -- a truncated/corrupt input can raise dataError
// events *and* still end in rejection), invokes `onProgress`/`onDataError`
// from it in order, deletes the `events` property (never part of the
// public result/error shape), then resolves/rejects as before. Delivered
// once the job has fully settled, not live -- see lib/processor.cjs's
// matching comment for why (ThreadSafeFunction live delivery was skipped).

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
      const onProgress = opts && typeof opts === 'object' ? opts.onProgress : undefined;
      const onDataError = opts && typeof opts === 'object' ? opts.onDataError : undefined;

      let onAbort;
      if (signal) {
        onAbort = () => cancel();
        signal.addEventListener('abort', onAbort, { once: true });
      }
      const removeListener = () => {
        if (signal && onAbort) signal.removeEventListener('abort', onAbort);
      };

      // Pulls `events` off `container` (a resolved result object, or a
      // rejected error), deletes the property, and invokes
      // onProgress/onDataError from it in order.
      const deliverEvents = (container) => {
        if (!container || typeof container !== 'object') return;
        const events = container.events;
        delete container.events;
        if (!Array.isArray(events)) return;
        for (const event of events) {
          if (event.kind === 'progress' && typeof onProgress === 'function') {
            onProgress({ stage: event.stage, iteration: event.iteration, expected: event.expected });
          } else if (event.kind === 'dataError' && typeof onDataError === 'function') {
            onDataError({ offset: event.offset, message: event.message });
          }
        }
      };

      return promise.then(
        (value) => {
          removeListener();
          deliverEvents(value);
          return value;
        },
        (err) => {
          removeListener();
          deliverEvents(err);
          throw LibRawError.fromNative(err, method);
        },
      );
    };
  }
  return wrapped;
}

module.exports = { wrapFused, FUSED_METHODS };
