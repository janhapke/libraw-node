// T14a: the metadata mirror -- identify()'s `metadata` field (src/metadata.h/
// src/generated/metadata.gen.cc, generated from api/metadata.json) and
// Processor.metadata (src/processor.h/.cc) -- on the synthetic PM5544 DNG
// (see test/fixtures/README.md) plus real-camera coverage gated on
// LIBRAW_TEST_IMAGES (see test/helpers/fixtures.ts).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import libraw from '../lib/index.cjs';
import { SYNTHETIC_DNG_PATH, realImagePath, realTestImagesDir } from './helpers/fixtures';

function freshBuffer(): Buffer {
    return readFileSync(SYNTHETIC_DNG_PATH);
}

describe('identify().metadata — synthetic PM5544 DNG', () => {
    it('reports idata.make, sizes.width === 768, and color.cam_mul', async () => {
        const info = await libraw.identify(freshBuffer());
        const { metadata } = info;

        expect(typeof metadata.idata.make).toBe('string');
        expect(metadata.idata.make.length).toBeGreaterThan(0);
        expect(metadata.sizes.width).toBe(768);
        expect(metadata.sizes.height).toBe(576);
        expect(Array.isArray(metadata.color.cam_mul)).toBe(true);
        expect(metadata.color.cam_mul.length).toBe(4);
    });

    it('sizes.oriented mirrors width/height unswapped when flip is 0', async () => {
        const info = await libraw.identify(freshBuffer());
        expect(info.metadata.sizes.flip).toBe(0);
        expect(info.metadata.sizes.oriented).toEqual({ width: 768, height: 576 });
    });

    it('nested structs are present (lens.nikon/dng/makernotes, other.parsed_gps, color.phase_one_data)', async () => {
        const info = await libraw.identify(freshBuffer());
        const { metadata } = info;
        expect(metadata.lens.nikon).toBeTypeOf('object');
        expect(metadata.lens.dng).toBeTypeOf('object');
        expect(metadata.lens.makernotes).toBeTypeOf('object');
        expect(metadata.other.parsed_gps).toBeTypeOf('object');
        expect(Array.isArray(metadata.other.parsed_gps.latitude)).toBe(true);
        expect(metadata.color.phase_one_data).toBeTypeOf('object');
        expect(metadata.makernotes.common).toBeTypeOf('object');
    });

    it('unset sentinels are absent: the second (unused) raw_inset_crops entry has no cleft/ctop keys', async () => {
        const info = await libraw.identify(freshBuffer());
        const crops = info.metadata.sizes.raw_inset_crops;
        expect(Array.isArray(crops)).toBe(true);
        expect(crops.length).toBe(2);
        // LibRaw leaves an unfilled inset-crop entry at {cleft:0xffff,
        // ctop:0xffff, cwidth:0, cheight:0} -- cleft/ctop are annotated with
        // that unset sentinel (api/metadata.annotations.json) and so must be
        // omitted (undefined), not present as 65535.
        expect(crops[1].cleft).toBeUndefined();
        expect(crops[1].ctop).toBeUndefined();
    });

    it('a raw pointer field (idata.xmpdata) never appears in the mirror', async () => {
        const info = await libraw.identify(freshBuffer());
        expect(info.metadata.idata.xmpdata).toBeUndefined();
        expect('xmpdata' in info.metadata.idata).toBe(false);
    });

    it('color.profile is undefined (no embedded ICC profile in the synthetic fixture)', async () => {
        const info = await libraw.identify(freshBuffer());
        expect(info.metadata.color.profile).toBeUndefined();
    });
});

describe('Processor.metadata (synthetic PM5544 DNG)', () => {
    it('throws LIBRAW_OUT_OF_ORDER_CALL before open', () => {
        const p = new libraw.Processor();
        expect(() => p.metadata).toThrow();
        try {
            void p.metadata;
            expect.unreachable('reading .metadata before open should have thrown');
        } catch (err) {
            expect((err as InstanceType<typeof libraw.LibRawError>).name).toBe('LIBRAW_OUT_OF_ORDER_CALL');
        }
    });

    it('is available right after openBufferSync (no unpack/process needed) and matches identify()', async () => {
        const p = new libraw.Processor();
        p.openBufferSync(freshBuffer());
        const metadata = p.metadata;
        expect(metadata.sizes.width).toBe(768);
        expect(metadata.idata.make).toBeTruthy();

        const info = await libraw.identify(freshBuffer());
        expect(metadata.idata.make).toBe(info.metadata.idata.make);
        expect(metadata.sizes.width).toBe(info.metadata.sizes.width);
    });
});

