#!/usr/bin/env node
// T15: generates types/index.d.ts, the package's public TypeScript surface,
// from the three committed manifests (api/params.json, api/metadata.json,
// api/enums.json -- see scripts/gen-manifest.js, scripts/gen-metadata.js and
// scripts/gen-enums.js for how those are produced) spliced into
// scripts/templates/index.d.ts.tpl, which carries the hand-written parts
// (result shapes, the Processor class, module functions, LibRawError,
// buildInfo) that have no manifest to generate from -- those are read
// straight from lib/index.cjs, lib/processor.cjs, lib/fused.cjs,
// lib/errors.cjs and src/*.cc/.h (see that template file's own header
// comment for the exact source of each hand-written declaration).
//
// The four manifest-derived sections are spliced in at plain-text markers
// in the template (`/*GEN:ENUMS*/`, `/*GEN:PARAMS*/`, `/*GEN:RAWPARAMS*/`,
// `/*GEN:METADATA*/`) -- each marker line is replaced wholesale by this
// generator's output for that section, so editing types/index.d.ts by hand
// is always overwritten on the next `npm run gen:types` (a `--check` run
// catches that drift, same contract as every other generator in this
// package).
//
// Field-type mapping rules (api/params.json / api/metadata.json's `type`
// values -> TypeScript):
//   OutputParams/RawParams (every field optional -- these are *settable*
//   config; getParams()/getRawParams() type their return as
//   Required<OutputParams>/Required<RawParams>, which is sound because
//   ParamsToObject/RawParamsToObject -- src/generated/params.gen.cc --
//   always set every non-"unsupported" key on read):
//     bool            -> boolean
//     int/uint/float  -> number, JSDoc carries min/max/default
//     enum            -> a named union of the manifest's numeric literal
//                        values (e.g. `ParamsUseCameraMatrix = 0 | 1 | 3`),
//                        JSDoc lists the name for each value (no runtime
//                        object is invented for this -- there is no
//                        matching runtime export for per-field param enums,
//                        unlike the libraw_const.h-derived tables under
//                        `enums`, so a fake `const` here would lie about
//                        the runtime shape)
//     flags           -> `number | <Field>Name[]`, where `<Field>Name` is a
//                        named union of the exact flag-name strings
//                        CheckFlagsValue (src/generated/params.gen.cc)
//                        accepts (the full LIBRAW_*, not the short name)
//     string           -> `string` if the manifest gives a cArrayLength
//                        (fixed char[N] buffer, never null), else
//                        `string | null` (nullable char* pointer field)
//     int[]/float[]/uint[] -> a tuple of `number` at the manifest's exact
//                        cArrayLength
//     unsupported      -> omitted (a comment names the field and why)
//   Metadata (every field readonly -- this is read-only data LibRaw fills
//   in; a field is optional iff the C++ side can omit its key -- see
//   src/generated/metadata.gen.cc's withUnsetGuard and its uint64/profile
//   special cases):
//     int/uint/float/double/time -> number, optional iff the manifest
//                        entry has an `unset` sentinel
//     uint64           -> `number | bigint`, always optional (LibRaw's
//                        UINT64_MAX sentinel is handled in C++, never
//                        recorded in the manifest's `unset` field)
//     string, cArrayDims.length===1 -> string, optional (omitted when the
//                        NUL-trimmed value is empty)
//     string, scalar (no cArrayDims) -> string, optional iff `unset`
//     bytes            -> Buffer; optional only for colordata.profile (the
//                        one pointer-paired bytes field, omitted when
//                        null), required (always emitted) otherwise
//     int[]/float[]    -> a tuple of `number` at cArrayDims[0], required
//     matrix           -> a tuple of cArrayDims[0] tuples of cArrayDims[1]
//                        numbers, required -- except colordata.WB_Coeffs/
//                        WBCT_Coeffs, special-cased (like the C++ side) to
//                        the compacted `WbCoeffEntry[]`/`WbctCoeffEntry[]`
//                        shape
//     struct           -> the referenced struct's generated interface
//                        (named by transforming its cType, e.g.
//                        "libraw_canon_makernotes_t" -> "CanonMakernotes"),
//                        or a tuple of it at cArrayDims[0] when the
//                        manifest gives one -- except metadata_common.afdata,
//                        special-cased (like the C++ side, which only
//                        emits the first `afcount` of its 4 fixed slots) to
//                        a variable-length `AfinfoItem[]`, not a 4-tuple
//     unsupported      -> omitted (a comment names the field)
//
// Usage:
//   node scripts/gen-types.js          regenerate types/index.d.ts
//   node scripts/gen-types.js --check  exit 1 if the committed file is stale
//
// `npm run gen:types` runs the first form; `npm run gen:check` runs the
// second (alongside every other generator's own --check).
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PARAMS_MANIFEST_PATH = path.join(ROOT, 'api/params.json');
const METADATA_MANIFEST_PATH = path.join(ROOT, 'api/metadata.json');
const ENUMS_MANIFEST_PATH = path.join(ROOT, 'api/enums.json');
const TEMPLATE_PATH = path.join(ROOT, 'scripts/templates/index.d.ts.tpl');
const OUTPUT_PATH = path.join(ROOT, 'types/index.d.ts');

