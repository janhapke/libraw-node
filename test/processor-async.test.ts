// T07: Promise-returning (AsyncWorker-backed) Processor stage methods
// (src/async_workers.h, src/processor.cc's "Async (Promise-returning) stage
// methods" section) and the busy guard (ERR_LIBRAW_BUSY, src/errors.h/.cc).
//
// Mirrors test/processor-sync.test.ts's fixture usage (synthetic PM5544 DNG,
// real-files hook via LIBRAW_TEST_IMAGES -- see test/helpers/fixtures.ts).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import libraw from '../lib/index.cjs';
import { SYNTHETIC_DNG_PATH, realImagePath, realTestImagesDir } from './helpers/fixtures';

type LibRawErrorInstance = InstanceType<typeof libraw.LibRawError>;

function freshBuffer(): Buffer {
    return readFileSync(SYNTHETIC_DNG_PATH);
}

describe('Processor — async staged methods (synthetic PM5544 DNG)', () => {
    it('runs the full openBuffer -> unpack -> process -> image pipeline and resolves', async () => {
        const p = new libraw.Processor();
        await p.openBuffer(freshBuffer());
        await p.unpack();
        await p.process();
        const img = await p.image({});
        expect(img.width).toBe(768);
        expect(img.height).toBe(576);
        expect(img.colors).toBe(3);
        expect(img.bits).toBe(8);
        expect(img.data.length).toBe(768 * 576 * 3);
        p.close();
    });

    it("the async pipeline's output buffer equals decodeSync's byte-for-byte for the synthetic DNG", async () => {
        // Same use_camera_wb note as processor-sync.test.ts: Processor applies
        // no params (setParams lands in T12), so pass the matching option to
        // decodeSync for a pipeline-equivalence comparison.
        const reference = libraw.decodeSync(freshBuffer(), { use_camera_wb: false });

        const p = new libraw.Processor();
        await p.openBuffer(freshBuffer());
        await p.unpack();
        await p.process();
        const img = await p.image({});
        p.close();

        expect(img.width).toBe(reference.width);
        expect(img.height).toBe(reference.height);
        expect(img.colors).toBe(reference.colors);
        expect(img.bits).toBe(reference.bits);
        expect(Buffer.compare(img.data, reference.data)).toBe(0);
    });

    it('unpackThumb + thumb extracts the embedded JPEG thumbnail', async () => {
        const p = new libraw.Processor();
        await p.openBuffer(freshBuffer());
        await p.unpackThumb();
        const thumb = await p.thumb();
        expect(thumb.type).toBe('jpeg');
        expect(thumb.data.length).toBeGreaterThan(0);
        expect(thumb.data[0]).toBe(0xff);
        expect(thumb.data[1]).toBe(0xd8);
        p.close();
    });

    it('adjustSizesInfoOnly resolves without a full decode', async () => {
        const p = new libraw.Processor();
        await p.openBuffer(freshBuffer());
        await expect(p.adjustSizesInfoOnly()).resolves.toBeUndefined();
        p.close();
    });

    it('openFile opens from a path and the pipeline resolves', async () => {
        const p = new libraw.Processor();
        await p.openFile(SYNTHETIC_DNG_PATH);
        await p.unpack();
        await p.process();
        const img = await p.image({});
        expect(img.width).toBe(768);
        p.close();
    });

    it('rejects with a LibRawError (LIBRAW_OUT_OF_ORDER_CALL) instead of throwing synchronously for out-of-order calls', async () => {
        const p = new libraw.Processor();
        // unpack() before openBuffer/openFile: the returned value must already
        // be a Promise (never a synchronous throw) that then rejects.
        const result = p.unpack();
        expect(result).toBeInstanceOf(Promise);
        await expect(result).rejects.toBeInstanceOf(libraw.LibRawError);
        try {
            await p.unpack();
            expect.unreachable('unpack() before open should have rejected');
        } catch (err) {
            expect((err as LibRawErrorInstance).name).toBe('LIBRAW_OUT_OF_ORDER_CALL');
            expect((err as LibRawErrorInstance).code).toBe(-4);
            expect((err as LibRawErrorInstance).stage).toBe('unpack');
        }
        p.close();
    });

    it('keeps the input buffer usable if the caller drops its own reference (openBuffer + GC)', async () => {
        // See src/async_workers.h's OpenBufferWorker: on success, the pinned
        // Buffer reference is handed off to Processor::inputRef_, which must
        // outlive whatever the caller does with its own `buf` variable.
        // Requires --expose-gc (see the reading run below); skipped otherwise
        // rather than silently not exercising the GC path.
        if (!global.gc) {
            console.log('SKIPPED: keeps-buffer-usable-after-GC test needs --expose-gc (NODE_OPTIONS=--expose-gc npm test)');
            return;
        }
        const p = new libraw.Processor();
        let buf: Buffer | undefined = freshBuffer();
        await p.openBuffer(buf);
        buf = undefined;
        global.gc();
        await p.unpack();
        await p.process();
        const img = await p.image({});
        expect(img.width).toBe(768);
        expect(img.height).toBe(576);
        p.close();
    });
});

