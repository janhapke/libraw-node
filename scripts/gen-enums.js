#!/usr/bin/env node
// T13: extracts *every* enum in vendor/LibRaw/libraw/libraw_const.h whose
// enumerators carry the `LIBRAW_` prefix (that is: every enum in the file --
// LibRaw uses that convention throughout) into a single manifest,
// api/enums.json, plus a generated JS module (forward + reverse maps) and a
// C++ X-macro include for the two families the native side needs by name
// (LIBRAW_WARN_* / LIBRAW_CAPS_*).
//
// Why this duplicates parsing logic already in scripts/gen-errors.js and
// scripts/gen-progress.js: those two scripts predate this one (T06/T10) and
// each has its own tailored consumer (src/errors.cc's LIBRAW_NODE_ERROR_ENTRY
// table, src/progress_stage.cc's LIBRAW_NODE_PROGRESS_ENTRY table, and
// lib/index.cjs's `progressStages` export) that a committed test already
// exercises. Rewriting them on top of this generic generator would touch
// files outside T13's scope for no behavioural change, so per T13's task
// text ("keep gen-errors.js/gen-progress.js as they are, or make them thin
// wrappers ... do not leave duplicated parsing logic without a comment
// saying why") they are kept as-is; this file re-parses LibRaw_errors and
// LibRaw_progress independently (see enums.json's `LibRaw_errors` /
// `LibRaw_progress` entries) for the general-purpose manifest, api/
// enums.json, that T15's docs/types generators and this task's own
// capabilityNames()/warningNames() consume instead.
//
// Parsing model:
//   - Every top-level `enum Name { ... };` block in the header is found and
//     its body parsed independently (no cross-enum state).
//   - Each enumerator is either bare (implicit value = previous + 1, or 0
//     for the first) or has an explicit `= <expr>` initialiser.
//   - `<expr>` is evaluated with a tiny expression engine supporting decimal
//     and hex integer literals, unary minus, `+`, `|`, `<<`/`>>`, `(`/`)`,
//     and references to *earlier* enumerators in the same enum (LibRaw uses
//     this for combo constants like LIBRAW_DNG_ALL and alias constants like
//     LIBRAW_OPIONS_NO_DATAERR_CALLBACK, a documented compatibility typo for
//     LIBRAW_OPTIONS_NO_DATAERR_CALLBACK).
//   - The per-enum `prefix` used to derive each enumerator's `short` name is
//     the character-level longest common prefix across all of that enum's
//     enumerator names, trimmed back to the last `_` boundary within that
//     prefix (falling back to "LIBRAW_" if that trim would drop below it,
//     or if the enum has a single enumerator). This is a generic rule (no
//     per-enum-family special-casing) that happens to reproduce
//     gen-progress.js's "LIBRAW_PROGRESS_" stripping and gen-errors.js's
//     "no stripping beyond LIBRAW_" behaviour alike.
//
// Outputs:
//   api/enums.json -- every enum, `{ name, short, value }[]` plus derived
//     `prefix` and a `kind` guess ("flags" if every value is 0 or a single
//     set bit, "enum" otherwise), committed.
//   lib/generated/libraw-enums.cjs -- `ENUMS[enumName] = { kind,
//     NAME_TO_VALUE (short -> value), VALUE_TO_NAME (value -> first short
//     name), VALUE_TO_NAMES (value -> all short names, for the rare
//     duplicate-value case e.g. LibRaw_decoder_flags' 3CHANNEL/SINAR4SHOT) }`
//     plus `namesForMask(enumName, mask)` -- consumed by lib/index.cjs for
//     `enums`, `capabilityNames()`, `warningNames()`.
//   src/generated/libraw_enums.inc -- LIBRAW_NODE_WARN_ENTRY(name, short) /
//     LIBRAW_NODE_CAPS_ENTRY(name, short) lines for the two enums the native
//     side (src/enums.cc) needs by name: LibRaw_warnings and
//     LibRaw_runtime_capabilities. One file, two X-macros (the file is
//     included twice from src/enums.cc, each time with the other macro
//     defined to expand to nothing) -- see that file for why.
//
// Usage:
//   node scripts/gen-enums.js          regenerate all three outputs
//   node scripts/gen-enums.js --check  exit 1 if any committed file is stale
//
// `npm run gen:enums` runs the first form; `npm run gen:check` runs the
// second alongside the other generators.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HEADER_PATH = path.join(ROOT, 'vendor/LibRaw/libraw/libraw_const.h');
const JSON_OUT_PATH = path.join(ROOT, 'api/enums.json');
const JS_OUT_PATH = path.join(ROOT, 'lib/generated/libraw-enums.cjs');
const CC_OUT_PATH = path.join(ROOT, 'src/generated/libraw_enums.inc');