// --- small text helpers -----------------------------------------------------

// "use_camera_matrix" -> "UseCameraMatrix" (field names are already
// lowercase snake_case, so this only needs to capitalize each chunk).
function snakeToPascal(name) {
  return name
    .split('_')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join('');
}

// "libraw_canon_makernotes_t" -> "CanonMakernotes"; "struct ph1_t" -> "Ph1".
// Every cType string api/metadata.json's `structs` map is keyed by goes
// through this, so the result must be unique per cType -- verified by
// buildMetadataBlock's duplicate-name check below rather than assumed.
function cTypeToPascal(cType) {
  let s = cType;
  if (s.startsWith('struct ')) s = s.slice('struct '.length);
  if (s.startsWith('libraw_')) s = s.slice('libraw_'.length);
  if (s.endsWith('_t')) s = s.slice(0, -2);
  return s
    .split('_')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join('');
}

function tupleType(elemType, n) {
  return `[${Array(n).fill(elemType).join(', ')}]`;
}

// Renders `lines` (paragraphs; '' is a blank JSDoc line) as an indented
// JSDoc block. Lines are not wrapped -- source doc strings are already
// reasonably sized, and hard-wrapping risks breaking mid-identifier text
// (file paths, LIBRAW_* names) that shows up in a few of them.
function renderJsDoc(lines, indent) {
  const pad = ' '.repeat(indent);
  const body = lines
    .filter((l) => l !== undefined && l !== null)
    .map((l) => (l === '' ? `${pad} *` : `${pad} * ${l}`))
    .join('\n');
  return `${pad}/**\n${body}\n${pad} */`;
}

function jsonStr(v) {
  return JSON.stringify(v);
}

// --- enums.json -> `enums`/result-field types -------------------------------

// Mirrors lib/index.cjs's ENUM_ALIASES table verbatim (see this repo's
// README.md "Enums and flags" section) -- the friendly TS aliases below
// (`WarningName`, `CapabilityName`, ...) must name the exact same C enums
// under the exact same short aliases the runtime `enums` object uses.
const ENUM_ALIASES = {
  WARN: { cEnumName: 'LibRaw_warnings', friendlyName: 'WarningName' },
  CAPS: { cEnumName: 'LibRaw_runtime_capabilities', friendlyName: 'CapabilityName' },
  DECODER: { cEnumName: 'LibRaw_decoder_flags', friendlyName: 'DecoderFlagName' },
  RAWOPTIONS: { cEnumName: 'LibRaw_processing_options', friendlyName: 'RawOptionName' },
  PROGRESS: { cEnumName: 'LibRaw_progress', friendlyName: 'ProgressStageName' },
  ERRORS: { cEnumName: 'LibRaw_errors', friendlyName: 'ErrorName' },
  THUMBNAIL_FORMATS: { cEnumName: 'LibRaw_thumbnail_formats', friendlyName: 'ThumbnailFormatName' },
  INTERNAL_THUMBNAIL_FORMATS: { cEnumName: 'LibRaw_internal_thumbnail_formats', friendlyName: 'InternalThumbnailFormatName' },
  IMAGE_FORMATS: { cEnumName: 'LibRaw_image_formats', friendlyName: 'ImageFormatName' },
};

