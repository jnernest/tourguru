/**
 * Rewrites package-lock.json tarball URLs from a private Nexus mirror
 * (https://<host>/repository/<repo>/...) to the public npm registry, which EAS Build can reach.
 * Locally nothing changes in practice: npm maps registry.npmjs.org URLs back to the configured
 * registry (default `replace-registry-host=npmjs`). Runs automatically before `npm run apk`.
 */
const fs = require('node:fs');
const path = require('node:path');

// npm runs scripts from the package root.
const LOCKFILE = path.resolve('package-lock.json');
const NEXUS_PREFIX = /^https?:\/\/[^/]+\/repository\/[^/]+\//;
const PUBLIC_REGISTRY = 'https://registry.npmjs.org/';

const lock = JSON.parse(fs.readFileSync(LOCKFILE, 'utf8'));
let rewritten = 0;
for (const entry of Object.values(lock.packages ?? {})) {
  if (typeof entry.resolved === 'string' && NEXUS_PREFIX.test(entry.resolved)) {
    entry.resolved = entry.resolved.replace(NEXUS_PREFIX, PUBLIC_REGISTRY);
    rewritten += 1;
  }
}
if (rewritten > 0) {
  fs.writeFileSync(LOCKFILE, `${JSON.stringify(lock, null, 2)}\n`);
}
console.log(`package-lock.json: ${rewritten} private-registry URL(s) rewritten to ${PUBLIC_REGISTRY}`);
