#!/usr/bin/env node
// T11: generates api/params.json, the field-level manifest of LibRaw's two
// user-facing option structs, from vendor/LibRaw/libraw/libraw_types.h
// (header facts: C type, array length) merged with the hand-maintained
// api/params.annotations.json (doc string, JS-facing type, default, enum /
// flags, min / max, notes). Same rationale as scripts/gen-errors.js and
// scripts/gen-progress.js: never let the generated surface drift from the
// vendored header, and make drift a hard failure instead of a silent skew.
//
// Structs covered (both live in imgdata, see libraw_types.h):
//   libraw_output_params_t      -> imgdata.params     (JSON key "params")
//   libraw_raw_unpack_params_t  -> imgdata.rawparams   (JSON key "rawparams")
//
// The header parser is a small C struct field parser, not a general C
// parser: it only needs to understand the shapes LibRaw actually uses for
// these two structs -- scalars (int, unsigned, float, double), fixed-size
// arrays (float gamm[6], unsigned greybox[4], char p4shot_order[5]), single
// pointers (char *output_profile) and pointer-to-pointer (char
// **custom_camera_strings). It reads the field list straight out of the
// struct body between "typedef struct" and "} <name>;" -- no macro
// expansion, no nested structs (neither struct nests another).
//
// Outputs:
//   api/params.json -- deterministic (header field order, no timestamps),
//     committed. Header block records the LibRaw version and this script's
//     name so a stale copy is easy to spot in review.
//
// Usage:
//   node scripts/gen-manifest.js          regenerate api/params.json
//   node scripts/gen-manifest.js --check  exit 1 if stale or uncovered
//
// `npm run gen:manifest` runs the first form; `npm run gen:check` (which
// also runs gen:errors --check and gen:progress --check) runs the second.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { extractStructBody, parseStructFields } = require('./lib/cstruct.js');
const { relativePosix } = require('./lib/paths.js');

const ROOT = path.resolve(__dirname, '..');
const TYPES_HEADER_PATH = path.join(ROOT, 'vendor/LibRaw/libraw/libraw_types.h');
const VERSION_HEADER_PATH = path.join(ROOT, 'vendor/LibRaw/libraw/libraw_version.h');
const ANNOTATIONS_PATH = path.join(ROOT, 'api/params.annotations.json');
const OUTPUT_PATH = path.join(ROOT, 'api/params.json');

// The two structs this generator covers, in the order they should appear in
// api/params.json. `annotationKey` is also the key under which each struct's
// per-field annotations live in api/params.annotations.json.
const STRUCTS = [
  {
    annotationKey: 'params',
    cTypeName: 'libraw_output_params_t',
    imgdataPath: 'imgdata.params',
  },
  {
    annotationKey: 'rawparams',
    cTypeName: 'libraw_raw_unpack_params_t',
    imgdataPath: 'imgdata.rawparams',
  },
];

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

// T14a: the field parser itself (struct-body extraction, declaration
// tokenizing) moved to scripts/lib/cstruct.js, generalized to also handle
// scripts/gen-metadata.js's nested/2-D/typedef'd-struct needs. This file now
// only adapts cstruct's field shape ({ name, baseType, pointerDepth,
// arrayDims, cType }) to the flat { name, cType, pointerDepth, arrayLength }
// shape api/params.json has always used -- neither libraw_output_params_t
// nor libraw_raw_unpack_params_t declares a 2-D array or a comma-separated
// multi-name declarator sharing an array suffix, so `arrayDims` never has
// more than one entry here (asserted below, not just assumed).
function parseParamsStructFields(headerSrc, cTypeName) {
  const body = extractStructBody(headerSrc, cTypeName, TYPES_HEADER_PATH);
  const rawFields = parseStructFields(body, cTypeName);
  return rawFields.map((f) => {
    if (f.arrayDims.length > 1) {
      throw new Error(`gen-manifest: ${cTypeName}.${f.name} has a ${f.arrayDims.length}-D array; ` +
        'params/rawparams are not expected to declare one -- update this adapter if that changes.');
    }
    return {
      name: f.name,
      cType: f.cType,
      pointerDepth: f.pointerDepth,
      arrayLength: f.arrayDims.length === 1 ? f.arrayDims[0] : null,
    };
  });
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
  return parsed;
}

