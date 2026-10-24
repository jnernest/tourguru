import { describe, expect, it } from 'vitest';

import { interestBonus } from '../text/interestCues';
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
