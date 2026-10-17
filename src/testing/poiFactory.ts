import type { Poi } from '../pois/types';

/** Metres per degree of latitude; good enough for building test geometry. */
const M_PER_DEG_LAT = 111_195;

export const ORIGIN = { lat: 48.0, lon: 11.0 };

/** A POI `metresNorth` metres due north of ORIGIN (negative = south). */
export function poiNorth(id: string, metresNorth: number, overrides: Partial<Poi> = {}): Poi {
  return {
    id,
    title: `Place ${id}`,
    summary: `Place ${id} is a test place. It has a history.`,
    articleLength: 5_000,
    lat: ORIGIN.lat + metresNorth / M_PER_DEG_LAT,
    lon: ORIGIN.lon,
    lang: 'en',
    pageId: 1000,
    image: null,
    url: `https://en.wikipedia.org/?curid=${id}`,
    ...overrides,
  };
}
