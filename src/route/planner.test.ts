import { describe, expect, it } from 'vitest';

import { rankPois } from '../pois/poiRanker';
import { ORIGIN, poiNorth } from '../testing/poiFactory';
import { googleMapsWalkUrl, MAX_STOPS, nextStop, planRoute } from './planner';

const never = () => false;
const here = { ...ORIGIN, heading: null };

describe('planRoute', () => {
  it('orders stops so the walk does not zig-zag', () => {
    // Ranked best-first by article size, deliberately not in walking order.
    const pois = [
      poiNorth('c', 300, { articleLength: 90_000 }),
      poiNorth('a', 100, { articleLength: 80_000 }),
      poiNorth('d', 400, { articleLength: 70_000 }),
      poiNorth('b', 200, { articleLength: 60_000 }),
    ];
    const plan = planRoute(ORIGIN, rankPois(pois, here, 500), never);
    expect(plan?.stops.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('estimates distance with a street detour factor, and time including stops', () => {
    const pois = [poiNorth('a', 100), poiNorth('b', 200), poiNorth('c', 300)];
    const plan = planRoute(ORIGIN, rankPois(pois, here, 500), never);
    expect(plan?.distanceM).toBeCloseTo(390, -1); // 300 m in a straight line × 1.3
    expect(plan?.minutes).toBe(Math.round(390 / 1.3 / 60 + 3 * 3));
  });

  it('leaves out places already heard and caps the number of stops', () => {
    const pois = Array.from({ length: 12 }, (_, i) => poiNorth(`p${i}`, 30 * (i + 1)));
    const plan = planRoute(ORIGIN, rankPois(pois, here, 500), (id) => id === 'p0');
    expect(plan?.stops).toHaveLength(MAX_STOPS);
    expect(plan?.stops.some((s) => s.id === 'p0')).toBe(false);
  });

  it('prefers sights over the closest places, and skips stations', () => {
    const pois = [
      poiNorth('station', 20, { title: 'Munich Karlsplatz station', articleLength: 50_000 }),
      poiNorth('ubahn', 30, { title: 'Bahnhof München Marienplatz', articleLength: 40_000 }),
      poiNorth('stub', 40, { title: 'Small fountain', articleLength: 800 }),
      poiNorth('church', 400, { title: 'Frauenkirche', articleLength: 24_000 }),
      poiNorth('hall', 300, { title: 'New Town Hall', articleLength: 45_000 }),
      poiNorth('gate', 200, { title: 'Karlstor', articleLength: 9_000 }),
    ];
    const plan = planRoute(ORIGIN, rankPois(pois, here, 500), never);
    const ids = plan?.stops.map((s) => s.id) ?? [];
    expect(ids).not.toContain('station');
    expect(ids).not.toContain('ubahn');
    expect(ids).toEqual(expect.arrayContaining(['church', 'hall', 'gate']));
  });

  it('returns null when there is not enough for a walk', () => {
    expect(planRoute(ORIGIN, rankPois([poiNorth('a', 50), poiNorth('b', 80)], here, 500), never)).toBeNull();
  });

  it('finds the next stop as the first one not heard yet', () => {
    const plan = planRoute(ORIGIN, rankPois([poiNorth('a', 100), poiNorth('b', 200), poiNorth('c', 300)], here, 500), never);
    expect(plan && nextStop(plan, (id) => id === 'a')?.id).toBe('b');
    expect(plan && nextStop(plan, () => true)).toBeNull();
  });
});

describe('googleMapsWalkUrl', () => {
  it('builds walking directions through all stops', () => {
    const url = googleMapsWalkUrl({ lat: 48, lon: 11 }, [
      { lat: 48.001, lon: 11 },
      { lat: 48.002, lon: 11 },
      { lat: 48.003, lon: 11 },
    ]);
    expect(url).toBe(
      'https://www.google.com/maps/dir/?api=1&origin=48.000000,11.000000&destination=48.003000,11.000000&travelmode=walking&waypoints=48.001000%2C11.000000%7C48.002000%2C11.000000',
    );
  });

  it('omits waypoints for a single stop', () => {
    expect(googleMapsWalkUrl({ lat: 48, lon: 11 }, [{ lat: 48.001, lon: 11 }])).not.toContain('waypoints');
  });
});
