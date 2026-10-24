import { ANTHROPIC_API_KEY, LLM_API_KEY, LLM_BASE_URL, LLM_MODEL } from '../config';
import { CLAUDE_MODEL, createClaudeComplete } from './claudeClient';
import type { CompleteFn } from './llmEngine';
import { createChatComplete, providerName } from './openAiCompatibleClient';

export interface AiProvider {
  label: string;
  complete: CompleteFn;
}

export function createAiProvider(): AiProvider | null {
  if (LLM_API_KEY) {
    const name = providerName(LLM_BASE_URL);
    return {
      label: `${name} (${LLM_MODEL})`,
      complete: createChatComplete({
        baseUrl: LLM_BASE_URL,
        model: LLM_MODEL,
        apiKey: LLM_API_KEY,
        // Only Gemini is known to accept this; other providers may reject unknown values.
        reasoningEffort: name === 'Gemini' ? 'minimal' : undefined,
      }),
    };
  }
  if (ANTHROPIC_API_KEY) {
    return { label: `Claude (${CLAUDE_MODEL})`, complete: createClaudeComplete(ANTHROPIC_API_KEY) };
  }
  return null;
}
