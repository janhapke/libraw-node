// T04: synthetic-DNG decode correctness + timing, and real-file dimension
// checks gated on LIBRAW_TEST_IMAGES (see test/helpers/fixtures.ts and
// test/fixtures/README.md).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import libraw from '../lib/index.cjs';
import { SYNTHETIC_DNG_PATH, SYNTHETIC_SOURCE_PNG_PATH, realImagePath, realTestImagesDir } from './helpers/fixtures';

interface DecodedImage {
    width: number;
    height: number;
    colors: number;
    bits: number;
    data: Buffer;
}

describe('decodeSync — synthetic PM5544 DNG', () => {
    it('decodes to 768x576x3 and prints the timing', () => {
        const buf = readFileSync(SYNTHETIC_DNG_PATH);

        const start = performance.now();
        const img: DecodedImage = libraw.decodeSync(buf, {});
        const elapsedMs = performance.now() - start;
        // eslint-disable-next-line no-console
        console.log(`decodeSync(pm5544-768x576.dng): ${elapsedMs.toFixed(2)} ms`);

        expect(img.width).toBe(768);
        expect(img.height).toBe(576);
        expect(img.colors).toBe(3);
        expect(img.bits).toBe(8);
        expect(img.data.length).toBe(768 * 576 * 3);
    });

    it('reports per-stage timings when stages: true (T05)', () => {
        const buf = readFileSync(SYNTHETIC_DNG_PATH);
        const img = libraw.decodeSync(buf, { stages: true }) as DecodedImage & {
            stages: { open: number; unpack: number; process: number; copy: number };
        };

        expect(img.stages).toBeTypeOf('object');
        for (const key of ['open', 'unpack', 'process', 'copy'] as const) {
            expect(img.stages[key], `stages.${key}`).toBeTypeOf('number');
            expect(img.stages[key], `stages.${key} >= 0`).toBeGreaterThanOrEqual(0);
        }

        // Without stages: true (or with it omitted/false), no stages key leaks in.
        const plain = libraw.decodeSync(buf, {}) as DecodedImage & { stages?: unknown };
        expect(plain.stages).toBeUndefined();
    });

    it('demosaics half_size to 384x288', () => {
        const buf = readFileSync(SYNTHETIC_DNG_PATH);
        const img: DecodedImage = libraw.decodeSync(buf, { half_size: true });
        expect(img.width).toBe(384);
        expect(img.height).toBe(288);
    });

    it('matches known PM5544 colour-bar pixels within tolerance of the source PNG', async () => {
        const dngBuf = readFileSync(SYNTHETIC_DNG_PATH);
        const img: DecodedImage = libraw.decodeSync(dngBuf, {});

        const { data: srcData, info } = await sharp(SYNTHETIC_SOURCE_PNG_PATH).raw().toBuffer({ resolveWithObject: true });
        expect(info.width).toBe(img.width);
        expect(info.height).toBe(img.height);

        const srcAt = (x: number, y: number) => {
            const o = (y * info.width + x) * info.channels;
            return [srcData[o], srcData[o + 1], srcData[o + 2]] as const;
        };
        const decAt = (x: number, y: number) => {
            const o = (y * img.width + x) * img.colors;
            return [img.data[o], img.data[o + 1], img.data[o + 2]] as const;
        };

        // decodeSync's default params run the full pipeline (demosaic, white
        // balance, gamma, auto-bright), so decoded values are not numerically
        // identical to the linear source PNG. What is stable across that
        // pipeline (verified against LibRaw 0.22.2's actual output for this
        // fixture) is which channels stay saturated/near-zero: a source
        // channel far from mid-grey (>=150 or <=40) keeps the same "bright"/
        // "dark" bucket after gamma+WB, with generous margin for demosaic
        // bleed at colour-bar edges.
        const points: Array<[number, number]> = [
            [10, 10], // white border
            [600, 300], // black bar
            [240, 200], // cyan bar
            [350, 200], // green bar (away from the 300px bar edge; demosaic bleeds near hard edges)
            [420, 200], // magenta bar
            [480, 200], // red bar
            [600, 200], // blue bar
        ];

        for (const [x, y] of points) {
            const src = srcAt(x, y);
            const dec = decAt(x, y);
            for (let c = 0; c < 3; c++) {
                if (src[c] >= 150) {
                    expect(dec[c], `(${x},${y}) channel ${c}: src=${src[c]} dec=${dec[c]}`).toBeGreaterThanOrEqual(150);
                } else if (src[c] <= 40) {
                    expect(dec[c], `(${x},${y}) channel ${c}: src=${src[c]} dec=${dec[c]}`).toBeLessThanOrEqual(80);
                }
            }
        }
    });

    it('throws a LibRawError-shaped Error (code = LIBRAW_* name) for garbage input', () => {
        const garbage = Buffer.from('not a raw file, just some bytes to trigger a LibRaw open/unpack failure');
        expect(() => libraw.decodeSync(garbage, {})).toThrowError();
        try {
            libraw.decodeSync(garbage, {});
            expect.unreachable('decodeSync should have thrown');
        } catch (err) {
            expect(err).toBeInstanceOf(Error);
            expect((err as Error & { code?: string }).code).toMatch(/^LIBRAW_/);
        }
    });
});

describe.skipIf(!realTestImagesDir)('decodeSync — real camera files (LIBRAW_TEST_IMAGES)', () => {
    it.each([
        ['IMGP5127.DNG', 4950, 3284],
        ['DSC_4985.NEF', 3900, 2613],
        ['P3210619.ORF', 4014, 3016],
    ])('%s decodes to %ix%i', (basename, width, height) => {
        const buf = readFileSync(realImagePath(basename as string));
        const start = performance.now();
        const img: DecodedImage = libraw.decodeSync(buf, {});
        const elapsedMs = performance.now() - start;
        // eslint-disable-next-line no-console
        console.log(`decodeSync(${basename}): ${elapsedMs.toFixed(2)} ms`);
        expect(img.width).toBe(width);
        expect(img.height).toBe(height);
        expect(img.colors).toBe(3);
    });
});
