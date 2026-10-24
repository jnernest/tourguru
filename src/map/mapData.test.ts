import { describe, expect, it } from 'vitest';

import type { RankedPoi } from '../pois/poiRanker';
import type { Poi } from '../pois/types';
import { placesGeoJson, positionGeoJson, routeGeoJson } from './mapData';

const poi = (id: string, lat: number, lon: number) => ({ id, title: `Place ${id}`, lat, lon }) as Poi;
const ranked = (p: Poi): RankedPoi => ({ poi: p, distanceM: 10, ahead: true, score: 1 });

describe('map data', () => {
  it('marks discovered places and uses [lon, lat] order', () => {
    const places = placesGeoJson([ranked(poi('A', 48.1, 11.5)), ranked(poi('B', 48.2, 11.6))], ['B']);
    expect(places.features.map((f) => [f.properties?.id, f.properties?.told])).toEqual([
      ['A', false],
      ['B', true],
    ]);
    expect(places.features[0].geometry).toEqual({ type: 'Point', coordinates: [11.5, 48.1] });
  });

  it('draws the route from the walker through every stop', () => {
    const route = { stops: [poi('A', 48.1, 11.5), poi('B', 48.2, 11.6)], distanceM: 100, minutes: 2 };
    const line = routeGeoJson(route, { lat: 48, lon: 11.4 }).features[0].geometry;
    expect(line).toEqual({
      type: 'LineString',
      coordinates: [
        [11.4, 48],
        [11.5, 48.1],
        [11.6, 48.2],
      ],
    });
    expect(routeGeoJson(null, { lat: 48, lon: 11.4 }).features).toEqual([]);
  });

  it('shows the walker only once a position is known', () => {
    expect(positionGeoJson(null).features).toEqual([]);
    expect(positionGeoJson({ lat: 48, lon: 11 }).features).toHaveLength(1);
  });
});
