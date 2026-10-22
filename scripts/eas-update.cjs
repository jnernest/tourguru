/**
 * Publishes the current app code as an over-the-air update to installed preview APKs.
 *
 * Usage: npm run update                      (message = latest git commit subject)
 *        npm run update "what changed"       (no `--` needed, so it also works in PowerShell)
 */
const { execSync, spawnSync } = require('node:child_process');

const EAS_CLI = 'eas-cli@25.1.1';

function lastCommitSubject() {
  try {
    return execSync('git log -1 --pretty=%s', { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

// The message reaches a shell on Windows: keep letters, digits, spaces and plain punctuation.
const raw = process.argv.slice(2).join(' ').trim() || lastCommitSubject() || 'App update';
const message = raw.replace(/[^\p{L}\p{N} .,:;!?()'/+_#-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);

const args = ['--yes', EAS_CLI, 'update', '--channel', 'preview', '--environment', 'preview', '--platform', 'android', '--message', message, '--non-interactive'];
console.log(`Publishing update: "${message}"`);
const result =
  process.platform === 'win32'
    ? // Unquoted command name: a quoted "npx.cmd" makes cmd resolve npm's files from the cwd.
      spawnSync(`npx.cmd ${args.map((a) => `"${a}"`).join(' ')}`, { stdio: 'inherit', shell: true })
    : spawnSync('npx', args, { stdio: 'inherit' });
process.exit(result.status ?? 1);
