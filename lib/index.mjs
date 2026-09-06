// T16: thin ESM wrapper around lib/index.cjs (the package's actual entry
// point -- `main` in package.json, and the only file that assembles the
// export surface from binding.cjs/processor.cjs/fused.cjs/errors.cjs/
// generated/*.cjs). This file adds nothing of its own: it re-exports every
// name lib/index.cjs exports, plus a default export of the same object, so
// both `import { decode } from '@janhapke/libraw'` and
// `import libraw from '@janhapke/libraw'; libraw.decode(...)` work under
// Node's ESM loader (wired up via package.json's `exports["."].import`).
//
// Named exports must be *statically* declared (an ESM `export` list is
// fixed at parse time, unlike CommonJS's dynamic `module.exports`), so the
// destructuring below spells out every key by name rather than looping over
// `Object.keys(cjs)`. Keep this list in sync with lib/index.cjs's actual
// export set -- test/esm.test.ts's "every cjs export has an mjs export"
// case fails loudly if the two drift apart.
import cjs from './index.cjs';

export const {
  // Fused, stateless helpers (src/fused.cc, T08/T09/T10/T16).
  decode,
  identify,
  thumbnail,
  // Legacy single-shot synchronous decode (T04).
  decodeSync,
  // Stateful staged API (T06/T07/T09/T10/T12/T14a/T16).
  Processor,
  // Error class every Processor method/async call/fused helper uses (T06).
  LibRawError,
  // Enum/flag tables and their two convenience lookups (T13).
  enums,
  capabilityNames,
  warningNames,
  // LibRaw_progress short-name <-> numeric-code table (T10).
  progressStages,
  // Build/version/capability introspection (T02/T03).
  buildInfo,
  version,
  versionNumber,
  capabilities,
  cameraCount,
  cameraList,
  hello,
  napiVersion,
} = cjs;

export default cjs;
