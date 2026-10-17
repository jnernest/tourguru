import { describe, expect, it } from 'vitest';

import { angleDifference, bearingDegrees, distanceMeters } from './geo';

const MARIENPLATZ = { lat: 48.1374, lon: 11.5755 };
const FRAUENKIRCHE = { lat: 48.1386, lon: 11.5736 };

describe('distanceMeters', () => {
  it('is zero for the same point', () => {
    expect(distanceMeters(MARIENPLATZ, MARIENPLATZ)).toBe(0);
  });

  it('measures Marienplatz → Frauenkirche at ~190 m', () => {
    expect(distanceMeters(MARIENPLATZ, FRAUENKIRCHE)).toBeGreaterThan(170);
    expect(distanceMeters(MARIENPLATZ, FRAUENKIRCHE)).toBeLessThan(210);
  });

  it('measures one degree of latitude at ~111 km', () => {
    expect(distanceMeters({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(111_195, -2);
  });
});

describe('bearingDegrees', () => {
  it.each([
    [{ lat: 1, lon: 0 }, 0],
    [{ lat: 0, lon: 1 }, 90],
    [{ lat: -1, lon: 0 }, 180],
    [{ lat: 0, lon: -1 }, 270],
  ])('points to %o at %d°', (to, expected) => {
    expect(bearingDegrees({ lat: 0, lon: 0 }, to)).toBeCloseTo(expected, 5);
  });
});

describe('angleDifference', () => {
  it.each([
    [10, 350, 20],
    [350, 10, 20],
    [0, 180, 180],
    [90, 90, 0],
    [720, 45, 45],
  ])('between %d and %d is %d', (a, b, expected) => {
    expect(angleDifference(a, b)).toBeCloseTo(expected, 10);
  });
});