function buildEnumsBlock(manifest) {
  const enumNames = Object.keys(manifest.enums);
  const out = [];

  out.push(
    '// One table per enum in vendor/LibRaw/libraw/libraw_const.h (api/enums.json,',
    '// scripts/gen-enums.js) -- `kind` is "flags" when every value is 0 or a',
    "// single set bit, else \"enum\"; `NAME_TO_VALUE`/`VALUE_TO_NAME`/",
    '// `VALUE_TO_NAMES` are keyed by each enumerator\'s *short* name (the C name',
    "// with the enum's common LIBRAW_..._ prefix stripped) -- see README.md's",
    '// "Enums and flags" section.',
  );

  for (const enumName of enumNames) {
    const entry = manifest.enums[enumName];
    const shorts = entry.values.map((v) => v.short);
    const uniqueShorts = [...new Set(shorts)];
    const nameType = `${enumName}Name`;
    const tableType = `${enumName}Table`;

    out.push('');
    out.push(`/** Short enumerator names of \`${enumName}\` (${entry.prefix || 'no common prefix'}). */`);
    out.push(`export type ${nameType} = ${uniqueShorts.map(jsonStr).join(' | ')};`);
    out.push(`export interface ${tableType} {`);
    out.push(`  readonly kind: ${jsonStr(entry.kind)};`);
    out.push(`  readonly NAME_TO_VALUE: { readonly [K in ${nameType}]: number };`);
    out.push(`  readonly VALUE_TO_NAME: { readonly [value: string]: ${nameType} };`);
    out.push(`  readonly VALUE_TO_NAMES: { readonly [value: string]: readonly ${nameType}[] };`);
    out.push('}');
  }

  out.push('');
  out.push('/** One entry per C enum name in libraw_const.h -- `enums.all` (see README.md). */');
  out.push('export interface LibRawEnumsAll {');
  for (const enumName of enumNames) {
    out.push(`  readonly ${jsonStr(enumName)}: ${enumName}Table;`);
  }
  out.push('}');

  out.push('');
  out.push('/** `enums` (lib/index.cjs): `all` plus short, documented aliases for the families callers reach for most. */');
  out.push('export interface LibRawEnums {');
  out.push('  readonly all: LibRawEnumsAll;');
  for (const [alias, { cEnumName }] of Object.entries(ENUM_ALIASES)) {
    out.push(`  readonly ${alias}: ${cEnumName}Table;`);
  }
  out.push('}');

  out.push('');
  out.push('// Friendly aliases for the families decode()/identify()/Processor results and');
  out.push('// module functions below are typed against, matching lib/index.cjs\'s ENUM_ALIASES.');
  for (const [, { cEnumName, friendlyName }] of Object.entries(ENUM_ALIASES)) {
    out.push(`export type ${friendlyName} = ${cEnumName}Name;`);
  }

  return out.join('\n');
}

// --- params.json -> OutputParams/RawParams -----------------------------------

function paramFieldDocLines(field) {
  const lines = [field.doc];
  if (field.notes) lines.push('', field.notes);
  const bounds = [];
  if (typeof field.min === 'number') bounds.push(`>= ${field.min}`);
  if (typeof field.max === 'number') bounds.push(`<= ${field.max}`);
  if (bounds.length) lines.push('', `Range: ${bounds.join(', ')}.`);
  if (field.type === 'enum') {
    const entries = Object.entries(field.enum).map(([name, value]) => `${value} (${name})`);
    lines.push('', `Values: ${entries.join(', ')}.`);
  }
  if (field.type === 'flags') {
    const entries = Object.entries(field.flags).map(([name, value]) => `${name} = ${value}`);
    lines.push('', `Flags: ${entries.join(', ')}.`);
  }
  if ('default' in field) {
    lines.push('', `Default: \`${jsonStr(field.default)}\`.`);
  }
  return lines;
}

