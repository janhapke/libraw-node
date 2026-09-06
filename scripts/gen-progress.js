#!/usr/bin/env node
// T10: generates the LibRaw progress-stage code <-> short-name tables from
// vendor/LibRaw/libraw/libraw_const.h's `enum LibRaw_progress`, the same way
// scripts/gen-errors.js does for `enum LibRaw_errors` -- see that script's
// header comment for the rationale (never let the C++/JS tables drift from
// the vendored header).
//
// Outputs:
//   src/generated/libraw_progress_stages.inc -- consumed by
//     src/progress_stage.cc via LIBRAW_NODE_PROGRESS_ENTRY(name, short); each
//     entry uses the *symbolic* LIBRAW_PROGRESS_* name (not a bare integer),
//     so a renamed/removed enumerator is a compile error, not a silent skew.
//   lib/generated/libraw-progress.cjs -- STAGE_TO_NAME / NAME_TO_STAGE maps
//     (short names, e.g. "LOAD_RAW") for the JS side (lib/index.cjs's
//     `progressStages` export and the events wrapper).
//
// Usage:
//   node scripts/gen-progress.js          regenerate both files
//   node scripts/gen-progress.js --check  exit 1 if committed files are stale
//
// `npm run gen:progress` runs the first form.
//
// T13 note: scripts/gen-enums.js parses LibRaw_progress again (independently)
// into api/enums.json, a general-purpose manifest of *every* enum in
// libraw_const.h. This script stays separate for the same reason
// gen-errors.js does (see that script's own T13 note): its outputs
// (src/generated/libraw_progress_stages.inc, consumed by
// src/progress_stage.cc, and lib/generated/libraw-progress.cjs's
// STAGE_TO_NAME/NAME_TO_STAGE, consumed by lib/index.cjs's `progressStages`
// export) predate gen-enums.js (T10), and `progressStages`' exact shape is
// part of this package's already-documented public surface.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HEADER_PATH = path.join(ROOT, 'vendor/LibRaw/libraw/libraw_const.h');
const CC_OUT_PATH = path.join(ROOT, 'src/generated/libraw_progress_stages.inc');
const JS_OUT_PATH = path.join(ROOT, 'lib/generated/libraw-progress.cjs');

const PREFIX = 'LIBRAW_PROGRESS_';

function parseValue(expr) {
  // Every enumerator in LibRaw_progress is either a bare decimal ("0", "1")
  // or a left-shift ("1 << 3") -- see the header. No implicit
  // (comma-only, no "=") enumerators are used in this enum, unlike
  // LibRaw_errors, so every entry here must have an explicit "=".
  const shifted = expr.match(/^(\d+)\s*<<\s*(\d+)$/);
  if (shifted) {
    return Number(shifted[1]) << Number(shifted[2]);
  }
  const bare = expr.match(/^(\d+)$/);
  if (bare) {
    return Number(bare[1]);
  }
  throw new Error(`gen-progress: could not parse enumerator value: ${JSON.stringify(expr)}`);
}

function parseProgressStages(headerSrc) {
  const enumMatch = headerSrc.match(/enum\s+LibRaw_progress\s*\{([^}]*)\}/);
  if (!enumMatch) {
    throw new Error(`enum LibRaw_progress not found in ${HEADER_PATH}`);
  }
  // Strip C-style comments (e.g. "/* reserved */") before splitting on commas
  // -- otherwise a comment sitting between two enumerators gets glued onto
  // the following line and fails to parse.
  const body = enumMatch[1].replace(/\/\*[\s\S]*?\*\//g, '');
  const entries = [];
  for (const rawLine of body.split(',')) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(/^(LIBRAW_PROGRESS_[A-Z0-9_]+)\s*=\s*(.+)$/);
    if (!m) {
      throw new Error(`gen-progress: could not parse enumerator line: ${JSON.stringify(line)}`);
    }
    const [, name, expr] = m;
    entries.push({ name, shortName: name.slice(PREFIX.length), value: parseValue(expr.trim()) });
  }
  if (entries.length === 0) {
    throw new Error('gen-progress: parsed zero enumerators out of LibRaw_progress');
  }
  return entries;
}

function renderCc(entries) {
  const lines = [
    '// GENERATED FILE -- do not edit by hand.',
    '// Regenerate with `npm run gen:progress` (scripts/gen-progress.js).',
    '// Source: vendor/LibRaw/libraw/libraw_const.h, enum LibRaw_progress.',
    '//',
    '// Included from src/progress_stage.cc with LIBRAW_NODE_PROGRESS_ENTRY(name,',
    '// short) defined to expand each symbolic name into a {value, "short"} table',
    '// entry -- using the symbolic LIBRAW_PROGRESS_* identifier (not a bare',
    '// integer) makes a renamed or removed enumerator a compile error against the',
    '// vendored header instead of a silent mismatch.',
    ...entries.map((e) => `LIBRAW_NODE_PROGRESS_ENTRY(${e.name}, "${e.shortName}")`),
    '',
  ];
  return lines.join('\n');
}

function renderJs(entries) {
  const stageToName = entries.map((e) => `  ${JSON.stringify(String(e.value))}: ${JSON.stringify(e.shortName)},`).join('\n');
  const nameToStage = entries.map((e) => `  ${e.shortName}: ${e.value},`).join('\n');
  return `'use strict';
// GENERATED FILE -- do not edit by hand.
// Regenerate with \`npm run gen:progress\` (scripts/gen-progress.js).
// Source: vendor/LibRaw/libraw/libraw_const.h, enum LibRaw_progress.

const STAGE_TO_NAME = {
${stageToName}
};

const NAME_TO_STAGE = {
${nameToStage}
};

module.exports = { STAGE_TO_NAME, NAME_TO_STAGE };
`;
}

function main() {
  const check = process.argv.includes('--check');
  const headerSrc = fs.readFileSync(HEADER_PATH, 'utf8');
  const entries = parseProgressStages(headerSrc);

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
    console.log(`gen-progress --check: OK (${entries.length} enumerators)`);
    return;
  }

  fs.mkdirSync(path.dirname(CC_OUT_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(JS_OUT_PATH), { recursive: true });
  fs.writeFileSync(CC_OUT_PATH, ccContent);
  fs.writeFileSync(JS_OUT_PATH, jsContent);
  console.log(`wrote ${path.relative(ROOT, CC_OUT_PATH)} and ${path.relative(ROOT, JS_OUT_PATH)} (${entries.length} enumerators)`);
}

main();
