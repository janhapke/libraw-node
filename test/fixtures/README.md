# Test fixtures

## `pm5544-768x576.dng`

A synthetic DNG raw file used to test RAW decoding (`decodeSync`, T04) without needing a real camera RAW
file committed to the repo.

- **768×576** RGGB Bayer mosaic raw layer, derived from the [PM5544 test card](https://upload.wikimedia.org/wikipedia/commons/c/c4/PM5544_with_non-PAL_signals.png)
  — a real, structured image (not random noise), so a demosaiced preview is visually verifiable and specific
  pixels can be checked against known colour-bar values.
- An embedded **96×72 JPEG thumbnail** (Exif-style, via `JPEGInterchangeFormat`/`JPEGInterchangeFormatLength`
  tags), so both LibRaw's fast preview path and its full demosaic path have real data to exercise (thumbnail
  decoding lands in a later task; the tag is already present).
- ~868 KB — small enough to commit directly, deterministic, and reproducible from source (see below), so
  there's no need for Git LFS or a real multi-megabyte camera file.

The generator (`GeneratePm5544Dng.ts` + `TiffIfdWriter.ts`) and this fixture's design are ported, with
attribution, from Jan Hapke's `photoview` repository (`tests/fixtures/GeneratePm5544Dng.ts` /
`TiffIfdWriter.ts`, same author) — the same file used there to test `LibRawPlugin` before the migration to
this binding. See the knowledge-base note `/home/jan/dev/_jdd/knowledge-base/dng-generation.md` for the
byte-layout design.

## `pm5544-source.png`

The source test card image used to generate the DNG above. Committed so the fixture is reproducible without
depending on network access to Wikipedia at generation time.

## `GeneratePm5544Dng.ts` / `TiffIfdWriter.ts`

The generator. `TiffIfdWriter.ts` is a small, reusable TIFF/DNG IFD writer (layout + serialization of tag
entries, byte offsets, overflow areas). `GeneratePm5544Dng.ts` (`Pm5544DngGenerator` class) uses it to
hand-build a minimal, valid DNG: `sharp` handles image decode/resize/JPEG-encoding, everything else (Bayer
mosaicing, TIFF tags, IFD layout) is written from scratch — no DNG-writing library needed.

**Regenerate:**

```bash
npx tsx test/fixtures/GeneratePm5544Dng.ts test/fixtures/pm5544-source.png test/fixtures/pm5544-768x576.dng
```

To generate from a different source image or at a different thumbnail size, pass a third argument object to
`Pm5544DngGenerator.generate()` in code (thumbnail size defaults to 96×72).

## Deflate-compressed variant: not added (follow-up)

T04 considered committing a second fixture using DNG `Compression=8` (Adobe Deflate) to exercise LibRaw's
compressed-raw decode path. It was **not** added: this vendored LibRaw 0.22.2 build's `deflate_dng_load_raw`
(`vendor/LibRaw/src/decoders/fp_dng.cpp`) only supports **floating-point** deflated DNGs (`ifd->sample_format
== 3`) — it unconditionally throws `LIBRAW_EXCEPTION_DECODE_RAW` ("Only float deflated supported") for
16-bit-integer deflated CFA data, which is what this fixture's Bayer mosaic uses. Making a deflate-compressed
variant decode correctly would mean switching the whole fixture to 32-bit floating-point raw samples (a much
larger generator change: different `TiffType`/pixel packing, different `SampleFormat` tag, likely a different
predictor path), not the "small extension" T04's task text allowed for. Left as a follow-up for whichever
task next needs a compressed-DNG regression test (e.g. alongside a future thumbnail/metadata task) rather
than done speculatively here.

## Real camera files

Real-camera RAW files are never committed to this repo. Tests that need one read the `LIBRAW_TEST_IMAGES`
environment variable (a directory of RAW files) via `test/helpers/fixtures.ts` and skip themselves when it
is unset. On this development machine, `/home/jan/dev/photoview/.private/testimages` is a valid value:

```bash
LIBRAW_TEST_IMAGES=/home/jan/dev/photoview/.private/testimages npm test
```

## Validating a generated DNG manually

There's no automated structural check beyond the vitest suite that consumes the fixture. To eyeball a
regenerated file (requires ImageMagick):

```bash
identify test/fixtures/pm5544-768x576.dng          # confirms dimensions/format
convert test/fixtures/pm5544-768x576.dng /tmp/preview.png   # demosaics the raw layer to PNG
```
