#!/usr/bin/env node
// T15: generates the four Markdown reference tables under docs/reference/
// (params.md, rawparams.md, metadata.md, enums.md) straight from the same
// three committed manifests scripts/gen-types.js reads (api/params.json,
// api/metadata.json, api/enums.json) -- so the generated types and the
// generated docs can never drift from each other or from the vendored
// LibRaw header they both ultimately come from.
//
// Each output file starts with a "generated, do not edit" banner naming
// this generator; docs/README.md links all four from its Reference section.
//
// Usage:
//   node scripts/gen-docs.js          regenerate all four files
//   node scripts/gen-docs.js --check  exit 1 if any is stale
//
// `npm run gen:docs` runs the first form; `npm run gen:check` runs the
// second (alongside every other generator's own --check).
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PARAMS_MANIFEST_PATH = path.join(ROOT, 'api/params.json');
const METADATA_MANIFEST_PATH = path.join(ROOT, 'api/metadata.json');
const ENUMS_MANIFEST_PATH = path.join(ROOT, 'api/enums.json');

const OUTPUTS = {
  params: path.join(ROOT, 'docs/reference/params.md'),
  rawparams: path.join(ROOT, 'docs/reference/rawparams.md'),
  metadata: path.join(ROOT, 'docs/reference/metadata.md'),
  enums: path.join(ROOT, 'docs/reference/enums.md'),
};

// --- helpers -----------------------------------------------------------------

