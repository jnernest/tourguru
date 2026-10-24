import type { LanguageCode } from '../i18n/languages';
import type { OpeningContext } from '../i18n/openings';
import type { Poi } from '../pois/types';

export type NarrationDepth = 'brief' | 'story';

export interface NarrationContext extends OpeningContext {
  depth?: NarrationDepth;
}

export const NO_CONTEXT: NarrationContext = { distanceM: null, direction: null };

export interface NarrationEngine {
  narrate(poi: Poi, lang: LanguageCode, context?: NarrationContext): Promise<string>;
}
