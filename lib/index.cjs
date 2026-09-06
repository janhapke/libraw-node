'use strict';

// Package entry point. T02-T05 exported the native binding's surface
// directly (hello, napiVersion, version, versionNumber, capabilities,
// cameraCount, cameraList, buildInfo, decodeSync). T06 adds the Processor
// object API and its error model on top, without changing any of that
// existing surface:
//   - lib/binding.cjs resolves and loads the native addon (node-gyp-build).
//   - lib/errors.cjs defines LibRawError, the class Processor methods throw.
//   - lib/processor.cjs wraps the native Processor class (binding.Processor)
//     so its thrown Napi::Errors become LibRawError instances.
// T08 adds the fused, stateless helpers (decode, identify, thumbnail --
// src/fused.cc/.h) the same way: lib/fused.cjs wraps them so their
// rejections become LibRawError instances too.
const native = require('./binding.cjs');
const { LibRawError } = require('./errors.cjs');
const { wrapProcessor } = require('./processor.cjs');
const { wrapFused, FUSED_METHODS } = require('./fused.cjs');

const Processor = wrapProcessor(native.Processor, LibRawError);
const fused = wrapFused(native, LibRawError);

// Node-API's DefineAddon() defines every exported property as
// non-enumerable and non-writable (napi_default attributes), so a plain
// object spread (`{ ...native }`) silently drops all of them -- copy each
// own property descriptor explicitly instead, then override `Processor`
// (the wrapped, LibRawError-throwing version) and add `LibRawError`.
const exportsObj = {};
for (const key of Object.getOwnPropertyNames(native)) {
  if (key === 'Processor' || FUSED_METHODS.includes(key)) continue;
  Object.defineProperty(exportsObj, key, Object.getOwnPropertyDescriptor(native, key));
}
Object.defineProperty(exportsObj, 'Processor', { value: Processor, writable: true, enumerable: true, configurable: true });
Object.defineProperty(exportsObj, 'LibRawError', { value: LibRawError, writable: true, enumerable: true, configurable: true });
for (const method of FUSED_METHODS) {
  Object.defineProperty(exportsObj, method, { value: fused[method], writable: true, enumerable: true, configurable: true });
}

module.exports = exportsObj;
