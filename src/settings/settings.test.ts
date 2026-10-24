import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS, MAX_SPEECH_RATE, narrationKey, parseSettings } from './settings';

describe('parseSettings', () => {
  it('returns defaults for nothing stored or broken JSON', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{oops')).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid fields and replaces invalid ones with defaults', () => {
    const parsed = parseSettings(
      JSON.stringify({ interests: ['history', 'cooking', 'art'], tone: 'pirate', speechRate: 9, autoTalk: false, voiceId: 42 }),
    );
    expect(parsed).toEqual({
      ...DEFAULT_SETTINGS,
      interests: ['history', 'art'],
      speechRate: MAX_SPEECH_RATE,
      autoTalk: false,
    });
  });
});

describe('narrationKey', () => {
  it('changes with tone and interests but not with their order', () => {
    const a = narrationKey({ ...DEFAULT_SETTINGS, interests: ['art', 'history'] });
    expect(a).toBe(narrationKey({ ...DEFAULT_SETTINGS, interests: ['history', 'art'] }));
    expect(a).not.toBe(narrationKey({ ...DEFAULT_SETTINGS, interests: ['history', 'art'], tone: 'kids' }));
  });
});
