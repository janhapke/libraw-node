// T10: events -- progress, data errors, EXIF tag callback
// (docs/plan/tasks.md's T10 section; src/events.h/.cc, src/progress_stage.h/
// .cc, src/cancel.cc's extended CancelAwareProgressCallback,
// src/async_workers.h's dataerror/exifparser handler installation,
// src/fused.cc's AttachEvents, lib/processor.cjs's EventEmitter wiring,
// lib/fused.cjs's onProgress/onDataError delivery).
//
// Determinism notes (read before touching the "quality" values below):
//   - decode()'s progress test forces `params: { user_qual: 0 }`
//     (lin_interpolate) rather than relying on LibRaw's default demosaic
//     choice for this Bayer synthetic DNG (AHD fallback, quality -1/3):
//     lin_interpolate() calls RUN_CALLBACK(LIBRAW_PROGRESS_INTERPOLATE)
//     unconditionally and single-threaded
//     (vendor/LibRaw/src/demosaic/misc_demosaic.cpp), whereas AHD's own
//     progress callback (vendor/LibRaw/src/demosaic/ahd_demosaic.cpp) only
//     fires from whichever OpenMP thread happens to be thread 0 for a given
//     tile-row -- empirically, on this machine (16 cores), thread 0 gets
//     none of this tiny 768x576 image's ~3 tile-row iterations, so
//     INTERPOLATE never fires under AHD with the default thread count.
//   - Processor has no parameter-setting API yet (setParams lands in T12),
//     so its own progress test (below) cannot force user_qual the same way
//     and instead runs in a subprocess with OMP_NUM_THREADS=1 -- see
//     test/helpers/processor-progress-subprocess.cjs's comment for the full
//     explanation of why that has to be a subprocess, not an in-process env
//     mutation.
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import libraw from '../lib/index.cjs';
import { SYNTHETIC_DNG_PATH } from './helpers/fixtures';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function freshBuffer(): Buffer {
    return readFileSync(SYNTHETIC_DNG_PATH);
}

type ProgressEvent = { stage: string; iteration: number; expected: number };
type DataErrorEvent = { offset: number; message: string };
type ExifTagEvent = { tag: number; type: number; len: number; ordering: number };

describe('progressStages export', () => {
    it('lib/index.cjs exports the generated LibRaw_progress name -> code table', () => {
        expect(libraw.progressStages.LOAD_RAW).toBeTypeOf('number');
        expect(libraw.progressStages.INTERPOLATE).toBeTypeOf('number');
        expect(libraw.progressStages.CONVERT_RGB).toBeTypeOf('number');
    });
});

describe('decode() — onProgress', () => {
    it('emits LOAD_RAW, INTERPOLATE, CONVERT_RGB in that order for a full decode of the synthetic DNG', async () => {
        const stages: string[] = [];
        const result = await libraw.decode(freshBuffer(), {
            // See this file's header comment: user_qual: 0 makes the
            // INTERPOLATE stage fire deterministically.
            params: { user_qual: 0 },
            onProgress: (e: ProgressEvent) => stages.push(e.stage),
        });
        expect(result.width).toBe(768);

        const loadRawIdx = stages.indexOf('LOAD_RAW');
        const interpolateIdx = stages.indexOf('INTERPOLATE');
        const convertRgbIdx = stages.lastIndexOf('CONVERT_RGB');
        expect(loadRawIdx).toBeGreaterThanOrEqual(0);
        expect(interpolateIdx).toBeGreaterThanOrEqual(0);
        expect(convertRgbIdx).toBeGreaterThanOrEqual(0);
        expect(loadRawIdx).toBeLessThan(interpolateIdx);
        expect(interpolateIdx).toBeLessThan(convertRgbIdx);

        // The resolved result never carries the internal `events` property
        // AttachEvents (src/fused.cc) put there for lib/fused.cjs to consume.
        expect(result).not.toHaveProperty('events');
    });

    it('half_size decode has no INTERPOLATE stage', async () => {
        const stages: string[] = [];
        await libraw.decode(freshBuffer(), {
            params: { half_size: true },
            onProgress: (e: ProgressEvent) => stages.push(e.stage),
        });
        expect(stages).toContain('LOAD_RAW');
        expect(stages).not.toContain('INTERPOLATE');
    });
});

