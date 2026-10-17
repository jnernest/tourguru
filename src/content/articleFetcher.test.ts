import { describe, expect, it, vi } from 'vitest';

import type { FetchLike } from '../pois/wikipediaSource';
import { poiNorth } from '../testing/poiFactory';
import { buildArticleUrl, createArticleLoader } from './articleFetcher';

const poi = poiNorth('Q131330', 0, { lang: 'de', pageId: 40917, summary: 'Kurzer Einleitungstext.' });
const ok = (extract: string): ReturnType<FetchLike> =>
  Promise.resolve({ ok: true, status: 200, json: async () => ({ query: { pages: [{ extract }] } }) });

describe('buildArticleUrl', () => {
  it('requests the full plain-text article from the place’s own edition', () => {
    const url = buildArticleUrl(poi);
    expect(url.startsWith('https://de.wikipedia.org/w/api.php?')).toBe(true);
    expect(url).toContain('pageids=40917');
    expect(url).toContain('explaintext=1');
    expect(url).not.toContain('exintro');
  });
});

describe('createArticleLoader', () => {
  it('returns the full article and caches it', async () => {
    const fetchFn = vi.fn<FetchLike>(() => ok('Schloss Schönbrunn ist ein Schloss. Es hat viele Räume und einen Park.'));
    const load = createArticleLoader(fetchFn);
    expect(await load(poi)).toContain('viele Räume');
    await load(poi);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('falls back to the lead on network errors, HTTP errors or an empty article', async () => {
    const failures: FetchLike[] = [
      () => Promise.reject(new Error('offline')),
      () => Promise.resolve({ ok: false, status: 503, json: async () => ({}) }),
      () => ok(''),
    ];
    for (const fetchFn of failures) {
      expect(await createArticleLoader(fetchFn)(poi)).toBe('Kurzer Einleitungstext.');
    }
  });
});