// Returns { tsType } and pushes any extra named type(s) this field needs
// (an enum's value union, a flags field's flag-name union) onto `extraDecls`.
// `typeNamePrefix` disambiguates same-named fields across params/rawparams
// ("options" appears in rawparams; every param-derived named type is
// prefixed with its struct so it can never collide with a hand-written or
// metadata-derived type of the same short name).
function paramFieldType(typeNamePrefix, fieldName, field, extraDecls) {
  const typeName = `${typeNamePrefix}${snakeToPascal(fieldName)}`;
  switch (field.type) {
    case 'bool':
      return 'boolean';
    case 'int':
    case 'uint':
    case 'float':
      return 'number';
    case 'enum': {
      const values = [...new Set(Object.values(field.enum))].sort((a, b) => a - b);
      const doc = Object.entries(field.enum)
        .map(([name, value]) => `${value} = ${name}`)
        .join(', ');
      extraDecls.push(`/** Named values for \`${fieldName}\`: ${doc}. */\nexport type ${typeName} = ${values.join(' | ')};`);
      return typeName;
    }
    case 'flags': {
      const names = Object.keys(field.flags);
      const nameType = `${typeName}Name`;
      extraDecls.push(`/** Flag names accepted for \`${fieldName}\` (OR'd together when given as an array). */\nexport type ${nameType} = ${names.map(jsonStr).join(' | ')};`);
      return `number | ${nameType}[]`;
    }
    case 'string':
      return field.cArrayLength ? 'string' : 'string | null';
    case 'int[]':
    case 'float[]':
    case 'uint[]':
      return tupleType('number', field.cArrayLength);
    default:
      throw new Error(`gen-types: paramFieldType: unhandled field type ${jsonStr(field.type)} for ${fieldName}`);
  }
}

function buildParamsInterface(interfaceName, typeNamePrefix, structDef) {
  const extraDecls = [];
  const lines = [];
  lines.push(
    `/** Settable fields of \`${structDef.cType}\` (${structDef.imgdataPath}). Every field is optional -- pass only the ones you want to change; \`getParams()\`/\`getRawParams()\` return every field populated (\`Required<${interfaceName}>\`). See docs/reference/${interfaceName === 'OutputParams' ? 'params' : 'rawparams'}.md. */`,
  );
  lines.push(`export interface ${interfaceName} {`);
  for (const name of structDef.fieldOrder) {
    const field = structDef.fields[name];
    if (field.type === 'unsupported') {
      lines.push(`  // ${name}: unsupported -- ${field.doc} Not settable/readable through this API; see api/params.json.`);
      continue;
    }
    const tsType = paramFieldType(typeNamePrefix, name, field, extraDecls);
    lines.push(renderJsDoc(paramFieldDocLines(field), 2));
    lines.push(`  ${name}?: ${tsType};`);
  }
  lines.push('}');
  return { text: lines.join('\n'), extraDecls };
}

function buildParamsBlock(manifest, structKey, interfaceName, typeNamePrefix) {
  const { text, extraDecls } = buildParamsInterface(interfaceName, typeNamePrefix, manifest.structs[structKey]);
  return [...extraDecls, '', text].join('\n');
}

// --- metadata.json -> Metadata and nested struct interfaces ------------------

function metadataFieldDocLines(field) {
  const lines = [field.doc];
  if (field.notes) lines.push('', field.notes);
  if ('unset' in field) {
    lines.push('', `Key is omitted when the underlying value equals LibRaw's unset sentinel (${jsonStr(field.unset)}).`);
  }
  if (field.type === 'uint64') {
    lines.push(
      '',
      "Key is omitted when LibRaw has not filled in this field (LibRaw's own sentinel is UINT64_MAX, not representable in the manifest). Present as a plain number when it fits Number.MAX_SAFE_INTEGER, otherwise a BigInt.",
    );
  }
  return lines;
}

