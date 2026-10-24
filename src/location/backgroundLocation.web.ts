import type { Fix } from './fix';

export async function startBackgroundWatch(_onFix: (fix: Fix) => void): Promise<() => void> {
  throw new Error('Guiding with the screen off works in the Android app only.');
}
