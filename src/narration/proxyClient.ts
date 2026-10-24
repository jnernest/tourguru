import type { ChatFetch } from './openAiCompatibleClient';
import type { CompleteFn } from './llmEngine';

const REQUEST_TIMEOUT_MS = 15_000;

export function createProxyComplete(proxyUrl: string, fetchFn: ChatFetch = fetch): CompleteFn {
  if (!/^https:\/\//.test(proxyUrl)) throw new Error('AI proxy URL must use https');
  return async (prompt) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetchFn(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt),
        signal: controller.signal,
      });
      const body = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok) throw new Error(`${body.error ?? 'AI request failed'} (HTTP ${res.status})`);
      if (!body.text) throw new Error('AI returned no narration');
      return body.text;
    } catch (e) {
      if (controller.signal.aborted) throw new Error(`AI did not answer within ${REQUEST_TIMEOUT_MS / 1000} s`);
      throw e;
    } finally {
      clearTimeout(timer);
    }
  };
}
