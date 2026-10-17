import type { LatLon } from '../geo/geo';

/**
 * Wikipedia edition code, e.g. "en", "de". Wider than LanguageCode: places can come from the
 * local Wikipedia even when the app does not narrate in that language.
 */
export type WikiLang = string;

export interface Poi extends LatLon {
  /** Wikidata id when known (stable across languages), else `{lang}wiki:{pageId}`. */
  id: string;
  title: string;
  /** Plain-text lead section of the article. */
  summary: string;
  /** Article size in bytes — a cheap proxy for how much there is to tell. */
  articleLength: number;
  /** Language of `title` and `summary`. */
  lang: WikiLang;
  /** MediaWiki page id within the `lang` edition. */
  pageId: number;
  url: string;
}

export interface PoiSource {
  nearby(center: LatLon, radiusM: number, lang: WikiLang): Promise<Poi[]>;
}
