import { Image } from 'react-native';

import { createArticleLoader } from '../content/articleFetcher';
import { createGalleryLoader } from '../content/commonsGallery';
import { createEntityDescriber } from '../content/wikidata';
import { createBusinessLookup } from '../content/wikidataTypes';
import type { LatLon } from '../geo/geo';
import type { LanguageCode } from '../i18n/languages';
import { lookupCountry } from '../location/locationService';
import { createAiProvider } from '../narration/aiProvider';
import {
  buildCityPack,
  withPackArticles,
  withPackEntities,
  withPackPlaces,
  type CityPack,
  type PackStore,
} from '../offline/cityPack';
import { createLocalLanguageResolver } from '../pois/localLanguage';
import { createMultiLanguageSource } from '../pois/multiLanguageSource';
import { createOsmSource, withOsm } from '../pois/osmSource';
import { createWikipediaSource } from '../pois/wikipediaSource';
import { readJson, writeJson } from '../storage/kv';
import { createMlKitTranslator } from '../translate/translator';

const PACK_KEY = 'tourguide.cityPack';

export const aiProvider = createAiProvider();
export const AI_NARRATION_ENABLED = aiProvider !== null;
export const AI_PROVIDER_LABEL = aiProvider?.label ?? null;

export const translator = createMlKitTranslator();
export const OFFLINE_TRANSLATION_AVAILABLE = translator !== null;

let pack: CityPack | null | undefined;
export const packStore: PackStore = {
  read: () => (pack === undefined ? (pack = readJson<CityPack | null>(PACK_KEY, null)) : pack),
  write: (next) => {
    writeJson(PACK_KEY, next);
    pack = next;
  },
};

const onlineSource = withOsm(
  createMultiLanguageSource(createWikipediaSource(), createLocalLanguageResolver(lookupCountry)),
  createOsmSource(),
);
const onlineArticle = createArticleLoader();
const onlineDescribe = createEntityDescriber();

export const placeSource = withPackPlaces(onlineSource, packStore);
export const loadArticle = withPackArticles(onlineArticle, packStore);
export const describePlace = withPackEntities(onlineDescribe, packStore);
export const lookupBusinesses = createBusinessLookup();
export const loadGallery = createGalleryLoader();

export async function downloadCityPack(
  center: LatLon,
  lang: LanguageCode,
  onProgress: (done: number, total: number) => void,
): Promise<CityPack> {
  const next = await buildCityPack(
    center,
    lang,
    {
      source: onlineSource,
      loadArticle: onlineArticle,
      describe: onlineDescribe,
      prefetchImage: (url) => Image.prefetch(url),
      now: Date.now,
    },
    onProgress,
  );
  packStore.write(next);
  return next;
}