describe('Processor — busy guard (ERR_LIBRAW_BUSY)', () => {
    it('rejects a concurrent second call immediately (a rejected promise, not a throw) with a LibRawError named ERR_LIBRAW_BUSY', async () => {
        const p = new libraw.Processor();
        p.openBufferSync(freshBuffer());

        const first = p.unpack(); // in flight, off the JS thread

        const start = performance.now();
        const second = p.unpack(); // called while busy
        expect(second).toBeInstanceOf(Promise); // rejection, not a synchronous throw

        let elapsedMs = -1;
        try {
            await second;
            expect.unreachable('second concurrent unpack() should have rejected');
        } catch (err) {
            elapsedMs = performance.now() - start;
            expect(err).toBeInstanceOf(libraw.LibRawError);
            expect((err as LibRawErrorInstance).name).toBe('ERR_LIBRAW_BUSY');
            expect((err as LibRawErrorInstance).code).toBe(-1000001);
        }
        // eslint-disable-next-line no-console
        console.log(`ERR_LIBRAW_BUSY rejection latency: ${elapsedMs.toFixed(3)} ms`);
        expect(elapsedMs).toBeGreaterThanOrEqual(0);
        expect(elapsedMs).toBeLessThan(25); // typical <1 ms; 25 ms tolerates parallel vitest workers decoding with OpenMP

        await first; // let the in-flight unpack() finish before close()
        p.close();
    });

    it('a synchronous accessor also throws ERR_LIBRAW_BUSY while an async call is in flight', async () => {
        const p = new libraw.Processor();
        p.openBufferSync(freshBuffer());
        const inFlight = p.unpack();
        expect(() => p.unpackSync()).toThrowError();
        try {
            p.unpackSync();
            expect.unreachable('unpackSync() while busy should have thrown');
        } catch (err) {
            expect((err as LibRawErrorInstance).name).toBe('ERR_LIBRAW_BUSY');
        }
        await inFlight;
        p.close();
    });
});

describe.skipIf(!realTestImagesDir)('Processor — async unpack() frees the JS thread (LIBRAW_TEST_IMAGES)', () => {
    it('a setInterval(…, 10) on the same thread ticks at least 20 times before unpack() of IMGP5127.DNG resolves', async () => {
        const p = new libraw.Processor();
        p.openBufferSync(readFileSync(realImagePath('IMGP5127.DNG')));

        let ticks = 0;
        const timer = setInterval(() => {
            ticks++;
        }, 10);

        const start = performance.now();
        await p.unpack();
        const elapsedMs = performance.now() - start;
        clearInterval(timer);

        // eslint-disable-next-line no-console
        console.log(`unpack(IMGP5127.DNG): ${elapsedMs.toFixed(2)} ms, setInterval(10ms) ticks: ${ticks}`);
        expect(ticks).toBeGreaterThanOrEqual(20);

        p.close();
    });
});
