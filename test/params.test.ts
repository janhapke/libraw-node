// T12: generated parameter application (src/params.h,
// src/generated/params.gen.cc, scripts/gen-params-cc.js) --
// Processor.setParams/setRawParams/getParams/getRawParams and decode()'s use
// of the same generated functions for its own params/rawparams options.
//
// The round-trip test below is generated *from api/params.json itself* at
// test time (not hand-listed field by field): for every field in both
// structs, compute a valid, non-default value from the field's own
// manifest entry (type/enum/flags/min/max/default), set it, read it back,
// and compare. Fields annotated "unsupported" (currently only
// rawparams.custom_camera_strings) are skipped -- there is no way to set
// them through this API at all (see src/params.h).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import libraw from '../lib/index.cjs';
import { SYNTHETIC_DNG_PATH } from './helpers/fixtures';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = path.join(HERE, '..', 'api', 'params.json');

type ManifestField = {
    type: string;
    default?: unknown;
    enum?: Record<string, number>;
    flags?: Record<string, number>;
    min?: number;
    max?: number;
    cArrayLength?: number;
};

type ManifestStruct = {
    fieldOrder: string[];
    fields: Record<string, ManifestField>;
};

type Manifest = {
    structs: {
        params: ManifestStruct;
        rawparams: ManifestStruct;
    };
};

const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

function freshBuffer(): Buffer {
    return readFileSync(SYNTHETIC_DNG_PATH);
}

// float32-exact candidates (all exactly representable in IEEE754 single
// precision, so a JS number -> float -> double round trip through the
// native side never loses precision and can be compared with plain `===`/
// toEqual). Used for every scalar "float" field regardless of its specific
// default/min/max, so this needs no per-field hardcoding.
const FLOAT_CANDIDATES = [0.5, 1.5, 2.5, 3.5, 4, 5, 0.25, 0.75, 6, 7];

// Computes a value for `field` that is (a) different from its manifest
// default and (b) valid (respects min/max/enum membership/array length).
// Returns `undefined` for "unsupported" fields (skip -- see this file's
// header comment).
function computeAltValue(name: string, field: ManifestField): unknown {
    switch (field.type) {
        case 'bool':
            return !field.default;

        case 'int':
        case 'uint': {
            const min = typeof field.min === 'number' ? field.min : -Infinity;
            const max = typeof field.max === 'number' ? field.max : Infinity;
            const base = typeof field.default === 'number' ? field.default : 0;
            const candidates = [base + 1, base - 1, base + 5, base - 5, base + 100, min, max, 0, 1, 2];
            for (const c of candidates) {
                if (Number.isFinite(c) && c !== base && c >= min && c <= max && (field.type !== 'uint' || c >= 0)) {
                    return c;
                }
            }
            throw new Error(`params.test.ts: no valid alt int value found for ${name} (${JSON.stringify(field)})`);
        }

        case 'float': {
            const min = typeof field.min === 'number' ? field.min : -Infinity;
            const max = typeof field.max === 'number' ? field.max : Infinity;
            const base = field.default;
            for (const c of FLOAT_CANDIDATES) {
                if (c !== base && c >= min && c <= max) return c;
            }
            throw new Error(`params.test.ts: no valid alt float value found for ${name} (${JSON.stringify(field)})`);
        }

        case 'enum': {
            const values = Object.values(field.enum ?? {});
            const alt = values.find((v) => v !== field.default);
            if (alt === undefined) {
                throw new Error(`params.test.ts: no alt enum value found for ${name}`);
            }
            return alt;
        }

        case 'flags': {
            // Toggle the first *non-zero* bit in the field's flags map (some
            // fields list a "NONE"/all-zero sentinel entry first, e.g.
            // output_flags.LIBRAW_OUTPUT_FLAGS_NONE = 0 -- XORing that would
            // leave the value equal to the default, defeating the "must
            // differ from default" requirement).
            const entries = Object.entries(field.flags ?? {});
            const nonZero = entries.find(([, v]) => v !== 0);
            if (!nonZero) {
                throw new Error(`params.test.ts: no non-zero flag entry found for ${name}`);
            }
            const base = typeof field.default === 'number' ? field.default : 0;
            // eslint-disable-next-line no-bitwise
            return (base ^ nonZero[1]) >>> 0;
        }

        case 'string':
            if (field.cArrayLength) {
                // Fixed char[N] buffer: at most cArrayLength-1 characters.
                const maxLen = field.cArrayLength - 1;
                const candidate = '1230'.slice(0, Math.max(1, Math.min(maxLen, 4)));
                return candidate !== field.default ? candidate : '4560'.slice(0, candidate.length);
            }
            return '/tmp/libraw-node-params-test-value';

        case 'int[]':
        case 'uint[]': {
            const len = field.cArrayLength ?? 0;
            return Array.from({ length: len }, (_, i) => i + 1);
        }

        case 'float[]': {
            const len = field.cArrayLength ?? 0;
            // 1.5, 2.5, 3.5, ... -- exact in both float and double.
            return Array.from({ length: len }, (_, i) => i + 1.5);
        }

        case 'unsupported':
            return undefined;

        default:
            throw new Error(`params.test.ts: unhandled manifest type ${JSON.stringify(field.type)} for ${name}`);
    }
}

