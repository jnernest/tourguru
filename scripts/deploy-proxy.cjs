const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const EAS_CLI = 'eas-cli@25.1.1';
const PROXY_URL = 'https://tour-guide.expo.app/api/narrate';

function run(command, args, env = {}) {
  const options = { stdio: 'inherit', env: { ...process.env, ...env }, shell: process.platform === 'win32' };
  const cmd = process.platform === 'win32' ? `${command}.cmd` : command;
  const quoted = process.platform === 'win32' ? args.map((a) => `"${a}"`) : args;
  const result = spawnSync(cmd, quoted, options);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function filesUnder(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? filesUnder(p) : [p];
  });
}

const envLines = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').split(/\r?\n/) : [];
if (envLines.some((l) => /^EXPO_PUBLIC_LLM_API_KEY=\S/.test(l))) {
  console.error('✖ .env.local has EXPO_PUBLIC_LLM_API_KEY: it would be compiled into the web app. Rename it to LLM_API_KEY.');
  process.exit(1);
}
const key = envLines.find((l) => l.startsWith('LLM_API_KEY='))?.slice('LLM_API_KEY='.length).trim();

fs.rmSync('dist', { recursive: true, force: true });
run('npx', ['expo', 'export', '--platform', 'web'], { TOURGUIDE_WEB_SERVER: '1', EXPO_PUBLIC_LLM_PROXY_URL: PROXY_URL });
if (key && filesUnder('dist').some((f) => fs.readFileSync(f, 'latin1').includes(key))) {
  console.error('✖ The Gemini key ended up in dist/. Not deploying.');
  process.exit(1);
}
run('npx', ['--yes', EAS_CLI, 'deploy', '--prod', '--environment', 'preview', '--non-interactive']);
