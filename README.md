# @janhapke/libraw

A general-purpose, Electron-safe Node.js binding for [LibRaw](https://www.libraw.org/), the RAW image
decoding library. Statically links LibRaw, zlib, and libjpeg-turbo; no dynamic sidecar libraries, no
compiler required on the consumer's machine (prebuilt binaries are shipped per platform).

This package is not scoped to any single consumer application — see
`docs/explanation/adoption-comparison.md` for the design rationale.

Status: early scaffold (see `docs/plan/tasks.md` for the task breakdown driving development).

## License

MIT for the binding itself. LibRaw is vendored under its CDDL 1.0 election (an LGPL 2.1 alternative also
exists upstream). See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) and
[`docs/explanation/licensing.md`](./docs/explanation/licensing.md) for the full picture.
