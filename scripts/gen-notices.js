#!/usr/bin/env node
// T23: regenerates THIRD_PARTY_NOTICES.md deterministically from
// scripts/versions.env plus the licence files that ship in the vendored
// submodules / node_modules / this repo's own `licenses/` directory, so the
// notices file can never silently drift from what is actually linked into
// the prebuilt addon.
//
// Inputs (all committed, so this script needs no network access and is
// deterministic given the working tree):
//   scripts/versions.env                          LibRaw/zlib/libjpeg-turbo/Node versions
//   package.json / node_modules/node-addon-api     node-addon-api's installed version + licence
//   vendor/LibRaw/LICENSE.CDDL, LICENSE.LGPL,
//     COPYRIGHT                                    LibRaw's dual licence + per-file attributions
//   vendor/zlib/LICENSE                            zlib licence
//   vendor/libjpeg-turbo/LICENSE.md                IJG + BSD-3 + zlib (libjpeg-turbo's own aggregate)
//   licenses/LLVM-LICENSE.txt                      Apache-2.0 WITH LLVM-exception (fetched once from
//                                                   https://raw.githubusercontent.com/llvm/llvm-project/
//                                                   main/LICENSE.TXT and committed -- macOS libomp's
//                                                   licence; libomp itself is a Homebrew keg installed at
//                                                   CI build time, not vendored in this repo, so its
//                                                   licence text cannot be read from a submodule the way
//                                                   the others are)
//   licenses/node-gyp-LICENSE.txt                  MIT (node-gyp's own LICENSE file at the pinned tag
//                                                   recorded below -- src/win_delay_load_hook.cc itself
//                                                   carries only a descriptive header comment, no licence
//                                                   text, despite what an earlier draft of this task
//                                                   assumed; the real MIT text is fetched once from
//                                                   https://raw.githubusercontent.com/nodejs/node-gyp/
//                                                   v11.2.0/LICENSE and committed here instead)
//
// Usage:
//   node scripts/gen-notices.js          regenerate THIRD_PARTY_NOTICES.md
//   node scripts/gen-notices.js --check  exit 1 if the committed file is stale
//
// `npm run gen:notices` / `npm run gen:notices:check` run the two forms;
// both are wired into the aggregate `npm run gen` / `npm run gen:check`.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(ROOT, 'THIRD_PARTY_NOTICES.md');
const NODE_GYP_TAG = 'v11.2.0';