// The two enums the native side needs a symbolic {value, "short"} table for
// (see this file's header comment on src/generated/libraw_enums.inc).
const CC_ENUMS = [
  { enumName: 'LibRaw_warnings', macro: 'LIBRAW_NODE_WARN_ENTRY' },
  { enumName: 'LibRaw_runtime_capabilities', macro: 'LIBRAW_NODE_CAPS_ENTRY' },
];

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

// Finds every `enum <Name> { ... }` block in the (comment-stripped) header,
// in file order. Non-greedy match on the body is safe here: libraw_const.h
// never nests a `{`/`}` pair inside an enum body (no nested structs/unions,
// no braced initialisers).
function findEnumBlocks(headerSrc) {
  const clean = stripComments(headerSrc);
  const blocks = [];
  const re = /enum\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(clean)) !== null) {
    blocks.push({ name: m[1], body: m[2] });
  }
  return blocks;
}

// Evaluates an enumerator initialiser expression, substituting references to
// earlier enumerators in the same enum (by name) with their resolved value.
function evalExpr(expr, knownNames, enumName) {
  // Hex literals (0x94) look like an identifier from "x94" onward to a bare
  // \w+ regex, so match hex-or-identifier as one alternation and only
  // substitute the identifier branch -- leaves 0x94 untouched while still
  // replacing LIBRAW_* name references.
  const substituted = expr.replace(/0[xX][0-9a-fA-F]+|[A-Za-z_][A-Za-z0-9_]*/g, (token) => {
    if (/^0[xX]/.test(token)) return token;
    const id = token;
    if (!Object.prototype.hasOwnProperty.call(knownNames, id)) {
      throw new Error(
        `gen-enums: ${enumName}: unresolved identifier ${JSON.stringify(id)} in expression ${JSON.stringify(expr)}`
      );
    }
    const v = knownNames[id];
    return v < 0 ? `(${v})` : String(v);
  });
  if (!/^[\s0-9xXa-fA-F()+\-*/|<>]*$/.test(substituted)) {
    throw new Error(`gen-enums: ${enumName}: unsupported expression syntax: ${JSON.stringify(expr)}`);
  }
  // eslint-disable-next-line no-new-func -- trusted input: the vendored
  // header, already restricted to a digits/hex/operator charset above.
  let value = Function(`"use strict"; return (${substituted});`)();
  if (!Number.isFinite(value)) {
    throw new Error(`gen-enums: ${enumName}: expression did not evaluate to a finite number: ${JSON.stringify(expr)}`);
  }
  // C's `/` on ints truncates; JS's doesn't. The only enum using division
  // (LibRawImageAspects, e.g. "(1000 * 16) / 9") has exactly one division at
  // the top of an otherwise self-contained expression, so truncating the
  // final result reproduces C's integer division for every value actually
  // used here.
  if (substituted.includes('/')) {
    value = Math.trunc(value);
  }
  return value;
}

