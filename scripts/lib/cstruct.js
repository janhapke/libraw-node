// Shared C struct field parser used by scripts/gen-manifest.js (T11,
// libraw_output_params_t / libraw_raw_unpack_params_t) and
// scripts/gen-metadata.js (T14a, the read-only metadata structs). Not a
// general C parser: it only understands the shapes LibRaw's own headers
// actually use for the structs these two generators cover --
//   - scalars: char, short, int, long, float, double, void, time_t, INT64,
//     UINT64, int8_t, and the "unsigned"/"signed" two-word forms
//     (unsigned short/int/char/long, signed char), plus ushort/uchar and
//     any typedef'd struct type (libraw_..._t, or "struct <name>" for the
//     one non-typedef'd struct LibRaw declares this way, ph1_t).
//   - fixed-size arrays, one or two dimensions (`float gamm[6]`,
//     `int mask[8][4]`, `int WB_Coeffs[256][4]`), with either a numeric
//     literal (decimal or 0x-hex, e.g. `curve[0x10000]`) or a macro name
//     (e.g. `cblack[LIBRAW_CBLACK_SIZE]`, resolved via the caller-supplied
//     `macros` map) as the length.
//   - pointers: `char *output_profile`, `char **custom_camera_strings`,
//     `void *profile`.
//   - comma-separated declarator lists sharing one base type, each
//     declarator with its own pointer/array suffix (`char altref, latref,
//     longref, gpsstatus;`, `char desc[512], artist[64];`).
// No macro expansion beyond simple array-length lookups, no bitfields, no
// function-pointer typedefs (a statement containing '(' is skipped -- none
// of the structs these two generators parse declare one as a field).
'use strict';

// Two-word "unsigned"/"signed" continuations LibRaw's headers actually use.
// A field is never literally named "short"/"char"/"long"/"int", so treating
// these as fixed continuations (rather than trying to disambiguate `unsigned
// int` from `unsigned <fieldname>` some other way) is safe for this header.
const UNSIGNED_SIGNED_CONTINUATIONS = new Set(['short', 'char', 'long', 'int']);

// Tokenizer: hex literals before decimal (0x10000 must not be split into
// "0" + "x10000"), then decimal literals, identifiers (including macro
// names used as array lengths), and the punctuation this grammar needs.
const TOKEN_RE = /0[xX][0-9A-Fa-f]+|\d+|[A-Za-z_]\w*|[[\]*,]/g;

function tokenize(stmt) {
  return stmt.match(TOKEN_RE) || [];
}

// Extracts the `{ ... }` body of a struct declaration named `cTypeName`,
// trying both forms LibRaw's headers use:
//   1. `typedef struct { ... } cTypeName;` (the overwhelming majority).
//   2. `struct cTypeName { ... };` (no typedef -- only `ph1_t`, referenced
//      elsewhere as a field of type `struct ph1_t`, uses this form).
// Neither struct nests another *anonymous* struct/union, so a plain
// "matching closing brace via the end marker, walk back to the nearest
// opening keyword" search is sufficient; it does not need to balance
// arbitrarily nested braces.
function extractStructBody(headerSrc, cTypeName, headerPathForErrors) {
  const typedefEndMarker = new RegExp(`\\}\\s*${cTypeName}\\s*;`);
  const typedefEndMatch = headerSrc.match(typedefEndMarker);
  if (typedefEndMatch) {
    const endIdx = typedefEndMatch.index;
    const beforeEnd = headerSrc.slice(0, endIdx);
    const typedefIdx = beforeEnd.lastIndexOf('typedef struct');
    if (typedefIdx !== -1) {
      const braceIdx = headerSrc.indexOf('{', typedefIdx);
      if (braceIdx !== -1 && braceIdx < endIdx) {
        return headerSrc.slice(braceIdx + 1, endIdx);
      }
    }
  }

  const plainStructRe = new RegExp(`struct\\s+${cTypeName}\\s*\\{`);
  const plainMatch = headerSrc.match(plainStructRe);
  if (plainMatch) {
    const braceIdx = plainMatch.index + plainMatch[0].length - 1;
    const endIdx = headerSrc.indexOf('};', braceIdx);
    if (endIdx !== -1) {
      return headerSrc.slice(braceIdx + 1, endIdx);
    }
  }

  throw new Error(`struct ${cTypeName} not found in ${headerPathForErrors || '(header)'}`);
}

