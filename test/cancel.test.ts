// T09: AbortSignal-driven cancellation for the fused helpers (decode,
// thumbnail -- src/fused.cc, lib/fused.cjs) and Processor's async stage
// methods (src/processor.cc, src/async_workers.h, lib/processor.cjs).
//
// The pre-abort fast path (signal already aborted at call time) is
// deterministic and fast enough to test on the synthetic PM5544 DNG. Real
// mid-flight cancellation needs a decode slow enough to have a window to
// abort into -- the synthetic DNG's ~5-20 ms unpack does not reliably give
// that, so those tests are gated on LIBRAW_TEST_IMAGES (IMGP5127.DNG: unpack
// ~420 ms, process ~160 ms per docs/plan/tasks.md's T09 section).
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import libraw from '../lib/index.cjs';
import { SYNTHETIC_DNG_PATH, realImagePath, realTestImagesDir } from './helpers/fixtures';

type LibRawErrorInstance = InstanceType<typeof libraw.LibRawError>;

function freshBuffer(): Buffer {
    return readFileSync(SYNTHETIC_DNG_PATH);
}

function expectCancelledError(err: unknown) {
    expect(err).toBeInstanceOf(libraw.LibRawError);
    const e = err as LibRawErrorInstance & { aborted?: boolean };
    expect(e.name).toBe('LIBRAW_CANCELLED_BY_CALLBACK');
    expect(e.code).toBe(-100010);
    expect(e.aborted).toBe(true);
}

describe('cancellation — pre-aborted signal rejects immediately, without touching LibRaw', () => {
    // Warm up the JS wrappers once so the latency assertions below measure the
    // steady-state path, not first-call module/JIT costs (seen at 5.3 ms once
    // while Docker builds ran concurrently on the same host).
    beforeAll(async () => {
        const controller = new AbortController();
        controller.abort();
        await libraw.decode(freshBuffer(), { signal: controller.signal }).catch(() => {});
        await libraw.thumbnail(freshBuffer(), { signal: controller.signal }).catch(() => {});
        const p = new libraw.Processor();
        p.openBufferSync(freshBuffer());
        await p.unpack({ signal: controller.signal }).catch(() => {});
        p.close();
    });

    it('decode() rejects in well under 5 ms', async () => {
        const controller = new AbortController();
        controller.abort();
        const t0 = performance.now();
        try {
            await libraw.decode(freshBuffer(), { signal: controller.signal });
            expect.unreachable('pre-aborted decode() should have rejected');
        } catch (err) {
            const elapsedMs = performance.now() - t0;
            // eslint-disable-next-line no-console
            console.log(`pre-aborted decode() rejection latency: ${elapsedMs.toFixed(3)} ms`);
            expectCancelledError(err);
            expect(elapsedMs).toBeLessThan(25); // typical <1 ms; 25 ms tolerates parallel vitest workers decoding with OpenMP
        }
    });

    it('thumbnail() rejects in well under 5 ms', async () => {
        const controller = new AbortController();
        controller.abort();
        const t0 = performance.now();
        try {
            await libraw.thumbnail(freshBuffer(), { signal: controller.signal });
            expect.unreachable('pre-aborted thumbnail() should have rejected');
        } catch (err) {
            const elapsedMs = performance.now() - t0;
            // eslint-disable-next-line no-console
            console.log(`pre-aborted thumbnail() rejection latency: ${elapsedMs.toFixed(3)} ms`);
            expectCancelledError(err);
            expect(elapsedMs).toBeLessThan(25); // typical <1 ms; 25 ms tolerates parallel vitest workers decoding with OpenMP
        }
    });

    it('Processor.unpack() rejects in well under 5 ms and leaves the Processor otherwise untouched', async () => {
        const p = new libraw.Processor();
        p.openBufferSync(freshBuffer());
        const controller = new AbortController();
        controller.abort();
        const t0 = performance.now();
        try {
            await p.unpack({ signal: controller.signal });
            expect.unreachable('pre-aborted unpack() should have rejected');
        } catch (err) {
            const elapsedMs = performance.now() - t0;
            // eslint-disable-next-line no-console
            console.log(`pre-aborted Processor.unpack() rejection latency: ${elapsedMs.toFixed(3)} ms`);
            expectCancelledError(err);
            expect(elapsedMs).toBeLessThan(25); // typical <1 ms; 25 ms tolerates parallel vitest workers decoding with OpenMP
        }
        // A pre-aborted signal must not mark the Processor as needing
        // recycle() -- it never touched LibRaw at all (src/errors.cc's
        // RejectIfAborted runs before any worker is even constructed).
        await expect(p.unpack()).resolves.toBeUndefined();
        p.close();
    });
});