function parseEnumBody(name, body) {
  const normalized = body.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    throw new Error(`gen-enums: enum ${name} has an empty body`);
  }
  const entries = [];
  const knownNames = {};
  let nextImplicit = 0;
  for (const rawChunk of normalized.split(',')) {
    const chunk = rawChunk.trim();
    if (!chunk) continue;
    const m = chunk.match(/^([A-Za-z_][A-Za-z0-9_]*)(?:\s*=\s*(.+))?$/);
    if (!m) {
      throw new Error(`gen-enums: ${name}: could not parse enumerator chunk: ${JSON.stringify(chunk)}`);
    }
    const [, enumeratorName, exprRaw] = m;
    let value;
    if (exprRaw !== undefined) {
      value = evalExpr(exprRaw.trim(), knownNames, name);
    } else {
      value = nextImplicit;
    }
    entries.push({ name: enumeratorName, value });
    knownNames[enumeratorName] = value;
    nextImplicit = value + 1;
  }
  if (entries.length === 0) {
    throw new Error(`gen-enums: enum ${name} parsed zero enumerators`);
  }
  return entries;
}

// Character-level longest common prefix across `names`, trimmed back to the
// last `_` boundary it contains (so a partial-word cut like "LIBRAW_RAWSPEEDV"
// -- shared by the V1_ and V3_ enumerators of LibRaw_rawspeed_bits_t -- backs
// off to the whole-word "LIBRAW_" instead). Falls back to "LIBRAW_" (or ""
// if even that doesn't match every name) when there is nothing more specific
// to strip, including the single-enumerator case.
function commonPrefix(names) {
  let prefix = names[0];
  for (const n of names.slice(1)) {
    let i = 0;
    const max = Math.min(prefix.length, n.length);
    while (i < max && prefix[i] === n[i]) i++;
    prefix = prefix.slice(0, i);
    if (!prefix) break;
  }
  const lastUnderscore = prefix.lastIndexOf('_');
  if (lastUnderscore >= 0) {
    prefix = prefix.slice(0, lastUnderscore + 1);
  } else {
    prefix = '';
  }
  const fallback = 'LIBRAW_';
  if (prefix.length < fallback.length && names.every((n) => n.startsWith(fallback))) {
    return fallback;
  }
  return prefix || (names.every((n) => n.startsWith(fallback)) ? fallback : '');
}

function isPowerOfTwoOrZero(v) {
  return Number.isInteger(v) && v >= 0 && (v & (v - 1)) === 0;
}

function classifyKind(entries) {
  return entries.every((e) => isPowerOfTwoOrZero(e.value)) ? 'flags' : 'enum';
}

function buildManifest(headerSrc, libRawVersion) {
  const blocks = findEnumBlocks(headerSrc);
  const enums = {};
  for (const block of blocks) {
    const entries = parseEnumBody(block.name, block.body);
    const names = entries.map((e) => e.name);
    const prefix = commonPrefix(names);
    const values = entries.map((e) => ({
      name: e.name,
      short: prefix && e.name.startsWith(prefix) ? e.name.slice(prefix.length) : e.name,
      value: e.value,
    }));
    enums[block.name] = { prefix, kind: classifyKind(entries), values };
  }
  return {
    $comment:
      'GENERATED FILE -- do not edit by hand. Regenerate with `npm run gen:enums` (scripts/gen-enums.js). ' +
      'Source: vendor/LibRaw/libraw/libraw_const.h -- every `enum` in that header (all of LibRaw\'s enumerators ' +
      'carry the LIBRAW_ prefix). `short` is `name` with the enum\'s common LIBRAW_*_ prefix stripped; `kind` is ' +
      '"flags" when every value is 0 or a single set bit, else "enum". Consumed by lib/generated/libraw-enums.cjs ' +
      'and src/generated/libraw_enums.inc (both generated by this same script) and by T15\'s docs/types generators.',
    libraw: { version: libRawVersion, header: 'vendor/LibRaw/libraw/libraw_const.h' },
    enums,
  };
}

