// Shared test-fixture helpers for @janhapke/libraw's vitest suite (T04).
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// vitest runs test files as ESM, so __dirname is not a global; derive the
// equivalent from import.meta.url instead.
const HERE = path.dirname(fileURLToPath(import.meta.url));

export const SYNTHETIC_DNG_PATH = path.join(HERE, '..', 'fixtures', 'pm5544-768x576.dng');
export const SYNTHETIC_SOURCE_PNG_PATH = path.join(HERE, '..', 'fixtures', 'pm5544-source.png');

/**
 * Real-camera RAW files are never committed to this repo (see
 * `test/fixtures/README.md`). Real-file tests read this directory from the
 * `LIBRAW_TEST_IMAGES` environment variable and skip themselves (via
 * `it.skipIf(!realTestImagesDir)`) when it is unset, so `npm test` alone
 * still passes using only the synthetic fixture. On this development
 * machine, `/home/jan/dev/photoview/.private/testimages` is a valid value:
 *
 *   LIBRAW_TEST_IMAGES=/home/jan/dev/photoview/.private/testimages npm test
 */
export const realTestImagesDir = process.env.LIBRAW_TEST_IMAGES;

export function realImagePath(basename: string): string {
    if (!realTestImagesDir) {
        throw new Error('realImagePath() called without LIBRAW_TEST_IMAGES set; guard the call with it.skipIf(!realTestImagesDir) first');
    }
    return path.join(realTestImagesDir, basename);
}
