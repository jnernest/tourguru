import type { LanguageCode } from '../i18n/languages';
import type { OpeningContext } from '../i18n/openings';
import type { Poi } from '../pois/types';

/**
 * brief: told automatically while walking (~30 s: what it is, key facts, a highlight).
 * story: on request ("Tell me more", ~1–2 min: the history in order, then a fun fact).
 */
export type NarrationDepth = 'brief' | 'story';

/** Where the place is relative to the listener when the narration starts, and how much to tell. */
export interface NarrationContext extends OpeningContext {
  depth?: NarrationDepth;
}

export const NO_CONTEXT: NarrationContext = { distanceM: null, direction: null };

/**
 * Turns a place into speakable text. Implementations: ExtractiveEngine (offline: Wikidata
 * key facts, extractive summary and history, on-device translation), LlmEngine (cloud LLM).
 */
export interface NarrationEngine {
  narrate(poi: Poi, lang: LanguageCode, context?: NarrationContext): Promise<string>;
}
