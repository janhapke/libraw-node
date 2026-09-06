// T17: a small, synthetic-fixture concurrency check that runs as part of
// the default `npm test` (unlike test/stress.test.ts, which is gated on
// LIBRAW_TEST_IMAGES and excluded from the default run because it takes
// minutes -- see vitest.config.mts and vitest.stress.config.mts). This one
// exercises the same property -- concurrent decode() calls against the
// libuv threadpool return correct, independent results, with no shared
// mutable state leaking between them -- entirely in-process (no
// worker_threads) against the committed synthetic PM5544 DNG, so it stays
// fast enough for CI without real camera files.
//
// "In-process" here means concurrency comes from firing many decode()
// promises without awaiting each one before starting the next: every
// decode() call is one fused AsyncWorker owning its own LibRaw instance
// (README.md's "Concurrency and threads" section), so libuv schedules them
// across its threadpool and they genuinely overlap, the same mechanism
// test/stress.test.ts's worker_threads rely on, just without the extra
// isolates.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import libraw from '../lib/index.cjs';
import { SYNTHETIC_DNG_PATH } from './helpers/fixtures';

const LANE_COUNT = 4;
const DECODES_PER_LANE = 10;
const QUALITIES = [0, 2] as const;

function sha1(buf: Buffer): string {
  return createHash('sha1').update(buf).digest('hex');
}

describe('concurrent decode() calls (synthetic PM5544 DNG, in-process)', () => {
  it(`runs ${LANE_COUNT} concurrent lanes x ${DECODES_PER_LANE} decodes and checks every checksum`, async () => {
    const buf = readFileSync(SYNTHETIC_DNG_PATH);

    // Single-threaded reference checksums, one per quality.
    const reference = new Map<number, string>();
    for (const q of QUALITIES) {
      const img = await libraw.decode(buf, { params: { user_qual: q } });
      reference.set(q, sha1(img.data as Buffer));
    }

    // LANE_COUNT concurrent lanes, each firing DECODES_PER_LANE sequential
    // decode() calls (alternating quality); all lanes run concurrently
    // against each other via Promise.all, so up to LANE_COUNT decode()
    // calls are in flight on the libuv threadpool at once.
    const lanes = Array.from({ length: LANE_COUNT }, async (_unused, lane) => {
      const results: { quality: number; checksum: string }[] = [];
      for (let i = 0; i < DECODES_PER_LANE; i++) {
        const quality = QUALITIES[(lane + i) % QUALITIES.length];
        const img = await libraw.decode(buf, { params: { user_qual: quality } });
        results.push({ quality, checksum: sha1(img.data as Buffer) });
      }
      return results;
    });

    const laneResults = await Promise.all(lanes);

    let totalDecodes = 0;
    for (const results of laneResults) {
      for (const { quality, checksum } of results) {
        totalDecodes++;
        expect(checksum, `quality ${quality} checksum`).toBe(reference.get(quality));
      }
    }
    expect(totalDecodes).toBe(LANE_COUNT * DECODES_PER_LANE);
  });
});
