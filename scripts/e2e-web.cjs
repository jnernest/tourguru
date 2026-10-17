/**
 * End-to-end check in a real browser: serves an exported web build, opens it in the locally
 * installed Chrome, clicks "Simulate a walk" and waits for a real narration (live Wikipedia).
 * Usage: npx expo export --dev --platform web --output-dir .smoke-web && node scripts/e2e-web.cjs .smoke-web
 */
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(process.argv[2] ?? '.smoke-web');
const PORT = 8765;
const NARRATION_TIMEOUT_MS = 90_000;
const SCREENSHOT = path.join(ROOT, 'e2e-screenshot.png');
const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.ico': 'image/x-icon' };

function serve() {
  return http
    .createServer((req, res) => {
      const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let file = path.join(ROOT, urlPath);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        file = path.join(ROOT, 'index.html');
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    })
    .listen(PORT);
}

async function main() {
  const server = serve();
  const executablePath = CHROME_PATHS.find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({
    // A typical Android phone, so the screenshot shows the real layout.
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    permissions: ['geolocation'],
    geolocation: { latitude: 48.1374, longitude: 11.5755 },
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && console.log(`  [console.error] ${m.text().slice(0, 200)}`));

  try {
    await page.goto(`http://localhost:${PORT}/`);
    await page.getByText('Walk Guide', { exact: true }).waitFor({ timeout: 30_000 });
    console.log('✔ app rendered');
    if (pageErrors.length) throw new Error(`page error on load: ${pageErrors[0]}`);

    await page.getByText('Simulate a walk', { exact: false }).click();
    console.log('✔ simulated walk started');

    const narration = page.getByTestId('narration');
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="narration"]');
        return el && el.textContent && el.textContent !== 'Preparing…';
      },
      undefined,
      { timeout: NARRATION_TIMEOUT_MS },
    );
    const title = await page.locator('[data-testid="narration"]').locator('xpath=preceding-sibling::*[1]').textContent();
    console.log(`✔ narrated "${title}":\n    ${(await narration.textContent()).slice(0, 300)}`);
    await page.screenshot({ path: SCREENSHOT, fullPage: true });
    console.log(`✔ screenshot: ${SCREENSHOT}`);
    if (pageErrors.length) throw new Error(`page error during walk: ${pageErrors[0]}`);
    console.log('E2E OK');
  } catch (e) {
    await page.screenshot({ path: SCREENSHOT, fullPage: true }).catch(() => undefined);
    console.log(`E2E FAIL: ${e.message.split('\n')[0]}  (screenshot: ${SCREENSHOT})`);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
}

main();
