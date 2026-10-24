import MlKitTranslate from '../../modules/mlkit-translate';
import type { Translator } from './types';

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
