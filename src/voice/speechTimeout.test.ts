import { describe, expect, it } from 'vitest';

import { speechTimeoutMs } from './speechTimeout';

describe('speechTimeoutMs', () => {
  it('allows only the margin for empty text', () => {
    expect(speechTimeoutMs('')).toBe(5_000);
  });

  it('allows well over normal speaking time for a typical narration', () => {
    expect(speechTimeoutMs('x'.repeat(600))).toBe(125_000);
  });
});
