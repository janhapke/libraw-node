#!/usr/bin/env node
// T05: OpenMP effect verification and stage timing tool.
//
// Decodes one RAW file with decodeSync's `stages: true` option (per-stage
// std::chrono::steady_clock timings measured in src/addon.cc: open, unpack,
// process, copy) and prints a single line of JSON so results can be diffed,
// piped through `jq`, or pasted verbatim into a report.
//
// Usage:
//   node scripts/bench-stages.cjs <file> [user_qual] [half_size]
//
//   <file>       path to a RAW file
//   [user_qual]  LibRaw interpolation quality (default: LibRaw's own default,
//                reported as null)
//   [half_size]  "1"/"true" to pass half_size: true (default: false)
//
// OMP_NUM_THREADS is read from the environment only to report it in the
// output ("default" when unset) -- this script never sets it itself; run it
// twice, once with the variable unset and once with OMP_NUM_THREADS=1, to
// compare (see docs/plan/tasks.md T05 and docs/explanation/adoption-comparison.md).
'use strict';

const { readFileSync } = require('node:fs');
const path = require('node:path');
const libraw = require('../lib/index.cjs');

function main() {
  const [, , filePath, userQualArg, halfSizeArg] = process.argv;

  if (!filePath) {
    process.stderr.write('usage: node scripts/bench-stages.cjs <file> [user_qual] [half_size]\n');
    process.exit(1);
  }

  const userQual = userQualArg !== undefined && userQualArg !== '' ? Number(userQualArg) : undefined;
  const halfSize = halfSizeArg === '1' || halfSizeArg === 'true';

  const buf = readFileSync(filePath);

  const options = { stages: true, half_size: halfSize };
  if (userQual !== undefined) {
    options.user_qual = userQual;
  }

  const img = libraw.decodeSync(buf, options);
  const { open, unpack, process: processMs, copy } = img.stages;
  const total = open + unpack + processMs + copy;

  const line = {
    file: path.basename(filePath),
    user_qual: userQual ?? null,
    half_size: halfSize,
    omp_num_threads: process.env.OMP_NUM_THREADS || 'default',
    width: img.width,
    height: img.height,
    stages: {
      open: round(open),
      unpack: round(unpack),
      process: round(processMs),
      copy: round(copy),
    },
    total: round(total),
  };

  process.stdout.write(JSON.stringify(line) + '\n');
}

function round(ms) {
  return Math.round(ms * 100) / 100;
}

main();
