import type { EntityText } from '../content/wikidata';
import { distanceMeters, type LatLon } from '../geo/geo';
import type { LanguageCode } from '../i18n/languages';
import type { Poi, PoiSource } from '../pois/types';

export interface CityPack {
  center: LatLon;
  radiusM: number;
  lang: LanguageCode;
  createdAt: number;
  places: Poi[];
  articles: Record<string, string>;
  entities: Record<string, EntityText | null>;
}

export interface PackStore {
  read(): CityPack | null;
  write(pack: CityPack): void;
}

export interface PackDeps {
  source: PoiSource;
  loadArticle: (poi: Poi) => Promise<string>;
  describe: (wikidataId: string, lang: LanguageCode) => Promise<EntityText | null>;
  prefetchImage?: (url: string) => Promise<unknown>;
  now: () => number;
}

const QUERY_RADIUS_M = 500;
const RING_DISTANCE_M = 800;
const RING_POINTS = 6;
const M_PER_DEG_LAT = 111_195;
const PARALLEL = 2;

export const PACK_RADIUS_M = RING_DISTANCE_M + QUERY_RADIUS_M;

export const articleKey = (poi: Pick<Poi, 'lang' | 'pageId' | 'id'>) => (poi.pageId ? `${poi.lang}:${poi.pageId}` : poi.id);
export const entityKey = (id: string, lang: string) => `${lang}:${id}`;

export function queryCenters(center: LatLon): LatLon[] {
  const ring = Array.from({ length: RING_POINTS }, (_, i) => {
    const angle = (2 * Math.PI * i) / RING_POINTS;
    const dLat = (RING_DISTANCE_M * Math.cos(angle)) / M_PER_DEG_LAT;
    const dLon = (RING_DISTANCE_M * Math.sin(angle)) / (M_PER_DEG_LAT * Math.cos((center.lat * Math.PI) / 180));
    return { lat: center.lat + dLat, lon: center.lon + dLon };
  });
  return [center, ...ring];
}

async function inBatches<T>(items: T[], run: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += PARALLEL) {
    await Promise.all(items.slice(i, i + PARALLEL).map(run));
  }
}

export async function buildCityPack(
  center: LatLon,
  lang: LanguageCode,
  deps: PackDeps,
  onProgress: (done: number, total: number) => void = () => undefined,
): Promise<CityPack> {
  const byId = new Map<string, Poi>();
  for (const point of queryCenters(center)) {
    const found = await deps.source.nearby(point, QUERY_RADIUS_M, lang).catch(() => [] as Poi[]);
    found.forEach((p) => byId.has(p.id) || byId.set(p.id, p));
  }
  const places = [...byId.values()];
  if (places.length === 0) throw new Error('No places found here, or no connection.');
  const pack: CityPack = { center, radiusM: PACK_RADIUS_M, lang, createdAt: deps.now(), places, articles: {}, entities: {} };
  let done = 0;
  onProgress(done, places.length);
  await inBatches(places, async (poi) => {
    const [article, entity] = await Promise.all([
      deps.loadArticle(poi).catch(() => poi.summary),
      deps.describe(poi.id, lang).catch(() => null),
    ]);
    pack.articles[articleKey(poi)] = article;
    pack.entities[entityKey(poi.id, lang)] = entity;
    if (poi.image && deps.prefetchImage) await deps.prefetchImage(poi.image.url).catch(() => undefined);
    onProgress(++done, places.length);
  });
  return pack;
}

export function withPackPlaces(base: PoiSource, store: PackStore): PoiSource {
  return {
    async nearby(center, radiusM, lang) {
      try {
        return await base.nearby(center, radiusM, lang);
      } catch (error) {
        const pack = store.read();
        if (!pack || distanceMeters(pack.center, center) > pack.radiusM) throw error;
        return pack.places.filter((p) => distanceMeters(p, center) <= radiusM);
      }
    },
  };
}

export function withPackArticles(load: (poi: Poi) => Promise<string>, store: PackStore) {
  return async (poi: Poi): Promise<string> => store.read()?.articles[articleKey(poi)] ?? load(poi);
}

export function withPackEntities(
  describe: (wikidataId: string, lang: LanguageCode) => Promise<EntityText | null>,
  store: PackStore,
) {
  return async (wikidataId: string, lang: LanguageCode): Promise<EntityText | null> => {
    const packed = store.read()?.entities[entityKey(wikidataId, lang)];
    return packed !== undefined ? packed : describe(wikidataId, lang);
  };
}