describe('decode() — truncated file — onDataError', () => {
    it('a 60%-truncated copy of the synthetic DNG both rejects (LIBRAW_IO_ERROR) and emits a dataError event', async () => {
        // Observed outcome (verified by hand before writing this assertion,
        // see the T10 final report): truncating the synthetic DNG's raw strip
        // makes LibRaw's own I/O layer hit EOF mid-read, which (a) calls the
        // data-error callback (LibRaw's own derror(), offset -1, "data
        // error" -- src/events.cc's RecordDataErrorEvent) *and* (b) still
        // makes unpack() return LIBRAW_IO_ERROR, rejecting the decode()
        // promise. Both happen for this fixture, not just one -- so both are
        // asserted explicitly, per docs/plan/tasks.md's T10 "either outcome
        // is asserted explicitly, not both allowed silently".
        const original = freshBuffer();
        const truncated = original.subarray(0, Math.floor(original.length * 0.6));
        const dir = mkdtempSync(path.join(tmpdir(), 'libraw-node-events-'));
        const truncatedPath = path.join(dir, 'truncated.dng');
        writeFileSync(truncatedPath, truncated);

        const dataErrors: DataErrorEvent[] = [];
        let rejected: unknown;
        try {
            await libraw.decode(readFileSync(truncatedPath), {
                onDataError: (e: DataErrorEvent) => dataErrors.push(e),
            });
            expect.unreachable('decode() of a 60%-truncated synthetic DNG should have rejected');
        } catch (err) {
            rejected = err;
        }

        expect(rejected).toBeInstanceOf(libraw.LibRawError);
        expect((rejected as InstanceType<typeof libraw.LibRawError>).name).toBe('LIBRAW_IO_ERROR');

        expect(dataErrors.length).toBeGreaterThanOrEqual(1);
        expect(dataErrors[0].message).toBe('data error');
    });
});

describe('Processor events (EventEmitter)', () => {
    it('emits LOAD_RAW before INTERPOLATE before CONVERT_RGB across openBuffer -> unpack -> process', () => {
        // Subprocess, not in-process -- see this file's header comment and
        // test/helpers/processor-progress-subprocess.cjs.
        const helper = path.join(HERE, 'helpers', 'processor-progress-subprocess.cjs');
        const stdout = execFileSync(process.execPath, [helper, SYNTHETIC_DNG_PATH], {
            env: { ...process.env, OMP_NUM_THREADS: '1' },
            encoding: 'utf8',
        });
        const stages: string[] = JSON.parse(stdout);

        const loadRawIdx = stages.indexOf('LOAD_RAW');
        const interpolateIdx = stages.indexOf('INTERPOLATE');
        const convertRgbIdx = stages.lastIndexOf('CONVERT_RGB');
        expect(loadRawIdx).toBeGreaterThanOrEqual(0);
        expect(interpolateIdx).toBeGreaterThanOrEqual(0);
        expect(convertRgbIdx).toBeGreaterThanOrEqual(0);
        expect(loadRawIdx).toBeLessThan(interpolateIdx);
        expect(interpolateIdx).toBeLessThan(convertRgbIdx);
    });

    it('emits no events for a Processor never used asynchronously (Sync methods do not record events)', async () => {
        const p = new libraw.Processor();
        const progress: ProgressEvent[] = [];
        p.on('progress', (e: ProgressEvent) => progress.push(e));
        p.openBufferSync(freshBuffer());
        p.unpackSync();
        p.processSync();
        p.close();
        // No async stage method was ever called, so _drainEvents() was never
        // reached and no 'progress' listener firing -- see processor.h's
        // pendingEvents_ comment: T10 scopes event recording to the async
        // path only, matching T09's cancellation support.
        expect(progress).toEqual([]);
    });

    describe('exifTag events', () => {
        it('fire only when constructed with { exifTags: true }, and include ImageWidth (0x0100) and Make (0x010F)', async () => {
            const withTags = new libraw.Processor({ exifTags: true });
            const tags: ExifTagEvent[] = [];
            withTags.on('exifTag', (e: ExifTagEvent) => tags.push(e));
            await withTags.openBuffer(freshBuffer());
            withTags.close();

            expect(tags.length).toBeGreaterThan(0);
            // See src/events.h's JobEvent::tag comment: the low 16 bits are
            // the real EXIF/TIFF tag number regardless of which IFD it came
            // from.
            const bareTags = tags.map((t) => t.tag & 0xffff);
            expect(bareTags).toContain(0x0100); // ImageWidth
            expect(bareTags).toContain(0x010f); // Make

            const withoutTags = new libraw.Processor();
            const noTags: ExifTagEvent[] = [];
            withoutTags.on('exifTag', (e: ExifTagEvent) => noTags.push(e));
            await withoutTags.openBuffer(freshBuffer());
            withoutTags.close();
            expect(noTags).toEqual([]);
        });
    });
});
