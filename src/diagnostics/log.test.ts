import { beforeEach, describe, expect, it } from 'vitest';

import { clearLog, errorText, formatLog, log, roundedCoords } from './log';

describe('diagnostic log', () => {
  beforeEach(clearLog);

  it('formats entries under a header with ISO timestamps and levels', () => {
    log('info', 'App started', Date.UTC(2026, 9, 17, 18, 0, 0));
    log('error', 'Translation failed', Date.UTC(2026, 9, 17, 18, 0, 5));
    expect(formatLog('HEADER')).toBe(
      'HEADER\n2026-10-17T18:00:00.000Z INFO App started\n2026-10-17T18:00:05.000Z ERROR Translation failed',
    );
  });

  it('keeps only the most recent 300 entries', () => {
    for (let i = 0; i < 310; i++) log('info', `entry ${i}`);
    const lines = formatLog('H').split('\n');
    expect(lines).toHaveLength(301);
    expect(lines[1]).toContain('entry 10');
  });

  it('includes native error codes, which identify the failing call', () => {
    const native = Object.assign(new Error('Failed to download model'), { code: 'E_TRANSLATE' });
    expect(errorText(native)).toBe('E_TRANSLATE: Failed to download model');
    expect(errorText('plain')).toBe('plain');
  });

  it('rounds coordinates to about 100 m', () => {
    expect(roundedCoords(48.185621, 16.312634)).toBe('48.186,16.313');
  });
});
