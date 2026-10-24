import { describe, expect, it, vi } from 'vitest';

import type { CompleteFn } from '../narration/llmEngine';
import { poiNorth } from '../testing/poiFactory';
import { buildQuizPrompt, createQuizMaker, scoreAnswer } from './quizMaker';

const poi = poiNorth('Q1', 0, { title: 'Karlstor' });
const describe_ = async () => ({ label: 'Karlstor', description: 'gate', facts: [], builtYear: 1302 });

describe('createQuizMaker', () => {
  it('uses the AI quiz when it returns valid JSON', async () => {
    const complete = vi.fn<CompleteFn>(async () => '{"question":"Who rebuilt it?","options":["A","B","C"],"answerIndex":2}');
    const make = createQuizMaker({ complete, aiEnabled: () => true, loadText: async () => 'Article.', describe: describe_ });
    expect(await make(poi, 'en')).toEqual({ question: 'Who rebuilt it?', options: ['A', 'B', 'C'], answerIndex: 2 });
  });

  it('falls back to the offline build-year question on bad AI output, AI off, or no AI', async () => {
    const bad = vi.fn<CompleteFn>(async () => 'Sure! Here is a quiz…');
    for (const deps of [
      { complete: bad, aiEnabled: () => true },
      { complete: bad, aiEnabled: () => false },
      { complete: null, aiEnabled: () => true },
    ]) {
      const quiz = await createQuizMaker({ ...deps, loadText: async () => 'Article.', describe: describe_ })(poi, 'en');
      expect(quiz?.question).toBe('Quiz: when was Karlstor built?');
      expect(quiz?.options[quiz.answerIndex]).toBe('1302');
    }
  });

  it('returns null when there is nothing to ask', async () => {
    const make = createQuizMaker({ complete: null, aiEnabled: () => false, loadText: async () => '', describe: async () => null });
    expect(await make(poi, 'en')).toBeNull();
  });
});

describe('quiz prompt and score', () => {
  it('asks for JSON in the chosen language', () => {
    const prompt = buildQuizPrompt(poi, 'de', 'Text.');
    expect(prompt.system).toMatch(/JSON only/);
    expect(prompt.user).toMatch(/^Language: German\nPlace: Karlstor/);
  });

  it('counts answers', () => {
    expect(scoreAnswer(scoreAnswer({ answered: 0, correct: 0 }, true), false)).toEqual({ answered: 2, correct: 1 });
  });
});