describe.skipIf(!realTestImagesDir)('metadata — real camera files (LIBRAW_TEST_IMAGES)', () => {
    it('P3210620.ORF: sizes.flip !== 0 and sizes.oriented is 3016x4014', async () => {
        const buf = readFileSync(realImagePath('P3210620.ORF'));
        const info = await libraw.identify(buf);
        const { sizes } = info.metadata;
        expect(sizes.flip).not.toBe(0);
        expect(sizes.oriented).toEqual({ width: 3016, height: 4014 });
    });

    it('other.timestamp and other.iso_speed are positive on every real file', async () => {
        for (const name of ['IMGP5127.DNG', 'DSC_4985.NEF', 'P3210619.ORF', 'P3210620.ORF']) {
            const buf = readFileSync(realImagePath(name));
            const info = await libraw.identify(buf);
            const { other } = info.metadata;
            expect(other.timestamp, `${name}: other.timestamp`).toBeGreaterThan(0);
            expect(other.iso_speed, `${name}: other.iso_speed`).toBeGreaterThan(0);
        }
    });

    it('DSC_4985.NEF: lens has makernotes and nikon sub-objects, with a lens name or focal length', async () => {
        const buf = readFileSync(realImagePath('DSC_4985.NEF'));
        const info = await libraw.identify(buf);
        const { lens } = info.metadata;
        expect(lens.makernotes).toBeTypeOf('object');
        expect(lens.nikon).toBeTypeOf('object');

        const hasLensName = typeof lens.makernotes.Lens === 'string' && lens.makernotes.Lens.length > 0;
        const hasFocalLength =
            typeof lens.makernotes.MinFocal === 'number' && lens.makernotes.MinFocal > 0;
        expect(hasLensName || hasFocalLength).toBe(true);

        // Nikon-specific sub-struct: at least one defined numeric field.
        const nikonDefinedCount = Object.values(lens.nikon).filter((v) => typeof v === 'number').length;
        expect(nikonDefinedCount).toBeGreaterThan(0);
    });

    // 64-bit unsigned fields (libraw_makernotes_lens_t.LensID and friends):
    // omitted entirely at LibRaw's UINT64_MAX unset sentinel, otherwise a
    // Number (if it fits Number.MAX_SAFE_INTEGER) or a BigInt (if not) --
    // never a Number with silently lost precision. See the `uint64` type in
    // api/metadata.annotations.json and scripts/gen-metadata-cc.js.
    it('lens.makernotes.LensID: P3210620.ORF has no LensID key (UINT64_MAX / unset)', async () => {
        const buf = readFileSync(realImagePath('P3210620.ORF'));
        const info = await libraw.identify(buf);
        const mn = info.metadata.lens.makernotes;
        expect('LensID' in mn).toBe(false);
        expect(mn.LensID).toBeUndefined();
    });

    it('lens.makernotes.LensID: DSC_4985.NEF has the exact 64-bit value as a BigInt (no precision loss)', async () => {
        const buf = readFileSync(realImagePath('DSC_4985.NEF'));
        const info = await libraw.identify(buf);
        const mn = info.metadata.lens.makernotes;
        expect(typeof mn.LensID).toBe('bigint');
        expect(mn.LensID).toBe(11114933715598089230n);
    });

    it('color.profile is either undefined or a Buffer, for every real file (reported)', async () => {
        for (const name of ['IMGP5127.DNG', 'DSC_4985.NEF', 'P3210619.ORF', 'P3210620.ORF']) {
            const buf = readFileSync(realImagePath(name));
            const info = await libraw.identify(buf);
            const profile = info.metadata.color.profile;
            // eslint-disable-next-line no-console
            console.log(`${name}: color.profile = ${profile ? `Buffer(${profile.length})` : 'undefined'}`);
            expect(profile === undefined || Buffer.isBuffer(profile)).toBe(true);
        }
    });
});

// T14b: per-vendor makernotes (metadata.makernotes.{canon,nikon,sony,fuji,
// olympus,panasonic,pentax,samsung,kodak,p1,hasselblad,ricoh}).
const T14B_VENDOR_KEYS = [
    'canon', 'nikon', 'sony', 'fuji', 'olympus', 'panasonic',
    'pentax', 'samsung', 'kodak', 'p1', 'hasselblad', 'ricoh',
] as const;

