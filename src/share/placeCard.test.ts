import { describe, expect, it } from 'vitest';

import type { Poi } from '../pois/types';
import { placeCardText } from './placeCard';

const poi = {
  id: 'Q1',
  title: 'Frauenkirche',
  url: 'https://en.wikipedia.org/wiki/Frauenkirche,_Munich',
  image: { url: 'https://upload.wikimedia.org/f.jpg', width: 500, height: 400 },
} as Poi;

describe('placeCardText', () => {
  it('includes the name, the story, the photo and the article link', () => {
    const text = placeCardText(poi, 'Its towers are 99 m tall.');
    expect(text).toContain('📍 Frauenkirche');
    expect(text).toContain('Its towers are 99 m tall.');
    expect(text).toContain('https://upload.wikimedia.org/f.jpg');
    expect(text).toContain(poi.url);
  });

  it('cuts long stories at a sentence end', () => {
    const story = `${'A short sentence. '.repeat(40)}`;
    const shared = placeCardText({ ...poi, image: null }, story).split('\n\n')[1];
    expect(shared.length).toBeLessThanOrEqual(400);
    expect(shared.endsWith('.')).toBe(true);
  });
});
