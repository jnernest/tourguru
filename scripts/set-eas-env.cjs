/**
 * Copies a key from .env.local to the EAS "preview" environment, so APK builds and EAS Updates
 * get it (.env.local itself is never uploaded). Never prints the value.
 *
 * Usage: node scripts/set-eas-env.cjs EXPO_PUBLIC_LLM_API_KEY
 * (Reading the file avoids passing the key on the command line, where PowerShell drops the
 * `--` that npm needs and the value never arrives.)
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const NAME = process.argv[2];
const ALLOWED_NAMES = new Set(['EXPO_PUBLIC_LLM_API_KEY', 'EXPO_PUBLIC_ANTHROPIC_API_KEY', 'EXPO_PUBLIC_LLM_BASE_URL', 'EXPO_PUBLIC_LLM_MODEL']);
// API keys and URLs only; anything else could be misread by the shell.
const SAFE_VALUE = /^[A-Za-z0-9._:/\-]+$/;
const EAS_CLI = 'eas-cli@25.1.1';

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

if (!ALLOWED_NAMES.has(NAME)) fail(`Unknown variable "${NAME}". Expected one of: ${[...ALLOWED_NAMES].join(', ')}`);

const envFile = path.resolve('.env.local');
if (!fs.existsSync(envFile)) fail('.env.local not found. Copy .env.local.example to .env.local and add the key.');
const line = fs
  .readFileSync(envFile, 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith(`${NAME}=`));
const value = line?.slice(NAME.length + 1).trim();
if (!value) fail(`${NAME} is empty in .env.local.`);
if (!SAFE_VALUE.test(value)) fail(`${NAME} contains unexpected characters; set it on expo.dev instead.`);

const args = [
  '--yes', EAS_CLI, 'env:set',
  '--name', NAME,
  '--value', value,
  '--environment', 'preview',
  '--visibility', 'sensitive',
  '--non-interactive',
];
// Windows needs a shell to run npx.cmd. Every argument is validated above (no quotes, spaces
// or shell metacharacters), so quoting each one and joining them is safe. The command name
// itself must stay unquoted: a quoted "npx.cmd" makes cmd resolve npm's files from the cwd.
const result =
  process.platform === 'win32'
    ? spawnSync(`npx.cmd ${args.map((a) => `"${a}"`).join(' ')}`, { stdio: ['ignore', 'inherit', 'inherit'], shell: true })
    : spawnSync('npx', args, { stdio: ['ignore', 'inherit', 'inherit'] });
if (result.status !== 0) fail(`eas env:set failed (exit ${result.status}).`);
console.log(`✔ ${NAME} is set for EAS preview builds and updates (value not shown).`);
