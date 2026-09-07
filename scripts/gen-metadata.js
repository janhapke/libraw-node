#!/usr/bin/env node
// T14a: generates api/metadata.json, the field-level manifest of LibRaw's
// read-only metadata structs, from vendor/LibRaw/libraw/libraw_types.h
// (header facts: C type, array dimensions) merged with the hand-maintained
// api/metadata.annotations.json (doc string, JS-facing type, unset
// sentinel, notes). Same rationale as scripts/gen-manifest.js (T11): never
// let the generated surface drift from the vendored header, and make drift
// a hard failure instead of a silent skew.
//
// Six top-level groups (imgdata paths, see docs/explanation/
// libraw-api-surface.md's "The metadata you get after open_*"):
//   idata               -> imgdata.idata               (libraw_iparams_t)
//   sizes               -> imgdata.sizes                (libraw_image_sizes_t)
//   other               -> imgdata.other                (libraw_imgother_t)
//   lens                -> imgdata.lens                 (libraw_lensinfo_t)
//   color               -> imgdata.color                (libraw_colordata_t)
//   makernotes.common   -> imgdata.makernotes.common     (libraw_metadata_common_t)
//   makernotes.canon      -> imgdata.makernotes.canon      (libraw_canon_makernotes_t)
//   makernotes.nikon      -> imgdata.makernotes.nikon      (libraw_nikon_makernotes_t)
//   makernotes.sony       -> imgdata.makernotes.sony       (libraw_sony_info_t)
//   makernotes.fuji       -> imgdata.makernotes.fuji       (libraw_fuji_info_t)
//   makernotes.olympus    -> imgdata.makernotes.olympus    (libraw_olympus_makernotes_t)
//   makernotes.panasonic  -> imgdata.makernotes.panasonic  (libraw_panasonic_makernotes_t)
//   makernotes.pentax     -> imgdata.makernotes.pentax     (libraw_pentax_makernotes_t)
//   makernotes.samsung    -> imgdata.makernotes.samsung    (libraw_samsung_makernotes_t)
//   makernotes.kodak      -> imgdata.makernotes.kodak      (libraw_kodak_makernotes_t)
//   makernotes.p1         -> imgdata.makernotes.phaseone   (libraw_p1_makernotes_t --
//                             LibRaw's own field name is `phaseone`, the JS-facing
//                             group key is `p1` per docs/plan/tasks.md's T14b list)
//   makernotes.hasselblad -> imgdata.makernotes.hasselblad (libraw_hasselblad_makernotes_t)
//   makernotes.ricoh      -> imgdata.makernotes.ricoh      (libraw_ricoh_makernotes_t)
// (the last twelve are T14b; the first six are T14a)
//
// Unlike gen-manifest.js's two structs (flat, no nesting), these eighteen
// nest typedef'd sub-structs (e.g. libraw_lensinfo_t.nikon is a
// libraw_nikonlens_t, libraw_nikon_makernotes_t.SensorHighSpeedCrop is a
// libraw_sensor_highspeed_crop_t) and one non-typedef'd one (libraw_colordata_t.
// phase_one_data is a `struct ph1_t`). scripts/lib/cstruct.js's field parser
// reports each such field's C type as its `baseType`; this generator
// recursively parses (and requires annotations for) every struct type it
// reaches this way, keyed by that exact baseType string (e.g.
// "libraw_nikonlens_t", "struct ph1_t") in both api/metadata.json's
// `structs` map and api/metadata.annotations.json's `structs` map. A struct
// type reached from more than one place (there are none among these
// eighteen groups' fields, but the scheme supports it) is parsed and
// annotated once, not once per reference path.
//
// Outputs:
//   api/metadata.json -- deterministic (header field order, no timestamps),
//     committed.
//
// Usage:
//   node scripts/gen-metadata.js          regenerate api/metadata.json
//   node scripts/gen-metadata.js --check  exit 1 if stale or uncovered
//
// `npm run gen:metadata` runs the first form; `npm run gen:check` runs the
// second (alongside every other generator's own --check).
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { extractStructBody, parseStructFields, parseNumericMacros } = require('./lib/cstruct.js');
const { relativePosix } = require('./lib/paths.js');

