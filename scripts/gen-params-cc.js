#!/usr/bin/env node
// T12: generates src/generated/params.gen.cc -- the table-driven C++
// implementation of ApplyParams/ApplyRawParams/ParamsToObject/
// RawParamsToObject declared by the hand-written src/params.h -- from
// api/params.json (itself generated from the vendored header by
// scripts/gen-manifest.js, T11). Same rationale as gen-errors.js/
// gen-progress.js/gen-manifest.js: the C++ side of the parameter surface
// must never drift from the manifest, so it is never hand-maintained.
//
// Per field (in api/params.json's fieldOrder), this emits one
// "apply" block (used by ApplyParams/ApplyRawParams) and, unless the field
// is annotated "unsupported", one "read" block (used by ParamsToObject/
// RawParamsToObject). The per-field validation/assignment shape depends
// only on the field's manifest `type`:
//   bool       -> Napi::Boolean, assigned as 0/1.
//   int/uint   -> Napi::Number, range-checked against min/max if present.
//   float      -> same, cast to the field's C type (float or double).
//   enum       -> Napi::Number, checked against the enum's value set
//                 (Napi::RangeError listing the allowed values if not a
//                 member).
//   flags      -> a plain number (used as-is, no membership check) or an
//                 array of flag-name strings (Napi::RangeError listing the
//                 allowed names for an unknown one), OR'd together.
//   string     -> a char* pointer field (nullable; backed by the caller's
//                 ParamStrings) if the manifest field has no cArrayLength,
//                 or a fixed char[N] buffer (length-checked, N-1 chars max)
//                 if it does.
//   int[]/float[]/uint[] -> Napi::Array, length-checked against
//                 cArrayLength, each element validated as a number.
//   unsupported -> setting it always throws Napi::TypeError; it is omitted
//                 from ParamsToObject/RawParamsToObject entirely (no safe
//                 way to read it back -- see src/params.h).
//
// Usage:
//   node scripts/gen-params-cc.js          regenerate src/generated/params.gen.cc
//   node scripts/gen-params-cc.js --check  exit 1 if the committed file is stale
//
// `npm run gen:params-cc` runs the first form; `npm run gen:check` runs the
// second (alongside gen-errors/gen-progress/gen-manifest's own --check).
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { relativePosix } = require('./lib/paths.js');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'api/params.json');
const OUTPUT_PATH = path.join(ROOT, 'src/generated/params.gen.cc');

// --- small C++-literal helpers ---------------------------------------------

function cxxString(s) {
  return JSON.stringify(String(s));
}

// Renders a JS number as a C++ integer/double literal suitable for the
// contexts used below (array lengths, enum/flag table values, min/max
// bounds). Every value in api/params.json is either a small integer or a
// float with at most a handful of decimal digits, so JS's default
// Number->string stringification is exact and unambiguous here.
function cxxNumberLiteral(n) {
  if (!Number.isFinite(n)) {
    throw new Error(`gen-params-cc: non-finite number literal: ${n}`);
  }
  return String(n);
}

function cxxScalarCastType(cType) {
  switch (cType) {
    case 'unsigned':
      return 'unsigned int';
    case 'int':
      return 'int';
    case 'float':
      return 'float';
    case 'double':
      return 'double';
    default:
      throw new Error(`gen-params-cc: unhandled scalar cType ${JSON.stringify(cType)}`);
  }
}

function renderEnumInitList(enumMap) {
  const entries = Object.entries(enumMap).map(
    ([name, value]) => `{${cxxString(name)}, ${cxxNumberLiteral(value)}}`,
  );
  return `{${entries.join(', ')}}`;
}

function renderFlagsInitList(flagsMap) {
  const entries = Object.entries(flagsMap).map(
    ([name, value]) => `{${cxxString(name)}, ${cxxNumberLiteral(value)}ULL}`,
  );
  return `{${entries.join(', ')}}`;
}

function renderKnownKeysInitList(fieldOrder) {
  return `{${fieldOrder.map((name) => cxxString(name)).join(', ')}}`;
}

