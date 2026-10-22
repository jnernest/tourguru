/**
 * The runtime "fingerprint" decides which installed APKs an over-the-air update may reach.
 * These parts never change the native app, so editing them must not cut installed APKs off
 * from updates:
 * - npm scripts: laptop-side helpers (build, update, store…)
 * - EAS project information in app.json (`owner`, `extra.eas.projectId`)
 * https://docs.expo.dev/versions/latest/sdk/fingerprint/
 */
module.exports = {
  sourceSkips: ['PackageJsonScriptsAll', 'ExpoConfigEASProject'],
};
