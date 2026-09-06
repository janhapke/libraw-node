#!/usr/bin/env node
// T06: generates the LibRaw error-code <-> name tables from
// vendor/LibRaw/libraw/libraw_const.h's `enum LibRaw_errors` so the C++ and
// JS sides of the error model (LibRawError) never drift from the vendored
// header.
//
// Outputs:
//   src/generated/libraw_errors.inc   -- consumed by src/errors.cc via
//                                        LIBRAW_NODE_ERROR_ENTRY(name); each
//                                        entry uses the *symbolic* LIBRAW_*
//                                        name (not a bare number), so a
//                                        renamed/removed enumerator is a
//                                        compile error, not a silent skew.
//   lib/generated/libraw-errors.cjs   -- CODE_TO_NAME / NAME_TO_CODE maps for
//                                        the JS-side LibRawError class.
//
// Usage:
//   node scripts/gen-errors.js          regenerate both files
//   node scripts/gen-errors.js --check  exit 1 if committed files are stale
//
// `npm run gen:errors` runs the first form.
//
// T13 note: scripts/gen-enums.js parses LibRaw_errors again (independently)
// into api/enums.json, a general-purpose manifest of *every* enum in
// libraw_const.h that T15's docs/types generators and this task's
// capabilityNames()/warningNames() consume. This script is kept as its own,
// separate generator rather than folded into gen-enums.js because its two
// outputs (src/generated/libraw_errors.inc's LIBRAW_NODE_ERROR_ENTRY table,
// consumed by src/errors.cc, and lib/generated/libraw-errors.cjs's
// CODE_TO_NAME/NAME_TO_CODE, consumed by lib/errors.cjs's LibRawError) predate
// gen-enums.js (T06), have their own committed tests, and use a full-name
// (not short-name) convention LibRawError's public shape already depends on
// -- see docs/plan/tasks.md's T13 "Do" list ("keep gen-errors.js/
// gen-progress.js as they are, or make them thin wrappers ... do not leave
// duplicated parsing logic without a comment saying why").
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HEADER_PATH = path.join(ROOT, 'vendor/LibRaw/libraw/libraw_const.h');
const CC_OUT_PATH = path.join(ROOT, 'src/generated/libraw_errors.inc');
const JS_OUT_PATH = path.join(ROOT, 'lib/generated/libraw-errors.cjs');

function parseErrors(headerSrc) {
  const enumMatch = headerSrc.match(/enum\s+LibRaw_errors\s*\{([^}]*)\}/);
  if (!enumMatch) {
    throw new Error(`enum LibRaw_errors not found in ${HEADER_PATH}`);
  }
  const body = enumMatch[1];
  const entries = [];
  let nextImplicit = 0;
  for (const rawLine of body.split(',')) {
    const line = rawLine.trim();
    if (!line) continue;
    const withValue = line.match(/^(LIBRAW_[A-Z0-9_]+)\s*=\s*(-?\d+)$/);
    if (withValue) {
      const [, name, value] = withValue;
      entries.push({ name, value: Number(value) });
      nextImplicit = Number(value) + 1;
      continue;
    }
    const bare = line.match(/^(LIBRAW_[A-Z0-9_]+)$/);
    if (bare) {
      entries.push({ name: bare[1], value: nextImplicit });
      nextImplicit += 1;
      continue;
    }
    throw new Error(`gen-errors: could not parse enumerator line: ${JSON.stringify(line)}`);
  }
  if (entries.length === 0) {
    throw new Error('gen-errors: parsed zero enumerators out of LibRaw_errors');
  }
  return entries;
}

function renderCc(entries) {
  const lines = [
    '// GENERATED FILE -- do not edit by hand.',
    '// Regenerate with `npm run gen:errors` (scripts/gen-errors.js).',
    '// Source: vendor/LibRaw/libraw/libraw_const.h, enum LibRaw_errors.',
    '//',
    '// Included from src/errors.cc with LIBRAW_NODE_ERROR_ENTRY(name) defined to',
    '// expand each symbolic name into a {value, "name"} table entry -- using the',
    '// symbolic LIBRAW_* identifier (not a bare integer) makes a renamed or',
    '// removed enumerator a compile error against the vendored header instead of',
    '// a silent mismatch.',
    ...entries.map((e) => `LIBRAW_NODE_ERROR_ENTRY(${e.name})`),
    '',
  ];
  return lines.join('\n');
}

function renderJs(entries) {
  const codeToName = entries.map((e) => `  ${JSON.stringify(String(e.value))}: ${JSON.stringify(e.name)},`).join('\n');
  const nameToCode = entries.map((e) => `  ${e.name}: ${e.value},`).join('\n');
  return `'use strict';
// GENERATED FILE -- do not edit by hand.
// Regenerate with \`npm run gen:errors\` (scripts/gen-errors.js).
// Source: vendor/LibRaw/libraw/libraw_const.h, enum LibRaw_errors.

const CODE_TO_NAME = {
${codeToName}
};

const NAME_TO_CODE = {
${nameToCode}
};

module.exports = { CODE_TO_NAME, NAME_TO_CODE };
`;
}

function main() {
  const check = process.argv.includes('--check');
  const headerSrc = fs.readFileSync(HEADER_PATH, 'utf8');
  const entries = parseErrors(headerSrc);

  const ccContent = renderCc(entries);
  const jsContent = renderJs(entries);

  if (check) {
    const ccCurrent = fs.existsSync(CC_OUT_PATH) ? fs.readFileSync(CC_OUT_PATH, 'utf8') : null;
    const jsCurrent = fs.existsSync(JS_OUT_PATH) ? fs.readFileSync(JS_OUT_PATH, 'utf8') : null;
    const staleCc = ccCurrent !== ccContent;
    const staleJs = jsCurrent !== jsContent;
    if (staleCc || staleJs) {
      if (staleCc) console.error(`stale: ${path.relative(ROOT, CC_OUT_PATH)}`);
      if (staleJs) console.error(`stale: ${path.relative(ROOT, JS_OUT_PATH)}`);
      console.error(`${entries.length} enumerators parsed from ${path.relative(ROOT, HEADER_PATH)}`);
      process.exit(1);
    }
    console.log(`gen-errors --check: OK (${entries.length} enumerators)`);
    return;
  }

  fs.mkdirSync(path.dirname(CC_OUT_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(JS_OUT_PATH), { recursive: true });
  fs.writeFileSync(CC_OUT_PATH, ccContent);
  fs.writeFileSync(JS_OUT_PATH, jsContent);
  console.log(`wrote ${path.relative(ROOT, CC_OUT_PATH)} and ${path.relative(ROOT, JS_OUT_PATH)} (${entries.length} enumerators)`);
}

main();
