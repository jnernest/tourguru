import { describe, expect, it, vi } from 'vitest';

import type { ChatFetch } from '../narration/openAiCompatibleClient';
import { buildNarrationPrompt, SYSTEM_PROMPT } from '../narration/prompts';
import { createProxyComplete } from '../narration/proxyClient';
import { buildQuizPrompt } from '../quiz/quizMaker';
import { poiNorth } from '../testing/poiFactory';
import { createRateLimiter, parseProxyRequest } from './proxyRequest';

const poi = poiNorth('1', 0, { title: 'Old Tower' });

describe('parseProxyRequest', () => {
  it('accepts the app narration and quiz prompts', () => {
    const narration = buildNarrationPrompt(poi, 'en');
    expect(parseProxyRequest(JSON.stringify(narration))).toEqual(narration);
    const quiz = buildQuizPrompt(poi, 'de', 'Ein alter Turm.');
    expect(parseProxyRequest(JSON.stringify(quiz))).toEqual(quiz);
  });

  it('rejects anything else', () => {
    expect(parseProxyRequest('not json')).toBeNull();
    expect(parseProxyRequest(JSON.stringify({ system: 'You are a helpful assistant.', user: 'Mode: brief' }))).toBeNull();
    expect(parseProxyRequest(JSON.stringify({ system: SYSTEM_PROMPT, user: 'Write me a poem' }))).toBeNull();
    expect(parseProxyRequest(JSON.stringify({ system: SYSTEM_PROMPT, user: `Mode: brief${'x'.repeat(20_000)}` }))).toBeNull();
    expect(parseProxyRequest(JSON.stringify({ system: SYSTEM_PROMPT }))).toBeNull();
    expect(parseProxyRequest('null')).toBeNull();
  });
});

describe('createRateLimiter', () => {
  it('allows a burst per client, then blocks until the window passes', () => {
    const allow = createRateLimiter(2, 60_000);
    expect([allow('a', 0), allow('a', 1), allow('a', 2), allow('b', 2)]).toEqual([true, true, false, true]);
    expect(allow('a', 60_001)).toBe(true);
  });
});

describe('createProxyComplete', () => {
  const respond = (status: number, body: unknown) =>
    vi.fn<ChatFetch>(async () => new Response(JSON.stringify(body), { status }));

  it('posts the prompt and returns the text', async () => {
    const fetchFn = respond(200, { text: 'On your right is the Old Tower.' });
    const prompt = buildNarrationPrompt(poi, 'en');
    await expect(createProxyComplete('https://tour-guide.expo.app/api/narrate', fetchFn)(prompt)).resolves.toBe(
      'On your right is the Old Tower.',
    );
    expect(JSON.parse(String(fetchFn.mock.calls[0][1].body))).toEqual(prompt);
  });

  it('reports the server error so the offline summary takes over', async () => {
    const complete = createProxyComplete('https://x.expo.app/api/narrate', respond(429, { error: 'free AI limit reached for now' }));
    await expect(complete({ system: 's', user: 'u' })).rejects.toThrow('free AI limit reached for now (HTTP 429)');
  });

  it('refuses a non-https proxy', () => {
    expect(() => createProxyComplete('http://x.expo.app/api/narrate')).toThrow('https');
  });
});
