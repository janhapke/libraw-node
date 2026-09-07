import { configDefaults, defineConfig } from 'vitest/config';

// T17: test/stress.test.ts (6 worker_threads x 50 decode() calls against a
// real ~48 MB-RGB-output DNG) takes minutes under CPU oversubscription and
// is gated on LIBRAW_TEST_IMAGES -- keep it out of the default `npm test`
// run (this config) and give it its own entry point instead:
// vitest.stress.config.mts, run via `npm run test:stress`.
export default defineConfig({
  test: {
    // 30 s: the concurrency/stress-style tests decode 40+ images per test and
    // the shared macos-15-intel runner has tripped vitest's 5 s default.
    testTimeout: 30_000,
    exclude: [...configDefaults.exclude, 'test/stress.test.ts'],
  },
});
