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

  narrate(poi: Poi, lang: LanguageCode, context?: NarrationContext): Promise<string> {
    return this.run(context, (engine) => engine.narrate(poi, lang, context));
  }

  answer(poi: Poi, lang: LanguageCode, question: string, context?: NarrationContext): Promise<string> {
    return this.run(context, (engine) => engine.answer?.(poi, lang, question, context) ?? Promise.resolve(''));
  }

  private async run(context: NarrationContext | undefined, call: (engine: NarrationEngine) => Promise<string>) {
    if (context?.offlineOnly) {
      return call(this.fallback);
    }
    try {
      const text = await call(this.primary);
      this.report(null);
      return text;
    } catch (error) {
      this.report(error);
      return call(this.fallback);
    }
  }
}
