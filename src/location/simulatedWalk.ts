import { bearingDegrees, distanceMeters, type LatLon } from '../geo/geo';
import type { Fix } from './fix';

export const MUNICH_OLD_TOWN: LatLon[] = [
  { lat: 48.13913, lon: 11.56636 }, // Karlstor
  { lat: 48.13885, lon: 11.57062 }, // St. Michael
  { lat: 48.13834, lon: 11.57301 }, // Frauenkirche (south side)
  { lat: 48.13739, lon: 11.57549 }, // Marienplatz
  { lat: 48.13716, lon: 11.57707 }, // Old Town Hall
  { lat: 48.13647, lon: 11.57582 }, // St. Peter
  { lat: 48.13512, lon: 11.57637 }, // Viktualienmarkt
];

const SIMULATED_ACCURACY_M = 5;

export function interpolateRoute(waypoints: LatLon[], stepM: number): Fix[] {
  const fixes: Fix[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    const steps = Math.max(1, Math.round(distanceMeters(from, to) / stepM));
    const heading = bearingDegrees(from, to);
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      fixes.push({
        lat: from.lat + (to.lat - from.lat) * t,
        lon: from.lon + (to.lon - from.lon) * t,
        heading,
        accuracyM: SIMULATED_ACCURACY_M,
        timestamp: 0,
      });
    }
  }
  const last = waypoints[waypoints.length - 1];
  if (last) {
    fixes.push({ ...last, heading: fixes.at(-1)?.heading ?? null, accuracyM: SIMULATED_ACCURACY_M, timestamp: 0 });
  }
  return fixes;
}

export interface SimulatedWalkOptions {
  route?: LatLon[];
  stepM?: number;
  tickMs?: number;
  isPaused?: () => boolean;
  onFinished?: () => void;
}

export function startSimulatedWalk(onFix: (fix: Fix) => void, options: SimulatedWalkOptions = {}): () => void {
  const { route = MUNICH_OLD_TOWN, stepM = 10, tickMs = 1_000, isPaused = () => false, onFinished } = options;
  const fixes = interpolateRoute(route, stepM);
  let index = 0;
  const timer = setInterval(() => {
    if (isPaused()) return;
    if (index >= fixes.length) {
      clearInterval(timer);
      onFinished?.();
      return;
    }
    onFix({ ...fixes[index], timestamp: Date.now() });
    index += 1;
  }, tickMs);
  return () => clearInterval(timer);
}