function roundTripCases(struct: ManifestStruct): Array<{ name: string; field: ManifestField; value: unknown }> {
    const cases: Array<{ name: string; field: ManifestField; value: unknown }> = [];
    for (const name of struct.fieldOrder) {
        const field = struct.fields[name];
        if (field.type === 'unsupported') continue; // skipped -- see header comment
        cases.push({ name, field, value: computeAltValue(name, field) });
    }
    return cases;
}

const paramsCases = roundTripCases(manifest.structs.params);
const rawparamsCases = roundTripCases(manifest.structs.rawparams);
const paramsSkipped = manifest.structs.params.fieldOrder.filter((n) => manifest.structs.params.fields[n].type === 'unsupported');
const rawparamsSkipped = manifest.structs.rawparams.fieldOrder.filter(
    (n) => manifest.structs.rawparams.fields[n].type === 'unsupported',
);

describe('Processor.setParams/getParams — round trip generated from api/params.json', () => {
    it(`covers ${paramsCases.length} of ${manifest.structs.params.fieldOrder.length} "params" fields (skipped: ${
        paramsSkipped.join(', ') || 'none'
    })`, () => {
        expect(paramsCases.length + paramsSkipped.length).toBe(manifest.structs.params.fieldOrder.length);
    });

    for (const { name, value } of paramsCases) {
        it(`round-trips params.${name}`, () => {
            const p = new (libraw as any).Processor();
            (p as any).setParams({ [name]: value });
            const got = (p as any).getParams()[name];
            expect(got).toEqual(value);
            (p as any).close();
        });
    }
});

describe('Processor.setRawParams/getRawParams — round trip generated from api/params.json', () => {
    it(`covers ${rawparamsCases.length} of ${manifest.structs.rawparams.fieldOrder.length} "rawparams" fields (skipped: ${
        rawparamsSkipped.join(', ') || 'none'
    })`, () => {
        expect(rawparamsCases.length + rawparamsSkipped.length).toBe(manifest.structs.rawparams.fieldOrder.length);
    });

    for (const { name, value } of rawparamsCases) {
        it(`round-trips rawparams.${name}`, () => {
            const p = new (libraw as any).Processor();
            (p as any).setRawParams({ [name]: value });
            const got = (p as any).getRawParams()[name];
            expect(got).toEqual(value);
            (p as any).close();
        });
    }
});

describe('Processor.setParams/setRawParams — state machine', () => {
    it('setRawParams throws LIBRAW_OUT_OF_ORDER_CALL once the Processor has been opened', () => {
        const p = new (libraw as any).Processor();
        p.openBufferSync(freshBuffer());
        expect(() => p.setRawParams({ shot_select: 0 })).toThrow();
        try {
            p.setRawParams({ shot_select: 0 });
        } catch (err: any) {
            expect(err.name).toBe('LIBRAW_OUT_OF_ORDER_CALL');
        }
        p.close();
    });

    it('setParams throws LIBRAW_OUT_OF_ORDER_CALL once the Processor has been processed', () => {
        const p = new (libraw as any).Processor();
        p.openBufferSync(freshBuffer());
        p.unpackSync();
        p.processSync();
        try {
            p.setParams({ half_size: true });
            expect.unreachable('setParams after processSync should have thrown');
        } catch (err: any) {
            expect(err.name).toBe('LIBRAW_OUT_OF_ORDER_CALL');
        }
        p.close();
    });

    it('getParams/getRawParams work on a freshly constructed Processor (no open needed)', () => {
        const p = new (libraw as any).Processor();
        const params = p.getParams();
        const rawparams = p.getRawParams();
        expect(params.output_bps).toBe(8);
        expect(rawparams.max_raw_memory_mb).toBe(2048);
        p.close();
    });
});

