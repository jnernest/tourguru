import { createArticleLoader } from '../content/articleFetcher';
import { createEntityDescriber } from '../content/wikidata';
import { createBusinessLookup } from '../content/wikidataTypes';
import { createAiProvider } from '../narration/aiProvider';
import { createMlKitTranslator } from '../translate/translator';

export const aiProvider = createAiProvider();
export const AI_NARRATION_ENABLED = aiProvider !== null;
export const AI_PROVIDER_LABEL = aiProvider?.label ?? null;

export const translator = createMlKitTranslator();
export const OFFLINE_TRANSLATION_AVAILABLE = translator !== null;

export const loadArticle = createArticleLoader();
export const describePlace = createEntityDescriber();
export const lookupBusinesses = createBusinessLookup();
