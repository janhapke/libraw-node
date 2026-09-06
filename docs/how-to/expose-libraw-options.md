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
> values actually used are `int|uint|float|double|string|bytes|int[]|float[]|matrix|struct|time|unsupported`
> (`matrix` covers both numeric 2-D arrays like `cmatrix`/`rgb_cam` and the CFA pattern arrays `xtrans`/
> `xtrans_abs`, which are `char[6][6]` but numeric-valued, not text). "Char arrays as trimmed strings" holds
> for `char[N]` fields annotated `string` (NUL-trimmed via `strnlen`, and omitted entirely -- not an empty
> string -- when the trimmed result is empty); the four single-`char` (non-array) GPS reference-code fields
> (`altref`/`latref`/`longref`/`gpsstatus`) are also `string`-typed but become a 1-character string, guarded
> by the same `unset` mechanism as numeric fields. "Omit fields at their unset sentinel" is implemented as a
> per-field `unset` value in the annotation (not a fixed set of `{0, -1, 0xffff}` tried automatically) --
> T14a discovered empirically that `libraw_raw_inset_crop_t`'s `cleft`/`ctop` use `0xffff` (65535) but that
> the UINT64 lens/camera/teleconverter/adapter/attachment ID fields in `libraw_makernotes_lens_t` do *not*
> use `0` (their real unset value is `UINT64_MAX`, confirmed against the synthetic fixture), so those five
> fields carry no `unset` annotation at all rather than a wrong one -- a value that large cannot round-trip
> exactly through a JS Number/JSON literal and back into an exact 64-bit C++ comparison anyway.
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