describe('Processor.setParams — negative cases (acceptance list)', () => {
    it("setParams({ halfSize: true }) throws a TypeError mentioning 'halfSize'", () => {
        const p = new (libraw as any).Processor();
        let thrown: any;
        try {
            p.setParams({ halfSize: true });
        } catch (err) {
            thrown = err;
        }
        expect(thrown).toBeInstanceOf(TypeError);
        expect(thrown.message).toMatch(/halfSize/);
        p.close();
    });

    it('setParams({ gamm: [...5 elements] }) throws a RangeError', () => {
        const p = new (libraw as any).Processor();
        let thrown: any;
        try {
            p.setParams({ gamm: [1, 2, 3, 4, 5] });
        } catch (err) {
            thrown = err;
        }
        expect(thrown).toBeInstanceOf(RangeError);
        expect(thrown.message).toMatch(/gamm/);
        p.close();
    });

    it('setParams({ user_qual: 7 }) throws a RangeError (7 is not an allowed enum value)', () => {
        const p = new (libraw as any).Processor();
        let thrown: any;
        try {
            p.setParams({ user_qual: 7 });
        } catch (err) {
            thrown = err;
        }
        expect(thrown).toBeInstanceOf(RangeError);
        expect(thrown.message).toMatch(/user_qual/);
        p.close();
    });
});

describe('flags fields — accept an array of LIBRAW_RAWOPTIONS_* names', () => {
    it('rawparams.options round-trips an array of flag names to their numeric OR', () => {
        const p = new (libraw as any).Processor();
        p.setRawParams({
            options: ['LIBRAW_RAWOPTIONS_CONVERTFLOAT_TO_INT', 'LIBRAW_RAWOPTIONS_DONT_CHECK_DNG_ILLUMINANT'],
        });
        const expected =
            manifest.structs.rawparams.fields.options.flags!.LIBRAW_RAWOPTIONS_CONVERTFLOAT_TO_INT |
            manifest.structs.rawparams.fields.options.flags!.LIBRAW_RAWOPTIONS_DONT_CHECK_DNG_ILLUMINANT;
        expect(p.getRawParams().options).toBe(expected);
        p.close();
    });

    it('an unknown flag name throws a RangeError listing the allowed names', () => {
        const p = new (libraw as any).Processor();
        let thrown: any;
        try {
            p.setRawParams({ options: ['NOT_A_REAL_FLAG'] });
        } catch (err) {
            thrown = err;
        }
        expect(thrown).toBeInstanceOf(RangeError);
        expect(thrown.message).toMatch(/NOT_A_REAL_FLAG/);
        p.close();
    });
});

describe('string fields — round trip (pointer-backed and fixed-buffer)', () => {
    it('params.output_profile (char*, nullable) round-trips a string, then null', () => {
        const p = new (libraw as any).Processor();
        p.setParams({ output_profile: '/tmp/libraw-node-test.icc' });
        expect(p.getParams().output_profile).toBe('/tmp/libraw-node-test.icc');
        p.setParams({ output_profile: null });
        expect(p.getParams().output_profile).toBeNull();
        p.close();
    });

    it('rawparams.p4shot_order (fixed char[5]) round-trips a 4-character string', () => {
        const p = new (libraw as any).Processor();
        p.setRawParams({ p4shot_order: '1230' });
        expect(p.getRawParams().p4shot_order).toBe('1230');
        p.close();
    });

    it('rawparams.p4shot_order rejects a string longer than 4 characters with a RangeError', () => {
        const p = new (libraw as any).Processor();
        let thrown: any;
        try {
            p.setRawParams({ p4shot_order: '12345' });
        } catch (err) {
            thrown = err;
        }
        expect(thrown).toBeInstanceOf(RangeError);
        p.close();
    });
});

describe('decode() — still honours params.half_size and rejects an unknown key (T12 regression check)', () => {
    it('half_size gives 384x288 on the synthetic DNG', async () => {
        const img = await (libraw as any).decode(freshBuffer(), { params: { half_size: true } });
        expect(img.width).toBe(384);
        expect(img.height).toBe(288);
    });

    it('rejects an unknown params key', async () => {
        await expect((libraw as any).decode(freshBuffer(), { params: { not_a_real_param: 1 } })).rejects.toThrow(
            /not_a_real_param/,
        );
    });

    it('rejects an unknown rawparams key', async () => {
        await expect((libraw as any).decode(freshBuffer(), { rawparams: { not_a_real_param: 1 } })).rejects.toThrow(
            /not_a_real_param/,
        );
    });
});
