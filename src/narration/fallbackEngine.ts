import type { LanguageCode } from '../i18n/languages';
import type { Poi } from '../pois/types';
import type { NarrationContext, NarrationEngine } from './NarrationEngine';

export type FallbackReporter = (error: unknown | null) => void;

export class FallbackEngine implements NarrationEngine {
  constructor(
    private readonly primary: NarrationEngine,
    private readonly fallback: NarrationEngine,
    private readonly report: FallbackReporter = () => undefined,
  ) {}

  async narrate(poi: Poi, lang: LanguageCode, context?: NarrationContext): Promise<string> {
    try {
      const text = await this.primary.narrate(poi, lang, context);
      this.report(null);
      return text;
    } catch (error) {
      this.report(error);
      return this.fallback.narrate(poi, lang, context);
    }
  }
}
