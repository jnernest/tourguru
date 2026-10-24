import { describe, expect, it } from 'vitest';

import { addPlace, addStep, startWalk, walkSummary, type DiaryPlace } from './diary';

const place = (id: string, narration: string): DiaryPlace => ({
  id,
  title: `Place ${id}`,
  at: 0,
  narration,
  imageUrl: null,
  url: `https://en.wikipedia.org/wiki/${id}`,
});

describe('walk diary', () => {
  it('adds up steps but ignores GPS jitter', () => {
    let walk = startWalk(0);
    walk = addStep(walk, null, { lat: 48.137, lon: 11.575 });
    walk = addStep(walk, { lat: 48.137, lon: 11.575 }, { lat: 48.13701, lon: 11.575 });
    expect(walk.distanceM).toBe(0);
    walk = addStep(walk, { lat: 48.137, lon: 11.575 }, { lat: 48.138, lon: 11.575 });
    expect(walk.distanceM).toBeGreaterThan(100);
  });

  it('keeps one entry per place and its latest story', () => {
    let walk = addPlace(startWalk(0), place('A', 'Short.'));
    walk = addPlace(walk, place('B', 'Other.'));
    walk = addPlace(walk, place('A', 'The longer story.'));
    expect(walk.places.map((p) => [p.id, p.narration])).toEqual([
      ['A', 'The longer story.'],
      ['B', 'Other.'],
    ]);
  });

  it('summarises places, distance and duration for sharing', () => {
    const walk = { ...addPlace(startWalk(0), place('A', 'First sentence. Second one.')), distanceM: 1500, endedAt: 1_800_000 };
    expect(walkSummary(walk)).toBe(
      '🚶 My TourGuide walk: 1 place · 1.5 km · 30 min\n1. Place A: First sentence.\n   https://en.wikipedia.org/wiki/A',
    );
  });
});
