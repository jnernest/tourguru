import { describe, expect, it } from 'vitest';

import { interestBonus } from '../text/interestCues';
import { addPlace, addStep, startWalk, walkSummary } from '../walk/diary';
import { answerFromArticle } from './answer';

const ARTICLE = `The Frauenkirche is a church in Munich.
== History ==
The towers were designed by the architect Jörg von Halsbach and completed in 1488.
The church was badly damaged by bombs during the Second World War and restored afterwards.
The organ was rebuilt in 1994 with almost seven thousand pipes.
`;

describe('answerFromArticle', () => {
  it('finds the sentence that answers the question', () => {
    expect(answerFromArticle('Who designed the towers?', ARTICLE)).toMatch(/Jörg von Halsbach/);
    expect(answerFromArticle('What happened in the war?', ARTICLE)).toMatch(/Second World War/);
  });

  it('returns nothing when the article does not cover it', () => {
    expect(answerFromArticle('How much is the ticket?', ARTICLE)).toBe('');
    expect(answerFromArticle('', ARTICLE)).toBe('');
  });
});

describe('interestBonus', () => {
  it('rewards sentences about the listener interests only', () => {
    const sentence = 'The towers were designed by the architect Jörg von Halsbach.';
    expect(interestBonus(sentence, [])).toBe(1);
    expect(interestBonus(sentence, ['architecture'])).toBeGreaterThan(1);
    expect(interestBonus(sentence, ['nature'])).toBe(1);
  });
});

describe('walk diary', () => {
  it('adds real steps, ignores jitter, and keeps places once', () => {
    const a = { lat: 48, lon: 11 };
    const b = { lat: 48.001, lon: 11 };
    let walk = addStep(addStep(startWalk(0), null, a), a, b);
    walk = addStep(walk, b, { lat: 48.00102, lon: 11 });
    expect(walk.distanceM).toBeCloseTo(111, 0);
    const place = { id: 'Q1', title: 'Karlstor', at: 1, narration: 'A gate. More text.', imageUrl: null, url: 'https://x' };
    walk = addPlace(addPlace(walk, place), place);
    expect(walk.places).toHaveLength(1);
    expect(walkSummary({ ...walk, endedAt: 30 * 60_000 })).toBe(
      '🚶 My TourGuide walk: 1 places · 111 m · 30 min\n1. Karlstor: A gate.\n   https://x',
    );
  });
});
