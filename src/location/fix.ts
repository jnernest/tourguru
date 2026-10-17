import type { Position } from '../pois/poiRanker';

export interface Fix extends Position {
  /** Horizontal accuracy radius in metres, or null when unknown. */
  accuracyM: number | null;
  timestamp: number;
}

interface RawCoords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
}

/** Below walking pace the GPS course is noise, so heading is dropped. */
const MIN_SPEED_FOR_HEADING_MPS = 0.5;

export function toFix(coords: RawCoords, timestamp: number): Fix {
  const moving = coords.speed !== null && coords.speed >= MIN_SPEED_FOR_HEADING_MPS;
  const validHeading = coords.heading !== null && coords.heading >= 0;
  return {
    lat: coords.latitude,
    lon: coords.longitude,
    accuracyM: coords.accuracy,
    heading: moving && validHeading ? coords.heading : null,
    timestamp,
  };
}
