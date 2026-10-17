import { describe, expect, it } from 'vitest';

import { toFix } from './fix';

const coords = { latitude: 48, longitude: 11, accuracy: 8, heading: 90, speed: 1.4 };

describe('toFix', () => {
  it('keeps heading while walking', () => {
    expect(toFix(coords, 123)).toEqual({
      lat: 48,
      lon: 11,
      accuracyM: 8,
      heading: 90,
      timestamp: 123,
    });
  });

  it.each([
    ['standing still', { speed: 0.1 }],
    ['speed unknown', { speed: null }],
    ['heading unknown', { heading: null }],
    ['heading invalid (-1 on iOS)', { heading: -1 }],
  ])('drops heading when %s', (_label, patch) => {
    expect(toFix({ ...coords, ...patch }, 0).heading).toBeNull();
  });
});
