import { describe, expect, it } from 'vitest';

import { builtYearQuiz, parseQuizJson } from './quiz';

describe('builtYearQuiz', () => {
  it('asks in the chosen language with the right answer among three options', () => {
    const quiz = builtYearQuiz('de', 'Karlstor', 1302, 'Q1');
    expect(quiz.question).toBe('Quiz: Wann wurde Karlstor erbaut?');
    expect(quiz.options).toHaveLength(3);
    expect(new Set(quiz.options).size).toBe(3);
    expect(quiz.options[quiz.answerIndex]).toBe('1302');
  });

  it('is stable per place and varies between places', () => {
    expect(builtYearQuiz('en', 'X', 1500, 'Q1')).toEqual(builtYearQuiz('en', 'X', 1500, 'Q1'));
    const variants = new Set(['Q1', 'Q2', 'Q3', 'Q4', 'Q5'].map((id) => builtYearQuiz('en', 'X', 1500, id).options.join()));
    expect(variants.size).toBeGreaterThan(1);
  });
});

describe('parseQuizJson', () => {
  it('accepts a well-formed AI answer, also inside a code fence', () => {
    const json = '```json\n{"question":"Who designed it?","options":["A","B","C"],"answerIndex":1}\n```';
    expect(parseQuizJson(json)).toEqual({ question: 'Who designed it?', options: ['A', 'B', 'C'], answerIndex: 1 });
  });

  it('rejects anything malformed', () => {
    expect(parseQuizJson('not json')).toBeNull();
    expect(parseQuizJson('{"question":"Q","options":["A","B"],"answerIndex":0}')).toBeNull();
    expect(parseQuizJson('{"question":"Q","options":["A","B","C"],"answerIndex":3}')).toBeNull();
  });
});
