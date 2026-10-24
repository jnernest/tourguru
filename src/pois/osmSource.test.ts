import { describe, expect, it, vi } from 'vitest';

import { poiNorth } from '../testing/poiFactory';
import { createOsmSource, mergeOsm, overpassQuery, parseOverpass, type PostFetch } from './osmSource';

const BODY = {
  elements: [
    { type: 'node', id: 1, lat: 48.1, lon: 11.5, tags: { name: 'Fischbrunnen', amenity: 'fountain', wikidata: 'Q1418064' } },
    {
      type: 'way',
      id: 2,
      center: { lat: 48.2, lon: 11.6 },
      tags: { name: 'Gedenktafel', 'name:en': 'Memorial plaque', historic: 'memorial', inscription: 'Hier lebte X', opening_hours: '24/7' },
    },
    { type: 'node', id: 3, tags: { name: 'No coordinates' } },
    { type: 'node', id: 4, lat: 1, lon: 1, tags: { historic: 'ruins' } },
  ],
};

describe('parseOverpass', () => {
  it('turns named sights into places, preferring the user-language name', () => {
    const places = parseOverpass(BODY, 'en');
    expect(places.map((p) => [p.id, p.title, p.kind])).toEqual([
      ['Q1418064', 'Fischbrunnen', 'fountain'],
      ['osm:way/2', 'Memorial plaque', 'memorial'],
    ]);
    expect(places[1]).toMatchObject({ lat: 48.2, inscription: 'Hier lebte X', openingHours: '24/7', summary: '“Hier lebte X”' });
  });
});

describe('createOsmSource', () => {
  it('falls through to the next server and gives up quietly', async () => {
    const fetchFn = vi
      .fn<PostFetch>()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(new Response(JSON.stringify(BODY), { status: 200 }));
    const places = await createOsmSource(fetchFn, ['https://a', 'https://b'])({ lat: 48, lon: 11 }, 300, 'de');
    expect(places).toHaveLength(2);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    const down = vi.fn<PostFetch>().mockRejectedValue(new Error('down'));
    expect(await createOsmSource(down, ['https://a'])({ lat: 48, lon: 11 }, 300, 'de')).toEqual([]);
  });

  it('asks for historic sights, attractions and fountains around the point', () => {
    const q = overpassQuery({ lat: 48.1374, lon: 11.5755 }, 300);
    expect(q).toContain('around:300,48.137400,11.575500');
    expect(q).toMatch(/historic.*tourism.*fountain/);
  });
});

describe('mergeOsm', () => {
  it('adds opening hours to Wikipedia places and appends OSM-only places', () => {
    const wiki = [poiNorth('Q1418064', 10)];
    const { places, hours } = mergeOsm(wiki, parseOverpass({ elements: [{ ...BODY.elements[0], tags: { ...BODY.elements[0].tags, opening_hours: 'Mo-Su 09:00-17:00' } }, BODY.elements[1]] }, 'en'));
    expect(places.map((p) => p.id)).toEqual(['Q1418064', 'osm:way/2']);
    expect(hours.get('Q1418064')).toBe('Mo-Su 09:00-17:00');
    expect(hours.get('osm:way/2')).toBe('24/7');
  });
});