// Parses every field declaration out of a struct body (as returned by
// extractStructBody). Returns an array of
//   { name, baseType, pointerDepth, arrayDims, cType }
// where `arrayDims` is an array of resolved integers (empty for a scalar,
// one entry for a 1-D array, two for a 2-D array) and `cType` is
// `baseType` followed by one `*` per pointer level (matching the `cType`
// shape scripts/gen-manifest.js has always emitted into api/params.json).
// `macros`, if given, resolves array-length identifiers that are not
// numeric literals (e.g. `LIBRAW_CBLACK_SIZE`); an unresolved one throws.
function parseStructFields(body, cTypeName, macros = {}) {
  const stripped = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const fields = [];

  for (const rawStmt of stripped.split(';')) {
    const stmt = rawStmt.replace(/\s+/g, ' ').trim();
    if (!stmt) continue;
    // Guards against anything this grammar does not model (function-pointer
    // typedefs, etc.) slipping through silently -- none of the structs these
    // generators cover should ever hit this for a field declaration.
    if (stmt.includes('(')) {
      throw new Error(`gen-cstruct: unsupported declaration form in ${cTypeName}: ${JSON.stringify(stmt)}`);
    }

    const tokens = tokenize(stmt);
    if (tokens.length === 0) continue;

    let idx = 0;
    let typeWords;
    if (tokens[idx] === 'struct') {
      typeWords = [tokens[idx], tokens[idx + 1]];
      idx += 2;
    } else if (tokens[idx] === 'unsigned' || tokens[idx] === 'signed') {
      if (UNSIGNED_SIGNED_CONTINUATIONS.has(tokens[idx + 1])) {
        typeWords = [tokens[idx], tokens[idx + 1]];
        idx += 2;
      } else {
        typeWords = [tokens[idx]];
        idx += 1;
      }
    } else {
      typeWords = [tokens[idx]];
      idx += 1;
    }
    const baseType = typeWords.join(' ');
    if (!baseType || typeWords.some((w) => w === undefined)) {
      throw new Error(`gen-cstruct: could not parse a base type in ${cTypeName}: ${JSON.stringify(stmt)}`);
    }

    let declaratorsInStmt = 0;
    for (;;) {
      let pointerDepth = 0;
      while (tokens[idx] === '*') {
        pointerDepth++;
        idx++;
      }
      const name = tokens[idx];
      if (!name || !/^[A-Za-z_]\w*$/.test(name)) {
        throw new Error(`gen-cstruct: could not parse a declarator name in ${cTypeName}: ${JSON.stringify(stmt)}`);
      }
      idx++;

      const arrayDims = [];
      while (tokens[idx] === '[') {
        idx++; // consume '['
        const dimTok = tokens[idx];
        idx++;
        if (tokens[idx] !== ']') {
          throw new Error(`gen-cstruct: malformed array dimension in ${cTypeName}.${name}: ${JSON.stringify(stmt)}`);
        }
        idx++; // consume ']'
        let dim;
        if (/^(?:\d+|0[xX][0-9A-Fa-f]+)$/.test(dimTok)) {
          dim = Number(dimTok);
        } else if (Object.prototype.hasOwnProperty.call(macros, dimTok)) {
          dim = macros[dimTok];
        } else {
          throw new Error(`gen-cstruct: unresolved array-length macro ${JSON.stringify(dimTok)} in ${cTypeName}.${name} (pass it in \`macros\`)`);
        }
        arrayDims.push(dim);
      }

      fields.push({
        name,
        baseType,
        pointerDepth,
        arrayDims,
        cType: baseType + '*'.repeat(pointerDepth),
      });
      declaratorsInStmt++;

      if (tokens[idx] === ',') {
        idx++;
        continue;
      }
      break;
    }

    if (idx !== tokens.length) {
      throw new Error(`gen-cstruct: trailing tokens after parsing ${cTypeName} declaration: ${JSON.stringify(stmt)}`);
    }
    if (declaratorsInStmt === 0) {
      throw new Error(`gen-cstruct: parsed zero declarators from statement in ${cTypeName}: ${JSON.stringify(stmt)}`);
    }
  }

  if (fields.length === 0) {
    throw new Error(`gen-cstruct: parsed zero fields out of ${cTypeName}`);
  }
  return fields;
}

// Parses `#define NAME <digits>` macros out of a header source (used for
// array-length macros like LIBRAW_CBLACK_SIZE). Hex/decimal only -- every
// array-length macro LibRaw's headers define is one of those.
function parseNumericMacros(headerSrc) {
  const macros = {};
  const re = /#define\s+([A-Za-z_]\w*)\s+(0[xX][0-9A-Fa-f]+|\d+)(?![.\w])/g;
  let m;
  while ((m = re.exec(headerSrc)) !== null) {
    macros[m[1]] = Number(m[2]);
  }
  return macros;
}

module.exports = { extractStructBody, parseStructFields, parseNumericMacros, tokenize };
