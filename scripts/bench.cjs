#!/usr/bin/env node
// T25: benchmark command and results file.
//
// For every RAW file in one or more directories/files, runs identify(),
// thumbnail(), and decode() at three quality/size settings (half_size +
// user_qual 2, user_qual 2, user_qual 3) for N iterations each (default 5,
// sequential, never overlapping -- these are single-job latencies, not a
// throughput test), reports the median/min/max per operation, prints a
// per-stage breakdown (decodeSync's `stages: true`, user_qual 2, one run)
// and an environment header, and writes a JSON results file under `bench/`
// (paths anonymised to basenames) unless --no-write.
//
// Usage:
//   node scripts/bench.cjs <dir-or-file...> [--iterations N] [--json <path>]
//                           [--no-write] [--host <name>]
//
//   <dir-or-file...>  one or more directories (scanned non-recursively for
//                      RAW extensions) or individual RAW files.
//   --iterations N     iterations per operation per file (default 5).
//   --json <path>      write the JSON results to this path instead of the
//                       default bench/<date>-<host>.json.
//   --no-write         print the table only; do not write any JSON file.
//   --host <name>      override the hostname used in the environment
//                       header and the default output filename (useful to
//                       anonymise a real machine name before committing a
//                       results file -- see bench/README or docs/plan/tasks.md T25).
//
// `npm run bench -- <dir>` runs this against $LIBRAW_TEST_IMAGES-style
// directories. See docs/explanation/adoption-comparison.md for how these
// numbers compare to the pre-migration estimates.
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const libraw = require('../lib/index.cjs');
const pkg = require('../package.json');

const RAW_EXTENSIONS = new Set([
  '.dng', '.nef', '.orf', '.cr2', '.cr3', '.arw', '.raf', '.rw2', '.pef',
  '.srw', '.x3f', '.3fr', '.iiq', '.nrw', '.erf', '.mrw', '.dcr', '.kdc',
  '.mos', '.mef', '.rwl', '.sr2', '.srf',
]);

const OPERATIONS = [
  { key: 'identify', label: 'identify' },
  { key: 'thumbnail', label: 'thumbnail' },
  { key: 'decode_half_size', label: 'decode(half_size,uq2)' },
  { key: 'decode_uq2', label: 'decode(uq2)' },
  { key: 'decode_uq3', label: 'decode(uq3)' },
];

function parseArgs(argv) {
  const inputs = [];
  let iterations = 5;
  let jsonPath = null;
  let write = true;
  let host = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--iterations') {
      iterations = Number(argv[++i]);
      if (!Number.isInteger(iterations) || iterations < 1) {
        throw new Error(`--iterations must be a positive integer, got ${argv[i]}`);
      }
    } else if (arg === '--json') {
      jsonPath = argv[++i];
      if (!jsonPath) throw new Error('--json requires a path argument');
    } else if (arg === '--no-write') {
      write = false;
    } else if (arg === '--host') {
      host = argv[++i];
      if (!host) throw new Error('--host requires a name argument');
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (arg.startsWith('--')) {
      throw new Error(`unknown option: ${arg}`);
    } else {
      inputs.push(arg);
    }
  }

  if (inputs.length === 0) {
    throw new Error('at least one <dir-or-file> argument is required');
  }

  return { inputs, iterations, jsonPath, write, host };
}

function printUsage() {
  process.stderr.write(
    'usage: node scripts/bench.cjs <dir-or-file...> [--iterations N] [--json <path>] [--no-write] [--host <name>]\n',
  );
}

function isRawFile(filePath) {
  return RAW_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function collectFiles(inputs) {
  const files = [];
  for (const input of inputs) {
    const stat = fs.statSync(input);
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(input).sort();
      for (const entry of entries) {
        const full = path.join(input, entry);
        if (fs.statSync(full).isFile() && isRawFile(full)) {
          files.push(full);
        }
      }
    } else if (stat.isFile()) {
      if (isRawFile(input)) {
        files.push(input);
      } else {
        process.stderr.write(`skipping non-RAW file: ${input}\n`);
      }
    }
  }
  return files;
}

