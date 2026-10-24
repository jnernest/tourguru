import { describe, expect, it, vi } from 'vitest';

import { poiNorth } from '../testing/poiFactory';
import type { Translator } from '../translate/types';
import { ExtractiveEngine } from './extractiveEngine';
import { FallbackEngine } from './fallbackEngine';
import { LlmEngine, type CompleteFn } from './llmEngine';
import { buildNarrationPrompt } from './prompts';

const ARTICLE =
  'The Old Tower is a medieval gate in the town centre. It was built in 1340 by the city council. ' +
  'During the war of 1632 Swedish troops damaged the tower badly. Today it houses a small museum of clocks.';
const tower = poiNorth('1', 0, { title: 'Old Tower', summary: ARTICLE });

describe('answer mode', () => {
  it('puts the question in its own block and asks for an answer', () => {
    const { user } = buildNarrationPrompt(tower, 'en', undefined, 'Who built it?');
    expect(user).toContain('Mode: answer');
    expect(user).toContain('<question>\nWho built it?\n</question>');
    expect(user).toContain(ARTICLE);
  });

  it('caps very long questions', () => {
    const { user } = buildNarrationPrompt(tower, 'en', undefined, 'why '.repeat(200));
    expect(user.match(/<question>\n([^<]*)\n<\/question>/)?.[1].length).toBeLessThanOrEqual(300);
  });

  it('answers offline from the best-matching sentences', async () => {
    const answer = await new ExtractiveEngine().answer(tower, 'en', 'What happened in the war?');
    expect(answer).toBe('During the war of 1632 Swedish troops damaged the tower badly.');
  });

  it('matches a question in another language by translating it to the article language first', async () => {
    const translate = vi.fn<Translator['translate']>(async (text, from) =>
      from === 'de' ? 'What happened in the war?' : `[de] ${text}`,
    );
    const answer = await new ExtractiveEngine({ translator: { translate } }).answer(tower, 'de', 'Was geschah im Krieg?');
    expect(answer).toBe('[de] During the war of 1632 Swedish troops damaged the tower badly.');
  });

  it('admits when the article has no answer', async () => {
    expect(await new ExtractiveEngine().answer(tower, 'en', 'Is there parking?')).toBe(
      "I don't know the answer to that about Old Tower.",
    );
  });

  it('uses the AI answer, and the offline one when the AI fails', async () => {
    const complete = vi.fn<CompleteFn>(async () => 'The city council built it in 1340.');
    const ai = new FallbackEngine(new LlmEngine(complete), new ExtractiveEngine());
    expect(await ai.answer(tower, 'en', 'Who built it?')).toBe('The city council built it in 1340.');
    expect(complete.mock.calls[0][0].user).toContain('Mode: answer');

    const failing = new FallbackEngine(new LlmEngine(async () => Promise.reject(new Error('429'))), new ExtractiveEngine());
    expect(await failing.answer(tower, 'en', 'Who built the tower?')).toContain('built in 1340 by the city council');
  });
});
