# How to expose LibRaw options to JavaScript

Goal: every field of `libraw_output_params_t` and `libraw_raw_unpack_params_t`, with LibRaw's names,
validated, typed, and documented, without hand-writing 60 setters twice.

## 1. Keep a JSON manifest as the single source of truth

`api/params.json` (generated once from `libraw_types.h` and the API-datastruct docs, then maintained):

```json
{
  "params": {
    "half_size":     { "type": "bool",   "doc": "2x2 binning, no demosaic; output is half size" },
    "user_qual":     { "type": "int",    "enum": [0,1,2,3,4,11,12], "doc": "0 linear, 1 VNG, 2 PPG, 3 AHD, 4 DCB, 11 DHT, 12 AAHD" },
    "output_bps":    { "type": "int",    "enum": [8,16] },
    "output_color":  { "type": "int",    "min": 0, "max": 8 },
    "highlight":     { "type": "int",    "min": 0, "max": 9 },
    "gamm":          { "type": "double[]", "len": 6 },
    "cropbox":       { "type": "uint[]",   "len": 4 },
    "user_mul":      { "type": "float[]",  "len": 4 },
    "output_profile":{ "type": "path" },
    "...": {}
  },
  "rawparams": {
    "shot_select":       { "type": "uint" },
    "options":           { "type": "flags", "flags": "LIBRAW_RAWOPTIONS" },
    "max_raw_memory_mb": { "type": "uint", "default": 2048 },
    "...": {}
  }
}
```

Generate three things from it:

1. `src/params.gen.cc` — a table of `{name, kind, offset/setter lambda, validator}` used by one generic
   `applyParams(Napi::Object, libraw_output_params_t&)`.
2. `types/params.d.ts` — `interface OutputParams { half_size?: boolean; user_qual?: 0|1|2|3|4|11|12; ... }`
   with the doc strings as JSDoc.
3. `docs/reference/params.md` — the table (this repo's [reference](../reference/libraw-output-params.md) is
   the hand-written seed).

Flag enums (`LIBRAW_RAWOPTIONS_*`, `LIBRAW_WARN_*`, `LIBRAW_CAPS_*`, `LibRaw_progress`) get the same
treatment: a manifest of name→value, exported as `const enum`s and reverse-mapped to string arrays in
results (`warnings: ['FALLBACK_TO_AHD']`).

## 2. Assignment rules

- Unknown keys throw `TypeError` (catch typos like `halfSize`).
- Arrays must have the exact length.
- Strings for `output_profile`/`camera_profile`/`bad_pixels`/`dark_frame` are copied into addon-owned
  `std::string`s whose `c_str()` is assigned to the `char*` fields; LibRaw does not own them, so they must
  outlive the `process` call (store them on the `Processor`).
- `rawparams.options` accepts a number or an array of flag names.
- Apply `rawparams` before `open_*`, `params` any time before `dcraw_process`. In the fused `decode`, both
  come in one options object and are applied in the right order by the worker.
- Reading back: `getParams()` returns the current struct as an object (useful for tests and for the
  "what did LibRaw actually use" debug output).

## 3. Metadata mirror

Same technique for the read-only side: a manifest of `imgdata.idata/sizes/other/lens/color/gps` and a
curated set of `makernotes.*` fields (the full makernotes surface is huge and changes across versions;
export the common ones — `common.CameraTemperature`, `nikon.ShutterCount`? (not in LibRaw; leave to exiv2),
`sony.*` sequence info, `canon.*` — on request). Emit numbers as numbers, char arrays as trimmed strings,
matrices as nested arrays, and omit fields that are at their "unset" sentinel (0, -1, 0xffff) so the JS
side can use `??`. Keep photoview's current field names (`make`, `model`, `iso`, `shutterSpeed`,
`aperture`, `focalLength`, `timestamp`, `lensName`, `lensMake`, ...) available as a compatibility view or
adapt the plugins.

## 4. Version drift

When bumping LibRaw, run a script that parses `libraw_types.h` for the two param structs and diffs against
the manifest; CI fails on new or removed fields until the manifest is updated. This is what lightdrift's
"parity manifest" idea is for; doing it from the header is cheaper than maintaining it by hand.