// --- per-field code generation ----------------------------------------------

// `structVar` is the C++ variable name for the struct reference
// (ApplyParams's `params` / ApplyRawParams's `rawparams`), also used as the
// struct member access prefix (`structVar.name`).
function genApplyField(structVar, name, field) {
  const key = cxxString(name);
  const access = `${structVar}.${name}`;

  switch (field.type) {
    case 'bool':
      return `  {  // ${name} (bool)
    Napi::Value v = obj.Get(${key});
    if (!v.IsUndefined()) {
      bool value = AsBoolean(env, v, kLabel, ${key});
      ${access} = value ? 1 : 0;
    }
  }`;

    case 'int':
    case 'uint': {
      const castType = cxxScalarCastType(field.cType);
      const hasMin = typeof field.min === 'number';
      const hasMax = typeof field.max === 'number';
      return `  {  // ${name} (${field.type})
    Napi::Value v = obj.Get(${key});
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, ${key});
      CheckRangeNum(env, kLabel, ${key}, num, ${hasMin ? 'true' : 'false'}, ${
        hasMin ? cxxNumberLiteral(field.min) : '0'
      }, ${hasMax ? 'true' : 'false'}, ${hasMax ? cxxNumberLiteral(field.max) : '0'});
      ${access} = static_cast<${castType}>(num);
    }
  }`;
    }

    case 'float': {
      const castType = cxxScalarCastType(field.cType);
      const hasMin = typeof field.min === 'number';
      const hasMax = typeof field.max === 'number';
      return `  {  // ${name} (float)
    Napi::Value v = obj.Get(${key});
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, ${key});
      CheckRangeNum(env, kLabel, ${key}, num, ${hasMin ? 'true' : 'false'}, ${
        hasMin ? cxxNumberLiteral(field.min) : '0'
      }, ${hasMax ? 'true' : 'false'}, ${hasMax ? cxxNumberLiteral(field.max) : '0'});
      ${access} = static_cast<${castType}>(num);
    }
  }`;
    }

    case 'enum':
      return `  {  // ${name} (enum)
    Napi::Value v = obj.Get(${key});
    if (!v.IsUndefined()) {
      double num = AsNumber(env, v, kLabel, ${key});
      int value = CheckEnumMember(env, kLabel, ${key}, num, ${renderEnumInitList(field.enum)});
      ${access} = value;
    }
  }`;

    case 'flags': {
      const castType = cxxScalarCastType(field.cType);
      return `  {  // ${name} (flags)
    Napi::Value v = obj.Get(${key});
    if (!v.IsUndefined()) {
      unsigned long long value = CheckFlagsValue(env, v, kLabel, ${key}, ${renderFlagsInitList(field.flags)});
      ${access} = static_cast<${castType}>(value);
    }
  }`;
    }

    case 'string': {
      if (field.cArrayLength) {
        const maxLen = field.cArrayLength - 1;
        return `  {  // ${name} (fixed string[${field.cArrayLength}])
    Napi::Value v = obj.Get(${key});
    if (!v.IsUndefined()) {
      std::string s = AsString(env, v, kLabel, ${key});
      if (s.size() > ${maxLen}) {
        ThrowRange(env, kLabel, ${key}, "string too long (max ${maxLen} characters)");
      }
      std::memset(${access}, 0, ${field.cArrayLength});
      std::memcpy(${access}, s.data(), s.size());
    }
  }`;
      }
      return `  {  // ${name} (string, nullable)
    Napi::Value v = obj.Get(${key});
    if (!v.IsUndefined()) {
      if (v.IsNull()) {
        strings.${name}.clear();
        ${access} = nullptr;
      } else {
        strings.${name} = AsString(env, v, kLabel, ${key});
        ${access} = const_cast<char*>(strings.${name}.c_str());
      }
    }
  }`;
    }

    case 'int[]':
    case 'float[]':
    case 'uint[]': {
      const elemCastType = cxxScalarCastType(field.cType);
      const len = field.cArrayLength;
      const baseType = field.type.slice(0, -2); // "uint[]" -> "uint"
      return `  {  // ${name} (${baseType}[${len}])
    Napi::Value v = obj.Get(${key});
    if (!v.IsUndefined()) {
      Napi::Array arr = AsArray(env, v, kLabel, ${key}, ${len});
      for (uint32_t i = 0; i < ${len}; i++) {
        double num = AsNumber(env, arr.Get(i), kLabel, ${key});
        ${access}[i] = static_cast<${elemCastType}>(num);
      }
    }
  }`;
    }

    case 'unsupported':
      return `  {  // ${name} (unsupported)
    Napi::Value v = obj.Get(${key});
    if (!v.IsUndefined()) {
      ThrowUnsupportedField(env, kLabel, ${key});
    }
  }`;

    default:
      throw new Error(`gen-params-cc: unhandled field type ${JSON.stringify(field.type)} for ${name}`);
  }
}

