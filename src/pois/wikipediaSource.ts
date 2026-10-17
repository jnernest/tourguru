import { USER_AGENT } from '../config';
import type { LatLon } from '../geo/geo';
import type { Poi, PoiSource, WikiLang } from './types';

/** MediaWiki caps `exlimit` at 20 when `exintro` is set. */
const MAX_RESULTS = 20;
/** MediaWiki caps geosearch radius at 10 km. */
const MAX_RADIUS_M = 10_000;

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
}
interface GeoQueryResponse {
  query?: { pages?: WikiPage[] };
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
    prop: 'coordinates|extracts|info|pageprops',
    // Without this only the first 10 pages get coordinates and the rest are dropped.
    colimit: String(MAX_RESULTS),
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
  };
}

export function parseGeoQueryResponse(body: unknown, lang: WikiLang): Poi[] {
  const pages = (body as GeoQueryResponse).query?.pages ?? [];
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