function readVersionsEnv() {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/versions.env'), 'utf8');
  const env = {};
  for (const line of src.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

function readText(relPath) {
  // Normalize CRLF/CR to LF before anything else. The vendor licence files
  // this reads live inside git submodules (vendor/LibRaw, vendor/zlib) that
  // carry no .gitattributes of their own (unlike this repo's own root
  // .gitattributes, which does not govern submodule checkouts at all), and
  // libjpeg-turbo's .gitattributes does not pin eol=lf either -- so on a
  // Windows checkout (core.autocrlf=true by default on windows-2022
  // runners) these files check out with CRLF while every other platform
  // sees LF, which made an earlier version of this script produce a
  // Windows-only-different THIRD_PARTY_NOTICES.md and fail `--check` in CI
  // (build-windows, T23). Normalizing here makes generation deterministic
  // regardless of the checkout's line-ending settings.
  return fs
    .readFileSync(path.join(ROOT, relPath), 'utf8')
    .replace(/\r\n/gu, '\n')
    .replace(/\r/gu, '\n')
    .replace(/\s+$/u, '');
}

function nodeAddonApiVersion() {
  const pkgPath = path.join(ROOT, 'node_modules/node-addon-api/package.json');
  if (!fs.existsSync(pkgPath)) {
    throw new Error(
      'gen-notices: node_modules/node-addon-api/package.json not found -- run `npm ci`/`npm install` first',
    );
  }
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
}

function fence(text) {
  // THIRD_PARTY_NOTICES.md is itself Markdown; licence texts are embedded
  // verbatim inside fenced code blocks so their own Markdown-ish characters
  // (headers, asterisks in the BSD/IJG texts, etc.) never get reinterpreted.
  // None of the embedded texts contain a ``` fence themselves (checked at
  // generation time below), so a plain triple-backtick fence is safe.
  if (text.includes('```')) {
    throw new Error('gen-notices: a licence text unexpectedly contains a ``` fence; cannot embed safely');
  }
  return '```\n' + text + '\n```';
}

function render(env) {
  const naapiVersion = nodeAddonApiVersion();
  const cddl = readText('vendor/LibRaw/LICENSE.CDDL');
  const lgpl = readText('vendor/LibRaw/LICENSE.LGPL');
  const librawCopyright = readText('vendor/LibRaw/COPYRIGHT');
  const zlibLicense = readText('vendor/zlib/LICENSE');
  const libjpegTurboLicense = readText('vendor/libjpeg-turbo/LICENSE.md');
  const naapiLicense = readText('node_modules/node-addon-api/LICENSE.md');
  const llvmLicense = readText('licenses/LLVM-LICENSE.txt');
  const nodeGypLicense = readText('licenses/node-gyp-LICENSE.txt');

  const generatedNote =
    'This file is generated by `scripts/gen-notices.js` from `scripts/versions.env` and the licence ' +
    'files listed in that script\'s header comment. Do not edit by hand -- run `npm run gen:notices` ' +
    'after bumping a vendored version and commit the result.';

  return `# Third-party notices

\`@janhapke/libraw\` is MIT-licensed. It statically links the vendored components below into the
prebuilt native addon (macOS/Windows OpenMP runtime is the one exception -- see the notes at the end).

${generatedNote}

## LibRaw

- Version: \`${env.LIBRAW_TAG}\` (git commit \`${env.LIBRAW_COMMIT}\`)
- Source: https://github.com/LibRaw/LibRaw
- Licence: LibRaw is dual-licensed. This package elects the **CDDL 1.0** (Common Development and
  Distribution License, Version 1.0) for the vendored copy; an alternative **GNU LGPL 2.1** licence is
  also offered upstream (full text below) -- see \`docs/explanation/licensing.md\` for the reasoning. The
  CDDL election permits static linking into this closed- or open-source addon without requiring
  relinkability.
- Note: LibRaw's GPL-2/3 "demosaic packs" (\`user_qual\` 5-10) are excluded from this build.
- Per-file attributions: \`vendor/LibRaw/COPYRIGHT\`, embedded below.

### LibRaw COPYRIGHT

${fence(librawCopyright)}

### LibRaw licence text: CDDL 1.0 (elected)

${fence(cddl)}

### LibRaw licence text: LGPL 2.1 (alternative election, not used by this package)

${fence(lgpl)}

## zlib

- Version: \`${env.ZLIB_TAG}\` (git commit \`${env.ZLIB_COMMIT}\`)
- Source: https://github.com/madler/zlib
- Licence: zlib licence (permissive, static linking is fine).

### zlib licence text

${fence(zlibLicense)}

## libjpeg-turbo

- Version: \`${env.LIBJPEG_TURBO_TAG}\` (git commit \`${env.LIBJPEG_TURBO_COMMIT}\`)
- Source: https://github.com/libjpeg-turbo/libjpeg-turbo
- Licence: a combination of the IJG (Independent JPEG Group) licence, the modified BSD licence (BSD-3
  clause, for the SIMD extensions and other libjpeg-turbo-specific code), and the zlib licence (for a small
  number of files). Static linking is fine under all three; notices must be kept.

### libjpeg-turbo licence text (aggregates IJG + BSD-3 + zlib)

${fence(libjpegTurboLicense)}

## node-addon-api

- Version: \`${naapiVersion}\` (installed; \`package.json\` pins \`^8.9.2\`)
- Source: https://github.com/nodejs/node-addon-api
- Licence: MIT.

### node-addon-api licence text

${fence(naapiLicense)}

## libomp (macOS only)

- Used on \`darwin-x64\`/\`darwin-arm64\` for OpenMP support (T20): Homebrew's \`libomp\` formula, linked
  statically (\`lib/libomp.a\`) into the addon.
- Source: https://github.com/llvm/llvm-project (\`openmp\` subproject)
- Licence: Apache License 2.0 with LLVM Exceptions.
- Version: **not pinned by this repo.** Homebrew's \`libomp\` formula is installed fresh on each macOS CI
  run (\`brew install libomp\`) rather than vendored as a submodule, so the exact \`libomp\` version linked
  into any given \`darwin-x64\`/\`darwin-arm64\` prebuild is whatever bottle Homebrew served that runner on
  that day -- see the CI log's \`brew install libomp\` step for the version actually installed, and
  \`buildInfo.flags\` (which includes the resolved \`-I<prefix>/include\` path from
  \`LIBRAW_NODE_OMP_ROOT\`, set via \`brew --prefix libomp\` in \`.github/workflows/build.yml\`) for the
  prefix used at compile time. This is recorded honestly rather than guessed.

### libomp licence text (Apache-2.0 WITH LLVM-exception, fetched from llvm/llvm-project's LICENSE.TXT)

${fence(llvmLicense)}

## node-gyp (Windows delay-load hook only)

- \`src/win_delay_load_hook.cc\` is copied verbatim (with its original header comment kept) from
  [\`nodejs/node-gyp\`](https://github.com/nodejs/node-gyp) at tag \`${NODE_GYP_TAG}\`
  (\`src/win_delay_load_hook.cc\`), compiled into the \`win32-x64\` addon only (T21). It is the same
  delay-load hook \`node-gyp\`/\`cmake-js\` addons get automatically; this project's CMake build wires it in
  by hand since it does not use \`node-gyp\`. See \`docs/how-to/make-the-addon-electron-safe.md\` row 3.
- Source: https://github.com/nodejs/node-gyp
- Licence: MIT. The source file's own header comment is descriptive only (no licence text); the licence
  text below is node-gyp's \`LICENSE\` file at the same pinned tag, fetched once and committed to
  \`licenses/node-gyp-LICENSE.txt\`.

### node-gyp licence text

${fence(nodeGypLicense)}

---

Not vendored/linked, but relevant to note:

- **libgomp** (GCC OpenMP runtime), used on Linux for OpenMP support (T03/T04): GPL-3 with the GCC
  Runtime Library Exception, linked **dynamically** (\`libgomp.so.1\`, ships with every GCC/glibc Linux
  install) rather than statically, so no GPL obligations attach to this MIT package.
- **vcomp140.dll** (Microsoft's own OpenMP runtime, part of the Visual C++ Redistributable), used on
  \`win32-x64\` for OpenMP support (T21, MSVC's \`/openmp\`): linked dynamically only, never bundled or
  redistributed by this package -- it is a runtime dependency documented in \`README.md\` and
  \`docs/reference/build-matrix.md\`, not a vendored component, so no notice/licence text applies here.
`;
}

function main() {
  const check = process.argv.includes('--check');
  const env = readVersionsEnv();
  const rendered = render(env);

  if (check) {
    if (!fs.existsSync(OUT_PATH)) {
      console.error(`gen-notices --check: ${OUT_PATH} does not exist`);
      process.exit(1);
    }
    const current = fs.readFileSync(OUT_PATH, 'utf8');
    if (current !== rendered) {
      console.error('gen-notices --check: THIRD_PARTY_NOTICES.md is stale -- run `npm run gen:notices`');
      process.exit(1);
    }
    console.log('gen-notices --check: THIRD_PARTY_NOTICES.md is up to date');
    return;
  }

  fs.writeFileSync(OUT_PATH, rendered);
  console.log(`gen-notices: wrote ${path.relative(ROOT, OUT_PATH)} (${rendered.length} bytes)`);
}

main();
