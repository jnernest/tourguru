import { describe, expect, it } from 'vitest';

import { speechTimeoutMs } from './speechTimeout';

describe('speechTimeoutMs', () => {
  it('allows only the margin for empty text', () => {
    expect(speechTimeoutMs('')).toBe(5_000);
  });

  it('allows well over normal speaking time for a typical narration', () => {
    // ~600 characters ≈ 40 s at a normal pace.
    expect(speechTimeoutMs('x'.repeat(600))).toBe(125_000);
  });
});
