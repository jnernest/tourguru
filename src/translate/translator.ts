import MlKitTranslate from '../../modules/mlkit-translate';
import type { Translator } from './types';

/**
 * Google ML Kit on-device translation (local native module, modules/mlkit-translate). The
 * first use of a language pair downloads its model (~30 MB); after that it works offline.
 * Null where the native module is absent (web, Expo Go, iOS).
 */
export function createMlKitTranslator(): Translator | null {
  const native = MlKitTranslate;
  if (!native) {
    return null;
  }
  return {
    async translate(text, from, to) {
      const result = await native.translate(text, from, to);
      if (typeof result !== 'string' || result.trim().length === 0) {
        throw new Error('On-device translation returned no text.');
      }
      return result;
    },
  };
}
