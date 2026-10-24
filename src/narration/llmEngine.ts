import type { LanguageCode } from '../i18n/languages';
import type { Poi } from '../pois/types';
import { NO_CONTEXT, type NarrationContext, type NarrationEngine } from './NarrationEngine';
import { buildNarrationPrompt, type NarrationPrompt } from './prompts';

export type CompleteFn = (prompt: NarrationPrompt) => Promise<string>;

export class LlmEngine implements NarrationEngine {
  constructor(
    private readonly complete: CompleteFn,
    private readonly loadText?: (poi: Poi) => Promise<string>,
  ) {}

  async narrate(poi: Poi, lang: LanguageCode, context: NarrationContext = NO_CONTEXT): Promise<string> {
    return this.complete(buildNarrationPrompt(await this.withText(poi), lang, context));
  }

  async answer(poi: Poi, lang: LanguageCode, question: string, context: NarrationContext = NO_CONTEXT): Promise<string> {
    return this.complete(buildNarrationPrompt(await this.withText(poi), lang, context, question));
  }

  private async withText(poi: Poi): Promise<Poi> {
    return this.loadText ? { ...poi, summary: await this.loadText(poi) } : poi;
  }
}
