import type { EntityText } from '../content/wikidata';
import { errorText } from '../diagnostics/log';
import { phrase, type LanguageCode } from '../i18n/languages';
import { nameWithDescription, opening } from '../i18n/openings';
import type { Poi } from '../pois/types';
import type { Translator } from '../translate/types';
import { NO_CONTEXT, type NarrationContext, type NarrationEngine } from './NarrationEngine';
import { highlight, summarize } from './summarizer';

export interface ExtractiveEngineDeps {
  /** Full article text for a place; defaults to the lead fetched with it. */
  loadText?: (poi: Poi) => Promise<string>;
  /** On-device translation for articles in another language; none = say it can't be read. */
  translator?: Translator | null;
  /** Called with the reason whenever translation was needed but did not work. */
  onTranslationFailed?: (reason: string) => void;
  /** Name, description and key facts in the user's language (Wikidata). */
  describe?: (wikidataId: string, lang: LanguageCode) => Promise<EntityText | null>;
}

/** With fewer structured facts than this, a summary of the article says more. */
const MIN_FACTS_FOR_KEY_POINTS = 2;

interface Request {
  poi: Poi;
  lang: LanguageCode;
  context: NarrationContext;
}

/**
 * Offline narration without a language model, told like a guide: where to look ("On your
 * right is…"), what the place is, its key facts (Wikidata, already in the user's language)
 * and one highlight from the article. Falls back to an extractive summary. Only verbatim
 * source text is used, translated on the device if needed, so nothing can be invented.
 */
export class ExtractiveEngine implements NarrationEngine {
  constructor(private readonly deps: ExtractiveEngineDeps = {}) {}

  async narrate(poi: Poi, lang: LanguageCode, context: NarrationContext = NO_CONTEXT): Promise<string> {
    const req: Request = { poi, lang, context };
    const [text, entity] = await Promise.all([
      this.deps.loadText ? this.deps.loadText(poi) : Promise.resolve(poi.summary),
      this.deps.describe ? this.deps.describe(poi.id, lang) : Promise.resolve(null),
    ]);
    if (entity && entity.facts.length >= MIN_FACTS_FOR_KEY_POINTS) {
      return this.keyPoints(req, entity, text);
    }
    const summary = summarize(text, poi.title);
    if (summary.length === 0) {
      return entity ? this.keyPoints(req, entity, '') : phrase(lang, 'noInfo', poi.title);
    }
    const body = poi.lang === lang ? summary : await this.translate(summary, poi.lang, lang);
    if (body) {
      return `${opening(lang, context, entity?.label ?? poi.title, poi.id)} ${body}`;
    }
    // Never read e.g. German text with an English voice.
    return entity ? this.keyPoints(req, entity, '') : phrase(lang, 'otherLanguage', poi.title);
  }

  /** "On your right is Schönbrunn Palace, a palace in Vienna. Built in 1638. … <one highlight>" */
  private async keyPoints({ poi, lang, context }: Request, entity: EntityText, text: string): Promise<string> {
    const name = nameWithDescription(lang, entity.label ?? poi.title, entity.description);
    const best = text ? highlight(text, poi.title) : '';
    const extra = best && poi.lang !== lang ? await this.translate(best, poi.lang, lang) : best;
    return [opening(lang, context, name, poi.id), ...entity.facts, extra ?? ''].filter((part) => part.length > 0).join(' ');
  }

  private async translate(text: string, from: string, to: string): Promise<string | null> {
    if (!this.deps.translator) {
      this.deps.onTranslationFailed?.('on-device translation is not available in this build');
      return null;
    }
    try {
      return await this.deps.translator.translate(text, from, to);
    } catch (e) {
      this.deps.onTranslationFailed?.(errorText(e));
      return null;
    }
  }
}