function median(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function stats(samples) {
  return {
    median: round(median(samples)),
    min: round(Math.min(...samples)),
    max: round(Math.max(...samples)),
    samples: samples.map(round),
  };
}

function round(ms) {
  return Math.round(ms * 100) / 100;
}

async function timeOnce(fn) {
  const t0 = performance.now();
  const result = await fn();
  const t1 = performance.now();
  return { ms: t1 - t0, result };
}

async function runOne(op, buf) {
  switch (op) {
    case 'identify':
      return timeOnce(() => libraw.identify(buf));
    case 'thumbnail':
      return timeOnce(() => libraw.thumbnail(buf));
    case 'decode_half_size':
      return timeOnce(() => libraw.decode(buf, { params: { half_size: true, user_qual: 2 } }));
    case 'decode_uq2':
      return timeOnce(() => libraw.decode(buf, { params: { user_qual: 2 } }));
    case 'decode_uq3':
      return timeOnce(() => libraw.decode(buf, { params: { user_qual: 3 } }));
    default:
      throw new Error(`unknown operation: ${op}`);
  }
}

async function benchFile(filePath, iterations) {
  const buf = fs.readFileSync(filePath);

  // Warm up once: run every operation a single time, discarding the
  // result, before the measured iterations -- this absorbs first-call
  // allocator/JIT effects so the measured samples reflect steady state.
  for (const { key } of OPERATIONS) {
    await runOne(key, buf);
  }

  const operations = {};
  let width = null;
  let height = null;

  for (const { key } of OPERATIONS) {
    const samples = [];
    for (let i = 0; i < iterations; i++) {
      const { ms, result } = await runOne(key, buf);
      samples.push(ms);
      if (key === 'identify' && width === null) {
        width = result.sizes.width;
        height = result.sizes.height;
      }
    }
    operations[key] = stats(samples);
  }

  // Per-stage breakdown for user_qual 2, one run (not part of the median
  // samples above -- decodeSync's timing instrumentation is separate from
  // the async decode() path measured by wall-clock above).
  const staged = libraw.decodeSync(buf, { stages: true, params: { user_qual: 2 } });
  const { open, unpack, process: processMs, copy } = staged.stages;
  const stages = {
    open: round(open),
    unpack: round(unpack),
    process: round(processMs),
    copy: round(copy),
    total: round(open + unpack + processMs + copy),
  };

  return {
    file: path.basename(filePath),
    width,
    height,
    operations,
    stages,
  };
}

function buildEnvironment() {
  const cpus = os.cpus() || [];
  return {
    package_version: pkg.version,
    libraw_version: libraw.buildInfo.libraw,
    openmp: libraw.buildInfo.openmp,
    compiler: libraw.buildInfo.compiler,
    cpu_count: cpus.length,
    cpu_model: cpus.length > 0 ? cpus[0].model : 'unknown',
    omp_num_threads: process.env.OMP_NUM_THREADS || 'unset',
    uv_threadpool_size: process.env.UV_THREADPOOL_SIZE || 'default 4',
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
  };
}

function printEnvironment(env) {
  const lines = [
    `@janhapke/libraw ${env.package_version}  |  LibRaw ${env.libraw_version}  |  openmp=${env.openmp}  |  compiler=${env.compiler}`,
    `CPUs: ${env.cpu_count} (${env.cpu_model})  |  OMP_NUM_THREADS=${env.omp_num_threads}  |  UV_THREADPOOL_SIZE=${env.uv_threadpool_size}`,
    `Node ${env.node_version}  |  ${env.platform}/${env.arch}`,
  ];
  for (const line of lines) process.stdout.write(line + '\n');
}

function printTable(results) {
  const cols = [
    { header: 'file', width: 22 },
    { header: 'dimensions', width: 12 },
    { header: 'identify', width: 10 },
    { header: 'thumbnail', width: 11 },
    { header: 'half+uq2', width: 10 },
    { header: 'uq2', width: 9 },
    { header: 'uq3', width: 9 },
  ];

  const headerLine = cols.map((c) => c.header.padEnd(c.width)).join('');
  const sepLine = cols.map((c) => '-'.repeat(c.width - 1).padEnd(c.width)).join('');
  process.stdout.write(headerLine + '\n');
  process.stdout.write(sepLine + '\n');

  for (const r of results) {
    const dims = `${r.width}x${r.height}`;
    const row = [
      r.file,
      dims,
      `${r.operations.identify.median}ms`,
      `${r.operations.thumbnail.median}ms`,
      `${r.operations.decode_half_size.median}ms`,
      `${r.operations.decode_uq2.median}ms`,
      `${r.operations.decode_uq3.median}ms`,
    ];
    const line = row.map((cell, i) => String(cell).padEnd(cols[i].width)).join('');
    process.stdout.write(line + '\n');
  }
  process.stdout.write('\n');

  process.stdout.write('Stage breakdown (decode, user_qual=2, single run, ms):\n');
  const stageCols = [
    { header: 'file', width: 22 },
    { header: 'open', width: 9 },
    { header: 'unpack', width: 9 },
    { header: 'process', width: 9 },
    { header: 'copy', width: 9 },
    { header: 'total', width: 9 },
  ];
  process.stdout.write(stageCols.map((c) => c.header.padEnd(c.width)).join('') + '\n');
  process.stdout.write(stageCols.map((c) => '-'.repeat(c.width - 1).padEnd(c.width)).join('') + '\n');
  for (const r of results) {
    const row = [r.file, r.stages.open, r.stages.unpack, r.stages.process, r.stages.copy, r.stages.total];
    process.stdout.write(row.map((cell, i) => String(cell).padEnd(stageCols[i].width)).join('') + '\n');
  }
}

function sanitizeHost(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown-host';
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`error: ${err.message}\n`);
    printUsage();
    process.exit(1);
    return;
  }

  const files = collectFiles(args.inputs);
  if (files.length === 0) {
    process.stderr.write('no RAW files found in the given inputs\n');
    process.exit(1);
    return;
  }

  const environment = buildEnvironment();
  printEnvironment(environment);
  process.stdout.write(`iterations: ${args.iterations}\n\n`);

  const results = [];
  for (const filePath of files) {
    results.push(await benchFile(filePath, args.iterations));
  }

  printTable(results);

  if (!args.write) {
    return;
  }

  const date = new Date().toISOString().slice(0, 10);
  const hostRaw = args.host || os.hostname() || `${process.platform}-${process.arch}`;
  const host = sanitizeHost(hostRaw);
  const outPath = args.jsonPath || path.join(__dirname, '..', 'bench', `${date}-${host}.json`);

  const payload = {
    date,
    host,
    environment,
    iterations: args.iterations,
    results,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');
  process.stdout.write(`\nwrote ${path.relative(process.cwd(), outPath)}\n`);
}

main().catch((err) => {
  process.stderr.write(`bench failed: ${err.stack || err.message}\n`);
  process.exit(1);
});