// Returns { tsType, optional } or null for an "unsupported" field.
function metadataFieldType(structKey, name, field, structNameOf) {
  switch (field.type) {
    case 'unsupported':
      return null;
    case 'int':
    case 'uint':
    case 'float':
    case 'double':
    case 'time':
      return { tsType: 'number', optional: 'unset' in field };
    case 'uint64':
      return { tsType: 'number | bigint', optional: true };
    case 'string':
      if (field.cArrayDims && field.cArrayDims.length === 1) {
        return { tsType: 'string', optional: true }; // omitted when the trimmed value is empty
      }
      return { tsType: 'string', optional: 'unset' in field }; // scalar char (e.g. a GPS ref code)
    case 'bytes': {
      const isProfile = structKey === 'libraw_colordata_t' && name === 'profile';
      return { tsType: 'Buffer', optional: isProfile };
    }
    case 'int[]':
    case 'float[]':
      return { tsType: tupleType('number', field.cArrayDims[0]), optional: false };
    case 'matrix': {
      if (structKey === 'libraw_colordata_t' && name === 'WB_Coeffs') {
        return { tsType: 'readonly WbCoeffEntry[]', optional: false };
      }
      if (structKey === 'libraw_colordata_t' && name === 'WBCT_Coeffs') {
        return { tsType: 'readonly WbctCoeffEntry[]', optional: false };
      }
      const [d0, d1] = field.cArrayDims;
      return { tsType: tupleType(tupleType('number', d1), d0), optional: false };
    }
    case 'struct': {
      const nestedName = structNameOf(field.cType);
      if (structKey === 'libraw_metadata_common_t' && name === 'afdata') {
        // Only the first `afcount` of the 4 fixed slots are emitted -- see
        // src/generated/metadata.gen.cc's afdata special case -- so this is
        // a variable-length array, not a 4-tuple.
        return { tsType: `readonly ${nestedName}[]`, optional: false };
      }
      if (field.cArrayDims && field.cArrayDims.length === 1) {
        return { tsType: tupleType(nestedName, field.cArrayDims[0]), optional: false };
      }
      return { tsType: nestedName, optional: false };
    }
    default:
      throw new Error(`gen-types: metadataFieldType: unhandled field type ${jsonStr(field.type)} for ${structKey}.${name}`);
  }
}

// Extra fields synthesized by src/generated/metadata.gen.cc / src/fused.cc
// that have no corresponding api/metadata.json field -- currently only
// sizes.oriented (T14a acceptance: width/height already swapped for a 5/6
// flip). Keyed by struct cType.
const SYNTHETIC_FIELDS = {
  libraw_image_sizes_t: [
    {
      name: 'oriented',
      doc: lines(
        "Convenience width/height with a 5 or 6 `flip` already swapped, so most callers never need to check `flip` themselves. Synthesized by MetadataToObject (src/generated/metadata.gen.cc's caller) -- not a field of libraw_image_sizes_t itself.",
      ),
      tsType: '{ readonly width: number; readonly height: number }',
    },
  ],
};

function lines(...args) {
  return args;
}

function buildStructInterface(cType, structDef, structNameOf) {
  const name = structNameOf(cType);
  const out = [`export interface ${name} {`];
  for (const fieldName of structDef.fieldOrder) {
    const field = structDef.fields[fieldName];
    if (field.type === 'unsupported') {
      out.push(`  // ${fieldName}: unsupported -- ${field.doc} No safe JS representation; see api/metadata.json.`);
      continue;
    }
    const t = metadataFieldType(cType, fieldName, field, structNameOf);
    out.push(renderJsDoc(metadataFieldDocLines(field), 2));
    out.push(`  readonly ${fieldName}${t.optional ? '?' : ''}: ${t.tsType};`);
  }
  for (const synthetic of SYNTHETIC_FIELDS[cType] || []) {
    out.push(renderJsDoc(synthetic.doc, 2));
    out.push(`  readonly ${synthetic.name}: ${synthetic.tsType};`);
  }
  out.push('}');
  return out.join('\n');
}

