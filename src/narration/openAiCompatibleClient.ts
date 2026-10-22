import type { CompleteFn } from './llmEngine';

/**
 * Any provider with an OpenAI-compatible Chat Completions endpoint: Google Gemini (free tier),
 * Groq, OpenRouter, Mistral, a local Ollama, …
 */
export interface LlmConfig {
  /** e.g. https://generativelanguage.googleapis.com/v1beta/openai/ */
  baseUrl: string;
  model: string;
  apiKey: string;
  /** Lower = faster. Gemini 3 cannot turn thinking off; "minimal" is the lowest it accepts. */
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
}

/** A walker has moved on after ~12 s; better to fall back than to keep waiting. */
const REQUEST_TIMEOUT_MS = 12_000;
/** A ~90-word narration plus a little reasoning. */
const MAX_TOKENS = 1_024;

interface ChatResponse {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  error?: { message?: string; status?: string };
}

/** "Gemini", "Groq", … from the endpoint, for the footer and the diagnostic log. */
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

/**
 * PERSONAL USE ONLY: the API key is compiled into the app bundle. Before sharing the app,
 * move this call behind a backend.
 */
export function createChatComplete(config: LlmConfig, fetchFn: typeof fetch = fetch): CompleteFn {
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