function genReadField(structVar, name, field) {
  const key = cxxString(name);
  const access = `${structVar}.${name}`;

  switch (field.type) {
    case 'bool':
      return `  obj.Set(${key}, Napi::Boolean::New(env, ${access} != 0));`;

    case 'int':
    case 'uint':
    case 'float':
    case 'enum':
    case 'flags':
      return `  obj.Set(${key}, Napi::Number::New(env, static_cast<double>(${access})));`;

    case 'string':
      if (field.cArrayLength) {
        return `  obj.Set(${key}, Napi::String::New(env, std::string(${access}, strnlen(${access}, ${field.cArrayLength}))));`;
      }
      return `  obj.Set(${key}, ${access} ? Napi::Value::From(env, std::string(${access})) : env.Null());`;

    case 'int[]':
    case 'float[]':
    case 'uint[]': {
      const len = field.cArrayLength;
      return `  {
    Napi::Array arr = Napi::Array::New(env, ${len});
    for (uint32_t i = 0; i < ${len}; i++) {
      arr.Set(i, Napi::Number::New(env, static_cast<double>(${access}[i])));
    }
    obj.Set(${key}, arr);
  }`;
    }

    case 'unsupported':
      return null; // omitted from ParamsToObject/RawParamsToObject -- see src/params.h.

    default:
      throw new Error(`gen-params-cc: unhandled field type ${JSON.stringify(field.type)} for ${name}`);
  }
}

// --- top-level rendering -----------------------------------------------------

