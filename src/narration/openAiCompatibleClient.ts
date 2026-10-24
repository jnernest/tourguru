import type { CompleteFn } from './llmEngine';

export interface LlmConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
}

const REQUEST_TIMEOUT_MS = 12_000;
const MAX_TOKENS = 1_024;

interface ChatResponse {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  error?: { message?: string; status?: string };
}

export function providerName(baseUrl: string): string {
  const host = /^https:\/\/([^/]+)/.exec(baseUrl)?.[1] ?? baseUrl;
  if (host.includes('generativelanguage.googleapis.com')) return 'Gemini';
  if (host.includes('groq.com')) return 'Groq';
  if (host.includes('openrouter.ai')) return 'OpenRouter';
  if (host.includes('mistral.ai')) return 'Mistral';
  return host;
}

export function chatCompletionsUrl(baseUrl: string): string {
  if (!/^https:\/\//.test(baseUrl)) {
    throw new Error('LLM base URL must use https');
  }
  return `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
}

async function errorFor(res: { status: number; json(): Promise<unknown> }): Promise<Error> {
  const body = (await res.json().catch(() => ({}))) as ChatResponse;
  const detail = body.error?.message ?? body.error?.status ?? '';
  if (res.status === 429) {
    return new Error(`free AI limit reached for now (HTTP 429)${detail ? `: ${detail}` : ''}`);
  }
  return new Error(`AI request failed (HTTP ${res.status})${detail ? `: ${detail}` : ''}`);
}

// Personal use only: the API key is compiled into the bundle; move behind a backend before sharing.
export type ChatFetch = (url: string, init: RequestInit) => Promise<Response>;

export function createChatComplete(config: LlmConfig, fetchFn: ChatFetch = fetch): CompleteFn {
  const url = chatCompletionsUrl(config.baseUrl);
  return async ({ system, user }) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          model: config.model,
          max_tokens: MAX_TOKENS,
          ...(config.reasoningEffort ? { reasoning_effort: config.reasoningEffort } : {}),
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw await errorFor(res);
      const choice = ((await res.json()) as ChatResponse).choices?.[0];
      const text = choice?.message?.content?.trim() ?? '';
      if (text.length === 0) throw new Error(`AI returned no narration (${choice?.finish_reason ?? 'no choice'})`);
      return text;
    } catch (e) {
      if (controller.signal.aborted) throw new Error(`AI did not answer within ${REQUEST_TIMEOUT_MS / 1000} s`);
      throw e;
    } finally {
      clearTimeout(timer);
    }
  };
}
