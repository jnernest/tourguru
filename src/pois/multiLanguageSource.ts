import type { LatLon } from '../geo/geo';
import type { Poi, PoiSource } from './types';

export type LocalLanguageAt = (center: LatLon) => Promise<string | null>;

export function createMultiLanguageSource(base: PoiSource, localLanguageAt: LocalLanguageAt): PoiSource {
  return {
    async nearby(center, radiusM, lang) {
      const local = await localLanguageAt(center);
      if (!local || local === lang) {
        return base.nearby(center, radiusM, lang);
      }
      const [own, localResults] = await Promise.allSettled([
        base.nearby(center, radiusM, lang),
        base.nearby(center, radiusM, local),
      ]);
      if (own.status === 'rejected' && localResults.status === 'rejected') {
        throw own.reason;
      }
      return mergeById(
        own.status === 'fulfilled' ? own.value : [],
        localResults.status === 'fulfilled' ? localResults.value : [],
      );
    },
  };
}

export function mergeById(preferred: Poi[], extra: Poi[]): Poi[] {
  const seen = new Set(preferred.map((p) => p.id));
  return [...preferred, ...extra.filter((p) => !seen.has(p.id))];
}
