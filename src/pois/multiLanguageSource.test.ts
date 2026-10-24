import { describe, expect, it, vi } from 'vitest';

import { poiNorth } from '../testing/poiFactory';
import { countryToWikiLang, createLocalLanguageResolver } from './localLanguage';
import { createMultiLanguageSource, mergeById } from './multiLanguageSource';
import type { PoiSource } from './types';

const VIENNA = { lat: 48.1845, lon: 16.3122 };

const EN = [poiNorth('Q131330', 135, { title: 'Schönbrunn Palace', lang: 'en' })];
const DE = [
  poiNorth('Q131330', 135, { title: 'Schloss Schönbrunn', lang: 'de' }),
  poiNorth('Q1418064', 200, { title: 'Orangerie (Wien-Schönbrunn)', lang: 'de' }),
];

function fakeSource(byLang: Record<string, unknown>): PoiSource {
  return {
    nearby: vi.fn(async (_c, _r, lang: string) => {
      const value = byLang[lang];
      if (value instanceof Error) throw value;
      return (value as typeof EN) ?? [];
    }),
  };
}

describe('countryToWikiLang', () => {
  it.each([
    ['AT', 'de'],
    ['at', 'de'],
    ['FR', 'fr'],
    ['IN', null],
    [null, null],
  ])('%s → %s', (code, expected) => {
    expect(countryToWikiLang(code)).toBe(expected);
  });
});

describe('createLocalLanguageResolver', () => {
  it('caches per ~11 km cell so the geocoder is not called on every refetch', async () => {
    const lookup = vi.fn(async () => 'AT');
    const resolve = createLocalLanguageResolver(lookup);
    expect(await resolve(VIENNA)).toBe('de');
    expect(await resolve({ lat: VIENNA.lat + 0.01, lon: VIENNA.lon })).toBe('de');
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it('returns null without caching when the geocoder fails, so it retries later', async () => {
    const lookup = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('AT');
    const resolve = createLocalLanguageResolver(lookup);
    expect(await resolve(VIENNA)).toBeNull();
    expect(await resolve(VIENNA)).toBe('de');
  });
});

describe('createMultiLanguageSource', () => {
  it('merges local places in, keeping the user-language version of shared ones', async () => {
    const source = createMultiLanguageSource(fakeSource({ en: EN, de: DE }), async () => 'de');
    const pois = await source.nearby(VIENNA, 500, 'en');
    expect(pois.map((p) => [p.title, p.lang])).toEqual([
      ['Schönbrunn Palace', 'en'],
      ['Orangerie (Wien-Schönbrunn)', 'de'],
    ]);
  });

  it('queries only once when the local language is the user language or unknown', async () => {
    for (const local of ['en', null]) {
      const base = fakeSource({ en: EN });
      await createMultiLanguageSource(base, async () => local).nearby(VIENNA, 500, 'en');
      expect(base.nearby).toHaveBeenCalledTimes(1);
    }
  });

  it('still returns local places when the user-language request fails, and vice versa', async () => {
    const ownDown = createMultiLanguageSource(fakeSource({ en: new Error('x'), de: DE }), async () => 'de');
    expect(await ownDown.nearby(VIENNA, 500, 'en')).toHaveLength(2);
    const localDown = createMultiLanguageSource(fakeSource({ en: EN, de: new Error('x') }), async () => 'de');
    expect(await localDown.nearby(VIENNA, 500, 'en')).toHaveLength(1);
  });

  it('fails only when both requests fail', async () => {
    const source = createMultiLanguageSource(
      fakeSource({ en: new Error('offline'), de: new Error('offline') }),
      async () => 'de',
    );
    await expect(source.nearby(VIENNA, 500, 'en')).rejects.toThrow('offline');
  });
});

describe('mergeById', () => {
  it('keeps order: preferred first, then unseen extras', () => {
    expect(mergeById(EN, DE).map((p) => p.id)).toEqual(['Q131330', 'Q1418064']);
  });
});
