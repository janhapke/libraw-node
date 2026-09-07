'use strict';

// T21 fix: on windows-2022 CI, `path.relative()` returns a Windows-style
// path (backslash separators, e.g. "vendor\LibRaw\libraw\libraw_types.h"),
// which several generators (gen-manifest.js, gen-metadata.js,
// gen-params-cc.js, gen-metadata-cc.js) embed verbatim into their generated
// output (a "source" JSON field, a "// Source:" comment) -- unlike the
// path.relative() calls used only in console.log/console.error messages,
// content embedded in a *committed* generated file must be identical
// regardless of which OS generated it, or `npm run gen:check` reports the
// file "stale" on whichever OS didn't originally generate it (discovered on
// windows-2022 in T21's build-windows job: generators run fine, but
// api/params.json's checked-in `source` field has forward slashes since it
// was generated on Linux, while node's path.relative() on the Windows
// runner would emit backslashes for the same relative path).
//
// relativePosix() is a drop-in for `path.relative(from, to)` that always
// returns forward-slash-separated output, so generated file *content* is
// byte-identical across platforms. Only use it where the result is written
// into a generated file; plain path.relative() remains fine (and more
// natural for a human reading the terminal) in --check/error messages,
// which are never diffed against committed content.
const path = require('node:path');

function relativePosix(from, to) {
  return path.relative(from, to).split(path.sep).join('/');
}

module.exports = { relativePosix };
