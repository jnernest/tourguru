// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @anthropic-ai/sdk's ESM build (.mjs) has circular imports that crash Metro bundles with
// "Cannot access '…' before initialization". Resolve its CommonJS build instead.
const SDK = '@anthropic-ai/sdk';
const upstreamResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = upstreamResolve ?? context.resolveRequest;
  if (moduleName === SDK || moduleName.startsWith(`${SDK}/`)) {
    return resolve({ ...context, unstable_conditionNames: ['require', 'default'] }, moduleName, platform);
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
