// Ported from photoview's `tests/fixtures/GeneratePm5544Dng.ts` (same repo
// author; see photoview's `tests/fixtures/README.md` for the original
// context: a `LibRawPlugin` test fixture) for @janhapke/libraw's T04 task —
// a small, deterministic, reproducible-from-source synthetic DNG so decode
// tests don't need a real camera RAW file committed to the repo.
//
// Uses `TiffIfdWriter.ts` (ported alongside this file, unchanged) for the
// TIFF/DNG IFD layout + serialization; `sharp` handles image decode/resize/
// JPEG-encode. See `README.md` in this directory and the knowledge-base note
// `/home/jan/dev/_jdd/knowledge-base/dng-generation.md` for the byte-layout
// design.
import { writeFile } from 'fs/promises';
import sharp from 'sharp';
import { TiffType } from './TiffIfdWriter';
import { buildIfdLayout, serializeIfd } from './TiffIfdWriter';
import type { TiffEntrySpec } from './TiffIfdWriter';

const STRIP_OFFSETS_TAG = 273;
const JPEG_OFFSET_TAG = 513;
const JPEG_LENGTH_TAG = 514;
const SUBIFDS_TAG = 330;
const HEADER_SIZE = 8;

interface ThumbSize {
    width: number;
    height: number;
}

/**
 * Generates a minimal, valid DNG with a full-resolution RGGB Bayer raw layer (in a
 * SubIFD) plus a small embedded JPEG thumbnail (in IFD0) — mirroring how real camera
 * DNGs lay out thumbnail + raw. No DNG-writing library required, just `sharp` for
 * image decode/resize/JPEG-encode and hand-built TIFF IFDs for the container.
 */
export class Pm5544DngGenerator {
    async generate(sourcePath: string, outPath: string, thumbSize: ThumbSize = { width: 96, height: 72 }): Promise<{ width: number; height: number; jpegBytes: number }> {
        const { data: rgb, info } = await sharp(sourcePath).raw().toBuffer({ resolveWithObject: true });
        const width = info.width;
        const height = info.height;

        const stripBytes = this.buildBayerMosaic(rgb, width, height, info.channels);
        const jpegBytes = await sharp(sourcePath).resize(thumbSize.width, thumbSize.height).jpeg({ quality: 60 }).toBuffer();

        const rawEntries = this.buildRawEntries(width, height, stripBytes.length);
        const ifd0Entries = this.buildIfd0Entries(thumbSize, jpegBytes.length);

        const ifd0Layout = buildIfdLayout(ifd0Entries, HEADER_SIZE);
        const offsetIfd0Overflow = HEADER_SIZE + ifd0Layout.tableSize;
        const offsetJpeg = offsetIfd0Overflow + ifd0Layout.overflow.length;

        let offsetRawIfd = offsetJpeg + jpegBytes.length;
        const jpegPad = offsetRawIfd % 2 !== 0 ? Buffer.from([0]) : Buffer.alloc(0);
        offsetRawIfd += jpegPad.length;

        const rawLayout = buildIfdLayout(rawEntries, offsetRawIfd);
        if (rawLayout.overflow.length !== 0) {
            throw new Error('Raw SubIFD entries were expected to all be inline (no overflow)');
        }
        const offsetRawPixels = offsetRawIfd + rawLayout.tableSize;

        const ifd0Bytes = serializeIfd(ifd0Layout, 0, {
            [JPEG_OFFSET_TAG]: offsetJpeg,
            [SUBIFDS_TAG]: offsetRawIfd,
        });
        const rawIfdBytes = serializeIfd(rawLayout, 0, {
            [STRIP_OFFSETS_TAG]: offsetRawPixels,
        });

        const header = Buffer.from([0x49, 0x49, 42, 0, HEADER_SIZE, 0, 0, 0]); // 'II' + magic 42 + IFD0 offset

        const out = Buffer.concat([
            header,
            ifd0Bytes,
            ifd0Layout.overflow,
            jpegBytes,
            jpegPad,
            rawIfdBytes,
            rawLayout.overflow,
            stripBytes,
        ]);

        await writeFile(outPath, out);

        return { width, height, jpegBytes: jpegBytes.length };
    }

