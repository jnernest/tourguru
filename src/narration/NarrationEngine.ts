import type { LanguageCode } from '../i18n/languages';
import type { OpeningContext } from '../i18n/openings';
import type { Poi } from '../pois/types';
import type { Interest, Tone } from '../settings/settings';

export type NarrationDepth = 'brief' | 'story';

export interface NarrationContext extends OpeningContext {
  depth?: NarrationDepth;
  interests?: readonly Interest[];
  tone?: Tone;
  offlineOnly?: boolean;
}

export const NO_CONTEXT: NarrationContext = { distanceM: null, direction: null };

export interface NarrationEngine {
  narrate(poi: Poi, lang: LanguageCode, context?: NarrationContext): Promise<string>;
}
