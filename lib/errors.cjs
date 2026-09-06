'use strict';

// T06: LibRawError, the JS-visible error class for the Processor object API
// (docs/reference/proposed-binding-api.md: "Errors are
// LibRawError { code: number, name: 'LIBRAW_IO_ERROR' | ..., stage, message }").
//
// The native Processor methods (src/processor.cc) throw a plain Napi::Error
// with `code` (number), `librawName` (string, e.g. "LIBRAW_IO_ERROR") and
// `stage` (string) properties set (src/errors.cc's ThrowProcessorError) --
// lib/processor.cjs catches those and rewraps them here via
// LibRawError.fromNative(). Note this is a *different* shape from
// decodeSync's own error (test/decode-sync.test.ts, predates this class and
// unchanged by T06): decodeSync's thrown Error has a *string* `code`
// property and is not a LibRawError instance.
//
// T07 adds one non-LibRaw code/name pair, used by the busy guard (any
// Processor call made while another async call on the same Processor is in
// flight -- see src/errors.h's kErrLibRawBusyCode/kErrLibRawBusyName and
// docs/plan/tasks.md's T07 "Busy guard" bullet): `code: -1000001`,
// `name: 'ERR_LIBRAW_BUSY'`. It is not in CODE_TO_NAME/NAME_TO_CODE below
// (those are generated from vendor/LibRaw/libraw/libraw_const.h by
// scripts/gen-errors.js and only ever contain real LIBRAW_* enumerators);
// the native side always sets `librawName` explicitly for it, so
// LibRawError.fromNative() below never needs the table lookup for this case.
const { CODE_TO_NAME } = require('./generated/libraw-errors.cjs');

/** Non-LibRaw numeric code for the ERR_LIBRAW_BUSY guard (see above). */
const ERR_LIBRAW_BUSY_CODE = -1000001;

class LibRawError extends Error {
  /**
   * @param {string} message
   * @param {{ code?: number, name?: string, stage?: string, aborted?: boolean }} [details]
   */
  constructor(message, { code, name, stage, aborted } = {}) {
    super(message);
    this.code = code;
    // Per the API doc, `name` on a LibRawError is the LIBRAW_* enumerator
    // name (e.g. "LIBRAW_OUT_OF_ORDER_CALL"), not the JS error class name.
    this.name = name || (code !== undefined ? CODE_TO_NAME[String(code)] : undefined) || 'LibRawError';
    this.stage = stage;
    // T08/T09: set only for cancellation (signal already aborted at call
    // time, or aborted mid-call once T09 wires that up) -- see
    // src/errors.cc's MakeCancelledError. Left undefined otherwise, never
    // false, so `'aborted' in err` also works as a cancellation check.
    if (aborted) {
      this.aborted = true;
    }
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LibRawError);
    }
  }

  /**
   * Wraps a native Napi::Error thrown by a Processor method or a fused
   * helper (`code` numeric, `librawName` string, `stage` string, and
   * optionally `aborted: true` -- see src/errors.cc) into a LibRawError.
   * Idempotent: an already-wrapped LibRawError passes through.
   *
   * @param {unknown} err
   * @param {string} [fallbackStage]
   */
  static fromNative(err, fallbackStage) {
    if (err instanceof LibRawError) {
      return err;
    }
    if (!(err instanceof Error)) {
      return err;
    }
    // Argument-validation failures (e.g. a wrong-size `into` buffer -- a
    // Napi::RangeError -- or an unsupported option key -- a Napi::TypeError,
    // both thrown from src/processor.cc / src/fused.cc before any LibRaw
    // call happens) carry neither `code` nor `librawName`: they are not a
    // LibRaw error at all, so pass them through as the RangeError/TypeError
    // they already are instead of flattening them into a LibRawError and
    // losing that type (T08 acceptance: "a wrong size -> RangeError").
    const hasLibRawShape = typeof err.code === 'number' || typeof err.librawName === 'string';
    if (!hasLibRawShape) {
      return err;
    }
    const code = typeof err.code === 'number' ? err.code : undefined;
    const name = typeof err.librawName === 'string' ? err.librawName : undefined;
    const stage = typeof err.stage === 'string' ? err.stage : fallbackStage;
    const aborted = err.aborted === true;
    return new LibRawError(err.message, { code, name, stage, aborted });
  }
}

LibRawError.ERR_LIBRAW_BUSY_CODE = ERR_LIBRAW_BUSY_CODE;

module.exports = { LibRawError, ERR_LIBRAW_BUSY_CODE };