const HELPERS_CC = `namespace {

[[noreturn]] void ThrowUnknownKey(Napi::Env env, const char* label, const std::string& key,
                                   const std::vector<std::string>& knownKeys) {
  std::string list;
  for (size_t i = 0; i < knownKeys.size(); i++) {
    if (i > 0) list += ", ";
    list += knownKeys[i];
  }
  throw Napi::TypeError::New(env, std::string(label) + ": unknown key '" + key + "'; supported keys are: " + list);
}

[[noreturn]] void ThrowUnsupportedField(Napi::Env env, const char* label, const char* key) {
  throw Napi::TypeError::New(
      env, std::string(label) + "." + key + ": not settable through this API (unsupported field, see api/params.json)");
}

[[noreturn]] void ThrowExpectedType(Napi::Env env, const char* label, const char* key, const char* expected) {
  throw Napi::TypeError::New(env, std::string(label) + "." + key + ": expected " + expected);
}

[[noreturn]] void ThrowArrayLength(Napi::Env env, const char* label, const char* key, uint32_t expected, uint32_t actual) {
  throw Napi::RangeError::New(env, std::string(label) + "." + key + ": expected an array of length " +
                                        std::to_string(expected) + ", got " + std::to_string(actual));
}

[[noreturn]] void ThrowRange(Napi::Env env, const char* label, const char* key, const std::string& detail) {
  throw Napi::RangeError::New(env, std::string(label) + "." + key + ": " + detail);
}

void ValidateKnownKeys(Napi::Env env, Napi::Object obj, const char* label, const std::vector<std::string>& knownKeys) {
  Napi::Array keys = obj.GetPropertyNames();
  for (uint32_t i = 0; i < keys.Length(); i++) {
    std::string key = keys.Get(i).As<Napi::String>().Utf8Value();
    if (std::find(knownKeys.begin(), knownKeys.end(), key) == knownKeys.end()) {
      ThrowUnknownKey(env, label, key, knownKeys);
    }
  }
}

bool AsBoolean(Napi::Env env, Napi::Value v, const char* label, const char* key) {
  if (!v.IsBoolean()) ThrowExpectedType(env, label, key, "boolean");
  return v.As<Napi::Boolean>().Value();
}

double AsNumber(Napi::Env env, Napi::Value v, const char* label, const char* key) {
  if (!v.IsNumber()) ThrowExpectedType(env, label, key, "number");
  return v.As<Napi::Number>().DoubleValue();
}

std::string AsString(Napi::Env env, Napi::Value v, const char* label, const char* key) {
  if (!v.IsString()) ThrowExpectedType(env, label, key, "string");
  return v.As<Napi::String>().Utf8Value();
}

Napi::Array AsArray(Napi::Env env, Napi::Value v, const char* label, const char* key, uint32_t expectedLen) {
  if (!v.IsArray()) ThrowExpectedType(env, label, key, "array");
  Napi::Array arr = v.As<Napi::Array>();
  if (arr.Length() != expectedLen) ThrowArrayLength(env, label, key, expectedLen, arr.Length());
  return arr;
}

void CheckRangeNum(Napi::Env env, const char* label, const char* key, double value, bool hasMin, double min,
                    bool hasMax, double max) {
  if (hasMin && value < min) {
    ThrowRange(env, label, key, "must be >= " + std::to_string(min) + " (got " + std::to_string(value) + ")");
  }
  if (hasMax && value > max) {
    ThrowRange(env, label, key, "must be <= " + std::to_string(max) + " (got " + std::to_string(value) + ")");
  }
}

// Enum-membership check. \`allowed\` is {name, value} pairs from the field's
// manifest \`enum\` map, in declaration order (used both for the membership
// test and to render the "allowed values" list on failure).
int CheckEnumMember(Napi::Env env, const char* label, const char* key, double value,
                     std::initializer_list<std::pair<const char*, long long>> allowed) {
  for (const auto& kv : allowed) {
    if (static_cast<double>(kv.second) == value) return static_cast<int>(kv.second);
  }
  std::string list;
  for (const auto& kv : allowed) {
    if (!list.empty()) list += ", ";
    list += std::to_string(kv.second) + " (" + kv.first + ")";
  }
  ThrowRange(env, label, key,
             "invalid value " + std::to_string(static_cast<long long>(value)) + "; allowed values: " + list);
}

// Flags: a plain number (used as-is, no membership check against \`table\`)
// or an array of flag-name strings (OR'd together; an unknown name throws
// Napi::RangeError listing the allowed names from \`table\`).
unsigned long long CheckFlagsValue(Napi::Env env, Napi::Value v, const char* label, const char* key,
                                    std::initializer_list<std::pair<const char*, unsigned long long>> table) {
  if (v.IsNumber()) {
    return static_cast<unsigned long long>(v.As<Napi::Number>().Int64Value());
  }
  if (v.IsArray()) {
    Napi::Array arr = v.As<Napi::Array>();
    unsigned long long result = 0;
    for (uint32_t i = 0; i < arr.Length(); i++) {
      Napi::Value el = arr.Get(i);
      if (!el.IsString()) ThrowExpectedType(env, label, key, "number or array of flag name strings");
      std::string name = el.As<Napi::String>().Utf8Value();
      bool found = false;
      for (const auto& kv : table) {
        if (name == kv.first) {
          result |= kv.second;
          found = true;
          break;
        }
      }
      if (!found) {
        std::string list;
        for (const auto& kv : table) {
          if (!list.empty()) list += ", ";
          list += kv.first;
        }
        ThrowRange(env, label, key, "unknown flag name '" + name + "'; allowed names: " + list);
      }
    }
    return result;
  }
  ThrowExpectedType(env, label, key, "number or array of flag name strings");
}

}  // namespace
`;

