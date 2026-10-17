import { describe, expect, it } from 'vitest';

import { poiNorth } from '../testing/poiFactory';
import { buildNarrationPrompt, MAX_SOURCE_CHARS } from './prompts';

describe('buildNarrationPrompt', () => {
  const poi = poiNorth('1', 0, { title: 'Frauenkirche', summary: 'A church with two towers.' });

  it('puts the place, language and source text in the user turn', () => {
    const { user } = buildNarrationPrompt(poi, 'de');
    expect(user).toContain('Language: German');
    expect(user).toContain('Place: Frauenkirche');
    expect(user).toContain('<source>\nA church with two towers.\n</source>');
  });

  it('tells the model the source language so it can translate a local article', () => {
    const local = poiNorth('2', 0, { title: 'Schloss Schönbrunn', summary: 'Ein Schloss.', lang: 'de' });
    const { system, user } = buildNarrationPrompt(local, 'en');
    expect(user).toContain('Language: English');
    expect(user).toContain('Source language code: de');
    expect(system).toMatch(/source may be in a different language; translate/);
  });

  it('keeps the system prompt identical across places and languages', () => {
    const other = poiNorth('2', 0, { title: 'Isartor', summary: 'A gate.' });
    expect(buildNarrationPrompt(poi, 'en').system).toBe(buildNarrationPrompt(other, 'hi').system);
  });

  it('instructs the model to stay grounded in the source', () => {
    expect(buildNarrationPrompt(poi, 'en').system).toMatch(/only facts stated in the text inside <source>/);
  });

  it('caps the source length', () => {
    const long = poiNorth('3', 0, { summary: 'x'.repeat(MAX_SOURCE_CHARS + 500) });
    const { user } = buildNarrationPrompt(long, 'en');
    expect(user.match(/x+/)?.[0].length).toBe(MAX_SOURCE_CHARS);
  });
});
