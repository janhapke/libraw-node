# How to set processing options

`@janhapke/libraw` exposes LibRaw's two option structs — `libraw_output_params_t` (postprocessing knobs,
`params`) and `libraw_raw_unpack_params_t` (decode-stage knobs, `rawparams`) — verbatim, under LibRaw's own
C field names (`snake_case`, not camelCase). Every field is generated from LibRaw's header with full
validation, so an unknown key or a wrong type/length fails loudly instead of being silently ignored.

## Where to pass them

The module-level fused helpers take `params`/`rawparams` inside their `options` object:

```js
const { decode, identify } = require('@janhapke/libraw');

const image = await decode(buffer, {
  params: { use_camera_wb: true, output_bps: 16, user_qual: 3 },
  rawparams: { options: ['CHECK_THUMBNAILS_KNOWN_VENDORS'] },
});

const info = await identify(buffer, {
  rawparams: { options: ['CHECK_THUMBNAILS_KNOWN_VENDORS'] }, // fixes 0-sized thumbs_list entries
});
```

`Processor` takes them as separate calls, `setParams`/`setRawParams` (synchronous — validation is cheap and
never touches LibRaw's decode path), with matching getters:

```js
const { Processor } = require('@janhapke/libraw');

const proc = new Processor();
proc.setRawParams({ options: ['CHECK_THUMBNAILS_KNOWN_VENDORS'] }); // must be set before opening
await proc.openBuffer(buffer);
proc.setParams({ use_camera_wb: true, user_qual: 2 }); // any time before process()
await proc.unpack();
await proc.process();

proc.getParams();    // the full current libraw_output_params_t, as an object
proc.getRawParams(); // the full current libraw_raw_unpack_params_t, as an object
```

`rawparams` affects parsing during `open*`/`unpack`, so set it before opening if it matters (e.g. thumbnail
validation bits); `params` affects `dcraw_process`, so it can be set any time before `process()`/`decode()`
actually runs. The fused helpers apply both in the right order internally from one `options` object.

## Field reference

Every settable field's type, default, range/enum, and doc string — generated straight from LibRaw's header
(`scripts/gen-docs.js`, kept in sync by `npm run gen:check`):

- [`docs/reference/params.md`](../reference/params.md) — `libraw_output_params_t` (`params`)
- [`docs/reference/rawparams.md`](../reference/rawparams.md) — `libraw_raw_unpack_params_t` (`rawparams`)

Some frequently used fields, as a starting point (see the reference above for the full list and every
enum/flag value):

| Field | Struct | Meaning |
|---|---|---|
| `half_size` | `params` | 2×2 binning, no demosaic — output is half size, much faster |
| `use_camera_wb` | `params` | As-shot white balance |
| `user_qual` | `params` | Demosaic algorithm: `0` linear, `1` VNG, `2` PPG, `3` AHD, `4` DCB, `11` DHT, `12` AAHD |
| `output_bps` | `params` | `8` or `16` bits per sample |
| `output_color` | `params` | Output color space: `0` raw .. `1` sRGB (default) .. `8` Rec2020 |
| `highlight` | `params` | Highlight recovery: `0` clip .. `9` most aggressive rebuild |
| `user_flip` | `params` | Orientation: `-1` use the file's own (default), `0` none, `3`/`5`/`6` forced rotations |
| `options` | `rawparams` | Bitmask/name-array of `LIBRAW_RAWOPTIONS_*` — parse-time behavior (thumbnail validation, DNG opcode stages, ...) |
| `shot_select` | `rawparams` | Which embedded raw image to use, for multi-shot formats |

## Validation rules

- **Unknown keys throw.** `setParams({ halfSize: true })` throws `TypeError` naming the bad key — this is
  how a typo like `halfSize` (vs. the real `half_size`) is caught immediately instead of being silently
  ignored.
- **Arrays must be the exact length** the struct declares (e.g. `gamm` is `number[6]`, `cropbox` is
  `number[4]`) — anything else throws.
- **Flags fields** (`rawparams.options`, `use_rawspeed`, `use_dngsdk`, `specials`) accept either a raw
  numeric bitmask or an array of the flag's short names (the `LIBRAW_*_` prefix stripped), e.g.
  `{ options: ['CHECK_THUMBNAILS_KNOWN_VENDORS', 'CAMERAWB_FALLBACK_TO_DAYLIGHT'] }` instead of computing
  `262144 | 131072` by hand.
- **Enum fields** (`user_qual`, `output_color`, `use_camera_matrix`, `highlight`, ...) accept the numeric
  value LibRaw expects; out-of-range values throw. See the reference tables for each field's valid set.
- **String fields** (`output_profile`, `camera_profile`, `bad_pixels`, `dark_frame`) take a plain JS string
  (a filesystem path, or `"embed"` for `camera_profile`); the package keeps the underlying storage alive for
  the life of the call/`Processor`.

## Enums and flags, standalone

Every enum LibRaw defines (`libraw_const.h`) — not just the ones a params field references — is available as
`enums`, an object of named tables (`enums.WARN`, `enums.CAPS`, `enums.DECODER`, `enums.RAWOPTIONS`,
`enums.PROGRESS`, `enums.ERRORS`, `enums.THUMBNAIL_FORMATS`, `enums.INTERNAL_THUMBNAIL_FORMATS`,
`enums.IMAGE_FORMATS`, plus `enums.all.<CTypeName>` for every enum by its C type name). Each table is
`{ kind: 'flags' | 'enum', NAME_TO_VALUE, VALUE_TO_NAME, VALUE_TO_NAMES }` keyed by the short name (the
`LIBRAW_*_` prefix stripped):

```js
const { enums, capabilityNames, warningNames } = require('@janhapke/libraw');

enums.WARN.NAME_TO_VALUE.FALLBACK_TO_AHD;                            // 32768
enums.RAWOPTIONS.NAME_TO_VALUE.CHECK_THUMBNAILS_KNOWN_VENDORS;       // 262144
enums.all.LibRaw_processing_options.NAME_TO_VALUE.PENTAX_PS_ALLFRAMES;

capabilityNames();       // e.g. ['ZLIB', 'JPEG'] -- this build's set capability bits, by short name
warningNames(1 << 15);   // ['FALLBACK_TO_AHD']  -- a LIBRAW_WARN_* bitmask's set bits, by short name
```

`decode()`/`identify()` results carry `warnings: string[]` using these same short names. Full listing:
[`docs/reference/enums.md`](../reference/enums.md).

## Reading back what LibRaw actually used

`Processor#getParams()`/`#getRawParams()` return the *current* struct as a plain object — useful to confirm
a default, or to see what a previous `setParams`/`open*` call left in place. The module-level helpers don't
have an equivalent (each call is stateless and self-contained), but `identify()`/`decode()`'s `warnings`
array reports anything LibRaw silently fell back on (e.g. `FALLBACK_TO_AHD` when `user_qual` 5–10 was
requested without the GPL demosaic packs, which this package never vendors).