function renderCc(manifest) {
  const paramsStruct = manifest.structs.params;
  const rawparamsStruct = manifest.structs.rawparams;

  const applyBlocks = (structVar, struct) =>
    struct.fieldOrder.map((name) => genApplyField(structVar, name, struct.fields[name])).join('\n\n');

  const readBlocks = (structVar, struct) =>
    struct.fieldOrder
      .map((name) => genReadField(structVar, name, struct.fields[name]))
      .filter((block) => block !== null)
      .join('\n');

  const lines = [
    '// GENERATED FILE -- do not edit by hand.',
    '// Regenerate with `npm run gen:params-cc` (scripts/gen-params-cc.js).',
    `// Source: ${relativePosix(ROOT, MANIFEST_PATH)} (LibRaw ${manifest.libraw.version}).`,
    '//',
    '// Implements the four functions declared by src/params.h -- see that',
    "// header's comments for the validation rules each field type gets and",
    '// the ParamStrings/lifetime contract for the char*-pointer fields.',
    '#include "../params.h"',
    '',
    '#include <algorithm>',
    '#include <cstring>',
    '#include <initializer_list>',
    '#include <string>',
    '#include <utility>',
    '#include <vector>',
    '',
    'namespace libraw_node {',
    '',
    HELPERS_CC,
    'void ApplyParams(Napi::Env env, Napi::Object obj, libraw_output_params_t& params, ParamStrings& strings) {',
    '  static const char* kLabel = "params";',
    `  static const std::vector<std::string> kKnownKeys = ${renderKnownKeysInitList(paramsStruct.fieldOrder)};`,
    '  ValidateKnownKeys(env, obj, kLabel, kKnownKeys);',
    '',
    applyBlocks('params', paramsStruct),
    '}',
    '',
    'void ApplyRawParams(Napi::Env env, Napi::Object obj, libraw_raw_unpack_params_t& rawparams) {',
    '  static const char* kLabel = "rawparams";',
    `  static const std::vector<std::string> kKnownKeys = ${renderKnownKeysInitList(rawparamsStruct.fieldOrder)};`,
    '  ValidateKnownKeys(env, obj, kLabel, kKnownKeys);',
    '',
    applyBlocks('rawparams', rawparamsStruct),
    '}',
    '',
    'Napi::Object ParamsToObject(Napi::Env env, const libraw_output_params_t& params) {',
    '  Napi::Object obj = Napi::Object::New(env);',
    readBlocks('params', paramsStruct),
    '  return obj;',
    '}',
    '',
    'Napi::Object RawParamsToObject(Napi::Env env, const libraw_raw_unpack_params_t& rawparams) {',
    '  Napi::Object obj = Napi::Object::New(env);',
    readBlocks('rawparams', rawparamsStruct),
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
  const manifestRaw = fs.readFileSync(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(manifestRaw);

  const content = renderCc(manifest);

  const fieldCount =
    manifest.structs.params.fieldOrder.length + manifest.structs.rawparams.fieldOrder.length;

  if (check) {
    const current = fs.existsSync(OUTPUT_PATH) ? fs.readFileSync(OUTPUT_PATH, 'utf8') : null;
    if (current !== content) {
      console.error(`stale: ${path.relative(ROOT, OUTPUT_PATH)}`);
      console.error(`gen-params-cc --check: FAILED (${fieldCount} fields from ${path.relative(ROOT, MANIFEST_PATH)})`);
      process.exit(1);
    }
    console.log(`gen-params-cc --check: OK (${fieldCount} fields)`);
    return;
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, content);
  console.log(`wrote ${path.relative(ROOT, OUTPUT_PATH)} (${fieldCount} fields)`);
}

main();
