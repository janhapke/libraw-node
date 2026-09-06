'use strict';

// Loads the platform/arch-specific prebuild from prebuilds/<platform>-<arch>/
// via node-gyp-build's standard resolution (falls back to build/Release for
// local `cmake --build` development trees). See
// docs/how-to/build-libraw-addon-in-docker.md for how prebuilds/ is produced.
const nodeGypBuild = require('node-gyp-build');

const binding = nodeGypBuild(__dirname + '/..');

module.exports = binding;
