import { describe, expect, it, vi } from 'vitest';

import { chatCompletionsUrl, createChatComplete, providerName, type ChatFetch } from './openAiCompatibleClient';

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const prompt = { system: 'You are a guide.', user: 'Place: Karlstor' };

function respond(status: number, body: unknown) {
  return vi.fn<ChatFetch>(async () => new Response(JSON.stringify(body), { status }));
}

describe('createChatComplete', () => {
  it('posts an OpenAI-style chat request and returns the answer', async () => {
    const fetchFn = respond(200, { choices: [{ message: { content: '  On your right is Karlstor.  ' } }] });
    const complete = createChatComplete({ baseUrl: GEMINI, model: 'gemini-3.5-flash-lite', apiKey: 'k', reasoningEffort: 'minimal' }, fetchFn);
    await expect(complete(prompt)).resolves.toBe('On your right is Karlstor.');

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer k');
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: 'gemini-3.5-flash-lite',
      reasoning_effort: 'minimal',
      messages: [
        { role: 'system', content: 'You are a guide.' },
        { role: 'user', content: 'Place: Karlstor' },
      ],
    });
  });

  it('omits reasoning_effort when not configured (other providers may reject it)', async () => {
    const fetchFn = respond(200, { choices: [{ message: { content: 'ok' } }] });
    await createChatComplete({ baseUrl: 'https://api.groq.com/openai/v1', model: 'm', apiKey: 'k' }, fetchFn)(prompt);
    expect(JSON.parse(String(fetchFn.mock.calls[0][1]?.body))).not.toHaveProperty('reasoning_effort');
  });

  it('explains a used-up free tier so the app can fall back and say why', async () => {
    const fetchFn = respond(429, { error: { status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded' } });
    await expect(createChatComplete({ baseUrl: GEMINI, model: 'm', apiKey: 'k' }, fetchFn)(prompt)).rejects.toThrow(
      'free AI limit reached for now (HTTP 429): Quota exceeded',
    );
  });

  it('reports other HTTP errors and empty answers', async () => {
    const badKey = respond(400, { error: { message: 'API key not valid' } });
    await expect(createChatComplete({ baseUrl: GEMINI, model: 'm', apiKey: 'k' }, badKey)(prompt)).rejects.toThrow(
      'AI request failed (HTTP 400): API key not valid',
    );
    const empty = respond(200, { choices: [{ message: { content: '' }, finish_reason: 'length' }] });
    await expect(createChatComplete({ baseUrl: GEMINI, model: 'm', apiKey: 'k' }, empty)(prompt)).rejects.toThrow(
      'AI returned no narration (length)',
    );
  });
});

describe('chatCompletionsUrl / providerName', () => {
  it('appends the path once and requires https', () => {
    expect(chatCompletionsUrl('https://api.groq.com/openai/v1')).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(() => chatCompletionsUrl('http://example.com')).toThrow('https');
  });

  it('names known providers for the footer', () => {
    expect(providerName(GEMINI)).toBe('Gemini');
    expect(providerName('https://api.groq.com/openai/v1')).toBe('Groq');
    expect(providerName('https://llm.example.org/v1')).toBe('llm.example.org');
  });
});
