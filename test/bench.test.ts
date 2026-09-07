// T25: scripts/bench.cjs, run as a subprocess against the committed
// synthetic PM5544 DNG fixture (no real camera files needed -- this test
// must pass under plain `npm test`, unlike the real-file bench run recorded
// under bench/). --iterations 1 keeps it fast (well under this file's
// share of vitest's default 30 s timeout); --no-write avoids touching
// bench/ from a test run.
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { SYNTHETIC_DNG_PATH } from './helpers/fixtures';

const REPO_ROOT = path.resolve(__dirname, '..');
const BENCH_SCRIPT = path.join(REPO_ROOT, 'scripts', 'bench.cjs');

describe('scripts/bench.cjs', () => {
    it('prints a table row for the synthetic fixture with --no-write', () => {
        const stdout = execFileSync(
            process.execPath,
            [BENCH_SCRIPT, SYNTHETIC_DNG_PATH, '--iterations', '1', '--no-write'],
            { encoding: 'utf8' },
        );

        // Environment header.
        expect(stdout).toContain('@janhapke/libraw');
        expect(stdout).toContain('LibRaw');
        expect(stdout).toContain('iterations: 1');

        // Main table: a row naming the fixture and its known dimensions,
        // with numeric-looking "<n>ms" columns after it.
        const row = stdout
            .split('\n')
            .find((line) => line.includes('pm5544-768x576.dng'));
        expect(row).toBeDefined();
        expect(row).toContain('768x576');
        expect(row).toMatch(/\d+(\.\d+)?ms/);

        // Stage breakdown table.
        expect(stdout).toContain('Stage breakdown');

        // --no-write must not print a "wrote ..." line or leave a file
        // under bench/.
        expect(stdout).not.toContain('wrote ');
    });

    it('writes valid JSON with all raw samples when --json is given', () => {
        const tmpDir = mkdtempSync(path.join(tmpdir(), 'libraw-bench-test-'));
        const jsonPath = path.join(tmpDir, 'results.json');
        try {
            const stdout = execFileSync(
                process.execPath,
                [BENCH_SCRIPT, SYNTHETIC_DNG_PATH, '--iterations', '1', '--json', jsonPath],
                { encoding: 'utf8' },
            );
            expect(stdout).toContain('wrote ');

            const parsed = JSON.parse(readFileSync(jsonPath, 'utf8'));
            expect(parsed.iterations).toBe(1);
            expect(Array.isArray(parsed.results)).toBe(true);

            const result = parsed.results.find((r: { file: string }) => r.file === 'pm5544-768x576.dng');
            expect(result).toBeDefined();
            expect(result.width).toBe(768);
            expect(result.height).toBe(576);
            expect(result.operations.identify.samples).toHaveLength(1);
            expect(result.operations.decode_uq2.samples).toHaveLength(1);
            expect(result.stages).toHaveProperty('total');

            expect(parsed.environment).toHaveProperty('libraw_version');
            expect(parsed.environment).toHaveProperty('openmp');
        } finally {
            rmSync(tmpDir, { recursive: true, force: true });
        }
    });
});
