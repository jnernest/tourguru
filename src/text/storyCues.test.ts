import { describe, expect, it } from 'vitest';

import { highlight } from '../narration/summarizer';
import { storyBonus } from './storyCues';

describe('storyBonus', () => {
  it('rewards legends, records and anecdotes in several languages', () => {
    expect(storyBonus('According to legend, the devil left a footprint here.')).toBe(2);
    expect(storyBonus('Der Sage nach soll hier der Teufel gestanden haben.')).toBeGreaterThan(1);
    expect(storyBonus('Selon la légende, le roi y dormit.')).toBeGreaterThan(1);
    expect(storyBonus('Es la iglesia más antigua de la ciudad.')).toBeGreaterThan(1);
  });

  it('leaves plain facts at 1', () => {
    expect(storyBonus('The building has three floors and a garden.')).toBe(1);
  });

  it('matches cues only at the start of a word', () => {
    expect(storyBonus('A narrow passage leads to the courtyard.')).toBe(1); // not German "Sage"
  });
});

describe('highlight prefers stories', () => {
  it('picks the legend over an equally long factual sentence', () => {
    const article = [
      'The Frauenkirche is a church in Munich.',
      'The church was renovated between 1989 and 1994 with funds from the city of Munich.',
      'According to legend, the devil stamped his foot in the church entrance, leaving a footprint.',
    ].join(' ');
    expect(highlight(article, 'Frauenkirche')).toMatch(/^According to legend/);
  });
});
