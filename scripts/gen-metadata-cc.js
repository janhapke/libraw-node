#!/usr/bin/env node
// T14a: generates src/generated/metadata.gen.cc -- MetadataToObject(env,
// const libraw_data_t&), declared by the hand-written src/metadata.h --
// from api/metadata.json (itself generated from the vendored header by
// scripts/gen-metadata.js). Same rationale as gen-params-cc.js: the C++ side
// of the metadata mirror must never drift from the manifest, so it is never
// hand-maintained.
//
// One `ToObject_<Type>` free function is emitted per struct type the
// manifest covers (six top-level groups plus every nested struct type
// reached from their fields -- see gen-metadata.js's header comment), each
// building a read-only Napi::Object field by field from api/metadata.json's
// per-field `type`:
//   int/uint/float/double  -> Napi::Number.
//   time                   -> Napi::Number (raw seconds, LibRaw's time_t
//                              value -- documented on other.timestamp in
//                              api/metadata.annotations.json, not converted
//                              to a JS Date here).
//   string, cArrayDims.length === 1 (char[N])
//                          -> NUL-trimmed std::string; omitted entirely
//                              (not an empty string) when the trimmed
//                              result is empty.
//   string, no cArrayDims (scalar char, e.g. GPS ref codes)
//                          -> a 1-character std::string, guarded by `unset`
//                              like any other scalar field (see below).
//   int[]/float[]           -> Napi::Array of numbers.
//   matrix (cArrayDims.length === 2)
//                          -> Napi::Array of Napi::Array of numbers.
//   struct, no cArrayDims  -> ToObject_<the field's own cType>(env, value).
//   struct, cArrayDims.length === 1
//                          -> Napi::Array of the above, one per element.
//   unsupported             -> omitted from the generated object entirely.
// A field with an `unset` sentinel in the manifest gets its Set() call
// wrapped in `if (rawValue != unset)`, so an unfilled field becomes a
// missing key (`undefined` on the JS side) instead of the sentinel value.
//
// Three fields need LibRaw-specific handling the generic `type`-driven
// rules above cannot express, special-cased by (struct type, field name):
//   - libraw_colordata_t.profile: paired with profile_length, becomes a
//     fresh Buffer copy of the ICC profile bytes when non-null (the one
//     documented exception to "pointer fields are unsupported" -- see
//     docs/plan/tasks.md's T14a Do list and this field's annotation notes).
//   - libraw_colordata_t.WB_Coeffs / WBCT_Coeffs: compacted to an array of
//     only the set illuminant/color-temperature entries instead of the
//     full fixed-size (256- / 64-entry) table.
//   - libraw_metadata_common_t.afdata: only the first `afcount` of the
//     fixed LIBRAW_AFDATA_MAXCOUNT (4) slots are emitted.
//
// MetadataToObject itself (not per-field generated, just six ToObject_*
// calls assembled into `{ idata, sizes, other, lens, color, makernotes:
// { common } }`) also adds `sizes.oriented` -- `{ width, height }` with the
// two swapped when imgdata.sizes.flip is 5 or 6, per the T14a acceptance
// criterion.
//
// Usage:
//   node scripts/gen-metadata-cc.js          regenerate src/generated/metadata.gen.cc
//   node scripts/gen-metadata-cc.js --check  exit 1 if the committed file is stale
//
// `npm run gen:metadata-cc` runs the first form; `npm run gen:check` runs
// the second.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'api/metadata.json');
const OUTPUT_PATH = path.join(ROOT, 'src/generated/metadata.gen.cc');

function cxxString(s) {
  return JSON.stringify(String(s));
}

// "libraw_image_sizes_t" -> "ToObject_libraw_image_sizes_t";
// "struct ph1_t" -> "ToObject_struct_ph1_t" (spaces are not valid in a C++
// identifier, so they become underscores; the result is unique per struct
// key since no two keys in api/metadata.json's `structs` map differ only by
// whitespace).
function cxxFnName(structKey) {
  return 'ToObject_' + structKey.replace(/\s+/g, '_');
}