const ROOT = path.resolve(__dirname, '..');
const TYPES_HEADER_PATH = path.join(ROOT, 'vendor/LibRaw/libraw/libraw_types.h');
const CONST_HEADER_PATH = path.join(ROOT, 'vendor/LibRaw/libraw/libraw_const.h');
const VERSION_HEADER_PATH = path.join(ROOT, 'vendor/LibRaw/libraw/libraw_version.h');
const ANNOTATIONS_PATH = path.join(ROOT, 'api/metadata.annotations.json');
const OUTPUT_PATH = path.join(ROOT, 'api/metadata.json');

// The six top-level groups this generator covers, in the order they should
// appear in api/metadata.json and in identify()/Processor.metadata's result
// object.
const GROUPS = [
  { key: 'idata', cTypeName: 'libraw_iparams_t', imgdataPath: 'imgdata.idata' },
  { key: 'sizes', cTypeName: 'libraw_image_sizes_t', imgdataPath: 'imgdata.sizes' },
  { key: 'other', cTypeName: 'libraw_imgother_t', imgdataPath: 'imgdata.other' },
  { key: 'lens', cTypeName: 'libraw_lensinfo_t', imgdataPath: 'imgdata.lens' },
  { key: 'color', cTypeName: 'libraw_colordata_t', imgdataPath: 'imgdata.color' },
  { key: 'makernotes.common', cTypeName: 'libraw_metadata_common_t', imgdataPath: 'imgdata.makernotes.common' },
  // T14b: per-vendor makernotes, landed in this order (docs/plan/tasks.md's T14b list).
  { key: 'makernotes.canon', cTypeName: 'libraw_canon_makernotes_t', imgdataPath: 'imgdata.makernotes.canon' },
  { key: 'makernotes.nikon', cTypeName: 'libraw_nikon_makernotes_t', imgdataPath: 'imgdata.makernotes.nikon' },
  { key: 'makernotes.sony', cTypeName: 'libraw_sony_info_t', imgdataPath: 'imgdata.makernotes.sony' },
  { key: 'makernotes.fuji', cTypeName: 'libraw_fuji_info_t', imgdataPath: 'imgdata.makernotes.fuji' },
  { key: 'makernotes.olympus', cTypeName: 'libraw_olympus_makernotes_t', imgdataPath: 'imgdata.makernotes.olympus' },
  { key: 'makernotes.panasonic', cTypeName: 'libraw_panasonic_makernotes_t', imgdataPath: 'imgdata.makernotes.panasonic' },
  { key: 'makernotes.pentax', cTypeName: 'libraw_pentax_makernotes_t', imgdataPath: 'imgdata.makernotes.pentax' },
  { key: 'makernotes.samsung', cTypeName: 'libraw_samsung_makernotes_t', imgdataPath: 'imgdata.makernotes.samsung' },
  { key: 'makernotes.kodak', cTypeName: 'libraw_kodak_makernotes_t', imgdataPath: 'imgdata.makernotes.kodak' },
  // LibRaw's own field name for this one is `phaseone`, not `p1` -- see the
  // header comment above.
  { key: 'makernotes.p1', cTypeName: 'libraw_p1_makernotes_t', imgdataPath: 'imgdata.makernotes.phaseone' },
  { key: 'makernotes.hasselblad', cTypeName: 'libraw_hasselblad_makernotes_t', imgdataPath: 'imgdata.makernotes.hasselblad' },
  { key: 'makernotes.ricoh', cTypeName: 'libraw_ricoh_makernotes_t', imgdataPath: 'imgdata.makernotes.ricoh' },
];

// A field's baseType is a reference to another struct this generator must
// also parse iff it looks like a LibRaw struct typedef (libraw_..._t) or is
// the one non-typedef'd exception, "struct ph1_t". Neither pattern collides
// with any scalar C type these six groups' fields actually use (int,
// unsigned, char, short, float, double, time_t, INT64, UINT64, void*, ...).
function isStructTypeReference(baseType) {
  return /^libraw_\w+_t$/.test(baseType) || baseType === 'struct ph1_t';
}

