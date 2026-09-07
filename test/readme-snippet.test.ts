// T26: proves README.md's quick-start snippets are not just prose -- both
// the CommonJS and ESM versions are extracted verbatim (only the package
// import is rewritten to point at this checkout's lib/index.cjs / .mjs
// instead of an installed '@janhapke/libraw'), written to a temp file, and
// actually run against the synthetic DNG fixture via a real `node`
// subprocess. If either snippet in the README stops working, this test
// fails -- the surest guard against documentation drifting from the shipped
// API.
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { SYNTHETIC_DNG_PATH } from './helpers/fixtures';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(HERE, '..');
const README_PATH = path.join(REPO_ROOT, 'README.md');
const LIB_CJS_PATH = path.join(REPO_ROOT, 'lib', 'index.cjs');
const LIB_MJS_PATH = path.join(REPO_ROOT, 'lib', 'index.mjs');

/**
 * Extracts the first fenced code block that immediately follows a
 * `<!-- quickstart:<marker> -->` HTML comment in `content`. The comment must
 * be on its own line; the very next fenced block (``` ... ```, any info
 * string) after it is taken verbatim.
 */
function extractQuickstart(content: string, marker: string): string {
    const commentRe = new RegExp(`<!--\\s*quickstart:${marker}\\s*-->`);
    const commentMatch = commentRe.exec(content);
    if (!commentMatch) {
        throw new Error(`README.md has no <!-- quickstart:${marker} --> marker`);
    }
    const afterComment = content.slice(commentMatch.index + commentMatch[0].length);
    const fenceMatch = /```[^\n]*\n([\s\S]*?)```/.exec(afterComment);
    if (!fenceMatch) {
        throw new Error(`no fenced code block found after <!-- quickstart:${marker} --> in README.md`);
    }
    return fenceMatch[1];
}

function runSnippet(fileName: string, source: string): { status: number | null; stdout: string; stderr: string } {
    // Created *inside* the repo (not the OS tmpdir) so `require('sharp')` /
    // `import 'sharp'` resolve via the normal node_modules walk-up from the
    // script's own directory -- see the .gitignore entry for this prefix.
    const dir = mkdtempSync(path.join(REPO_ROOT, 'test', '.readme-snippet-'));
    const scriptPath = path.join(dir, fileName);
    try {
        writeFileSync(scriptPath, source, 'utf8');
        const result = spawnSync(process.execPath, [scriptPath, SYNTHETIC_DNG_PATH], {
            cwd: dir,
            encoding: 'utf8',
            timeout: 10_000,
        });
        return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

describe('README.md quick-start snippets', () => {
    const readme = readFileSync(README_PATH, 'utf8');

    it('CommonJS snippet decodes the synthetic fixture and prints PASS', () => {
        const snippet = extractQuickstart(readme, 'cjs');
        expect(snippet).toContain("require('@janhapke/libraw')");
        // CommonJS: an absolute path is a valid require() specifier as-is.
        const rewritten = snippet.replace("require('@janhapke/libraw')", `require(${JSON.stringify(LIB_CJS_PATH)})`);

        const { status, stdout, stderr } = runSnippet('quickstart.cjs', rewritten);
        expect(stderr + stdout, `snippet failed:\n${stderr}`).not.toMatch(/Error/);
        expect(status, `snippet exited non-zero:\nstdout: ${stdout}\nstderr: ${stderr}`).toBe(0);
        expect(stdout).toMatch(/PASS 768 576/);
    });

    it('ESM snippet decodes the synthetic fixture and prints PASS', () => {
        const snippet = extractQuickstart(readme, 'esm');
        expect(snippet).toContain("from '@janhapke/libraw'");
        // ESM: Node's loader wants an absolute path or a file:// URL; use a
        // file:// URL, which works identically on POSIX and Windows.
        const libMjsUrl = pathToFileURL(LIB_MJS_PATH).href;
        const rewritten = snippet.replace("from '@janhapke/libraw'", `from ${JSON.stringify(libMjsUrl)}`);

        const { status, stdout, stderr } = runSnippet('quickstart.mjs', rewritten);
        expect(stderr + stdout, `snippet failed:\n${stderr}`).not.toMatch(/Error/);
        expect(status, `snippet exited non-zero:\nstdout: ${stdout}\nstderr: ${stderr}`).toBe(0);
        expect(stdout).toMatch(/PASS 768 576/);
    });
});
