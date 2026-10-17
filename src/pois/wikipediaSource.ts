import { USER_AGENT } from '../config';
import type { LatLon } from '../geo/geo';
import type { Poi, PoiImage, PoiSource, WikiLang } from './types';

/** MediaWiki caps `exlimit` at 20 when `exintro` is set. */
const MAX_RESULTS = 20;
/** MediaWiki caps geosearch radius at 10 km. */
const MAX_RADIUS_M = 10_000;
/** One of Wikimedia's standard thumbnail widths; sharp on a phone card, ~40 kB each. */
const THUMBNAIL_PX = 500;

export interface HttpResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}
export type FetchLike = (
  url: string,
  init: { headers: Record<string, string> },
) => Promise<HttpResponse>;

interface WikiPage {
  pageid: number;
  title: string;
  extract?: string;
  length?: number;
  coordinates?: { lat: number; lon: number }[];
  pageprops?: { wikibase_item?: string };
  thumbnail?: { source: string; width: number; height: number };
}
interface GeoQueryResponse {
  query?: { pages?: WikiPage[] };
  /** MediaWiki reports failures (rate limits, maxlag, bad parameters) with HTTP 200 and this. */
  error?: { code?: string; info?: string };
}

/** Wikipedia edition codes are 2–3 lowercase letters; anything else must not reach a hostname. */
const WIKI_LANG_PATTERN = /^[a-z]{2,3}$/;

/** MediaWiki Action API URL for one Wikipedia edition, with the common JSON parameters. */
export function buildApiUrl(lang: WikiLang, params: Record<string, string>): string {
  if (!WIKI_LANG_PATTERN.test(lang)) {
    throw new Error(`Invalid Wikipedia language code: ${lang}`);
  }
  const all = { action: 'query', format: 'json', formatversion: '2', origin: '*', ...params };
  // Built by hand: URLSearchParams is only partially implemented in React Native.
  const query = Object.entries(all)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return `https://${lang}.wikipedia.org/w/api.php?${query}`;
}

export const WIKIMEDIA_HEADERS = { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT };

export function buildGeoQueryUrl(center: LatLon, radiusM: number, lang: WikiLang): string {
  return buildApiUrl(lang, {
    generator: 'geosearch',
    ggscoord: `${center.lat}|${center.lon}`,
    ggsradius: String(Math.min(Math.round(radiusM), MAX_RADIUS_M)),
    ggslimit: String(MAX_RESULTS),
    prop: 'coordinates|extracts|info|pageprops|pageimages',
    // Without this only the first 10 pages get coordinates and the rest are dropped.
    colimit: String(MAX_RESULTS),
    // Main picture per article. Only freely licensed images are returned by default.
    piprop: 'thumbnail',
    pithumbsize: String(THUMBNAIL_PX),
    pilimit: String(MAX_RESULTS),
    exintro: '1',
    explaintext: '1',
    exlimit: String(MAX_RESULTS),
    ppprop: 'wikibase_item',
  });
}

function toPoi(page: WikiPage, lang: WikiLang): Poi | null {
  const coord = page.coordinates?.[0];
  const summary = page.extract?.trim() ?? '';
  if (!coord || summary.length === 0) {
    return null;
  }
  return {
    id: page.pageprops?.wikibase_item ?? `${lang}wiki:${page.pageid}`,
    title: page.title,
    summary,
    articleLength: page.length ?? summary.length,
    lat: coord.lat,
    lon: coord.lon,
    lang,
    pageId: page.pageid,
    url: `https://${lang}.wikipedia.org/?curid=${page.pageid}`,
    image: toImage(page.thumbnail),
  };
}

function toImage(thumbnail: WikiPage['thumbnail']): PoiImage | null {
  // Only https images from Wikimedia's own hosts are shown.
  if (!thumbnail || !/^https:\/\/[a-z]+\.wikimedia\.org\//.test(thumbnail.source)) {
    return null;
  }
  return { url: thumbnail.source, width: thumbnail.width, height: thumbnail.height };
}

export function parseGeoQueryResponse(body: unknown, lang: WikiLang): Poi[] {
  const { error, query } = body as GeoQueryResponse;
  if (error) {
    // Throw rather than return [], so "no places here" is not confused with "request failed".
    throw new Error(`Wikipedia API error (${lang}): ${error.code ?? 'unknown'} ${error.info ?? ''}`.trim());
  }
  const pages = query?.pages ?? [];
  return pages.map((p) => toPoi(p, lang)).filter((p): p is Poi => p !== null);
}

export function createWikipediaSource(fetchFn: FetchLike = fetch): PoiSource {
  return {
    async nearby(center, radiusM, lang) {
      const res = await fetchFn(buildGeoQueryUrl(center, radiusM, lang), {
        headers: WIKIMEDIA_HEADERS,
      });
      if (!res.ok) {
        throw new Error(`Wikipedia request failed (HTTP ${res.status})`);
      }
      return parseGeoQueryResponse(await res.json(), lang);
    },
  };
}
