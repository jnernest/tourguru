import type { LanguageCode } from '../i18n/languages';
import type { Poi } from '../pois/types';
import { NO_CONTEXT, type NarrationContext, type NarrationEngine } from './NarrationEngine';
import { buildNarrationPrompt, type NarrationPrompt } from './prompts';

/** Sends a prompt to an LLM and resolves with its text. Throws on any failure. */
export type CompleteFn = (prompt: NarrationPrompt) => Promise<string>;

/** Rewrites Wikipedia text into a short spoken narration via a cloud LLM. */
export class ClaudeEngine implements NarrationEngine {
  constructor(
    private readonly complete: CompleteFn,
    /** Full article text; defaults to the lead fetched with the place. */
    private readonly loadText?: (poi: Poi) => Promise<string>,
  ) {}

  async narrate(poi: Poi, lang: LanguageCode, context: NarrationContext = NO_CONTEXT): Promise<string> {
    const source = this.loadText ? { ...poi, summary: await this.loadText(poi) } : poi;
    return this.complete(buildNarrationPrompt(source, lang, context));
  }
}