// The C++ type usable as a function parameter type. "struct ph1_t" needs
// its "struct " prefix stripped (C++ makes the tag name alone sufficient
// once the struct is declared -- unlike C, no elaborated-type-specifier is
// required), every typedef'd struct name is already a valid type as-is.
function cxxParamType(structKey) {
  return structKey.startsWith('struct ') ? structKey.slice('struct '.length) : structKey;
}

// Wraps `setStatement` (one or more full C++ statements ending in a Set()
// call) in an `if (raw != unset)` guard when the field's manifest entry
// carries an `unset` sentinel. `rawAccess` is the raw (pre-conversion) C++
// expression for the field's value -- comparing it directly against the
// sentinel works uniformly for every scalar type this generator emits an
// `unset` guard for (int/uint/float/double/time, and the scalar-char
// "string" fields like GPS ref codes).
function withUnsetGuard(field, rawAccess, setStatement) {
  if (!('unset' in field)) return setStatement;
  const sentinel = typeof field.unset === 'number' ? field.unset : JSON.stringify(field.unset);
  return `  if (${rawAccess} != ${sentinel}) {\n${indent(setStatement)}\n  }`;
}

function indent(code) {
  return code
    .split('\n')
    .map((line) => (line.length ? '  ' + line : line))
    .join('\n');
}

