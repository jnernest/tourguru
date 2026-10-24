import { SYSTEM_PROMPT, type NarrationPrompt } from '../narration/prompts';
import { QUIZ_SYSTEM } from '../quiz/quizMaker';

export const MAX_BODY_CHARS = 16_000;
const MAX_USER_CHARS = 12_000;
const ALLOWED_SYSTEMS = new Set([SYSTEM_PROMPT, QUIZ_SYSTEM]);

// Only TourGuide's own prompts are relayed, so the endpoint is useless as a general-purpose LLM.
export function parseProxyRequest(raw: string): NarrationPrompt | null {
  if (raw.length > MAX_BODY_CHARS) return null;
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return null;
  }
  const { system, user } = (body ?? {}) as Record<string, unknown>;
  if (typeof system !== 'string' || typeof user !== 'string') return null;
  if (!ALLOWED_SYSTEMS.has(system) || user.length === 0 || user.length > MAX_USER_CHARS) return null;
  if (!/^(Mode|Language): /.test(user)) return null;
  return { system, user };
}

export function createRateLimiter(maxPerWindow: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (client: string, now: number): boolean => {
    const recent = (hits.get(client) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= maxPerWindow) {
      hits.set(client, recent);
      return false;
    }
    recent.push(now);
    hits.set(client, recent);
    if (hits.size > 10_000) hits.clear();
    return true;
  };
}