describe.skipIf(!realTestImagesDir)('metadata.makernotes — per-vendor (T14b, LIBRAW_TEST_IMAGES)', () => {
    it('DSC_4985.NEF: makernotes.nikon has at least three defined numeric fields', async () => {
        const buf = readFileSync(realImagePath('DSC_4985.NEF'));
        const info = await libraw.identify(buf);
        const nikon = info.metadata.makernotes.nikon;
        expect(nikon).toBeTypeOf('object');

        const numericFieldNames = Object.entries(nikon)
            .filter(([, v]) => typeof v === 'number')
            .map(([k]) => k);
        // eslint-disable-next-line no-console
        console.log(`DSC_4985.NEF makernotes.nikon defined numeric fields (${numericFieldNames.length}):`, numericFieldNames.join(', '));
        expect(numericFieldNames.length).toBeGreaterThanOrEqual(3);
    });

    it('P3210620.ORF: makernotes.olympus is present, with several defined fields (printed)', async () => {
        const buf = readFileSync(realImagePath('P3210620.ORF'));
        const info = await libraw.identify(buf);
        const olympus = info.metadata.makernotes.olympus;
        expect(olympus).toBeTypeOf('object');

        const definedEntries = Object.entries(olympus).filter(([, v]) => v !== undefined);
        // eslint-disable-next-line no-console
        console.log(
            'P3210620.ORF makernotes.olympus defined fields (sample):',
            definedEntries.slice(0, 8).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', '),
        );
        expect(definedEntries.length).toBeGreaterThan(0);
        // A camera-model-derived string field should be present and non-empty.
        expect(typeof olympus.CameraType2).toBe('string');
        expect((olympus.CameraType2 as string).length).toBeGreaterThan(0);
    });

    it('IMGP5127.DNG: makernotes.pentax object exists (a DNG may carry few Pentax-specific fields)', async () => {
        const buf = readFileSync(realImagePath('IMGP5127.DNG'));
        const info = await libraw.identify(buf);
        const pentax = info.metadata.makernotes.pentax;
        expect(pentax).toBeTypeOf('object');

        const definedEntries = Object.entries(pentax).filter(([, v]) => v !== undefined);
        // eslint-disable-next-line no-console
        console.log(
            'IMGP5127.DNG makernotes.pentax defined fields:',
            definedEntries.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', '),
        );
        // No minimum count asserted (per the task's own "a DNG may carry
        // few" caveat) -- only that the object itself is exposed.
    });

    // Rule (documented in docs/how-to/expose-libraw-options.md's T14b
    // correction block): imgdata.makernotes is a plain struct-of-structs,
    // not a tagged union -- LibRaw gives this generator no reliable signal
    // to omit a whole vendor sub-object for a file made by a different
    // vendor, so all twelve makernotes.* keys are always present as objects
    // on every file (never omitted), matching the T14a precedent for
    // lens.nikon/lens.dng/lens.makernotes/color.phase_one_data.
    it('all twelve makernotes.* vendor keys are always present objects, never omitted, on every real file', async () => {
        for (const name of ['IMGP5127.DNG', 'DSC_4985.NEF', 'P3210619.ORF', 'P3210620.ORF']) {
            const buf = readFileSync(realImagePath(name));
            const info = await libraw.identify(buf);
            const { makernotes } = info.metadata;
            for (const vendor of T14B_VENDOR_KEYS) {
                expect(makernotes[vendor], `${name}: makernotes.${vendor}`).toBeTypeOf('object');
                expect(makernotes[vendor], `${name}: makernotes.${vendor}`).not.toBeUndefined();
            }
        }
    });

    // "No key in any vendor object holds a sentinel value": check the
    // documented-sentinel fields specifically (the only ones this generator
    // omits at all -- see the T14b correction block) across every real file,
    // including files for a *different* vendor than the one that documents
    // the sentinel.
    it('no documented-sentinel field ever surfaces its sentinel value', async () => {
        const SENTINEL_CHECKS: Array<{ vendor: (typeof T14B_VENDOR_KEYS)[number]; field: string; sentinel: number }> = [
            { vendor: 'sony', field: 'CameraType', sentinel: 0xffff },
            { vendor: 'sony', field: 'AFAreaModeSetting', sentinel: 0xff },
            { vendor: 'sony', field: 'AFMicroAdjOn', sentinel: -1 },
            { vendor: 'sony', field: 'AFMicroAdjValue', sentinel: 0x7f },
            { vendor: 'sony', field: 'LongExposureNoiseReduction', sentinel: 0xffffffff },
            { vendor: 'sony', field: 'Quality', sentinel: 0xffffffff },
            { vendor: 'fuji', field: 'RAFDataGeneration', sentinel: 0 },
            { vendor: 'canon', field: 'Quality', sentinel: -1 },
        ];

        for (const name of ['IMGP5127.DNG', 'DSC_4985.NEF', 'P3210619.ORF', 'P3210620.ORF']) {
            const buf = readFileSync(realImagePath(name));
            const info = await libraw.identify(buf);
            const { makernotes } = info.metadata;
            for (const { vendor, field, sentinel } of SENTINEL_CHECKS) {
                const value = (makernotes[vendor] as Record<string, unknown>)[field];
                if (value !== undefined) {
                    expect(value, `${name}: makernotes.${vendor}.${field}`).not.toBe(sentinel);
                }
            }
        }
    });
});
