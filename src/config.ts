/**
 * Wikimedia requires a descriptive User-Agent with a way to contact the operator:
 * https://foundation.wikimedia.org/wiki/Policy:User-Agent_policy
 * Replace the contact with a real address before any public release.
 */
export const USER_AGENT = 'WalkGuide/0.1 (prototype; contact: walkguide@example.invalid)';

/**
 * Read from `.env.local` (gitignored) at bundle time. Empty = AI narration off, and the app
 * reads the Wikipedia summary as-is. Must be accessed as a literal `process.env.EXPO_PUBLIC_*`
 * expression for Expo to inline it.
 */
export const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

/**
 * Any OpenAI-compatible provider; defaults to Google Gemini's free tier. Takes precedence over
 * Claude when set. Change provider by setting the base URL and model too, e.g. Groq:
 * https://api.groq.com/openai/v1 with one of its model ids.
 */
export const LLM_API_KEY = process.env.EXPO_PUBLIC_LLM_API_KEY ?? '';
export const LLM_BASE_URL =
  process.env.EXPO_PUBLIC_LLM_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/';
/** Gemini's recommended fast model for new projects (https://ai.google.dev/gemini-api/docs/models). */
export const LLM_MODEL = process.env.EXPO_PUBLIC_LLM_MODEL || 'gemini-3.5-flash-lite';
