import { describe, expect, it } from 'vitest';

import { openLabel, openState } from './openingHours';

// 2026-10-21 is a Wednesday.
const at = (day: number, time: string) => new Date(`2026-10-${String(day).padStart(2, '0')}T${time}:00`);

describe('openState', () => {
  it('handles weekday ranges and times', () => {
    const spec = 'Mo-Fr 09:00-18:00; Sa 10:00-14:00';
    expect(openState(spec, at(21, '10:00'))).toBe('open');
    expect(openState(spec, at(21, '18:00'))).toBe('closed');
    expect(openState(spec, at(24, '13:59'))).toBe('open');
    expect(openState(spec, at(25, '12:00'))).toBe('closed');
  });

  it('handles 24/7, off days, split hours and overnight ranges', () => {
    expect(openState('24/7', at(25, '03:00'))).toBe('open');
    expect(openState('Mo-Su 10:00-17:00; Tu off', at(20, '12:00'))).toBe('closed');
    expect(openState('Mo-Fr 08:00-12:00,14:00-18:00', at(21, '13:00'))).toBe('closed');
    expect(openState('Fr-Sa 20:00-02:00', at(24, '01:00'))).toBe('open');
    expect(openState('10:00-18:00', at(25, '11:00'))).toBe('open');
  });

  it('says unknown instead of guessing for forms it does not understand', () => {
    expect(openState('Mo-Fr 09:00-17:00; PH off', at(21, '10:00'))).toBe('unknown');
    expect(openState('sunrise-sunset', at(21, '10:00'))).toBe('unknown');
    expect(openState('by appointment', at(21, '10:00'))).toBe('unknown');
  });
});

describe('openLabel', () => {
  const wednesdayNoon = new Date(2026, 9, 21, 12, 0);
  it('says open or closed now, and nothing when unknown', () => {
    expect(openLabel('Mo-Fr 09:00-17:00', wednesdayNoon)).toBe('open now');
    expect(openLabel('Mo-Fr 13:00-17:00', wednesdayNoon)).toBe('closed now');
    expect(openLabel('Mo-Fr 09:00-17:00; PH off', wednesdayNoon)).toBeNull();
    expect(openLabel(null, wednesdayNoon)).toBeNull();
  });
});
