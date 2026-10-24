import type { LatLon } from '../geo/geo';

const COUNTRY_WIKI: Record<string, string> = {
  AT: 'de', DE: 'de', LI: 'de',
  FR: 'fr', MC: 'fr', LU: 'fr',
  IT: 'it', SM: 'it', VA: 'it',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  PT: 'pt', BR: 'pt',
  NL: 'nl', PL: 'pl', CZ: 'cs', SK: 'sk', HU: 'hu', RO: 'ro', BG: 'bg', HR: 'hr', SI: 'sl',
  GR: 'el', TR: 'tr', SE: 'sv', NO: 'no', DK: 'da', FI: 'fi', RU: 'ru', UA: 'uk',
  JP: 'ja', KR: 'ko', CN: 'zh', TW: 'zh',
};

export function countryToWikiLang(isoCountryCode: string | null | undefined): string | null {
  return isoCountryCode ? (COUNTRY_WIKI[isoCountryCode.toUpperCase()] ?? null) : null;
}

export type CountryLookup = (center: LatLon) => Promise<string | null>;

const GRID_DEG = 0.1;

const gridKey = ({ lat, lon }: LatLon): string =>
  `${Math.round(lat / GRID_DEG)}:${Math.round(lon / GRID_DEG)}`;

export function createLocalLanguageResolver(lookupCountry: CountryLookup) {
  const cache = new Map<string, string | null>();
  return async (center: LatLon): Promise<string | null> => {
    const key = gridKey(center);
    if (!cache.has(key)) {
      let lang: string | null = null;
      try {
        lang = countryToWikiLang(await lookupCountry(center));
      } catch {
        // No geocoder (web) or offline: fall back to the user's language only, and retry later.
        return null;
      }
      cache.set(key, lang);
    }
    return cache.get(key) ?? null;
  };
}
