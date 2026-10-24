import { angleDifference, bearingDegrees, distanceMeters, type LatLon } from '../geo/geo';
import type { Poi } from './types';

export interface Position extends LatLon {
  heading: number | null;
}

export interface RankedPoi {
  poi: Poi;
  distanceM: number;
  ahead: boolean;
  score: number;
}

const AHEAD_CONE_DEG = 45;
const PROXIMITY_WEIGHT = 0.6;
const RICHNESS_WEIGHT = 0.25;
const AHEAD_WEIGHT = 0.15;
const RICHNESS_LOG_CAP = 5;

function richness(articleLength: number): number {
  return Math.min(Math.log10(Math.max(articleLength, 1)) / RICHNESS_LOG_CAP, 1);
}

function isAhead(position: Position, poi: Poi): boolean {
  if (position.heading === null) {
    return false;
  }
  return angleDifference(bearingDegrees(position, poi), position.heading) <= AHEAD_CONE_DEG;
}

export function rankPois(pois: Poi[], position: Position, radiusM: number): RankedPoi[] {
  return pois
    .map((poi) => {
      const distanceM = distanceMeters(position, poi);
      const ahead = isAhead(position, poi);
      const proximity = Math.max(0, 1 - distanceM / radiusM);
      const score =
        proximity * PROXIMITY_WEIGHT +
        richness(poi.articleLength) * RICHNESS_WEIGHT +
        (ahead ? AHEAD_WEIGHT : 0);
      return { poi, distanceM, ahead, score };
    })
    .filter((r) => r.distanceM <= radiusM)
    .sort((a, b) => b.score - a.score);
}
