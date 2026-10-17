import { describe, expect, it } from 'vitest';

import { badgeEarned, discoveryLine, discoveryProgress } from './discovery';

describe('discovery', () => {
  it('reports the badge earned and what is needed for the next', () => {
    expect(discoveryProgress(0)).toEqual({ badge: null, toNext: 1, nextBadge: 'First discovery' });
    expect(discoveryProgress(12)).toEqual({ badge: 'Explorer', toNext: 13, nextBadge: 'Pathfinder' });
    expect(discoveryProgress(150)).toEqual({ badge: 'Master guide', toNext: null, nextBadge: null });
  });

  it('detects a badge being crossed, and only then', () => {
    expect(badgeEarned(9, 10)).toBe('Explorer');
    expect(badgeEarned(10, 11)).toBeNull();
    expect(badgeEarned(0, 1)).toBe('First discovery');
  });

  it('summarises progress around the user and overall', () => {
    expect(discoveryLine(12, 5, 20)).toBe(
      'Discovered 5 of 20 places around you · 12 in total · 🏅 Explorer · 13 more for Pathfinder',
    );
    expect(discoveryLine(0, 0, 0)).toBe('0 in total · 1 more for First discovery');
  });
});
