import type { LanguageCode } from '../i18n/languages';
import type { OpeningContext } from '../i18n/openings';
import type { Poi } from '../pois/types';

/** Where the place is relative to the listener when the narration starts. */
export type NarrationContext = OpeningContext;

export const NO_CONTEXT: NarrationContext = { distanceM: null, direction: null };

/**
 * Turns a place into speakable text. Implementations: ExtractiveEngine (offline: Wikidata
 * key facts, extractive summary, on-device translation), LlmEngine (cloud LLM).
 */
export interface NarrationEngine {
  narrate(poi: Poi, lang: LanguageCode, context?: NarrationContext): Promise<string>;
}