function buildMetadataBlock(manifest) {
  const structKeys = Object.keys(manifest.structs);
  const structNames = new Map(structKeys.map((k) => [k, cTypeToPascal(k)]));

  const seen = new Map();
  for (const [cType, name] of structNames) {
    if (seen.has(name)) {
      throw new Error(`gen-types: buildMetadataBlock: cType name collision: ${cType} and ${seen.get(name)} both map to ${name}`);
    }
    seen.set(name, cType);
  }
  const structNameOf = (cType) => {
    const name = structNames.get(cType);
    if (!name) throw new Error(`gen-types: buildMetadataBlock: unresolved struct reference ${jsonStr(cType)}`);
    return name;
  };

  const out = [];
  out.push(
    '// Compacted illuminant/color-temperature white-balance coefficient entries',
    "// (colordata.WB_Coeffs/WBCT_Coeffs) -- see src/generated/metadata.gen.cc's",
    '// special cases for these two fields.',
    'export interface WbCoeffEntry {',
    '  readonly illuminant: number;',
    '  readonly coeffs: readonly [number, number, number, number];',
    '}',
    'export interface WbctCoeffEntry {',
    '  readonly colorTemperature: number;',
    '  readonly coeffs: readonly [number, number, number, number];',
    '}',
  );

  for (const cType of structKeys) {
    out.push('');
    out.push(buildStructInterface(cType, manifest.structs[cType], structNameOf));
  }

  out.push('');
  out.push(
    '/**',
    ' * Read-only metadata mirror of `imgdata` (identify()\'s `metadata` result field,',
    ' * and Processor.metadata) -- see docs/reference/metadata.md.',
    ' */',
  );
  out.push('export interface Metadata {');
  const topLevel = [];
  const makernotes = [];
  for (const [groupKey, group] of Object.entries(manifest.groups)) {
    const iface = structNameOf(group.cType);
    if (groupKey.startsWith('makernotes.')) {
      makernotes.push(`    readonly ${groupKey.slice('makernotes.'.length)}: ${iface};`);
    } else {
      topLevel.push(`  readonly ${groupKey}: ${iface};`);
    }
  }
  out.push(...topLevel);
  out.push('  readonly makernotes: {');
  out.push(...makernotes);
  out.push('  };');
  out.push('}');

  return out.join('\n');
}

// --- main --------------------------------------------------------------------

function main() {
  const check = process.argv.includes('--check');

  const paramsManifest = JSON.parse(fs.readFileSync(PARAMS_MANIFEST_PATH, 'utf8'));
  const metadataManifest = JSON.parse(fs.readFileSync(METADATA_MANIFEST_PATH, 'utf8'));
  const enumsManifest = JSON.parse(fs.readFileSync(ENUMS_MANIFEST_PATH, 'utf8'));

  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`gen-types: template not found: ${path.relative(ROOT, TEMPLATE_PATH)}`);
  }
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

  const enumsBlock = buildEnumsBlock(enumsManifest);
  const paramsBlock = buildParamsBlock(paramsManifest, 'params', 'OutputParams', 'Params');
  const rawparamsBlock = buildParamsBlock(paramsManifest, 'rawparams', 'RawParams', 'RawParams');
  const metadataBlock = buildMetadataBlock(metadataManifest);

  const markers = {
    '/*GEN:ENUMS*/': enumsBlock,
    '/*GEN:PARAMS*/': paramsBlock,
    '/*GEN:RAWPARAMS*/': rawparamsBlock,
    '/*GEN:METADATA*/': metadataBlock,
  };

  let content = template;
  for (const [marker, block] of Object.entries(markers)) {
    if (!content.includes(marker)) {
      throw new Error(`gen-types: template missing marker ${marker}`);
    }
    content = content.replace(marker, () => block);
  }

  const banner =
    '// GENERATED FILE -- do not edit by hand.\n' +
    '// Regenerate with `npm run gen:types` (scripts/gen-types.js), which splices\n' +
    '// api/params.json, api/metadata.json and api/enums.json into the hand-written\n' +
    '// template scripts/templates/index.d.ts.tpl. Edit that template for the\n' +
    '// hand-written parts (result shapes, Processor, module functions,\n' +
    '// LibRawError, buildInfo); edit the api/*.annotations.json files (then\n' +
    '// regenerate their manifest) for the generated parts.\n\n';
  content = banner + content;

  if (!content.endsWith('\n')) content += '\n';

  if (check) {
    const current = fs.existsSync(OUTPUT_PATH) ? fs.readFileSync(OUTPUT_PATH, 'utf8') : null;
    if (current !== content) {
      console.error(`stale: ${path.relative(ROOT, OUTPUT_PATH)}`);
      console.error('gen-types --check: FAILED');
      process.exit(1);
    }
    console.log('gen-types --check: OK');
    return;
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, content);
  console.log(`wrote ${path.relative(ROOT, OUTPUT_PATH)}`);
}

main();