// One field's code, given the struct it belongs to (`structKey`, e.g.
// "libraw_image_sizes_t") and its manifest entry. `structVar` is the C++
// parameter name for the enclosing struct reference (always "s"). Returns
// null for a field that contributes nothing to the generated object
// (currently only `unsupported`).
function genField(structKey, structVar, name, field) {
  const key = cxxString(name);
  const access = `${structVar}.${name}`;
  const arrayDims = field.cArrayDims || [];

  // --- LibRaw-specific special cases (struct type + field name) ----------
  if (structKey === 'libraw_colordata_t' && name === 'profile') {
    return `  if (${access} != nullptr && ${structVar}.profile_length > 0) {
    Napi::Buffer<uint8_t> buf = Napi::Buffer<uint8_t>::New(env, ${structVar}.profile_length);
    std::memcpy(buf.Data(), ${access}, ${structVar}.profile_length);
    obj.Set(${key}, buf);
  }`;
  }
  if (structKey === 'libraw_colordata_t' && name === 'WB_Coeffs') {
    return `  {  // compacted: only set illuminant slots (docs/plan/tasks.md T14a Do list)
    Napi::Array arr = Napi::Array::New(env);
    uint32_t n = 0;
    for (int i = 0; i < 256; i++) {
      const int* c = ${access}[i];
      if (c[0] == 0 && c[1] == 0 && c[2] == 0 && c[3] == 0) continue;
      Napi::Object entry = Napi::Object::New(env);
      entry.Set("illuminant", Napi::Number::New(env, i));
      Napi::Array coeffs = Napi::Array::New(env, 4);
      for (uint32_t k = 0; k < 4; k++) coeffs.Set(k, Napi::Number::New(env, static_cast<double>(c[k])));
      entry.Set("coeffs", coeffs);
      arr.Set(n++, entry);
    }
    obj.Set(${key}, arr);
  }`;
  }
  if (structKey === 'libraw_colordata_t' && name === 'WBCT_Coeffs') {
    return `  {  // compacted: only set color-temperature slots (colorTemperature > 0)
    Napi::Array arr = Napi::Array::New(env);
    uint32_t n = 0;
    for (int i = 0; i < 64; i++) {
      const float* c = ${access}[i];
      if (!(c[0] > 0)) continue;
      Napi::Object entry = Napi::Object::New(env);
      entry.Set("colorTemperature", Napi::Number::New(env, static_cast<double>(c[0])));
      Napi::Array coeffs = Napi::Array::New(env, 4);
      for (uint32_t k = 0; k < 4; k++) coeffs.Set(k, Napi::Number::New(env, static_cast<double>(c[k + 1])));
      entry.Set("coeffs", coeffs);
      arr.Set(n++, entry);
    }
    obj.Set(${key}, arr);
  }`;
  }
  if (structKey === 'libraw_metadata_common_t' && name === 'afdata') {
    const fnName = cxxFnName(field.cType);
    return `  {  // only the first afcount of the fixed LIBRAW_AFDATA_MAXCOUNT slots are valid
    int count = ${structVar}.afcount;
    if (count < 0) count = 0;
    if (count > ${arrayDims[0]}) count = ${arrayDims[0]};
    Napi::Array arr = Napi::Array::New(env, static_cast<uint32_t>(count));
    for (int i = 0; i < count; i++) {
      arr.Set(static_cast<uint32_t>(i), ${fnName}(env, ${access}[i]));
    }
    obj.Set(${key}, arr);
  }`;
  }

  // --- generic, `type`-driven codegen -------------------------------------
  switch (field.type) {
    case 'unsupported':
      return null;

    case 'int':
    case 'uint':
    case 'float':
    case 'double':
    case 'time': {
      const setStatement = `  obj.Set(${key}, Napi::Number::New(env, static_cast<double>(${access})));`;
      return withUnsetGuard(field, access, setStatement);
    }

    case 'string': {
      if (arrayDims.length === 1) {
        const len = arrayDims[0];
        // Local variable deliberately not named the same as the enclosing
        // function's struct parameter (always "s") -- `std::string s(s.foo,
        // ...)` would shadow the parameter mid-declaration and read from
        // the not-yet-constructed local instead of the struct field.
        return `  {
    std::string str(${access}, strnlen(${access}, ${len}));
    if (!str.empty()) obj.Set(${key}, str);
  }`;
      }
      // Scalar char (e.g. a GPS reference code byte): a 1-character string.
      const setStatement = `  obj.Set(${key}, std::string(1, ${access}));`;
      return withUnsetGuard(field, access, setStatement);
    }

    case 'bytes':
      throw new Error(`gen-metadata-cc: field ${structKey}.${name} is "bytes" but has no special-case handler`);

    case 'int[]':
    case 'float[]': {
      const len = arrayDims[0];
      return `  {
    Napi::Array arr = Napi::Array::New(env, ${len});
    for (uint32_t i = 0; i < ${len}; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(${access}[i])));
    }
    obj.Set(${key}, arr);
  }`;
    }

    case 'matrix': {
      const [d0, d1] = arrayDims;
      return `  {
    Napi::Array rows = Napi::Array::New(env, ${d0});
    for (uint32_t i = 0; i < ${d0}; i++) {
      Napi::Array cols = Napi::Array::New(env, ${d1});
      for (uint32_t j = 0; j < ${d1}; j++) {
        cols.Set(j, Napi::Number::New(env, static_cast<double>(${access}[i][j])));
      }
      rows.Set(i, cols);
    }
    obj.Set(${key}, rows);
  }`;
    }

    case 'struct': {
      const fnName = cxxFnName(field.cType);
      if (arrayDims.length === 0) {
        return `  obj.Set(${key}, ${fnName}(env, ${access}));`;
      }
      const len = arrayDims[0];
      return `  {
    Napi::Array arr = Napi::Array::New(env, ${len});
    for (uint32_t i = 0; i < ${len}; i++) {
      arr.Set(i, ${fnName}(env, ${access}[i]));
    }
    obj.Set(${key}, arr);
  }`;
    }

    default:
      throw new Error(`gen-metadata-cc: unhandled field type ${JSON.stringify(field.type)} for ${structKey}.${name}`);
  }
}

function renderStructFn(structKey, struct) {
  const paramType = cxxParamType(structKey);
  const fnName = cxxFnName(structKey);
  const blocks = struct.fieldOrder
    .map((name) => genField(structKey, 's', name, struct.fields[name]))
    .filter((b) => b !== null)
    .join('\n');
  return `Napi::Object ${fnName}(Napi::Env env, const ${paramType}& s) {
  Napi::Object obj = Napi::Object::New(env);
${blocks}
  return obj;
}`;
}

