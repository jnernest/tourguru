import { describe, expect, it } from 'vitest';

import { ORIGIN, poiNorth } from '../testing/poiFactory';
import { rankPois } from './poiRanker';

const standing = { ...ORIGIN, heading: null };
const walkingNorth = { ...ORIGIN, heading: 0 };

describe('rankPois', () => {
  it('ranks closer places higher when everything else is equal', () => {
    const ranked = rankPois([poiNorth('far', 300), poiNorth('near', 50)], standing, 500);
    expect(ranked.map((r) => r.poi.id)).toEqual(['near', 'far']);
    expect(ranked[0].distanceM).toBeCloseTo(50, 0);
  });

  it('excludes places outside the radius', () => {
    expect(rankPois([poiNorth('out', 600)], standing, 500)).toEqual([]);
  });

  it('marks places in the walking direction as ahead and prefers them', () => {
    const ranked = rankPois([poiNorth('behind', -100), poiNorth('ahead', 100)], walkingNorth, 500);
    expect(ranked.map((r) => [r.poi.id, r.ahead])).toEqual([
      ['ahead', true],
      ['behind', false],
    ]);
  });

  it('never marks anything ahead when heading is unknown', () => {
    expect(rankPois([poiNorth('a', 100)], standing, 500)[0].ahead).toBe(false);
  });

  it('lets a much richer article outrank a slightly closer stub', () => {
    const stub = poiNorth('stub', 80, { articleLength: 300 });
    const rich = poiNorth('rich', 100, { articleLength: 90_000 });
    expect(rankPois([stub, rich], standing, 500)[0].poi.id).toBe('rich');
  });
});
