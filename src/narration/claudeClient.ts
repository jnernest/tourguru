import Anthropic from '@anthropic-ai/sdk';

import type { CompleteFn } from './llmEngine';

export const CLAUDE_MODEL = 'claude-opus-5-5';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_TOKENS = 2_000;

// Personal use only: the API key is compiled into the bundle; move behind a backend before sharing.
export function createClaudeComplete(apiKey: string): CompleteFn {
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 0,
  });

  return async ({ system, user }) => {
    // Non-streaming: React Native's built-in fetch cannot stream response bodies.
    const response = await client.beta.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      output_config: { effort: 'low' },
      // If a safety classifier declines, the server retries on a suitable model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system,
      messages: [{ role: 'user', content: user }],
    });
    if (response.stop_reason !== 'end_turn') {
      throw new Error(`Claude stopped early (${response.stop_reason}).`);
    }
    const text = response.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim();
    if (text.length === 0) {
      throw new Error('Claude returned no narration.');
    }
    return text;
  };
}