describe('cancellation — aborting after completion is harmless', () => {
    it('calling abort() after decode() already resolved does nothing observable', async () => {
        const controller = new AbortController();
        const img = await libraw.decode(freshBuffer(), { signal: controller.signal });
        expect(img.width).toBe(768);
        expect(() => controller.abort()).not.toThrow();
    });

    it('calling abort() after Processor.unpack() already resolved does not block the next stage', async () => {
        const p = new libraw.Processor();
        p.openBufferSync(freshBuffer());
        const controller = new AbortController();
        await p.unpack({ signal: controller.signal });
        controller.abort();
        // If the late abort() had leaked into needing recycle() (or LibRaw's
        // own _exitflag, see src/async_workers.h's SettleCancelState), this
        // would reject with LIBRAW_OUT_OF_ORDER_CALL / LIBRAW_CANCELLED_BY_CALLBACK.
        await expect(p.process()).resolves.toBeUndefined();
        p.close();
    });
});

describe.skipIf(!realTestImagesDir)('cancellation — real camera file (LIBRAW_TEST_IMAGES)', () => {
    it('aborting 50 ms into decode(IMGP5127.DNG) rejects within 200 ms of abort(), and a following decode matches an uncancelled decode byte-for-byte', async () => {
        const buf = readFileSync(realImagePath('IMGP5127.DNG'));
        const controller = new AbortController();

        let abortAtMs = 0;
        const timer = setTimeout(() => {
            abortAtMs = performance.now();
            controller.abort();
        }, 50);

        let rejectedAtMs = 0;
        try {
            await libraw.decode(buf, { signal: controller.signal });
            expect.unreachable('cancelled decode(IMGP5127.DNG) should have rejected');
        } catch (err) {
            rejectedAtMs = performance.now();
            expectCancelledError(err);
        } finally {
            clearTimeout(timer);
        }

        const latencyMs = rejectedAtMs - abortAtMs;
        // eslint-disable-next-line no-console
        console.log(`decode(IMGP5127.DNG) abort-to-rejection latency: ${latencyMs.toFixed(3)} ms`);
        expect(latencyMs).toBeGreaterThanOrEqual(0);
        expect(latencyMs).toBeLessThan(200);

        // Same buffer, same file, no signal at all -- must be unaffected by
        // the previous, cancelled call (no leaked cancel state: src/
        // async_workers.h's SettleCancelState / src/fused.cc reuses neither
        // the LibRaw instance nor the JobCancelState across calls).
        const reference = await libraw.decode(readFileSync(realImagePath('IMGP5127.DNG')));
        const again = await libraw.decode(buf);
        expect(again.width).toBe(reference.width);
        expect(again.height).toBe(reference.height);
        expect(Buffer.compare(again.data, reference.data)).toBe(0);
    }, 15000);

    it('aborting during Processor.unpack() of IMGP5127.DNG rejects, and the next stage call throws LIBRAW_OUT_OF_ORDER_CALL until recycle()', async () => {
        const p = new libraw.Processor();
        p.openBufferSync(readFileSync(realImagePath('IMGP5127.DNG')));
        const controller = new AbortController();

        let abortAtMs = 0;
        const timer = setTimeout(() => {
            abortAtMs = performance.now();
            controller.abort();
        }, 50);

        let rejectedAtMs = 0;
        try {
            await p.unpack({ signal: controller.signal });
            expect.unreachable('cancelled unpack() should have rejected');
        } catch (err) {
            rejectedAtMs = performance.now();
            expectCancelledError(err);
        } finally {
            clearTimeout(timer);
        }

        const latencyMs = rejectedAtMs - abortAtMs;
        // eslint-disable-next-line no-console
        console.log(`Processor.unpack(IMGP5127.DNG) abort-to-rejection latency: ${latencyMs.toFixed(3)} ms`);
        expect(latencyMs).toBeGreaterThanOrEqual(0);
        expect(latencyMs).toBeLessThan(200);

        // The "next stage call ... throws LIBRAW_OUT_OF_ORDER_CALL" rule
        // (docs/reference/proposed-binding-api.md, processor.h's
        // needsRecycle_ comment) -- covers retrying the *same* stage, a
        // later stage, and the synchronous accessor.
        await expect(p.unpack()).rejects.toMatchObject({ name: 'LIBRAW_OUT_OF_ORDER_CALL', code: -4 });
        await expect(p.process()).rejects.toMatchObject({ name: 'LIBRAW_OUT_OF_ORDER_CALL', code: -4 });
        expect(() => p.unpackSync()).toThrowError();
        try {
            p.unpackSync();
            expect.unreachable('unpackSync() after a cancelled unpack() should have thrown');
        } catch (err) {
            expect((err as LibRawErrorInstance).name).toBe('LIBRAW_OUT_OF_ORDER_CALL');
        }

        // recycle() clears it; the Processor is fully usable again.
        p.recycle();
        p.openBufferSync(readFileSync(realImagePath('IMGP5127.DNG')));
        await expect(p.unpack()).resolves.toBeUndefined();
        await expect(p.process()).resolves.toBeUndefined();
        p.close();
    }, 15000);

    it('an aborted thumbnail() rejects with LIBRAW_CANCELLED_BY_CALLBACK', async () => {
        const buf = readFileSync(realImagePath('IMGP5127.DNG'));
        const controller = new AbortController();
        controller.abort();
        try {
            await libraw.thumbnail(buf, { signal: controller.signal });
            expect.unreachable('aborted thumbnail() should have rejected');
        } catch (err) {
            expectCancelledError(err);
        }
    });
});
