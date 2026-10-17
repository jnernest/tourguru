import type { LanguageCode } from '../i18n/languages';
import type { Poi } from '../pois/types';
import type { NarrationContext, NarrationEngine } from './NarrationEngine';

/** Called after each narration: null when `primary` succeeded, else the error that caused the fallback. */
export type FallbackReporter = (error: unknown | null) => void;

/** Tries `primary`; on any failure (offline, timeout, refusal) uses `fallback` instead. */
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
