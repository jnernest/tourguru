import { describe, expect, it, vi } from 'vitest';

import { distanceMeters } from '../geo/geo';
import type { Poi, PoiSource } from '../pois/types';
import { ORIGIN, poiNorth } from '../testing/poiFactory';
import {
  buildCityPack,
  queryCenters,
  withPackArticles,
  withPackEntities,
  withPackPlaces,
  type CityPack,
  type PackDeps,
  type PackStore,
} from './cityPack';

const memoryStore = (): PackStore & { pack: CityPack | null } => {
  const store = {
    pack: null as CityPack | null,
    read: () => store.pack,
    write: (p: CityPack) => {
      store.pack = p;
    },
  };
  return store;
};

function deps(places: Poi[]): PackDeps {
  return {
    source: { nearby: vi.fn(async () => places) },
    loadArticle: vi.fn(async (poi: Poi) => `Full article about ${poi.title}.`),
    describe: vi.fn(async () => ({ label: 'Label', description: null, facts: ['Built in 1638.'], builtYear: 1638 })),
    prefetchImage: vi.fn(async () => true),
    now: () => 42,
  };
}

describe('queryCenters', () => {
  it('covers a ring of 800 m around the walker', () => {
    const [center, ...ring] = queryCenters(ORIGIN);
    expect(center).toEqual(ORIGIN);
    expect(ring).toHaveLength(6);
    ring.forEach((p) => expect(distanceMeters(ORIGIN, p)).toBeCloseTo(800, -1));
  });
});

describe('buildCityPack', () => {
  it('stores each place once with its article and facts, reporting progress', async () => {
    const d = deps([poiNorth('a', 10, { pageId: 1 }), poiNorth('b', 20, { pageId: 2, image: { url: 'https://img/b.jpg', width: 1, height: 1 } })]);
    const progress = vi.fn();
    const pack = await buildCityPack(ORIGIN, 'en', d, progress);
    expect(pack.places.map((p) => p.id)).toEqual(['a', 'b']);
    expect(d.source.nearby).toHaveBeenCalledTimes(7);
    expect(Object.values(pack.articles)).toEqual(['Full article about Place a.', 'Full article about Place b.']);
    expect(pack.entities['en:a']?.facts).toEqual(['Built in 1638.']);
    expect(d.prefetchImage).toHaveBeenCalledWith('https://img/b.jpg');
    expect(progress).toHaveBeenLastCalledWith(2, 2);
  });

  it('fails clearly when nothing could be downloaded', async () => {
    await expect(buildCityPack(ORIGIN, 'en', deps([]))).rejects.toThrow('No places found');
  });
});

describe('reading from the pack', () => {
  it('serves places from the pack only when the network fails inside the packed area', async () => {
    const store = memoryStore();
    store.pack = await buildCityPack(ORIGIN, 'en', deps([poiNorth('a', 10), poiNorth('far', 1200)]));
    const offline: PoiSource = { nearby: async () => Promise.reject(new Error('offline')) };
    const ids = (await withPackPlaces(offline, store).nearby(ORIGIN, 500, 'en')).map((p) => p.id);
    expect(ids).toEqual(['a']);
    const elsewhere = { lat: ORIGIN.lat + 1, lon: ORIGIN.lon };
    await expect(withPackPlaces(offline, store).nearby(elsewhere, 500, 'en')).rejects.toThrow('offline');
    const online: PoiSource = { nearby: async () => [poiNorth('live', 5)] };
    expect((await withPackPlaces(online, store).nearby(ORIGIN, 500, 'en')).map((p) => p.id)).toEqual(['live']);
  });

  it('prefers packed articles and facts over the network', async () => {
    const store = memoryStore();
    store.pack = await buildCityPack(ORIGIN, 'en', deps([poiNorth('a', 10)]));
    const load = vi.fn(async () => 'network');
    expect(await withPackArticles(load, store)(poiNorth('a', 10))).toBe('Full article about Place a.');
    expect(await withPackArticles(load, store)(poiNorth('other', 10, { pageId: 999 }))).toBe('network');
    const describeFn = vi.fn(async () => null);
    expect((await withPackEntities(describeFn, store)('a', 'en'))?.facts).toEqual(['Built in 1638.']);
    expect(describeFn).not.toHaveBeenCalled();
    await withPackEntities(describeFn, store)('a', 'de');
    expect(describeFn).toHaveBeenCalledWith('a', 'de');
  });
});
