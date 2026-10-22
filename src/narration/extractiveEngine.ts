import type { EntityText } from '../content/wikidata';
import { errorText } from '../diagnostics/log';
import { phrase, type LanguageCode } from '../i18n/languages';
import { nameWithDescription, opening } from '../i18n/openings';
import type { Poi } from '../pois/types';
import type { Translator } from '../translate/types';
import { NO_CONTEXT, type NarrationContext, type NarrationEngine } from './NarrationEngine';
import { funFact, historyTimeline, isStoryLike } from './history';
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
    if (context.depth === 'story') {
      return this.story(req, entity, text);
    }
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

  /** "On your right is Schönbrunn Palace, a palace in Vienna. Built in 1638. … Fun fact: …" */
  private async keyPoints({ poi, lang, context }: Request, entity: EntityText, text: string): Promise<string> {
    const name = nameWithDescription(lang, entity.label ?? poi.title, entity.description);
    const best = text ? highlight(text, poi.title) : '';
    const extra = await this.inUserLanguage(best, poi.lang, lang);
    const said = extra && isStoryLike(best) ? phrase(lang, 'funFact', extra) : extra;
    return [opening(lang, context, name, poi.id), ...entity.facts, said ?? ''].filter((part) => part.length > 0).join(' ');
  }

  /** "Tell me more": the history in chronological order, then a fun fact. */
  private async story({ poi, lang, context }: Request, entity: EntityText | null, text: string): Promise<string> {
    const name = entity?.label ?? poi.title;
    // Point the place out when we know where it is (told while walking); else announce the story.
    const intro =
      context.distanceM === null
        ? phrase(lang, 'storyIntro', name)
        : opening(lang, context, nameWithDescription(lang, name, entity?.description ?? null), poi.id);
    const timeline = historyTimeline(text, poi.title);
    const fact = funFact(text, timeline);
    if (timeline.length === 0 && !fact) {
      return phrase(lang, 'noHistory', name);
    }
    const [history, fun] = await Promise.all([
      this.inUserLanguage(timeline.join(' '), poi.lang, lang),
      this.inUserLanguage(fact, poi.lang, lang),
    ]);
    if (!history && !fun) {
      return phrase(lang, 'otherLanguage', name);
    }
    return [intro, history ?? '', fun ? phrase(lang, 'funFact', fun) : '']
      .filter((part) => part.length > 0)
      .join(' ');
  }

  /** The text as is when it is already in the user's language, else translated; null if impossible. */
  private async inUserLanguage(text: string, from: string, to: string): Promise<string | null> {
    if (!text) return '';
    return from === to ? text : this.translate(text, from, to);
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
