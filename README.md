# @janhapke/libraw

A general-purpose, Electron-safe Node.js binding for [LibRaw](https://www.libraw.org/), the RAW image
decoding library. Statically links LibRaw, zlib, and libjpeg-turbo, and no compiler is required on the
consumer's machine (prebuilt binaries are shipped per platform). On Linux, `libgomp.so.1` (GCC's OpenMP
runtime) is the one dynamic dependency beyond libc/libm/libpthread/libdl — every Linux system with a GCC
toolchain already has it; see the `target_link_libraries(addon PRIVATE gomp)` comment in `CMakeLists.txt`
for why it cannot be statically linked into a shared object with this toolchain.

This package is not scoped to any single consumer application — see
`docs/explanation/adoption-comparison.md` for the design rationale.

Status: early scaffold (see `docs/plan/tasks.md` for the task breakdown driving development).

## Enums and flags

Every enum in LibRaw's `libraw_const.h` (warnings, capabilities, decoder flags, raw-unpack options,
thumbnail/image formats, progress stages, error codes, colorspaces, camera-maker/mount/format indexes,
...) is extracted by `scripts/gen-enums.js` into `api/enums.json` and re-exported from the package as
`enums`, an object of named tables:

```js
const { enums, capabilityNames, warningNames, capabilities, decode } = require('@janhapke/libraw');

enums.WARN.NAME_TO_VALUE.FALLBACK_TO_AHD;        // 32768 (1 << 15)
enums.CAPS.NAME_TO_VALUE.ZLIB;                   // 64    (1 << 6)
enums.all.LibRaw_processing_options.NAME_TO_VALUE.PENTAX_PS_ALLFRAMES; // every enum, by its C type name
```

`enums.all` has one entry per C enum name (e.g. `enums.all.LibRaw_warnings`); `enums.WARN`, `enums.CAPS`,
`enums.DECODER`, `enums.RAWOPTIONS`, `enums.PROGRESS`, `enums.ERRORS`, `enums.THUMBNAIL_FORMATS`,
`enums.INTERNAL_THUMBNAIL_FORMATS`, and `enums.IMAGE_FORMATS` are short aliases for the families most
callers reach for. Each table is `{ kind: 'flags' | 'enum', NAME_TO_VALUE, VALUE_TO_NAME, VALUE_TO_NAMES }`
keyed by the *short* name — the enumerator's C name (e.g. `LIBRAW_WARN_FALLBACK_TO_AHD`) with the enum's
common `LIBRAW_..._` prefix stripped (`FALLBACK_TO_AHD`).

Two convenience functions built on the CAPS/WARN tables:

- `capabilityNames()` — the short names of `capabilities()`'s set bits, e.g. `['ZLIB', 'JPEG']`.
- `warningNames(mask)` — the short names of a `LIBRAW_WARN_*` bitmask's set bits, e.g.
  `warningNames(1 << 15) === ['FALLBACK_TO_AHD']`.

`decode()`/`identify()` results carry `warnings: string[]` using these same short names (so
`LIBRAW_WARN_FALLBACK_TO_AHD` reports as `'FALLBACK_TO_AHD'`, not the full `LIBRAW_*` name).

## Testing

`npm test` runs the vitest suite (`test/`) against the committed synthetic PM5544 DNG fixture
(`test/fixtures/pm5544-768x576.dng` — see `test/fixtures/README.md`), no real camera files needed.

Real-camera-file tests are gated on the `LIBRAW_TEST_IMAGES` environment variable (a directory of RAW
files) and skip themselves when it is unset:

```bash
LIBRAW_TEST_IMAGES=/path/to/raw/files npm test
```

On this development machine, `/home/jan/dev/photoview/.private/testimages` is a valid value.

## License

MIT for the binding itself. LibRaw is vendored under its CDDL 1.0 election (an LGPL 2.1 alternative also
exists upstream). See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) and
[`docs/explanation/licensing.md`](./docs/explanation/licensing.md) for the full picture.
