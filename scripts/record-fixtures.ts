/**
 * Re-records the Wikipedia fixtures used by the tests, using the app's own query builder.
 * Run: npm run fixtures
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { USER_AGENT } from '../src/config';
import type { LanguageCode } from '../src/i18n/languages';
import { buildGeoQueryUrl } from '../src/pois/wikipediaSource';

const MARIENPLATZ = { lat: 48.1374, lon: 11.5755 };
const LANGS: LanguageCode[] = ['en', 'de'];
/** Keeps fixtures small; the tests only need the start of each lead section. */
const MAX_EXTRACT_CHARS = 700;
const OUT_DIR = join(__dirname, '..', 'src', '__fixtures__');

interface Body {
  query?: { pages?: { extract?: string }[] };
}

async function record(lang: LanguageCode): Promise<void> {
  const res = await fetch(buildGeoQueryUrl(MARIENPLATZ, 500, lang), {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`${lang}: HTTP ${res.status}`);
  const body = (await res.json()) as Body;
  for (const page of body.query?.pages ?? []) {
    page.extract = (page.extract ?? '').slice(0, MAX_EXTRACT_CHARS);
  }
  writeFileSync(join(OUT_DIR, `marienplatz-${lang}.json`), `${JSON.stringify(body, null, 1)}\n`);
  console.log(`${lang}: ${body.query?.pages?.length ?? 0} pages`);
}

Promise.all(LANGS.map(record)).catch((e) => {
  console.error(e);
  process.exit(1);
});
