'use strict';

// T24 Part C: minimal Electron Forge packaging config. This app exists
// purely to prove the packaged-asar path works (docs/how-to/
// make-the-addon-electron-safe.md row 10): `electron-forge package` is
// enough for that -- it does not need a display, unlike `make` (which
// would also build platform installers) or `start`/`launch`. No makers
// are configured at all (see package.json's scripts -- only "package" is
// ever run by scripts/forge-asar-check.sh).
//
// packagerConfig.asar.unpack: the addon's single static .node file (no
// shared-library sidecars -- see docs/explanation/electron-compatibility.md
// §5) must live outside app.asar as a real file on disk for dlopen/
// LoadLibrary to open it; Forge's own AutoUnpackNativesPlugin does exactly
// this same '**/*.node' glob, but this project sets it directly on
// packagerConfig instead of adding the plugin, since nothing else needs
// unpacking (no .so/.dylib/.dll sidecars to catch with a broader glob, per
// the knowledge base's electron-native-modules.md "AutoUnpackNativesPlugin
// only unpacks *.node" note -- not applicable here, but worth the
// asar.unpack being explicit rather than relying on a plugin default).
module.exports = {
  packagerConfig: {
    asar: {
      unpack: '**/*.node',
    },
    // Nothing to prune here (test/forge-app/package.json only lists
    // @janhapke/libraw as a runtime dependency), but keep prune explicit
    // and true (Forge's default) so this doesn't silently change if a
    // future edit adds a devDependency this app doesn't actually need
    // packaged.
    prune: true,
    // Never notarize/sign in this throwaway check app -- see
    // docs/explanation/electron-compatibility.md §6 for why the real
    // package (photoview, or any consumer) doesn't need addon-side
    // signing work either way.
    osxSign: undefined,
    osxNotarize: undefined,
  },
  rebuildConfig: {},
  makers: [],
  plugins: [],
};
