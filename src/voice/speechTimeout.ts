/** Slow TTS speaks ~10 characters per second; allow double that plus a fixed margin. */
const MIN_CHARS_PER_SECOND = 10;
const SLACK_FACTOR = 2;
const MARGIN_MS = 5_000;

export function speechTimeoutMs(text: string): number {
  return Math.round((text.length / MIN_CHARS_PER_SECOND) * 1_000 * SLACK_FACTOR + MARGIN_MS);
}
