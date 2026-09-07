// T16 acceptance: `import { decode } from '@janhapke/libraw'` (ESM) and
// `require('@janhapke/libraw').decode` (CJS) must both resolve to a
// function once the package is actually installed as a dependency (not
// just run from a relative path inside this repo, which would not exercise
// package.json's `exports` map or `files` list at all).
//
// `npm pack` builds the real publishable tarball (validating `files` the
// same way an npm publish would -- if `lib/index.mjs` or `prebuilds/` were
// missing from `files`, the installed copy below would not have them), and
// a fresh temp-directory `npm install` of that tarball is as close to "a
// real consumer installing this package" as a test can get without an
// actual npm registry publish. Runs in a real subprocess pair (`node
// --input-type=module -e ...` / `node -e ...`) so module resolution goes
// through Node's own ESM/CJS loaders against the installed `node_modules`,
// not vitest's.
//
// Host rule (docs/plan/tasks.md's Common rules): never install anything on
// the host besides npm packages in node_modules or temp dirs -- everything
// this test installs lands under `fs.mkdtempSync`'s directory, removed at
// the end.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..');

// T21: on Windows, `npm` on PATH resolves to `npm.cmd` (a batch file).
// execFileSync/spawnSync do not consult PATHEXT the way a shell does, so
// `execFileSync('npm', ...)` fails with ENOENT there. Passing the resolved
// `npm.cmd` name directly doesn't fix it either -- Node refuses to spawn a
// .cmd/.bat file without `shell: true` (EINVAL; the fix for a batch-file
// argument-injection CVE), even via execFileSync's argv-array form. Both
// failures were hit in turn on windows-2022 in test-windows; the working
// combination is `shell: true` on win32 only, spawning plain `npm` and
// letting cmd.exe's own PATHEXT resolve it to npm.cmd -- Node still quotes
// each argv-array element for cmd.exe itself, so tmpDir/tarballPath (no
// shell metacharacters, just a path) don't need manual escaping.
const NPM_CMD = 'npm';
const EXEC_OPTS_EXTRA = process.platform === 'win32' ? { shell: true as const } : {};

let tmpDir: string;
let tarballPath: string;
let packedFiles: string[] = [];

describe('package install: ESM and CJS entry points', () => {
    beforeAll(() => {
        // `npm pack --json` prints the tarball's filename and its file list
        // without publishing anything; write it straight into the temp
        // install dir so no stray tarball is left in the repo.
        tmpDir = mkdtempSync(path.join(tmpdir(), 'libraw-node-esm-test-'));
        const packOutput = execFileSync(NPM_CMD, ['pack', '--json', '--pack-destination', tmpDir], {
            cwd: REPO_ROOT,
            encoding: 'utf8',
            ...EXEC_OPTS_EXTRA,
        });
        const [packInfo] = JSON.parse(packOutput) as Array<{ filename: string; files: Array<{ path: string }> }>;
        // `npm pack --json`'s `filename` is already the on-disk tarball name
        // (e.g. `janhapke-libraw-0.0.0.tgz` for the scoped package
        // `@janhapke/libraw`), matching `--pack-destination` exactly.
        tarballPath = path.join(tmpDir, packInfo.filename);
        if (!existsSync(tarballPath)) {
            throw new Error(`npm pack did not produce ${tarballPath}`);
        }
        packedFiles = packInfo.files.map((f) => f.path);

        writeFileSync(
            path.join(tmpDir, 'package.json'),
            JSON.stringify({ name: 'libraw-node-esm-test-consumer', version: '1.0.0', private: true }, null, 2),
        );
        execFileSync(NPM_CMD, ['install', '--no-audit', '--no-fund', '--omit=dev', tarballPath], {
            cwd: tmpDir,
            encoding: 'utf8',
            ...EXEC_OPTS_EXTRA,
        });
    }, 180_000);

    afterAll(() => {
        if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
    });

    it('npm pack includes lib/, types/, prebuilds/ and the licence files (validates package.json "files")', () => {
        expect(packedFiles).toContain('lib/index.cjs');
        expect(packedFiles).toContain('lib/index.mjs');
        expect(packedFiles).toContain('lib/tosharp.cjs');
        expect(packedFiles).toContain('types/index.d.ts');
        expect(packedFiles).toContain('THIRD_PARTY_NOTICES.md');
        expect(packedFiles).toContain('LICENSE');
        expect(packedFiles.some((f) => f.startsWith('prebuilds/'))).toBe(true);
        expect(packedFiles.some((f) => f.startsWith('vendor/'))).toBe(false);
        expect(packedFiles.some((f) => f.startsWith('build/'))).toBe(false);
    });

    it('`import { decode } from "@janhapke/libraw"` resolves to a function (ESM)', () => {
        const stdout = execFileSync(
            process.execPath,
            ['--input-type=module', '-e', "import { decode } from '@janhapke/libraw'; console.log(typeof decode);"],
            { cwd: tmpDir, encoding: 'utf8' },
        );
        expect(stdout.trim()).toBe('function');
    });

    it('`require("@janhapke/libraw").decode` resolves to a function (CJS)', () => {
        const stdout = execFileSync(
            process.execPath,
            ['-e', "console.log(typeof require('@janhapke/libraw').decode);"],
            { cwd: tmpDir, encoding: 'utf8' },
        );
        expect(stdout.trim()).toBe('function');
    });

    it('every named export of lib/index.cjs is also a named export of lib/index.mjs', () => {
        const stdout = execFileSync(
            process.execPath,
            [
                '-e',
                "const cjs = require('@janhapke/libraw'); console.log(JSON.stringify(Object.getOwnPropertyNames(cjs).sort()));",
            ],
            { cwd: tmpDir, encoding: 'utf8' },
        );
        const cjsKeys: string[] = JSON.parse(stdout);

        const importSpec = cjsKeys.map((k) => `${k} as _${k}`).join(', ');
        const mjsStdout = execFileSync(
            process.execPath,
            ['--input-type=module', '-e', `import { ${importSpec} } from '@janhapke/libraw'; console.log('ok');`],
            { cwd: tmpDir, encoding: 'utf8' },
        );
        expect(mjsStdout.trim()).toBe('ok');
    });
});
