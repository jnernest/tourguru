import { USER_AGENT } from '../config';
import type { LatLon } from '../geo/geo';
import type { Poi } from './types';

export const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const SERVER_TIMEOUT_MS = 8_000;
const MAX_ELEMENTS = 80;
const WIKIDATA_ID = /^Q\d+$/;

export interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface OsmPlace extends Poi {
  kind: string;
  openingHours: string | null;
  inscription: string | null;
  wikidataId: string | null;
}

export function overpassQuery(center: LatLon, radiusM: number): string {
  const around = `around:${Math.round(radiusM)},${center.lat.toFixed(6)},${center.lon.toFixed(6)}`;
  return `[out:json][timeout:10];(nwr(${around})["historic"]["name"];nwr(${around})["tourism"~"^(attraction|artwork|viewpoint|museum|gallery)$"]["name"];nwr(${around})["amenity"="fountain"]["name"];);out center tags ${MAX_ELEMENTS};`;
}

function kindOf(tags: Record<string, string>): string {
  return tags.historic ?? tags.tourism ?? tags.amenity ?? 'place';
}

function summaryOf(tags: Record<string, string>, name: string): string {
  const parts = [tags.description, tags.inscription ? `“${tags.inscription}”` : undefined].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : `${name} (${kindOf(tags).replace(/_/g, ' ')}).`;
}

export function parseOverpass(body: unknown, lang: string): OsmPlace[] {
  const elements = (body as { elements?: OsmElement[] }).elements ?? [];
  return elements.flatMap((e) => {
    const tags = e.tags ?? {};
    const lat = e.lat ?? e.center?.lat;
    const lon = e.lon ?? e.center?.lon;
    const name = tags[`name:${lang}`] ?? tags.name;
    if (lat === undefined || lon === undefined || !name) return [];
    const wikidataId = WIKIDATA_ID.test(tags.wikidata ?? '') ? tags.wikidata : null;
    return [
      {
        id: wikidataId ?? `osm:${e.type}/${e.id}`,
        title: name,
        summary: summaryOf(tags, name),
        articleLength: 0,
        pageViews: 0,
        lat,
        lon,
        lang,
        pageId: 0,
        url: `https://www.openstreetmap.org/${e.type}/${e.id}`,
        image: null,
        kind: kindOf(tags),
        openingHours: tags.opening_hours ?? null,
        inscription: tags.inscription ?? null,
        wikidataId,
      },
    ];
  });
}

export type PostFetch = (url: string, init: RequestInit) => Promise<Response>;

/** Tries each public server in turn; OSM is a bonus, so any failure just yields no places. */
export function createOsmSource(fetchFn: PostFetch = fetch, servers = OVERPASS_SERVERS) {
  return async (center: LatLon, radiusM: number, lang: string): Promise<OsmPlace[]> => {
    const body = `data=${encodeURIComponent(overpassQuery(center, radiusM))}`;
    for (const server of servers) {
      try {
        const res = await fetchFn(server, {
          method: 'POST',
          headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
          signal: AbortSignal.timeout(SERVER_TIMEOUT_MS),
        });
        if (res.ok) return parseOverpass(await res.json(), lang);
      } catch {
        // Next server.
      }
    }
    return [];
  };
}

/** Wikipedia places gain OSM opening hours; OSM-only places are added after them. */
export function mergeOsm(wikiPlaces: Poi[], osm: OsmPlace[]): { places: Poi[]; hours: Map<string, string> } {
  const byWikidata = new Map(osm.filter((o) => o.wikidataId).map((o) => [o.wikidataId as string, o]));
  const hours = new Map<string, string>();
  for (const p of wikiPlaces) {
    const match = byWikidata.get(p.id);
    if (match?.openingHours) hours.set(p.id, match.openingHours);
  }
  const known = new Set(wikiPlaces.map((p) => p.id));
  const extra = osm.filter((o) => !known.has(o.id));
  for (const o of extra) if (o.openingHours) hours.set(o.id, o.openingHours);
  return { places: [...wikiPlaces, ...extra], hours };
}