function escapeMd(text) {
  return String(text).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function code(text) {
  return `\`${text}\``;
}

function banner(title, generatorRelPath, sourceNote) {
  return [
    `# ${title}`,
    '',
    `> Generated file -- do not edit by hand. Regenerate with \`npm run gen:docs\` (${generatorRelPath}).`,
    `> Source: ${sourceNote}.`,
    '',
  ].join('\n');
}

function table(headers, rows) {
  const headerLine = `| ${headers.join(' | ')} |`;
  const sepLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const rowLines = rows.map((r) => `| ${r.join(' | ')} |`);
  return [headerLine, sepLine, ...rowLines].join('\n');
}

// --- params.md / rawparams.md -------------------------------------------------

function describeParamType(field) {
  switch (field.type) {
    case 'bool':
      return 'boolean';
    case 'int':
      return 'number (int)';
    case 'uint':
      return 'number (uint)';
    case 'float':
      return 'number (float)';
    case 'enum':
      return 'enum (number)';
    case 'flags':
      return 'flags (`number \\| name[]`)';
    case 'string':
      return field.cArrayLength ? `string (max ${field.cArrayLength - 1} chars)` : 'string \\| null';
    case 'int[]':
    case 'float[]':
    case 'uint[]':
      return `number[${field.cArrayLength}]`;
    case 'unsupported':
      return 'unsupported';
    default:
      throw new Error(`gen-docs: describeParamType: unhandled type ${JSON.stringify(field.type)}`);
  }
}

function describeParamRange(field) {
  if (field.type === 'enum') {
    return Object.entries(field.enum)
      .map(([name, value]) => `${value}=${name}`)
      .join(', ');
  }
  if (field.type === 'flags') {
    return Object.entries(field.flags)
      .map(([name, value]) => `${name}=${value}`)
      .join(', ');
  }
  const bounds = [];
  if (typeof field.min === 'number') bounds.push(`>= ${field.min}`);
  if (typeof field.max === 'number') bounds.push(`<= ${field.max}`);
  return bounds.length ? bounds.join(', ') : '—';
}

function renderParamsDoc(title, generatorRelPath, structDef) {
  const rows = structDef.fieldOrder.map((name) => {
    const f = structDef.fields[name];
    const def = 'default' in f && f.default !== null ? code(JSON.stringify(f.default)) : f.default === null ? 'null' : '—';
    const desc = escapeMd(f.doc + (f.notes ? ` ${f.notes}` : ''));
    return [code(name), describeParamType(f), def, escapeMd(describeParamRange(f)), desc];
  });
  const sourceNote = `${structDef.cType} (${structDef.imgdataPath}), api/params.json`;
  return [
    banner(title, generatorRelPath, sourceNote),
    table(['Field', 'Type', 'Default', 'Range / Enum / Flags', 'Description'], rows),
    '',
  ].join('\n');
}

// --- metadata.md ---------------------------------------------------------------

function describeMetadataType(field) {
  switch (field.type) {
    case 'int':
    case 'uint':
      return 'number (int)';
    case 'float':
    case 'double':
      return 'number (float)';
    case 'time':
      return 'number (unix seconds)';
    case 'uint64':
      return 'number \\| bigint';
    case 'string':
      return field.cArrayDims && field.cArrayDims.length === 1 ? `string (char[${field.cArrayDims[0]}])` : 'string (1 char)';
    case 'bytes':
      return field.cArrayDims ? `Buffer (${field.cArrayDims[0]} bytes)` : 'Buffer';
    case 'int[]':
    case 'float[]':
      return `number[${field.cArrayDims[0]}]`;
    case 'matrix':
      return `number[${field.cArrayDims[0]}][${field.cArrayDims[1]}]`;
    case 'struct':
      return field.cArrayDims ? `${field.cType}[${field.cArrayDims[0]}]` : field.cType;
    case 'unsupported':
      return 'unsupported';
    default:
      throw new Error(`gen-docs: describeMetadataType: unhandled type ${JSON.stringify(field.type)}`);
  }
}

function describeMetadataNotes(field) {
  const notes = [];
  if ('unset' in field) notes.push(`omitted when equal to ${JSON.stringify(field.unset)}`);
  if (field.type === 'uint64') notes.push('omitted when LibRaw has not filled it in');
  if (field.notes) notes.push(field.notes);
  return notes.length ? escapeMd(notes.join('; ')) : '—';
}

function renderStructSection(cType, structDef) {
  const rows = structDef.fieldOrder.map((name) => {
    const f = structDef.fields[name];
    return [code(name), describeMetadataType(f), describeMetadataNotes(f), escapeMd(f.doc)];
  });
  return [
    `### \`${cType}\``,
    '',
    table(['Field', 'Type', 'Notes', 'Description'], rows),
    '',
  ].join('\n');
}

function renderMetadataDoc(generatorRelPath, manifest) {
  const groupRows = Object.entries(manifest.groups).map(([key, g]) => [
    code(key),
    code(g.cType),
    code(g.imgdataPath),
  ]);

  const sections = Object.keys(manifest.structs).map((cType) => renderStructSection(cType, manifest.structs[cType]));

  return [
    banner('LibRaw metadata reference', generatorRelPath, 'vendor/LibRaw/libraw/libraw_types.h, api/metadata.json'),
    'The `identify()` result\'s `metadata` field and `Processor#metadata` mirror `imgdata` as ' +
      '`{ idata, sizes, other, lens, color, makernotes: { common, canon, nikon, sony, fuji, olympus, ' +
      'panasonic, pentax, samsung, kodak, p1, hasselblad, ricoh } }`. `sizes` additionally carries a ' +
      'synthesized `oriented: { width, height }` (width/height already swapped for a 5/6 `flip`), not ' +
      'part of `libraw_image_sizes_t` itself.',
    '',
    '## Groups',
    '',
    table(['Group key', 'C type', 'imgdata path'], groupRows),
    '',
    '## Structs',
    '',
    ...sections,
  ].join('\n');
}

// --- enums.md --------------------------------------------------------------------

function renderEnumsDoc(generatorRelPath, manifest) {
  const summaryRows = Object.entries(manifest.enums).map(([name, e]) => [
    code(name),
    e.kind,
    String(e.values.length),
    code(e.prefix || ''),
  ]);

  const sections = Object.entries(manifest.enums).map(([name, e]) => {
    const rows = e.values.map((v) => [code(v.short), String(v.value), code(v.name)]);
    return [`### \`${name}\` (${e.kind})`, '', table(['Short name', 'Value', 'Full C name'], rows), ''].join('\n');
  });

  return [
    banner('LibRaw enums reference', generatorRelPath, 'vendor/LibRaw/libraw/libraw_const.h, api/enums.json'),
    'Every enum in `libraw_const.h`. Re-exported at runtime as `enums` (see README.md\'s "Enums and ' +
      'flags" section) -- `enums.all[cEnumName]` by C name, plus short aliases (`enums.WARN`, ' +
      '`enums.CAPS`, `enums.DECODER`, `enums.RAWOPTIONS`, `enums.PROGRESS`, `enums.ERRORS`, ' +
      '`enums.THUMBNAIL_FORMATS`, `enums.INTERNAL_THUMBNAIL_FORMATS`, `enums.IMAGE_FORMATS`) for the ' +
      'families callers reach for most.',
    '',
    '## Summary',
    '',
    table(['C name', 'Kind', 'Enumerators', 'Common prefix'], summaryRows),
    '',
    '## Enums',
    '',
    ...sections,
  ].join('\n');
}

// --- main ----------------------------------------------------------------------

function main() {
  const check = process.argv.includes('--check');

  const paramsManifest = JSON.parse(fs.readFileSync(PARAMS_MANIFEST_PATH, 'utf8'));
  const metadataManifest = JSON.parse(fs.readFileSync(METADATA_MANIFEST_PATH, 'utf8'));
  const enumsManifest = JSON.parse(fs.readFileSync(ENUMS_MANIFEST_PATH, 'utf8'));

  const generatorRelPath = 'scripts/gen-docs.js';

  const contents = {
    params: `${renderParamsDoc('LibRaw output params reference (`decode({ params })` / `Processor#setParams()`/`#getParams()`)', generatorRelPath, paramsManifest.structs.params)}\n`,
    rawparams: `${renderParamsDoc('LibRaw raw-unpack params reference (`decode({ rawparams })` / `identify({ rawparams })` / `Processor#setRawParams()`/`#getRawParams()`)', generatorRelPath, paramsManifest.structs.rawparams)}\n`,
    metadata: `${renderMetadataDoc(generatorRelPath, metadataManifest)}\n`,
    enums: `${renderEnumsDoc(generatorRelPath, enumsManifest)}\n`,
  };

  if (check) {
    let failed = false;
    for (const [key, outPath] of Object.entries(OUTPUTS)) {
      const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : null;
      if (current !== contents[key]) {
        failed = true;
        console.error(`stale: ${path.relative(ROOT, outPath)}`);
      }
    }
    if (failed) {
      console.error('gen-docs --check: FAILED');
      process.exit(1);
    }
    console.log('gen-docs --check: OK');
    return;
  }

  for (const [key, outPath] of Object.entries(OUTPUTS)) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, contents[key]);
    console.log(`wrote ${path.relative(ROOT, outPath)}`);
  }
}

main();
