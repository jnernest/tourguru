import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { distanceMeters } from '../geo/geo';
import type { Fix } from './fix';
import { interpolateRoute, MUNICH_OLD_TOWN, startSimulatedWalk } from './simulatedWalk';

const NORTH_100M = [
  { lat: 48, lon: 11 },
  { lat: 48 + 100 / 111_195, lon: 11 },
];

describe('interpolateRoute', () => {
  it('places points roughly every step along the route, ending at the last waypoint', () => {
    const fixes = interpolateRoute(NORTH_100M, 10);
    expect(fixes).toHaveLength(11);
    expect(distanceMeters(fixes[0], fixes[1])).toBeCloseTo(10, 0);
    expect(fixes.at(-1)).toMatchObject(NORTH_100M[1]);
  });

  it('heads in the direction of travel', () => {
    expect(interpolateRoute(NORTH_100M, 10).every((f) => f.heading !== null && f.heading < 1)).toBe(true);
  });

  it('builds a Munich route of a walkable length', () => {
    const fixes = interpolateRoute(MUNICH_OLD_TOWN, 10);
    const length = fixes.slice(1).reduce((sum, f, i) => sum + distanceMeters(fixes[i], f), 0);
    expect(length).toBeGreaterThan(1_000);
    expect(length).toBeLessThan(2_000);
  });
});

describe('startSimulatedWalk', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('emits one fix per tick and stands still while paused', () => {
    const received: Fix[] = [];
    let paused = false;
    const stop = startSimulatedWalk((f) => received.push(f), {
      route: NORTH_100M,
      isPaused: () => paused,
    });
    vi.advanceTimersByTime(3_000);
    expect(received).toHaveLength(3);
    paused = true;
    vi.advanceTimersByTime(5_000);
    expect(received).toHaveLength(3);
    stop();
  });

  it('reports when the route is finished', () => {
    const onFinished = vi.fn();
    startSimulatedWalk(() => undefined, { route: NORTH_100M, onFinished });
    vi.advanceTimersByTime(20_000);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });
});
