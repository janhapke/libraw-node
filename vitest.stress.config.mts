import { defineConfig } from 'vitest/config';

// T17: dedicated vitest project for test/stress.test.ts, run via
// `npm run test:stress` (which also sets NODE_OPTIONS=--expose-gc, since
// the test calls global.gc() directly). Kept out of vitest.config.mts /
// `npm test` -- see that file's comment. A long testTimeout matches the
// test's own per-`it` timeout override; set here too so the *file* (import
// + reference-checksum computation, which runs outside that `it`) has
// enough room as well.
export default defineConfig({
  test: {
    include: ['test/stress.test.ts'],
    testTimeout: 600_000,
    hookTimeout: 600_000,
  },
});
