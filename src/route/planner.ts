import { distanceMeters, type LatLon } from '../geo/geo';
import type { RankedPoi } from '../pois/poiRanker';
import type { Poi } from '../pois/types';

export interface RoutePlan {
  /** Stops in walking order. */
  stops: Poi[];
  /** Estimated walking distance (straight lines × street detour factor). */
  distanceM: number;
  /** Walking time plus a short look at each stop. */
  minutes: number;
}

export const MAX_STOPS = 8;
export const MIN_STOPS = 3;
/** Streets are not straight lines; ~1.3 is the usual urban detour ratio. */
const DETOUR_FACTOR = 1.3;
const WALKING_SPEED_MPS = 1.3;
const MINUTES_PER_STOP = 3;

/**
 * Stations and stops have Wikipedia articles and coordinates but are not sights. Matched on
 * the title, in the supported languages ("Bahnhof" also inside "Hauptbahnhof").
 */
const TRANSPORT_STOP = /\b(?:station|metro|subway|tram stop|bus stop|haltestelle|gare|estación|stazione)\b|bahnhof|u-bahn|s-bahn/i;

export function isTransportStop(title: string): boolean {
  return TRANSPORT_STOP.test(title);
}

const legLength = (a: LatLon, b: LatLon): number => distanceMeters(a, b);

function pathLength(start: LatLon, stops: LatLon[]): number {
  return stops.reduce((sum, stop, i) => sum + legLength(i === 0 ? start : stops[i - 1], stop), 0);
}

/** Greedy order: always walk to the closest stop not yet visited. */
function nearestNeighbour<T extends LatLon>(start: LatLon, stops: T[]): T[] {
  const remaining = [...stops];
  const ordered: T[] = [];
  let here = start;
  while (remaining.length > 0) {
    let best = 0;
    remaining.forEach((s, i) => {
      if (legLength(here, s) < legLength(here, remaining[best])) best = i;
    });
    const next = remaining.splice(best, 1)[0];
    ordered.push(next);
    here = next;
  }
  return ordered;
}

/** 2-opt on an open path with a fixed start: reverse segments while that shortens the walk. */
function twoOpt<T extends LatLon>(start: LatLon, stops: T[]): T[] {
  let route = [...stops];
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let j = i + 1; j < route.length; j++) {
        const candidate = [...route.slice(0, i), ...route.slice(i, j + 1).reverse(), ...route.slice(j + 1)];
        if (pathLength(start, candidate) + 1e-6 < pathLength(start, route)) {
          route = candidate;
          improved = true;
        }
      }
    }
  }
  return route;
}

/**
 * A short walk past the best places around `start` that the user has not heard yet. Picks
 * the highest-ranked places and orders them into an efficient path. Null if there are too
 * few places for a walk.
 */
export function planRoute(start: LatLon, ranked: RankedPoi[], isTold: (id: string) => boolean): RoutePlan | null {
  // A walk is chosen for its sights, not their closeness: prefer the best-documented places
  // anywhere in range (stable sort keeps the ranking order among equals).
  const picked = ranked
    .map((r) => r.poi)
    .filter((poi) => !isTold(poi.id) && !isTransportStop(poi.title))
    .sort((a, b) => b.articleLength - a.articleLength)
    .slice(0, MAX_STOPS);
  if (picked.length < MIN_STOPS) {
    return null;
  }
  const stops = twoOpt(start, nearestNeighbour(start, picked));
  const distanceM = pathLength(start, stops) * DETOUR_FACTOR;
  const minutes = Math.round(distanceM / WALKING_SPEED_MPS / 60 + stops.length * MINUTES_PER_STOP);
  return { stops, distanceM, minutes };
}

/** Google Maps allows up to 9 waypoints in a walking-directions link on mobile. */
const MAX_LINK_WAYPOINTS = 9;
const coords = (p: LatLon): string => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;

/**
 * Turn-by-turn walking directions for the remaining stops, opened in Google Maps (app or web).
 * https://developers.google.com/maps/documentation/urls/get-started#directions-action
 */
export function googleMapsWalkUrl(start: LatLon, stops: LatLon[]): string {
  const waypoints = stops.slice(0, -1).slice(0, MAX_LINK_WAYPOINTS).map(coords).join('|');
  const destination = stops[stops.length - 1];
  const params = [
    'api=1',
    `origin=${coords(start)}`,
    `destination=${coords(destination)}`,
    'travelmode=walking',
    ...(waypoints ? [`waypoints=${encodeURIComponent(waypoints)}`] : []),
  ];
  return `https://www.google.com/maps/dir/?${params.join('&')}`;
}

/**
 * Walking directions to one place. Without an origin, Google Maps starts from the phone's
 * live location, which is more accurate than our last fix.
 */
export function googleMapsWalkToUrl(destination: LatLon): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${coords(destination)}&travelmode=walking`;
}

/** The first stop not told yet: where the walk goes next. */
export function nextStop(plan: RoutePlan, isTold: (id: string) => boolean): Poi | null {
  return plan.stops.find((s) => !isTold(s.id)) ?? null;
}
