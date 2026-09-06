// T08: the fused, stateless helpers -- decode(), identify(), thumbnail()
// (src/fused.cc/.h, lib/fused.cjs) -- on the synthetic PM5544 DNG (see
// test/fixtures/README.md) plus real-file timings gated on
// LIBRAW_TEST_IMAGES (see test/helpers/fixtures.ts).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import libraw from '../lib/index.cjs';
import { SYNTHETIC_DNG_PATH, realImagePath, realTestImagesDir } from './helpers/fixtures';

type LibRawErrorInstance = InstanceType<typeof libraw.LibRawError>;

function freshBuffer(): Buffer {
    return readFileSync(SYNTHETIC_DNG_PATH);
}

describe('identify() — synthetic PM5544 DNG', () => {
    it('reports one embedded thumbnail and the expected sizes/idata shape', async () => {
        const info = await libraw.identify(freshBuffer());

        expect(info.thumbs.length).toBe(1);
        expect(info.thumbs[0].tformat).toBe('jpeg');
        expect(info.thumbs[0].twidth).toBeGreaterThan(0);
        expect(info.thumbs[0].theight).toBeGreaterThan(0);

        expect(info.sizes.width).toBe(768);
        expect(info.sizes.height).toBe(576);
        expect(info.sizes.iwidth).toBe(768);
        expect(info.sizes.iheight).toBe(576);

        expect(info.idata.colors).toBeGreaterThan(0);
        expect(typeof info.idata.cdesc).toBe('string');
        expect(typeof info.idata.make).toBe('string');

        expect(info.decoder).toBeTypeOf('object');
        expect(Array.isArray(info.warnings)).toBe(true);
        expect(info.metadata).toEqual({});
    });
});

describe('thumbnail() — synthetic PM5544 DNG', () => {
    it('extracts the embedded JPEG thumbnail', async () => {
        const thumb = await libraw.thumbnail(freshBuffer());
        expect(thumb.format).toBe('jpeg');
        expect(thumb.data[0]).toBe(0xff);
        expect(thumb.data[1]).toBe(0xd8);
        expect(thumb.width).toBeGreaterThan(0);
        expect(thumb.height).toBeGreaterThan(0);
    });
});

