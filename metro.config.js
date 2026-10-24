const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The SDK's ESM build has circular imports that crash Metro; force its CommonJS build.
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
