'use strict';

// Loads the platform/arch-specific prebuild from prebuilds/<platform>-<arch>/
// via node-gyp-build's standard resolution (falls back to build/Release for
// local `cmake --build` development trees). See
// docs/how-to/build-libraw-addon-in-docker.md for how prebuilds/ is produced.
//
// Split out of lib/index.cjs in T06 so lib/index.cjs can compose the raw
// native exports with the JS-side Processor wrapper (lib/processor.cjs) and
// LibRawError (lib/errors.cjs) without every consumer of "the native
// binding" (lib/processor.cjs included) re-implementing binding resolution.
const nodeGypBuild = require('node-gyp-build');

const binding = nodeGypBuild(__dirname + '/..');

module.exports = binding;
