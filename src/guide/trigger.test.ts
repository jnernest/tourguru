import { describe, expect, it } from 'vitest';

import { rankPois } from '../pois/poiRanker';
import { ORIGIN, poiNorth } from '../testing/poiFactory';
import { selectCandidate, StabilityGate } from './trigger';

const never = () => false;

describe('selectCandidate', () => {
  it('picks a place within the near radius in any direction', () => {
    const ranked = rankPois([poiNorth('a', -50)], { ...ORIGIN, heading: 0 }, 500);
    expect(selectCandidate(ranked, never)?.poi.id).toBe('a');
  });

  it('picks a place up to the ahead radius only if it is ahead', () => {
    const pois = [poiNorth('ahead', 110), poiNorth('behind', -110)];
    const north = rankPois(pois, { ...ORIGIN, heading: 0 }, 500);
    const standing = rankPois(pois, { ...ORIGIN, heading: null }, 500);
    expect(selectCandidate(north, never)?.poi.id).toBe('ahead');
    expect(selectCandidate(standing, never)).toBeNull();
  });

  it('reaches up to 200 m when standing still, e.g. sitting outside a palace', () => {
    const palace = [poiNorth('palace', 135)];
    const still = rankPois(palace, { ...ORIGIN, heading: null }, 500);
    expect(selectCandidate(still, never, true)?.poi.id).toBe('palace');
    expect(selectCandidate(still, never, false)).toBeNull();
    const tooFar = rankPois([poiNorth('far', 250)], { ...ORIGIN, heading: null }, 500);
    expect(selectCandidate(tooFar, never, true)).toBeNull();
  });

  it('skips places already told', () => {
    const ranked = rankPois([poiNorth('a', 10), poiNorth('b', 20)], { ...ORIGIN, heading: null }, 500);
    expect(selectCandidate(ranked, (id) => id === 'a')?.poi.id).toBe('b');
  });
});

describe('StabilityGate', () => {
  it('accepts only after N consecutive identical candidates', () => {
    const gate = new StabilityGate(2);
    expect(gate.accept('a')).toBe(false);
    expect(gate.accept('a')).toBe(true);
    expect(gate.accept('a')).toBe(true);
  });

  it('restarts counting when the candidate changes or disappears', () => {
    const gate = new StabilityGate(2);
    gate.accept('a');
    expect(gate.accept('b')).toBe(false);
    expect(gate.accept(null)).toBe(false);
    expect(gate.accept('b')).toBe(false);
    expect(gate.accept('b')).toBe(true);
  });

  it('forgets history on reset', () => {
    const gate = new StabilityGate(2);
    gate.accept('a');
    gate.reset();
    expect(gate.accept('a')).toBe(false);
  });
});
