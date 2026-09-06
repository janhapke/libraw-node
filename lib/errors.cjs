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
const { CODE_TO_NAME } = require('./generated/libraw-errors.cjs');

class LibRawError extends Error {
  /**
   * @param {string} message
   * @param {{ code?: number, name?: string, stage?: string }} [details]
   */
  constructor(message, { code, name, stage } = {}) {
    super(message);
    this.code = code;
    // Per the API doc, `name` on a LibRawError is the LIBRAW_* enumerator
    // name (e.g. "LIBRAW_OUT_OF_ORDER_CALL"), not the JS error class name.
    this.name = name || (code !== undefined ? CODE_TO_NAME[String(code)] : undefined) || 'LibRawError';
    this.stage = stage;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LibRawError);
    }
  }

  /**
   * Wraps a native Napi::Error thrown by a Processor method (`code` numeric,
   * `librawName` string, `stage` string -- see src/errors.cc) into a
   * LibRawError. Idempotent: an already-wrapped LibRawError passes through.
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
    const code = typeof err.code === 'number' ? err.code : undefined;
    const name = typeof err.librawName === 'string' ? err.librawName : undefined;
    const stage = typeof err.stage === 'string' ? err.stage : fallbackStage;
    return new LibRawError(err.message, { code, name, stage });
  }
}

module.exports = { LibRawError };
