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
