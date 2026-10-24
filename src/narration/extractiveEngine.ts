import { answerFromArticle } from '../content/answer';
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
  loadText?: (poi: Poi) => Promise<string>;
  translator?: Translator | null;
  onTranslationFailed?: (reason: string) => void;
  describe?: (wikidataId: string, lang: LanguageCode) => Promise<EntityText | null>;
}

const MIN_FACTS_FOR_KEY_POINTS = 2;

const KIDS_STORY_SENTENCES = 2;

interface Request {
  poi: Poi;
  lang: LanguageCode;
  context: NarrationContext;
}

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
    const summary = summarize(text, poi.title, context.interests);
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

  async answer(poi: Poi, lang: LanguageCode, question: string): Promise<string> {
    const text = this.deps.loadText ? await this.deps.loadText(poi) : poi.summary;
    // Match words in the article's language, then speak the answer in the user's.
    const query = (await this.inUserLanguage(question, lang, poi.lang)) ?? question;
    const found = answerFromArticle(query, text);
    const said = found ? await this.inUserLanguage(found, poi.lang, lang) : null;
    return said || phrase(lang, 'noAnswer', poi.title);
  }

  private async keyPoints({ poi, lang, context }: Request, entity: EntityText, text: string): Promise<string> {
    const name = nameWithDescription(lang, entity.label ?? poi.title, entity.description);
    const best = text ? highlight(text, poi.title, context.interests) : '';
    const extra = await this.inUserLanguage(best, poi.lang, lang);
    const said = extra && isStoryLike(best) ? phrase(lang, 'funFact', extra) : extra;
    return [opening(lang, context, name, poi.id), ...entity.facts, said ?? ''].filter((part) => part.length > 0).join(' ');
  }

  private async story({ poi, lang, context }: Request, entity: EntityText | null, text: string): Promise<string> {
    const name = entity?.label ?? poi.title;
    const intro =
      context.distanceM === null
        ? phrase(lang, 'storyIntro', name)
        : opening(lang, context, nameWithDescription(lang, name, entity?.description ?? null), poi.id);
    const timeline = historyTimeline(text, poi.title, context.interests, context.tone === 'kids' ? KIDS_STORY_SENTENCES : undefined);
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
