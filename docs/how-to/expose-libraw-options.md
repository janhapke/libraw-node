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
