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
