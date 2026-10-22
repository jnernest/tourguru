/**
 * The runtime "fingerprint" decides which installed APKs an over-the-air update may reach.
 * npm scripts are laptop-side helpers (build, update, store…) that never change the native app,
 * so editing them must not cut installed APKs off from updates.
 * https://docs.expo.dev/versions/latest/sdk/fingerprint/
 */
module.exports = {
  sourceSkips: ['PackageJsonScriptsAll'],
};
