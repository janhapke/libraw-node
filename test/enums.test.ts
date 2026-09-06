// T13: enum/flag tables (scripts/gen-enums.js -> api/enums.json,
// lib/generated/libraw-enums.cjs, src/generated/libraw_enums.inc) and the
// module-level helpers built on them (capabilityNames(), warningNames(),
// `enums`). See docs/plan/tasks.md's T13 section.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import libraw from '../lib/index.cjs';
import { realImagePath, realTestImagesDir } from './helpers/fixtures';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENUMS_JSON_PATH = path.join(HERE, '..', 'api', 'enums.json');

type EnumEntry = { name: string; short: string; value: number };
type EnumManifest = {
    enums: Record<string, { prefix: string; kind: 'flags' | 'enum'; values: EnumEntry[] }>;
};

describe('capabilityNames()', () => {
    it('contains ZLIB and JPEG (this build is statically linked against both)', () => {
        const names = libraw.capabilityNames();
        expect(Array.isArray(names)).toBe(true);
        expect(names).toContain('ZLIB');
        expect(names).toContain('JPEG');
    });

    it('matches the bits actually set in capabilities()', () => {
        const caps = libraw.capabilities();
        const names = libraw.capabilityNames();
        for (const name of names) {
            const value = libraw.enums.CAPS.NAME_TO_VALUE[name];
            expect(typeof value).toBe('number');
            expect(caps & value).toBe(value);
        }
    });
});

describe('warningNames()', () => {
    it('warningNames(0) is []', () => {
        expect(libraw.warningNames(0)).toEqual([]);
    });

    it('decodes a known bit to its short name', () => {
        const fallbackBit = libraw.enums.WARN.NAME_TO_VALUE.FALLBACK_TO_AHD;
        expect(libraw.warningNames(fallbackBit)).toEqual(['FALLBACK_TO_AHD']);
    });
});

describe('api/enums.json — every enum has consistent forward/reverse maps', () => {
    const manifest: EnumManifest = JSON.parse(readFileSync(ENUMS_JSON_PATH, 'utf8'));
    const enumNames = Object.keys(manifest.enums);

    it('parsed at least the families T13 asks for', () => {
        expect(enumNames.length).toBeGreaterThan(20);
        for (const expected of [
            'LibRaw_processing_options', // LIBRAW_RAWOPTIONS_*
            'LibRaw_warnings', // LIBRAW_WARN_*
            'LibRaw_runtime_capabilities', // LIBRAW_CAPS_*
            'LibRaw_decoder_flags', // LIBRAW_DECODER_*
            'LibRaw_thumbnail_formats',
            'LibRaw_internal_thumbnail_formats',
            'LibRaw_image_formats',
            'LibRaw_progress',
            'LibRaw_errors',
            'LibRaw_dng_processing',
            'LibRaw_rawspeed_bits_t',
            'LibRaw_openbayer_patterns',
            'LibRaw_runtime_capabilities',
            'LibRaw_colorspace',
        ]) {
            expect(enumNames).toContain(expected);
        }
    });

    it.each(enumNames)('%s: every value has a unique name, and lib/generated agrees', (enumName) => {
        const { values } = manifest.enums[enumName];
        expect(values.length).toBeGreaterThan(0);

        const namesSeen = new Set<string>();
        for (const entry of values) {
            expect(namesSeen.has(entry.short)).toBe(false);
            namesSeen.add(entry.short);
            expect(Number.isFinite(entry.value)).toBe(true);
        }

        const generated = libraw.enums.all[enumName];
        expect(generated).toBeDefined();
        for (const entry of values) {
            // Forward: short name -> value.
            expect(generated.NAME_TO_VALUE[entry.short]).toBe(entry.value);
            // Reverse: value -> at least one name that round-trips back to
            // the same value (VALUE_TO_NAME may pick a different sibling
            // than `entry.short` when two enumerators share a value --
            // e.g. LibRaw_decoder_flags' 3CHANNEL/SINAR4SHOT -- VALUE_TO_NAMES
            // always includes every sibling).
            expect(generated.VALUE_TO_NAMES[String(entry.value)]).toContain(entry.short);
            const reverseName = generated.VALUE_TO_NAME[String(entry.value)];
            expect(generated.NAME_TO_VALUE[reverseName]).toBe(entry.value);
        }
    });
});

describe('user_qual: 5 (GPL demosaic pack, unavailable in this build) — real Bayer file', () => {
    it.skipIf(!realTestImagesDir)('decode(IMGP5127.DNG, { params: { user_qual: 5 } }) falls back to AHD', async () => {
        const buffer = readFileSync(realImagePath('IMGP5127.DNG'));
        const result = await libraw.decode(buffer, { params: { user_qual: 5 } });
        // eslint-disable-next-line no-console
        console.log('decode(IMGP5127.DNG, { user_qual: 5 }).warnings =', result.warnings);
        expect(result.warnings).toContain('FALLBACK_TO_AHD');
    });
});