> **Correction (T11/T12):** the manifest actually committed is `api/params.json` (T11,
> `scripts/gen-manifest.js`), keyed by `structs.params`/`structs.rawparams` (not a bare `params`/
> `rawparams` top level as sketched in §1 above), with header-derived facts (`cType`, `cArrayLength`) kept
> separate from the hand-maintained `api/params.annotations.json` (`doc`, `type`, `default`, `enum`/
> `flags`, `min`/`max`, `notes`) so the two can never drift silently -- `gen-manifest.js --check` fails if
> either side is missing a field the other has.
>
> `src/params.gen.cc` (§1, item 1) is actually `src/generated/params.gen.cc` (T12,
> `scripts/gen-params-cc.js`), and it is not one generic `applyParams(Napi::Object, libraw_output_params_t&)`
> dispatching through a runtime `{name, kind, offset/setter lambda, validator}` table -- it emits one
> straight-line validate-then-assign block per manifest field instead (still entirely table-driven, just at
> *generation* time: the JS generator walks `api/params.json`'s field table and emits C++ per field, rather
> than the C++ walking a table at *run* time). The four functions it implements
> (`ApplyParams`/`ApplyRawParams`/`ParamsToObject`/`RawParamsToObject`) are declared by a small hand-written
> `src/params.h`, which also declares `ParamStrings` -- the addon-owned `std::string` storage `output_profile`/
> `camera_profile`/`bad_pixels`/`dark_frame` need per §2's "Assignment rules" bullet, kept alive by
> `Processor` (as a member) or by the fused `decode()` worker (via a `shared_ptr`), not literally "on the
> `Processor`" in the sense of instance-only.
>
> §1's "flag enums ... get the same treatment" is not yet built as a separate `api/enums.json` manifest --
> that is T13. T12 only implements the `flags`-typed *fields* of `api/params.json` (a plain number, or an
> array of `LIBRAW_*` flag-name strings taken straight from that field's own `flags` map in the manifest --
> not from a shared enum table), which is enough for `rawparams.options`'s `LIBRAW_RAWOPTIONS_*` names (§2)
> and every other `flags`-typed field, but not for a package-wide `warnings: string[]` derived from
> `process_warnings` (still hand-written in `src/fused.cc`, per T08's own note there) or for exporting the
> flag/enum tables standalone.

> **Correction (T14a):** §3's "manifest of `imgdata.idata/sizes/other/lens/color/gps`" is `api/metadata.json`
> (`scripts/gen-metadata.js`), keyed by `groups.{idata,sizes,other,lens,color,"makernotes.common"}` (imgdata
> path + C type) and `structs.<cTypeName>` (one entry per struct type actually reached, top-level or
> nested -- there is no separate top-level `gps` group; GPS is `other.parsed_gps`, a nested
> `libraw_gps_info_t`). Per-vendor `makernotes.*` (canon/nikon/sony/...) are T14b, not this generator --
> only `makernotes.common` (temperature/flash/AF-data fields common to every vendor) is in scope here, so
> "a curated set of makernotes.* fields" did not need curating for T14a itself. The struct-field parser
> (extraction + tokenizing) that used to live inline in `gen-manifest.js` was generalized into
> `scripts/lib/cstruct.js` (nested/typedef'd struct types, 2-D arrays, comma-separated declarator lists,
> macro-resolved array lengths) so both generators share it, per this task's own instruction.
>
> `api/metadata.annotations.json` is keyed by exact C struct-type reference string (e.g.
> `"libraw_gps_info_t"`, `"struct ph1_t"` for the one struct LibRaw declares without a typedef), not by
> imgdata path, so a struct type reached from more than one field is annotated once. The per-field `type`
> values actually used are
> `int|uint|uint64|float|double|string|bytes|int[]|float[]|matrix|struct|time|unsupported`
> (`matrix` covers both numeric 2-D arrays like `cmatrix`/`rgb_cam` and the CFA pattern arrays `xtrans`/
> `xtrans_abs`, which are `char[6][6]` but numeric-valued, not text). "Char arrays as trimmed strings" holds
> for `char[N]` fields annotated `string` (NUL-trimmed via `strnlen`, and omitted entirely -- not an empty
> string -- when the trimmed result is empty); the four single-`char` (non-array) GPS reference-code fields
> (`altref`/`latref`/`longref`/`gpsstatus`) are also `string`-typed but become a 1-character string, guarded
> by the same `unset` mechanism as numeric fields. "Omit fields at their unset sentinel" is implemented as a
> per-field `unset` value in the annotation (not a fixed set of `{0, -1, 0xffff}` tried automatically) --
> T14a discovered empirically that `libraw_raw_inset_crop_t`'s `cleft`/`ctop` use `0xffff` (65535).
>
> The five UINT64 lens/camera/teleconverter/adapter/attachment ID fields in `libraw_makernotes_lens_t`
> needed a dedicated `type: "uint64"` instead: their real unset value is `UINT64_MAX` (confirmed against the
> synthetic fixture and both real ORF/NEF files below), not `0`, and `UINT64_MAX` cannot round-trip exactly
> through a JS Number/JSON literal and back into an exact 64-bit C++ comparison the way every other `unset`
> value here does -- so a first pass left these five fields with no `unset` annotation at all (always
> present, silently losing precision above 2^53 when rendered as a plain `Napi::Number`: `P3210620.ORF`'s
> `LensID`, actually `UINT64_MAX`, printed as the JS Number `18446744073709552000`, and `DSC_4985.NEF`'s real
> `LensID` `11114933715598089230` printed as `11114933715598090000`). `type: "uint64"` fixes both problems at
> once: `scripts/gen-metadata-cc.js` compares the raw value against `std::numeric_limits<uint64_t>::max()`
> in C++ (never through this JSON file) and omits the key when equal; otherwise it emits a `Napi::Number`
> when the value is `<= Number.MAX_SAFE_INTEGER` (2^53 - 1) or a `Napi::BigInt` (`Napi::BigInt::New`) when
> it is larger, so no value is ever silently rounded. `P3210620.ORF` (whose `LensID` is `UINT64_MAX`) now has
> no `lens.makernotes.LensID` key at all; `DSC_4985.NEF`'s is a JS BigInt, exactly `11114933715598089230n`.
>
> Pointer fields are `unsupported` except `color.profile` (paired with `color.profile_length`, becomes a
> `Buffer` when non-null) -- exactly the one documented exception in `docs/plan/tasks.md`'s T14a Do list.
> Two more LibRaw-specific special cases exist beyond the generic per-`type` rules: `color.WB_Coeffs`/
> `WBCT_Coeffs` are compacted to only their set illuminant/color-temperature entries (each a
> 256- or 64-slot fixed table, almost entirely zero for any one file), and `makernotes.common.afdata` emits
> only its first `afcount` of the fixed `LIBRAW_AFDATA_MAXCOUNT` (4) slots. `sizes.oriented` (`{ width,
> height }`, swapped when `imgdata.sizes.flip` is 5 or 6) is added by hand in the generated
> `MetadataToObject`, not derived from a manifest field.
>
> `src/generated/metadata.gen.cc` (`scripts/gen-metadata-cc.js`) declares one `ToObject_<Type>` function per
> struct type (mirroring `gen-params-cc.js`'s straight-line-per-field generation strategy) and is declared by
> a small hand-written `src/metadata.h` (one function, `MetadataToObject(Napi::Env, const libraw_data_t&)`).
> `identify()`'s top-level `sizes`/`idata` shortcut fields (T08) are now sourced from the same
> `MetadataToObject` call as the `metadata` field itself, rather than hand-assembled from a hand-picked
> subset -- they are therefore now the full per-field mirror, not the smaller T08 subset. `Processor.metadata`
> is a getter (`InstanceAccessor`, read as `processor.metadata`, not called as a function), throwing
> `LIBRAW_OUT_OF_ORDER_CALL` before the Processor is opened.

> **Correction (T14b):** all twelve per-vendor `makernotes.*` groups T14a deferred landed in one session --
> `makernotes.{canon,nikon,sony,fuji,olympus,panasonic,pentax,samsung,kodak,p1,hasselblad,ricoh}` --
> 340 fields total (`libraw_canon_makernotes_t` 41, `libraw_nikon_makernotes_t` 58, `libraw_sony_info_t` 57,
> `libraw_fuji_info_t` 41, `libraw_olympus_makernotes_t` 39, `libraw_panasonic_makernotes_t` 10,
> `libraw_pentax_makernotes_t` 12, `libraw_samsung_makernotes_t` 7, `libraw_kodak_makernotes_t` 18,
> `libraw_p1_makernotes_t` 4, `libraw_hasselblad_makernotes_t` 15, `libraw_ricoh_makernotes_t` 16), plus two
> newly-reached nested struct types (`libraw_area_t`, Canon's crop/black-area rectangles; and
> `libraw_sensor_highspeed_crop_t`, Nikon's high-speed-crop rectangle). `scripts/gen-metadata.js`'s `GROUPS`
> list gained twelve entries the same way `makernotes.common` was added in T14a; the one naming wrinkle is
> `makernotes.p1`, whose `imgdataPath` is `imgdata.makernotes.phaseone` -- LibRaw's own C field name for this
> vendor is `phaseone`, not `p1` (`docs/plan/tasks.md`'s T14b list uses the JS-facing name `p1`, so the group
> key and the emitted JS key are both `p1` while the C struct access stays `d.makernotes.phaseone`).
>
> `scripts/lib/cstruct.js` needed one small grammar extension: `libraw_fuji_info_t` declares five `char[]`
> fields with a `+1` NUL-terminator idiom (`char FujiModel[32 + 1]`), which the previous single-numeric-
> literal-or-macro array-length parser rejected. The fix is a '+'-separated sum of literals/macros as a
> dimension (no other arithmetic operator appears in any LibRaw array length) -- see the parser's own updated
> header comment. No other new parser feature was needed: every vendor struct's fields (fixed 1-D/2-D arrays,
> `short`/`ushort`/`uchar`/`uint8_t`/`uint16_t`/`int8_t`/`INT64`-family scalars and arrays, nested typedef'd
> struct fields, comma-separated declarator lists, one raw pointer field) already fit the grammar T11/T14a
> built.
>
> Two representation rules needed picking that T14a's six core groups never exercised:
> - **`bytes` fields with no per-field special case.** T14a's only `bytes` field (`color.profile`) is a
>   pointer paired with a length, hand-special-cased in `gen-metadata-cc.js`. T14b's `bytes` fields are plain
>   fixed-size `uchar[N]` byte/flag records with no documented text or per-element-numeric meaning (Nikon's
>   flash/VR status bytes, Pentax's `DriveMode`/`DynamicRangeExpansion`) -- `gen-metadata-cc.js` gained a
>   *generic* `bytes` case (any `type: "bytes"` field with a single fixed array dimension becomes a fresh,
>   always-emitted `Buffer` copy of the `N` raw bytes), rather than adding eight more per-field special cases.
>   The dividing line applied throughout `api/metadata.annotations.json`: a `uchar[N]` array is `bytes`; a
>   `uint8_t[N]`/`int8_t` field is treated as ordinary numeric data (`int`/`int[]`), since LibRaw's own header
>   reserves the fixed-width spelling for fields with individually meaningful values (e.g. Sony's
>   `AFPointsUsed`, a list of AF point indices) even though both compile to the same one-byte C type.
> - **The `unset` sentinel, for structs LibRaw zero-initializes wholesale.** `vendor/LibRaw/src/utils/
>   init_close_utils.cpp` shows the entire per-vendor makernotes block is `ZERO(MN)`-ed before every file is
>   parsed (both in the constructor and in `recycle()`), so every scalar field's true C-level default is `0`
>   -- but adding `unset: 0` to all ~300 scalar fields on that basis alone would also suppress genuinely-zero
>   *decoded* values for fields where `0` is a normal reading (flash-off, a real black level of 0, "no
>   compensation applied", ...), which T14a's own precedent avoids (`makernotes.common.ColorSpace`,
>   `other.shot_order` and others carry no `unset` despite defaulting to 0 too). T14b keeps that conservative
>   T14a convention: `unset` is added only where `libraw_types.h` itself documents a specific sentinel in a
>   field comment -- about twenty Sony fields with an explicit `// init in 0xffff`/`0xff`/`-1`/`0x7f` comment
>   (`CameraType`, `AFAreaModeSetting`, `AFMicroAdjOn`, `LongExposureNoiseReduction`, ...), plus
>   `Sony0x9400_version` ("0 if not found/deciphered"), `prd_BayerPattern` ("0 -> not valid"), Fuji's
>   `RAFDataGeneration` ("0 (none)"), Canon's `Quality` ("-1 = n/a"), and two single-character digit-as-string
>   Sony fields (`nShotsInPixelShiftGroup`/`numInPixelShiftGroup`) that reuse the GPS-ref-code pattern
>   (`unset: 0`) T14a already established. Every other T14b scalar field has no `unset` entry and is always
>   emitted, including as a literal `0` -- verified against all three real test files below, none of which
>   ever show a documented sentinel value (65535/255/4294967295/127/-1) in a defined key.
>
> **Vendors that don't match a file's actual maker are never omitted, and this is deliberate, not an
> oversight:** `imgdata.makernotes` is a plain struct-of-structs (one member per vendor, all twelve always
> present in memory), not a tagged union LibRaw sets a "this file is vendor X" discriminant for -- there is no
> reliable signal this generator can key an "omit the whole sub-object" decision on. All twelve
> `makernotes.*` keys are therefore always present as objects on every file, matching the existing T14a
> precedent for `lens.nikon`/`lens.dng`/`lens.makernotes`/`color.phase_one_data` (always-present nested
> structs regardless of whether the file actually uses that maker's extension). A non-matching vendor's
> object is *not* generally empty, either: most of its fields carry LibRaw's own zero-initialized defaults
> (no `unset` annotation to omit them, per the rule above) rather than the vendor's real parsed data -- e.g.
> `DSC_4985.NEF` (a Nikon file) reports a full 41-key `makernotes.canon` object, every field at its C-level
> zero default, not `undefined`. Two fields are non-zero on *every* file regardless of vendor match, by
> LibRaw's own constructor/`recycle()` code (not a parsing result): `makernotes.kodak.ISOCalibrationGain`
> (always `1.0`) and `makernotes.hasselblad.nIFD_CM` (always `[-1, -1]`) -- documented on those fields'
> `notes` would be misleading since they are not this generator's `unset` mechanism at work, so they are
> called out here instead. `makernotes.p1` is the practical exception that reads as "empty" on every real
> test file below (all four fields are `string`-typed and NUL-trimmed to nothing when unset, so a
> non-Phase-One file's `p1` object has zero own keys) -- not because of any special-casing, but because every
> field in that particular struct happens to be a string.