    private buildBayerMosaic(rgb: Buffer, width: number, height: number, channels: number): Buffer {
        const mosaic = Buffer.alloc(width * height * 2);
        const scale = 257; // 255 * 257 == 65535

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const pixelOffset = (y * width + x) * channels;
                const r = rgb[pixelOffset];
                const g = rgb[pixelOffset + 1];
                const b = rgb[pixelOffset + 2];

                let value: number;
                if (y % 2 === 0 && x % 2 === 0) {
                    value = r * scale; // R
                } else if (y % 2 === 0 && x % 2 === 1) {
                    value = g * scale; // G
                } else if (y % 2 === 1 && x % 2 === 0) {
                    value = g * scale; // G
                } else {
                    value = b * scale; // B
                }

                mosaic.writeUInt16LE(value, (y * width + x) * 2);
            }
        }

        return mosaic;
    }

    private buildRawEntries(width: number, height: number, stripByteCount: number): TiffEntrySpec[] {
        return [
            { tag: 254, type: TiffType.LONG, values: [0] }, // NewSubfileType = full-res raw
            { tag: 256, type: TiffType.LONG, values: [width] },
            { tag: 257, type: TiffType.LONG, values: [height] },
            { tag: 258, type: TiffType.SHORT, values: [16] }, // BitsPerSample
            { tag: 259, type: TiffType.SHORT, values: [1] }, // Compression = none
            { tag: 262, type: TiffType.SHORT, values: [32803] }, // PhotometricInterpretation = CFA
            { tag: STRIP_OFFSETS_TAG, type: TiffType.LONG, values: null }, // patched
            { tag: 277, type: TiffType.SHORT, values: [1] }, // SamplesPerPixel
            { tag: 278, type: TiffType.LONG, values: [height] }, // RowsPerStrip
            { tag: 279, type: TiffType.LONG, values: [stripByteCount] }, // StripByteCounts
            { tag: 284, type: TiffType.SHORT, values: [1] }, // PlanarConfiguration
            { tag: 33421, type: TiffType.SHORT, values: [2, 2] }, // CFARepeatPatternDim
            { tag: 33422, type: TiffType.BYTE, values: [0, 1, 1, 2] }, // CFAPattern RGGB
            { tag: 50714, type: TiffType.LONG, values: [0] }, // BlackLevel
            { tag: 50717, type: TiffType.LONG, values: [65535] }, // WhiteLevel
        ];
    }

    private buildIfd0Entries(thumbSize: ThumbSize, jpegByteLength: number): TiffEntrySpec[] {
        return [
            { tag: 254, type: TiffType.LONG, values: [1] }, // NewSubfileType = thumbnail/reduced-res
            { tag: 256, type: TiffType.LONG, values: [thumbSize.width] },
            { tag: 257, type: TiffType.LONG, values: [thumbSize.height] },
            { tag: 258, type: TiffType.SHORT, values: [8] }, // BitsPerSample (nominal; JPEG is self-describing)
            { tag: 259, type: TiffType.SHORT, values: [6] }, // Compression = old-style JPEG (Exif-thumbnail convention)
            { tag: 262, type: TiffType.SHORT, values: [6] }, // PhotometricInterpretation = YCbCr
            { tag: 271, type: TiffType.ASCII, values: 'janhapke/libraw' }, // Make
            { tag: 272, type: TiffType.ASCII, values: 'PM5544 Synthetic' }, // Model
            { tag: 274, type: TiffType.SHORT, values: [1] }, // Orientation
            { tag: 277, type: TiffType.SHORT, values: [3] }, // SamplesPerPixel
            { tag: JPEG_OFFSET_TAG, type: TiffType.LONG, values: null }, // patched
            { tag: JPEG_LENGTH_TAG, type: TiffType.LONG, values: [jpegByteLength] },
            { tag: SUBIFDS_TAG, type: TiffType.LONG, values: null }, // patched: offset to raw SubIFD
            { tag: 50706, type: TiffType.BYTE, values: [1, 4, 0, 0] }, // DNGVersion 1.4.0.0
            { tag: 50707, type: TiffType.BYTE, values: [1, 1, 0, 0] }, // DNGBackwardVersion 1.1.0.0
            { tag: 50708, type: TiffType.ASCII, values: '@janhapke/libraw Synthetic Test Camera' }, // UniqueCameraModel
            {
                tag: 50721,
                type: TiffType.SRATIONAL,
                values: [[1, 1], [0, 1], [0, 1], [0, 1], [1, 1], [0, 1], [0, 1], [0, 1], [1, 1]],
            }, // ColorMatrix1 (identity)
            { tag: 50778, type: TiffType.SHORT, values: [21] }, // CalibrationIlluminant1 = D65
        ];
    }
}

async function main(): Promise<void> {
    const [sourcePath, outPath] = process.argv.slice(2);
    if (!sourcePath || !outPath) {
        console.error('Usage: npx tsx test/fixtures/GeneratePm5544Dng.ts <source.png> <output.dng>');
        process.exit(1);
    }
    const result = await new Pm5544DngGenerator().generate(sourcePath, outPath);
    console.log(`Wrote ${outPath} (raw ${result.width}x${result.height}, embedded thumb JPEG ${result.jpegBytes} bytes)`);
}

// package.json has no "type": "module", so tsx transpiles this file's
// `import`s to CommonJS `require`s and the usual `require.main` guard works,
// same as the ts-node-run original in photoview.
if (require.main === module) {
    void main();
}
