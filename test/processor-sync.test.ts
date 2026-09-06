// T06: unit tests for the Processor object API (lib/processor.cjs +
// src/processor.cc) and the LibRawError error model (lib/errors.cjs), on
// the synthetic PM5544 DNG (see test/fixtures/README.md -- 768x576 raw plus
// an embedded 96x72 JPEG thumbnail, so both the raw and thumbnail paths have
// real data to exercise without a real camera file).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import libraw from '../lib/index.cjs';
import { SYNTHETIC_DNG_PATH } from './helpers/fixtures';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function freshBuffer(): Buffer {
    // A separate copy per test/instance: openBufferSync roots whatever Buffer
    // is passed (Napi::Reference over its V8 backing store), so sharing one
    // Buffer object across processors is fine too, but a fresh read keeps
    // each test independent of decode order.
    return readFileSync(SYNTHETIC_DNG_PATH);
}

describe('Processor — synchronous staged methods (synthetic PM5544 DNG)', () => {
    it('runs the full open -> unpack -> process -> image pipeline', () => {
        const p = new libraw.Processor();
        p.openBufferSync(freshBuffer());
        p.unpackSync();
        p.processSync();
        const img = p.imageSync({});
        expect(img.width).toBe(768);
        expect(img.height).toBe(576);
        expect(img.colors).toBe(3);
        expect(img.bits).toBe(8);
        expect(img.data.length).toBe(768 * 576 * 3);
        p.close();
    });

    it('imageSync matches decodeSync byte-for-byte for the same effective options', () => {
        // decodeSync (T04) forces use_camera_wb=true as its own default;
        // Processor applies no params in T06 (setParams lands in T12), so
        // LibRaw's own zero-initialised default (use_camera_wb=0) applies.
        // Pass the matching option to decodeSync so both pipelines run with
        // the same params -- this is a pipeline-equivalence check, not a
        // claim that the two default option sets match.
        const reference = libraw.decodeSync(freshBuffer(), { use_camera_wb: false });

        const p = new libraw.Processor();
        p.openBufferSync(freshBuffer());
        p.unpackSync();
        p.processSync();
        const img = p.imageSync({});
        p.close();

        expect(Buffer.compare(img.data, reference.data)).toBe(0);
    });

    it('imageSync writes into a caller-provided `into` buffer', () => {
        const p = new libraw.Processor();
        p.openBufferSync(freshBuffer());
        p.unpackSync();
        p.processSync();

        const into = Buffer.alloc(768 * 576 * 3);
        const img = p.imageSync({ into });
        expect(img.data).toBe(into); // same backing buffer, not a fresh allocation
        expect(img.data.some((b: number) => b !== 0)).toBe(true);

        // Too-small `into` is rejected instead of overflowing.
        expect(() => p.imageSync({ into: Buffer.alloc(10) })).toThrowError();

        p.close();
    });

    it('imageSync honours `bgr` (swaps the R and B channels)', () => {
        const p = new libraw.Processor();
        p.openBufferSync(freshBuffer());
        p.unpackSync();
        p.processSync();
        const rgb = p.imageSync({});

        const p2 = new libraw.Processor();
        p2.openBufferSync(freshBuffer());
        p2.unpackSync();
        p2.processSync();
        const bgr = p2.imageSync({ bgr: true });

        // Same size; R and B channels swapped at every pixel, green
        // unchanged. Plain loop + a single assertion at the end (not a
        // per-pixel `expect`) -- vitest's assertion overhead across
        // 768*576 pixels would otherwise dominate the test's wall time.
        expect(bgr.data.length).toBe(rgb.data.length);
        let mismatches = 0;
        let hasAsymmetricPixel = false;
        for (let i = 0; i < rgb.data.length; i += 3) {
            if (bgr.data[i] !== rgb.data[i + 2] || bgr.data[i + 1] !== rgb.data[i + 1] || bgr.data[i + 2] !== rgb.data[i]) {
                mismatches++;
            }
            if (rgb.data[i] !== rgb.data[i + 2]) {
                hasAsymmetricPixel = true;
            }
        }
        expect(mismatches, `${mismatches} pixels did not swap R/B correctly`).toBe(0);
        // The colour bars guarantee at least one pixel where R != B, so the
        // swap above is not vacuously true.
        expect(hasAsymmetricPixel).toBe(true);
        p.close();
        p2.close();
    });

    it('thumbOK reflects the embedded thumbnail\'s presence and size cap', () => {
        const p = new libraw.Processor();
        p.openBufferSync(freshBuffer());
        // Present right after open (LibRaw determines this from the parsed
        // IFD offset/length, not from unpackThumbSync -- see
        // vendor/LibRaw/src/utils/thumb_utils.cpp).
        expect(p.thumbOK()).toBeGreaterThan(0);
        // A 1-byte cap is smaller than the real ~KB-sized JPEG thumbnail, so
        // this is the "no thumbnail [that fits]" case the task asks for.
        expect(p.thumbOK(1)).toBe(0);
        p.close();
    });

    it('unpackThumbSync + thumbSync extracts the embedded JPEG thumbnail', () => {
        const p = new libraw.Processor();
        p.openBufferSync(freshBuffer());
        p.unpackThumbSync();
        const thumb = p.thumbSync();
        expect(thumb.type).toBe('jpeg');
        expect(thumb.data.length).toBeGreaterThan(0);
        expect(thumb.data[0]).toBe(0xff);
        expect(thumb.data[1]).toBe(0xd8);
        p.close();
    });

    it('adjustSizesInfoOnlySync fills sizes without a full decode', () => {
        const p = new libraw.Processor();
        p.openBufferSync(freshBuffer());
        expect(() => p.adjustSizesInfoOnlySync()).not.toThrow();
        p.close();
    });

    it('exposes the read accessors after open/unpack', () => {
        const p = new libraw.Processor();
        p.openBufferSync(freshBuffer());
        p.unpackSync();

        expect(p.errorCount()).toBe(0);
        expect(typeof p.unpackFunctionName()).toBe('string');
        const info = p.decoderInfo();
        expect(typeof info.decoder_name).toBe('string');
        expect(typeof info.decoder_flags).toBe('number');
        expect(typeof p.isFujiRotated()).toBe('boolean');
        expect(typeof p.isSraw()).toBe('boolean');
        expect(typeof p.isNikonSraw()).toBe('boolean');
        expect(typeof p.isCoolscanNef()).toBe('boolean');
        expect(typeof p.isJpegThumb()).toBe('boolean');
        expect(typeof p.isFloatingPoint()).toBe('boolean');
        expect(typeof p.haveFpData()).toBe('boolean');
        expect(typeof p.srawMidpoint()).toBe('number');
        expect(typeof p.color(0, 0)).toBe('number');

        p.close();
    });

    it('recycle() resets state so the processor can be reused', () => {
        const p = new libraw.Processor();
        p.openBufferSync(freshBuffer());
        p.unpackSync();
        p.processSync();
        p.imageSync({});
        p.recycle();

        // Back to pre-open state: staged calls are out-of-order again.
        expect(() => p.unpackSync()).toThrowError();

        // But a fresh open works fine on the same (recycled) instance.
        p.openBufferSync(freshBuffer());
        p.unpackSync();
        p.processSync();
        const img = p.imageSync({});
        expect(img.width).toBe(768);

        p.close();
    });

    it('throws LibRawError with name === "LIBRAW_OUT_OF_ORDER_CALL" for out-of-order calls', () => {
        const p = new libraw.Processor();
        expect.assertions(4);
        try {
            p.unpackSync(); // never opened
        } catch (err) {
            expect(err).toBeInstanceOf(libraw.LibRawError);
            expect((err as InstanceType<typeof libraw.LibRawError>).name).toBe('LIBRAW_OUT_OF_ORDER_CALL');
            expect((err as InstanceType<typeof libraw.LibRawError>).code).toBe(-4);
            expect((err as InstanceType<typeof libraw.LibRawError>).stage).toBe('unpackSync');
        }
        p.close();
    });

    it('same out-of-order error for processSync before unpackSync, and imageSync before processSync', () => {
        const p = new libraw.Processor();
        p.openBufferSync(freshBuffer());
        // The thrown LibRawError's `message` is a human-readable LibRaw
        // strerror() string (no LIBRAW_* text in it); the enumerator name
        // lives in `.name`/`.code`, asserted here instead of via
        // toThrowError's message-regex matching.
        try {
            p.processSync();
            expect.unreachable('processSync before unpackSync should have thrown');
        } catch (err) {
            expect((err as InstanceType<typeof libraw.LibRawError>).name).toBe('LIBRAW_OUT_OF_ORDER_CALL');
        }
        p.unpackSync();
        try {
            p.imageSync({});
            expect.unreachable('imageSync before processSync should have thrown');
        } catch (err) {
            expect((err as InstanceType<typeof libraw.LibRawError>).name).toBe('LIBRAW_OUT_OF_ORDER_CALL');
        }
        p.close();
    });

    it('throws LIBRAW_OUT_OF_ORDER_CALL for any call after close()', () => {
        const p = new libraw.Processor();
        p.openBufferSync(freshBuffer());
        p.close();
        try {
            p.unpackSync();
            expect.unreachable('unpackSync after close() should have thrown');
        } catch (err) {
            expect((err as InstanceType<typeof libraw.LibRawError>).name).toBe('LIBRAW_OUT_OF_ORDER_CALL');
        }
        // close() itself is idempotent.
        expect(() => p.close()).not.toThrow();
    });

    it('accepts a `flags` constructor option', () => {
        expect(() => new libraw.Processor({ flags: 0 })).not.toThrow();
    });
});

describe('Processor — context-aware loading (worker_threads)', () => {
    it('constructs a Processor in three worker_threads simultaneously', async () => {
        const workerPath = path.join(HERE, 'helpers', 'processor-worker.cjs');
        const results = await Promise.all(
            [0, 1, 2].map(
                (id) =>
                    new Promise<string>((resolve, reject) => {
                        const worker = new Worker(workerPath, { workerData: { id, dngPath: SYNTHETIC_DNG_PATH } });
                        worker.once('message', (msg) => resolve(msg as string));
                        worker.once('error', reject);
                    }),
            ),
        );
        expect(results).toEqual(['ok:0', 'ok:1', 'ok:2']);
    });
});