// Builds the manifest and returns { manifest, report, errors }.
// `report` carries per-struct field counts for --check's required output;
// `errors` lists every coverage problem (header field with no annotation,
// annotation with no header field) so --check can print all of them at once
// instead of failing on the first.
function buildManifest() {
  const headerSrc = fs.readFileSync(TYPES_HEADER_PATH, 'utf8');
  const versionHeaderSrc = fs.readFileSync(VERSION_HEADER_PATH, 'utf8');
  const libraw = parseLibRawVersion(versionHeaderSrc);
  const annotations = loadAnnotations();

  const errors = [];
  const report = [];
  const structsOut = {};

  for (const structDef of STRUCTS) {
    const { annotationKey, cTypeName, imgdataPath } = structDef;
    const headerFields = parseParamsStructFields(headerSrc, cTypeName);
    const headerFieldNames = new Set(headerFields.map((f) => f.name));

    const structAnnotations = annotations[annotationKey];
    if (!structAnnotations || typeof structAnnotations !== 'object') {
      errors.push(`${annotationKey}: missing "${annotationKey}" object in ${path.relative(ROOT, ANNOTATIONS_PATH)}`);
      report.push({ struct: annotationKey, cType: cTypeName, count: headerFields.length });
      continue;
    }

    // Annotation present with no matching header field (stale/typo/removed).
    for (const annotatedName of Object.keys(structAnnotations)) {
      if (!headerFieldNames.has(annotatedName)) {
        errors.push(`${annotationKey}.${annotatedName}: annotated but no such field in ${cTypeName} (${path.relative(ROOT, TYPES_HEADER_PATH)})`);
      }
    }

    const fieldsOut = {};
    for (const field of headerFields) {
      const annotation = structAnnotations[field.name];
      if (!annotation) {
        errors.push(`${annotationKey}.${field.name}: field in ${cTypeName} has no annotation in ${path.relative(ROOT, ANNOTATIONS_PATH)}`);
        continue;
      }
      const entry = {
        doc: annotation.doc,
        type: annotation.type,
      };
      if ('default' in annotation) entry.default = annotation.default;
      if (annotation.enum) entry.enum = annotation.enum;
      if (annotation.flags) entry.flags = annotation.flags;
      if ('min' in annotation) entry.min = annotation.min;
      if ('max' in annotation) entry.max = annotation.max;
      if (annotation.since) entry.since = annotation.since;
      if (annotation.notes) entry.notes = annotation.notes;
      entry.cType = field.cType;
      if (field.arrayLength !== null) entry.cArrayLength = field.arrayLength;
      fieldsOut[field.name] = entry;
    }

    structsOut[annotationKey] = {
      cType: cTypeName,
      imgdataPath,
      fieldOrder: headerFields.map((f) => f.name),
      fields: fieldsOut,
    };
    report.push({ struct: annotationKey, cType: cTypeName, count: headerFields.length });
  }

  const manifest = {
    generator: 'scripts/gen-manifest.js',
    libraw: { version: libraw.string, major: libraw.major, minor: libraw.minor, patch: libraw.patch },
    source: relativePosix(ROOT, TYPES_HEADER_PATH),
    structs: structsOut,
  };

  return { manifest, report, errors };
}

function renderJson(manifest) {
  return JSON.stringify(manifest, null, 2) + '\n';
}

function main() {
  const check = process.argv.includes('--check');
  const { manifest, report, errors } = buildManifest();
  const content = renderJson(manifest);

  const reportLine = report.map((r) => `${r.struct} (${r.cType}): ${r.count} fields`).join(', ');

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
    if (failed) {
      console.error('gen-manifest --check: FAILED');
      process.exit(1);
    }
    console.log('gen-manifest --check: OK');
    return;
  }

  if (errors.length > 0) {
    for (const err of errors) console.error(`error: ${err}`);
    console.error(reportLine);
    console.error('gen-manifest: FAILED (fix annotation coverage before generating)');
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, content);
  console.log(`wrote ${path.relative(ROOT, OUTPUT_PATH)}`);
  console.log(reportLine);
}

main();