// extractStructBody wants the bare struct name for its "struct NAME {"
// fallback form; "struct ph1_t" as a baseType needs that prefix stripped
// before the lookup (the typedef'd forms have no prefix to strip).
function structLookupName(baseType) {
  return baseType.startsWith('struct ') ? baseType.slice('struct '.length) : baseType;
}

function parseLibRawVersion(versionHeaderSrc) {
  const major = versionHeaderSrc.match(/#define\s+LIBRAW_MAJOR_VERSION\s+(\d+)/);
  const minor = versionHeaderSrc.match(/#define\s+LIBRAW_MINOR_VERSION\s+(\d+)/);
  const patch = versionHeaderSrc.match(/#define\s+LIBRAW_PATCH_VERSION\s+(\d+)/);
  if (!major || !minor || !patch) {
    throw new Error(`could not parse LIBRAW_{MAJOR,MINOR,PATCH}_VERSION from ${VERSION_HEADER_PATH}`);
  }
  return {
    major: Number(major[1]),
    minor: Number(minor[1]),
    patch: Number(patch[1]),
    string: `${major[1]}.${minor[1]}.${patch[1]}`,
  };
}

function loadAnnotations() {
  if (!fs.existsSync(ANNOTATIONS_PATH)) {
    throw new Error(`annotations file not found: ${path.relative(ROOT, ANNOTATIONS_PATH)}`);
  }
  const raw = fs.readFileSync(ANNOTATIONS_PATH, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`${path.relative(ROOT, ANNOTATIONS_PATH)}: invalid JSON: ${err.message}`);
  }
  if (!parsed.structs || typeof parsed.structs !== 'object') {
    throw new Error(`${path.relative(ROOT, ANNOTATIONS_PATH)}: missing top-level "structs" object`);
  }
  return parsed;
}

// Recursively resolves `cTypeName` (a struct typedef name, or "struct
// ph1_t") into `structsOut` (keyed by the exact reference string), parsing
// every nested struct-typed field it reaches along the way. `errors`
// collects coverage problems (mirrors gen-manifest.js's --check behaviour:
// report every problem at once, not just the first) instead of throwing
// immediately for missing annotations -- a malformed header parse (cstruct
// itself throwing) is still a hard, immediate failure, since there is no
// sensible partial result to report in that case.
function resolveStruct(cTypeName, headerSrc, macros, annotations, structsOut, errors) {
  if (structsOut[cTypeName]) return; // already resolved (shared sub-struct type)

  const lookupName = structLookupName(cTypeName);
  const body = extractStructBody(headerSrc, lookupName, TYPES_HEADER_PATH);
  const headerFields = parseStructFields(body, lookupName, macros);
  const headerFieldNames = new Set(headerFields.map((f) => f.name));

  const structAnnotations = annotations.structs[cTypeName];
  if (!structAnnotations || typeof structAnnotations !== 'object') {
    errors.push(`${cTypeName}: missing "structs.${cTypeName}" object in ${path.relative(ROOT, ANNOTATIONS_PATH)}`);
    structsOut[cTypeName] = { cType: cTypeName, fieldOrder: headerFields.map((f) => f.name), fields: {} };
    return;
  }

  for (const annotatedName of Object.keys(structAnnotations)) {
    if (!headerFieldNames.has(annotatedName)) {
      errors.push(`${cTypeName}.${annotatedName}: annotated but no such field in ${lookupName} (${path.relative(ROOT, TYPES_HEADER_PATH)})`);
    }
  }

  const fieldsOut = {};
  // Register this struct's own entry before recursing into its nested
  // struct-typed fields, so a (hypothetical) cyclic reference cannot recurse
  // forever -- none of LibRaw's structs are actually self-referential, but
  // the guard is free.
  structsOut[cTypeName] = { cType: cTypeName, fieldOrder: headerFields.map((f) => f.name), fields: fieldsOut };

  for (const field of headerFields) {
    const annotation = structAnnotations[field.name];
    if (!annotation) {
      errors.push(`${cTypeName}.${field.name}: field in ${lookupName} has no annotation in ${path.relative(ROOT, ANNOTATIONS_PATH)}`);
      continue;
    }
    const entry = {
      doc: annotation.doc,
      type: annotation.type,
    };
    if ('unset' in annotation) entry.unset = annotation.unset;
    if (annotation.notes) entry.notes = annotation.notes;
    entry.cType = field.cType;
    if (field.arrayDims.length > 0) entry.cArrayDims = field.arrayDims;
    if (field.pointerDepth > 0) entry.pointerDepth = field.pointerDepth;
    fieldsOut[field.name] = entry;

    if (isStructTypeReference(field.baseType) && field.pointerDepth === 0) {
      resolveStruct(field.baseType, headerSrc, macros, annotations, structsOut, errors);
    }
  }
}

function buildManifest() {
  const headerSrc = fs.readFileSync(TYPES_HEADER_PATH, 'utf8');
  const constHeaderSrc = fs.readFileSync(CONST_HEADER_PATH, 'utf8');
  const versionHeaderSrc = fs.readFileSync(VERSION_HEADER_PATH, 'utf8');
  const libraw = parseLibRawVersion(versionHeaderSrc);
  const annotations = loadAnnotations();
  // Array-length macros (LIBRAW_CBLACK_SIZE, LIBRAW_AFDATA_MAXCOUNT, ...)
  // live in libraw_const.h, not libraw_types.h itself.
  const macros = parseNumericMacros(constHeaderSrc);

  const errors = [];
  const structsOut = {};
  const groupsOut = {};
  const report = [];

  for (const group of GROUPS) {
    resolveStruct(group.cTypeName, headerSrc, macros, annotations, structsOut, errors);
    groupsOut[group.key] = { cType: group.cTypeName, imgdataPath: group.imgdataPath };
    const fieldCount = structsOut[group.cTypeName] ? Object.keys(structsOut[group.cTypeName].fields).length : 0;
    report.push({ group: group.key, cType: group.cTypeName, count: fieldCount });
  }

  // Also report every nested struct type resolved along the way, for
  // --check's/gen's printed summary (helps a reviewer see the full set of
  // structs this generator now covers, not only the six top-level ones).
  const nestedReport = Object.keys(structsOut)
    .filter((name) => !GROUPS.some((g) => g.cTypeName === name))
    .sort()
    .map((name) => ({ struct: name, count: Object.keys(structsOut[name].fields).length }));

  const manifest = {
    generator: 'scripts/gen-metadata.js',
    libraw: { version: libraw.string, major: libraw.major, minor: libraw.minor, patch: libraw.patch },
    source: relativePosix(ROOT, TYPES_HEADER_PATH),
    groups: groupsOut,
    structs: structsOut,
  };

  return { manifest, report, nestedReport, errors };
}

function renderJson(manifest) {
  return JSON.stringify(manifest, null, 2) + '\n';
}

function main() {
  const check = process.argv.includes('--check');
  const { manifest, report, nestedReport, errors } = buildManifest();
  const content = renderJson(manifest);

  const reportLine = report.map((r) => `${r.group} (${r.cType}): ${r.count} fields`).join(', ');
  const nestedLine = nestedReport.map((r) => `${r.struct}: ${r.count} fields`).join(', ');

  if (check) {
    let failed = false;
    if (errors.length > 0) {
      failed = true;
      for (const err of errors) console.error(`error: ${err}`);
    }
    const current = fs.existsSync(OUTPUT_PATH) ? fs.readFileSync(OUTPUT_PATH, 'utf8') : null;
    if (current !== content) {
      failed = true;
      console.error(`stale: ${path.relative(ROOT, OUTPUT_PATH)}`);
    }
    console.log(reportLine);
    console.log(`nested structs: ${nestedLine}`);
    if (failed) {
      console.error('gen-metadata --check: FAILED');
      process.exit(1);
    }
    console.log('gen-metadata --check: OK');
    return;
  }

  if (errors.length > 0) {
    for (const err of errors) console.error(`error: ${err}`);
    console.error(reportLine);
    console.error('gen-metadata: FAILED (fix annotation coverage before generating)');
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, content);
  console.log(`wrote ${path.relative(ROOT, OUTPUT_PATH)}`);
  console.log(reportLine);
  console.log(`nested structs: ${nestedLine}`);
}

main();
