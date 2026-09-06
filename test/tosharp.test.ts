// T16: toSharp(sharpModule) -- attached (non-enumerable) by lib/tosharp.cjs
// to decode()/thumbnail() results (lib/fused.cjs) and to
// Processor.imageSync()/image()/thumbSync()/thumb() results
// (lib/processor.cjs). Covers the acceptance case from docs/plan/tasks.md's
// T16 section ("`(await decode(dng)).toSharp(sharp).jpeg().toBuffer()`
// yields a JPEG") plus the other call sites/edge cases named in this task's
// instructions: a JPEG thumbnail, a synchronous Processor.imageSync()
// result, `toSharp` staying off `Object.keys()`, and 16-bit (`output_bps:
// 16`) raw output.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import libraw from '../lib/index.cjs';
import { SYNTHETIC_DNG_PATH } from './helpers/fixtures';

function freshBuffer(): Buffer {
    return readFileSync(SYNTHETIC_DNG_PATH);
}

describe('toSharp() — decode() result', () => {
    it('produces a sharp pipeline that encodes to a JPEG matching the DNG dimensions', async () => {
        const img = await libraw.decode(freshBuffer());
        const jpeg = await img.toSharp(sharp).jpeg().toBuffer();

        expect(jpeg[0]).toBe(0xff);
        expect(jpeg[1]).toBe(0xd8);

        const meta = await sharp(jpeg).metadata();
        expect(meta.width).toBe(img.width);
        expect(meta.height).toBe(img.height);
        expect(img.width).toBe(768);
        expect(img.height).toBe(576);
    });

    it('is not an own enumerable key of the result', async () => {
        const img = await libraw.decode(freshBuffer());
        expect(Object.keys(img)).not.toContain('toSharp');
        expect(Object.prototype.propertyIsEnumerable.call(img, 'toSharp')).toBe(false);
        // ...but is still callable, and JSON.stringify/spread stay unaffected.
        expect(typeof img.toSharp).toBe('function');
        expect(JSON.parse(JSON.stringify({ ...img, data: undefined })).toSharp).toBeUndefined();
    });

    it('supports 16-bit output (output_bps: 16), reading full-range 16-bit samples', async () => {
        const img = await libraw.decode(freshBuffer(), { params: { output_bps: 16 } });
        expect(img.bits).toBe(16);
        expect(img.data.length).toBe(img.width * img.height * img.colors * 2);

        // A PNG/JPEG encode still succeeds (sharp downcasts to 8-bit for
        // those formats regardless of input depth -- see
        // lib/tosharp.cjs's header comment).
        const jpeg = await img.toSharp(sharp).jpeg().toBuffer();
        expect(jpeg[0]).toBe(0xff);
        expect(jpeg[1]).toBe(0xd8);

        // The pipeline reads the data as genuine 16-bit samples (not just
        // the low byte of each pair): round-tripping through raw output at
        // `depth: 'ushort'` reproduces the exact input byte length, and a
        // sample known to be 0xffff in the source buffer stays full-scale
        // instead of being misread as an 8-bit 0xff/0x00 pair.
        const rawView = new Uint16Array(img.data.buffer, img.data.byteOffset, img.data.length / 2);
        expect(rawView[0]).toBe(0xffff);
        const { data: rawOut, info } = await img
            .toSharp(sharp)
            .raw({ depth: 'ushort' })
            .toBuffer({ resolveWithObject: true });
        expect(info.depth).toBe('ushort');
        expect(rawOut.length).toBe(img.data.length);
    });
});

describe('toSharp() — thumbnail() result (JPEG format)', () => {
    it('hands the JPEG bytes straight to sharp, which decodes them', async () => {
        const thumb = await libraw.thumbnail(freshBuffer());
        expect(thumb.format).toBe('jpeg');

        const jpeg = await thumb.toSharp(sharp).jpeg().toBuffer();
        expect(jpeg[0]).toBe(0xff);
        expect(jpeg[1]).toBe(0xd8);

        const meta = await sharp(jpeg).metadata();
        expect(meta.width).toBe(thumb.width);
        expect(meta.height).toBe(thumb.height);
    });

    it('is not an own enumerable key of the result', async () => {
        const thumb = await libraw.thumbnail(freshBuffer());
        expect(Object.keys(thumb)).not.toContain('toSharp');
    });
});

describe('toSharp() — Processor.imageSync() result', () => {
    it('produces a sharp pipeline from the synchronous staged API', () => {
        const p = new libraw.Processor();
        p.openBufferSync(freshBuffer());
        p.unpackSync();
        p.processSync();
        const img = p.imageSync();

        expect(Object.keys(img)).not.toContain('toSharp');
        return img
            .toSharp(sharp)
            .jpeg()
            .toBuffer()
            .then((jpeg: Buffer) => {
                expect(jpeg[0]).toBe(0xff);
                expect(jpeg[1]).toBe(0xd8);
            });
    });
});

describe('toSharp() — Processor.thumbSync() result (JPEG type)', () => {
    it('produces a sharp pipeline for a JPEG-type thumbnail', () => {
        const p = new libraw.Processor();
        p.openBufferSync(freshBuffer());
        p.unpackThumbSync();
        const thumb = p.thumbSync();
        expect(thumb.type).toBe('jpeg');

        return thumb
            .toSharp(sharp)
            .jpeg()
            .toBuffer()
            .then((jpeg: Buffer) => {
                expect(jpeg[0]).toBe(0xff);
                expect(jpeg[1]).toBe(0xd8);
            });
    });
});
