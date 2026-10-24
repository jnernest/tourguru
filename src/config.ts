export const USER_AGENT = 'TourGuide/0.1 (prototype; contact: tourguide@example.invalid)';

// Must stay a literal process.env.EXPO_PUBLIC_* expression for Expo to inline it.
export const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

export const LLM_API_KEY = process.env.EXPO_PUBLIC_LLM_API_KEY ?? '';
export const LLM_BASE_URL =
  process.env.EXPO_PUBLIC_LLM_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/';
export const LLM_MODEL = process.env.EXPO_PUBLIC_LLM_MODEL || 'gemini-3.5-flash-lite';
