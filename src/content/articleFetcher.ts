import { buildApiUrl, WIKIMEDIA_HEADERS, type FetchLike } from '../pois/wikipediaSource';
import type { Poi } from '../pois/types';

interface ExtractResponse {
  query?: { pages?: { extract?: string }[] };
}

export function buildArticleUrl(poi: Pick<Poi, 'lang' | 'pageId'>): string {
  return buildApiUrl(poi.lang, {
    prop: 'extracts',
    explaintext: '1',
    exsectionformat: 'wiki',
    pageids: String(poi.pageId),
  });
}

export function createArticleLoader(fetchFn: FetchLike = fetch) {
  const cache = new Map<string, string>();
  return async (poi: Poi): Promise<string> => {
    const key = `${poi.lang}:${poi.pageId}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    try {
      const res = await fetchFn(buildArticleUrl(poi), { headers: WIKIMEDIA_HEADERS });
      if (!res.ok) return poi.summary;
      const text = ((await res.json()) as ExtractResponse).query?.pages?.[0]?.extract?.trim();
      const article = text && text.length > poi.summary.length ? text : poi.summary;
      cache.set(key, article);
      return article;
    } catch {
      return poi.summary;
    }
  };
}

export type ArticleLoader = ReturnType<typeof createArticleLoader>;
