import type { LatLon } from '../geo/geo';
import type { RankedPoi } from '../pois/poiRanker';
import type { RoutePlan } from '../route/planner';

export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

export function placesGeoJson(nearby: RankedPoi[], discoveredIds: readonly string[]): GeoJSON.FeatureCollection {
  const told = new Set(discoveredIds);
  return {
    type: 'FeatureCollection',
    features: nearby.map(({ poi }) => ({
      type: 'Feature',
      id: poi.id,
      properties: { id: poi.id, title: poi.title, told: told.has(poi.id) },
      geometry: { type: 'Point', coordinates: [poi.lon, poi.lat] },
    })),
  };
}

export function routeGeoJson(route: RoutePlan | null, start: LatLon | null): GeoJSON.FeatureCollection {
  const points = [...(start ? [start] : []), ...(route?.stops ?? [])];
  return {
    type: 'FeatureCollection',
    features:
      route && points.length >= 2
        ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points.map((p) => [p.lon, p.lat]) } }]
        : [],
  };
}

export function positionGeoJson(position: LatLon | null): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: position
      ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [position.lon, position.lat] } }]
      : [],
  };
}
