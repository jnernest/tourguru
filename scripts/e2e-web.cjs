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
    await page.getByText('TourGuide', { exact: true }).waitFor({ timeout: 30_000 });
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

    const before = await narration.textContent();
    await page.getByText('Tell me more', { exact: false }).click();
    await page.waitForFunction(
      (prev) => {
        const t = document.querySelector('[data-testid="narration"]')?.textContent ?? '';
        return t !== prev && t !== 'Preparing…' && t.length > 0;
      },
      before,
      { timeout: NARRATION_TIMEOUT_MS },
    );
    if (!(await page.getByText('Walk there', { exact: false }).isVisible())) throw new Error('"Walk there" button missing');
    console.log('✔ "Walk there" button shown');
    console.log(`✔ story: ${(await narration.textContent()).slice(0, 160)}…`);

    await page.getByText('🎯 Quiz', { exact: true }).click();
    const quizOutcome = page.getByText(/Score: \d+ of \d+|No quiz question/);
    await quizOutcome.first().waitFor({ timeout: NARRATION_TIMEOUT_MS });
    if (await page.getByText('No quiz question', { exact: false }).isVisible()) {
      console.log('✔ quiz: no question for this place (no build year on Wikidata)');
    } else {
      await page.locator('[role="button"]', { hasText: /^\d{4}$/ }).first().click();
      await page.getByText(/Score: \d+ of 1/).waitFor({ timeout: 5_000 });
      console.log(`✔ quiz answered: ${(await page.getByText(/Score: /).textContent()).trim()}`);
    }

    await page.getByText('Suggest a walk', { exact: false }).click();
    await page.getByText(/Your walk · \d+ stops/).waitFor({ timeout: 10_000 });
    console.log(`✔ walk planned: ${(await page.getByText(/Your walk · \d+ stops/).textContent()).trim()}`);
    console.log(`    ${(await page.getByText(/^Next: /).textContent()).trim()}`);
    await page.getByText('Open in Google Maps').waitFor({ timeout: 5_000 });
    console.log(`✔ discovery: ${(await page.getByText(/in total/).first().textContent()).trim()}`);
    await page.getByText('⚙ Settings', { exact: false }).click();
    await page.getByText('Kids', { exact: true }).click();
    await page.getByText('History', { exact: true }).click();
    await page.getByText('+', { exact: true }).click();
    await page.getByText('Speaking speed: 1.1×').waitFor({ timeout: 5_000 });
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tourguide.settings') ?? '{}'));
    if (saved.tone !== 'kids' || !saved.interests?.includes('history') || saved.speechRate !== 1.1) {
      throw new Error(`settings not saved: ${JSON.stringify(saved)}`);
    }
    console.log(`✔ settings saved: ${JSON.stringify({ tone: saved.tone, interests: saved.interests, speechRate: saved.speechRate })}`);
    await page.getByText('Stop walk', { exact: true }).click();
    await page.getByText(/Share last walk \(\d+ places?\)/).waitFor({ timeout: 5_000 });
    const walks = await page.evaluate(() => JSON.parse(localStorage.getItem('tourguide.walks') ?? '[]'));
    console.log(`✔ diary saved: ${walks[0].places.length} places, ${Math.round(walks[0].distanceM)} m`);
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