describe('decode() — synthetic PM5544 DNG', () => {
    it('half_size gives 384x288', async () => {
        const img = await libraw.decode(freshBuffer(), { params: { half_size: true } });
        expect(img.width).toBe(384);
        expect(img.height).toBe(288);
        expect(img.colors).toBe(3);
        expect(Array.isArray(img.warnings)).toBe(true);
        expect(img.data.length).toBe(img.stride * img.height);
    });

    it('output.into with the correct size fills the caller-supplied buffer', async () => {
        const probe = await libraw.decode(freshBuffer(), {});
        const into = Buffer.alloc(probe.data.length);
        const img = await libraw.decode(freshBuffer(), { output: { into } });
        expect(img.data.length).toBe(into.length);
        expect(img.data.buffer).toBe(into.buffer); // same backing store, not a fresh allocation
        expect(Buffer.compare(img.data, probe.data)).toBe(0);
    });

    it('output.into with a too-small buffer rejects with a RangeError', async () => {
        const into = Buffer.alloc(4); // far too small for any real decode
        await expect(libraw.decode(freshBuffer(), { output: { into } })).rejects.toBeInstanceOf(RangeError);
    });

    it("output.layout: 'bgr' swaps the red/blue channels versus 'rgb'", async () => {
        const rgb = await libraw.decode(freshBuffer(), { output: { layout: 'rgb' } });
        const bgr = await libraw.decode(freshBuffer(), { output: { layout: 'bgr' } });
        expect(bgr.width).toBe(rgb.width);
        expect(bgr.height).toBe(rgb.height);
        expect(bgr.colors).toBe(3);

        // Sample a handful of pixels: R and B channels swapped, G unchanged.
        let sawADifference = false;
        for (let y = 0; y < rgb.height; y += 97) {
            for (let x = 0; x < rgb.width; x += 131) {
                const o = (y * rgb.width + x) * rgb.colors;
                expect(bgr.data[o]).toBe(rgb.data[o + 2]); // B <- R
                expect(bgr.data[o + 1]).toBe(rgb.data[o + 1]); // G unchanged
                expect(bgr.data[o + 2]).toBe(rgb.data[o]); // R <- B
                if (rgb.data[o] !== rgb.data[o + 2]) sawADifference = true;
            }
        }
        // Guard against a vacuous pass (e.g. a channel-swap bug on an
        // all-grey image would trivially satisfy the assertions above).
        expect(sawADifference).toBe(true);
    });

    it('rejects an unknown params key with a TypeError listing the supported keys', async () => {
        await expect(
            libraw.decode(freshBuffer(), { params: { not_a_real_param: 1 } }),
        ).rejects.toThrow(/not_a_real_param.*half_size/s);
    });

    it('rejects an unknown rawparams key with a TypeError listing the supported keys', async () => {
        await expect(
            libraw.decode(freshBuffer(), { rawparams: { not_a_real_param: 1 } }),
        ).rejects.toThrow(/not_a_real_param.*shot_select/s);
    });

    it('a pre-aborted signal rejects immediately with LIBRAW_CANCELLED_BY_CALLBACK / aborted: true', async () => {
        const controller = new AbortController();
        controller.abort();
        try {
            await libraw.decode(freshBuffer(), { signal: controller.signal });
            expect.unreachable('decode() with a pre-aborted signal should have rejected');
        } catch (err) {
            expect(err).toBeInstanceOf(libraw.LibRawError);
            const e = err as LibRawErrorInstance;
            expect(e.name).toBe('LIBRAW_CANCELLED_BY_CALLBACK');
            expect(e.code).toBe(-100010);
            expect((e as LibRawErrorInstance & { aborted?: boolean }).aborted).toBe(true);
        }
    });

    it('two concurrent decode() calls on independent buffers both resolve correctly', async () => {
        const [a, b] = await Promise.all([
            libraw.decode(freshBuffer(), { params: { half_size: true } }),
            libraw.decode(freshBuffer(), {}),
        ]);
        expect(a.width).toBe(384);
        expect(a.height).toBe(288);
        expect(b.width).toBe(768);
        expect(b.height).toBe(576);
    });
});

describe.skipIf(!realTestImagesDir)('fused helpers — real camera file (LIBRAW_TEST_IMAGES)', () => {
    it('identify() and thumbnail() on IMGP5127.DNG each resolve within 15 ms (after a warm-up call)', async () => {
        const buf = readFileSync(realImagePath('IMGP5127.DNG'));

        // Warm-up: first call pays for page faults / filesystem cache misses
        // that are not representative of the steady-state cost this
        // acceptance criterion is about (docs/plan/tasks.md T08).
        await libraw.identify(buf);
        await libraw.thumbnail(buf);

        const t0 = performance.now();
        const info = await libraw.identify(buf);
        const identifyMs = performance.now() - t0;
        // eslint-disable-next-line no-console
        console.log(`identify(IMGP5127.DNG): ${identifyMs.toFixed(3)} ms`);

        const t1 = performance.now();
        const thumb = await libraw.thumbnail(buf);
        const thumbnailMs = performance.now() - t1;
        // eslint-disable-next-line no-console
        console.log(`thumbnail(IMGP5127.DNG): ${thumbnailMs.toFixed(3)} ms`);

        expect(info.idata.make).toBeTruthy();
        expect(thumb.data.length).toBeGreaterThan(0);
        expect(identifyMs).toBeLessThanOrEqual(15);
        expect(thumbnailMs).toBeLessThanOrEqual(15);
    });

    it('decode({ half_size: true, user_qual: 2 }) on IMGP5127.DNG gives 2475x1642', async () => {
        const buf = readFileSync(realImagePath('IMGP5127.DNG'));
        const img = await libraw.decode(buf, { params: { half_size: true, user_qual: 2 } });
        expect(img.width).toBe(2475);
        expect(img.height).toBe(1642);
    });
});