function renderCc(manifest) {
  const structKeys = Object.keys(manifest.structs);

  const forwardDecls = structKeys
    .map((k) => `Napi::Object ${cxxFnName(k)}(Napi::Env env, const ${cxxParamType(k)}& s);`)
    .join('\n');

  const bodies = structKeys.map((k) => renderStructFn(k, manifest.structs[k])).join('\n\n');

  const groups = manifest.groups;

  const lines = [
    '// GENERATED FILE -- do not edit by hand.',
    '// Regenerate with `npm run gen:metadata-cc` (scripts/gen-metadata-cc.js).',
    `// Source: ${path.relative(ROOT, MANIFEST_PATH)} (LibRaw ${manifest.libraw.version}).`,
    '//',
    '// Implements MetadataToObject, declared by src/metadata.h -- see that',
    "// header's comment and this generator's own header comment for the",
    '// per-field type rules and the three LibRaw-specific special cases',
    '// (color.profile, color.WB_Coeffs/WBCT_Coeffs, makernotes.common.afdata).',
    '#include "../metadata.h"',
    '',
    '#include <cstring>',
    '#include <string>',
    '',
    'namespace libraw_node {',
    '',
    'namespace {',
    '',
    forwardDecls,
    '',
    bodies,
    '',
    '}  // namespace',
    '',
    'Napi::Object MetadataToObject(Napi::Env env, const libraw_data_t& d) {',
    '  Napi::Object obj = Napi::Object::New(env);',
    `  obj.Set("idata", ${cxxFnName(groups.idata.cType)}(env, d.idata));`,
    '',
    `  Napi::Object sizesObj = ${cxxFnName(groups.sizes.cType)}(env, d.sizes);`,
    '  {',
    '    // T14a acceptance: sizes.oriented swaps width/height when',
    '    // imgdata.sizes.flip (as reported after open) is 5 or 6.',
    '    int flip = d.sizes.flip;',
    '    bool swapped = (flip == 5 || flip == 6);',
    '    Napi::Object oriented = Napi::Object::New(env);',
    '    oriented.Set("width", Napi::Number::New(env, swapped ? d.sizes.height : d.sizes.width));',
    '    oriented.Set("height", Napi::Number::New(env, swapped ? d.sizes.width : d.sizes.height));',
    '    sizesObj.Set("oriented", oriented);',
    '  }',
    '  obj.Set("sizes", sizesObj);',
    '',
    `  obj.Set("other", ${cxxFnName(groups.other.cType)}(env, d.other));`,
    `  obj.Set("lens", ${cxxFnName(groups.lens.cType)}(env, d.lens));`,
    `  obj.Set("color", ${cxxFnName(groups.color.cType)}(env, d.color));`,
    '',
    '  Napi::Object makernotesObj = Napi::Object::New(env);',
    `  makernotesObj.Set("common", ${cxxFnName(groups['makernotes.common'].cType)}(env, d.makernotes.common));`,
    '  obj.Set("makernotes", makernotesObj);',
    '',
    '  return obj;',
    '}',
    '',
    '}  // namespace libraw_node',
    '',
  ];
  return lines.join('\n');
}

function main() {
  const check = process.argv.includes('--check');
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  const content = renderCc(manifest);
  const structCount = Object.keys(manifest.structs).length;

  if (check) {
    const current = fs.existsSync(OUTPUT_PATH) ? fs.readFileSync(OUTPUT_PATH, 'utf8') : null;
    if (current !== content) {
      console.error(`stale: ${path.relative(ROOT, OUTPUT_PATH)}`);
      console.error(`gen-metadata-cc --check: FAILED (${structCount} structs from ${path.relative(ROOT, MANIFEST_PATH)})`);
      process.exit(1);
    }
    console.log(`gen-metadata-cc --check: OK (${structCount} structs)`);
    return;
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, content);
  console.log(`wrote ${path.relative(ROOT, OUTPUT_PATH)} (${structCount} structs)`);
}

main();