function parseLibRawVersion(headerSrcVersion) {
  const major = headerSrcVersion.match(/#define\s+LIBRAW_MAJOR_VERSION\s+(\d+)/);
  const minor = headerSrcVersion.match(/#define\s+LIBRAW_MINOR_VERSION\s+(\d+)/);
  const patch = headerSrcVersion.match(/#define\s+LIBRAW_PATCH_VERSION\s+(\d+)/);
  if (!major || !minor || !patch) return 'unknown';
  return `${major[1]}.${minor[1]}.${patch[1]}`;
}

function renderJsonOut(manifest) {
  return JSON.stringify(manifest, null, 2) + '\n';
}

function jsIdentSafe(key) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : JSON.stringify(key);
}

function renderJs(manifest) {
  const enumNames = Object.keys(manifest.enums);
  const perEnum = enumNames
    .map((enumName) => {
      const { kind, values } = manifest.enums[enumName];
      const nameToValue = values.map((v) => `      ${jsIdentSafe(v.short)}: ${v.value},`).join('\n');
      // VALUE_TO_NAME: first-wins on a duplicate value (e.g. LibRaw_decoder_flags'
      // LIBRAW_DECODER_3CHANNEL and LIBRAW_DECODER_SINAR4SHOT both = 1<<11).
      const seen = new Set();
      const valueToNameLines = [];
      const valueToNamesMap = new Map();
      for (const v of values) {
        if (!valueToNamesMap.has(v.value)) valueToNamesMap.set(v.value, []);
        valueToNamesMap.get(v.value).push(v.short);
      }
      for (const v of values) {
        if (seen.has(v.value)) continue;
        seen.add(v.value);
        valueToNameLines.push(`      ${JSON.stringify(String(v.value))}: ${JSON.stringify(v.short)},`);
      }
      const valueToNamesLines = [...valueToNamesMap.entries()]
        .map(([value, shorts]) => `      ${JSON.stringify(String(value))}: ${JSON.stringify(shorts)},`)
        .join('\n');
      return `  ${JSON.stringify(enumName)}: {
    kind: ${JSON.stringify(kind)},
    NAME_TO_VALUE: {
${nameToValue}
    },
    VALUE_TO_NAME: {
${valueToNameLines.join('\n')}
    },
    VALUE_TO_NAMES: {
${valueToNamesLines}
    },
  },`;
    })
    .join('\n');

  return `'use strict';
// GENERATED FILE -- do not edit by hand.
// Regenerate with \`npm run gen:enums\` (scripts/gen-enums.js).
// Source: vendor/LibRaw/libraw/libraw_const.h (see api/enums.json).

const ENUMS = {
${perEnum}
};

// Returns the sorted (ascending by bit value) list of short names for the
// set bits of \`mask\` in a "flags"-kind enum. Values that are 0 (e.g.
// LIBRAW_WARN_NONE) never match a nonzero mask bit and are never included.
function namesForMask(enumName, mask) {
  const entry = ENUMS[enumName];
  if (!entry) throw new Error(\`namesForMask: unknown enum \${enumName}\`);
  const names = [];
  for (const [valueStr, name] of Object.entries(entry.VALUE_TO_NAME)) {
    const value = Number(valueStr);
    if (value !== 0 && (mask & value) === value) {
      names.push({ value, name });
    }
  }
  names.sort((a, b) => a.value - b.value);
  return names.map((e) => e.name);
}

module.exports = { ENUMS, namesForMask };
`;
}

function renderCc(manifest) {
  const lines = [
    '// GENERATED FILE -- do not edit by hand.',
    '// Regenerate with `npm run gen:enums` (scripts/gen-enums.js).',
    '// Source: vendor/LibRaw/libraw/libraw_const.h, enum LibRaw_warnings and',
    '// enum LibRaw_runtime_capabilities.',
    '//',
    '// This file is included twice from src/enums.cc: once with',
    '// LIBRAW_NODE_WARN_ENTRY(name, short) defined (and LIBRAW_NODE_CAPS_ENTRY',
    '// defined to expand to nothing) to build the warnings table, and once with',
    '// the roles swapped to build the capabilities table -- the classic X-macro',
    '// two-pass trick, so one generated file backs two independent {value,',
    '// "short"} tables without listing either enum twice in this comment or in',
    '// the generator. Using the symbolic LIBRAW_* identifier (not a bare',
    '// integer) makes a renamed or removed enumerator a compile error against',
    '// the vendored header instead of a silent mismatch.',
  ];
  for (const { enumName, macro } of CC_ENUMS) {
    const { values } = manifest.enums[enumName];
    if (!values) throw new Error(`gen-enums: renderCc: enum ${enumName} missing from manifest`);
    for (const v of values) {
      // LIBRAW_WARN_NONE / any zero-valued entry carries no bit to test for
      // and would corrupt the flags-array scan (every mask trivially
      // "contains" 0) -- skip it, matching the hand-written table it
      // replaces (src/fused.cc's old kWarnings never listed WARN_NONE).
      if (v.value === 0) continue;
      lines.push(`${macro}(${v.name}, ${JSON.stringify(v.short)})`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

function main() {
  const check = process.argv.includes('--check');
  const headerSrc = fs.readFileSync(HEADER_PATH, 'utf8');
  const versionHeaderPath = path.join(ROOT, 'vendor/LibRaw/libraw/libraw_version.h');
  const libRawVersion = parseLibRawVersion(fs.readFileSync(versionHeaderPath, 'utf8'));

  const manifest = buildManifest(headerSrc, libRawVersion);
  const jsonContent = renderJsonOut(manifest);
  const jsContent = renderJs(manifest);
  const ccContent = renderCc(manifest);

  const enumCount = Object.keys(manifest.enums).length;
  const enumeratorCount = Object.values(manifest.enums).reduce((sum, e) => sum + e.values.length, 0);

  if (check) {
    const jsonCurrent = fs.existsSync(JSON_OUT_PATH) ? fs.readFileSync(JSON_OUT_PATH, 'utf8') : null;
    const jsCurrent = fs.existsSync(JS_OUT_PATH) ? fs.readFileSync(JS_OUT_PATH, 'utf8') : null;
    const ccCurrent = fs.existsSync(CC_OUT_PATH) ? fs.readFileSync(CC_OUT_PATH, 'utf8') : null;
    const staleJson = jsonCurrent !== jsonContent;
    const staleJs = jsCurrent !== jsContent;
    const staleCc = ccCurrent !== ccContent;
    if (staleJson || staleJs || staleCc) {
      if (staleJson) console.error(`stale: ${path.relative(ROOT, JSON_OUT_PATH)}`);
      if (staleJs) console.error(`stale: ${path.relative(ROOT, JS_OUT_PATH)}`);
      if (staleCc) console.error(`stale: ${path.relative(ROOT, CC_OUT_PATH)}`);
      console.error(`${enumCount} enums / ${enumeratorCount} enumerators parsed from ${path.relative(ROOT, HEADER_PATH)}`);
      process.exit(1);
    }
    console.log(`gen-enums --check: OK (${enumCount} enums, ${enumeratorCount} enumerators)`);
    return;
  }

  fs.mkdirSync(path.dirname(JSON_OUT_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(JS_OUT_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(CC_OUT_PATH), { recursive: true });
  fs.writeFileSync(JSON_OUT_PATH, jsonContent);
  fs.writeFileSync(JS_OUT_PATH, jsContent);
  fs.writeFileSync(CC_OUT_PATH, ccContent);
  console.log(
    `wrote ${path.relative(ROOT, JSON_OUT_PATH)}, ${path.relative(ROOT, JS_OUT_PATH)} and ` +
      `${path.relative(ROOT, CC_OUT_PATH)} (${enumCount} enums, ${enumeratorCount} enumerators)`
  );
}

main();
