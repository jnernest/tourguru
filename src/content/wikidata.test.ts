import { describe, expect, it, vi } from 'vitest';

import type { FetchLike } from '../pois/wikipediaSource';
import { buildEntityUrl, createEntityDescriber, extractRawFacts, formatFacts } from './wikidata';

const entityRef = (id: string) => ({ mainsnak: { datavalue: { type: 'wikibase-entityid', value: { id } } } });
const time = (t: string, precision = 9) => ({ mainsnak: { datavalue: { type: 'time', value: { time: t, precision } } } });

// Shaped like the real wbgetentities response for Schönbrunn Palace (Q131330).
const PALACE = {
  labels: { en: { value: 'Schönbrunn Palace' }, de: { value: 'Schloss Schönbrunn' } },
  descriptions: { en: { value: 'palace in Vienna, Austria' } },
  claims: {
    P571: [time('+1638-01-01T00:00:00Z')],
    P84: [entityRef('Q84253'), entityRef('Q732370')],
    P149: [entityRef('Q840829'), entityRef('Q46261')],
    // "Listed objects in Austria" first, to check that only the UNESCO entry is spoken.
    P1435: [entityRef('Q1188447'), entityRef('Q43113623')],
  },
};
const REF_LABELS = {
  Q84253: { labels: { en: { value: 'Johann Bernhard Fischer von Erlach' } } },
  Q732370: { labels: { en: { value: 'Nicolò Pacassi' } } },
  Q840829: { labels: { en: { value: 'Baroque' } } },
  Q46261: { labels: { en: { value: 'baroque architecture' } } },
  Q43113623: { labels: { en: { value: 'part of UNESCO World Heritage Site' } } },
  Q1188447: { labels: { en: { value: 'Listed objects in Austria' } } },
};

function wikidataFake(): FetchLike {
  return vi.fn<FetchLike>(async (url) => ({
    ok: true,
    status: 200,
    json: async () => ({ entities: url.includes('claims') ? { Q131330: PALACE } : REF_LABELS }),
  }));
}

describe('buildEntityUrl', () => {
  it('requests the user language with an English fallback, for one or more ids', () => {
    expect(buildEntityUrl(['Q131330'], 'de', 'labels|descriptions|claims')).toBe(
      'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*&props=labels%7Cdescriptions%7Cclaims&ids=Q131330&languages=de%7Cen',
    );
    expect(buildEntityUrl(['Q1', 'Q2'], 'en', 'labels')).toContain('ids=Q1%7CQ2&languages=en');
  });

  it('rejects anything that is not a plain Q-id and language code', () => {
    expect(() => buildEntityUrl(['Q1&ids=Q2'], 'en', 'labels')).toThrow();
    expect(() => buildEntityUrl(['Q1'], 'en&x=1', 'labels')).toThrow();
    expect(() => buildEntityUrl([], 'en', 'labels')).toThrow();
  });
});

describe('createEntityDescriber', () => {
  it('turns Wikidata claims into spoken key facts in the user language', async () => {
    expect(await createEntityDescriber(wikidataFake())('Q131330', 'en')).toEqual({
      label: 'Schönbrunn Palace',
      description: 'palace in Vienna, Austria',
      facts: [
        'Built in 1638.',
        'Designed by Johann Bernhard Fischer von Erlach and Nicolò Pacassi.',
        'Its style is Baroque.',
        'Heritage status: part of UNESCO World Heritage Site.',
      ],
    });
  });

  it('resolves all referenced names in one extra request', async () => {
    const fetchFn = wikidataFake();
    await createEntityDescriber(fetchFn)('Q131330', 'en');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('returns null with nothing to say, for non-Wikidata ids, and on failures', async () => {
    const empty: FetchLike = async () => ({ ok: true, status: 200, json: async () => ({ entities: { Q1: { labels: {} } } }) });
    expect(await createEntityDescriber(empty)('Q1', 'en')).toBeNull();
    const fetchFn = vi.fn<FetchLike>();
    expect(await createEntityDescriber(fetchFn)('dewiki:123', 'en')).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
    expect(await createEntityDescriber(() => Promise.reject(new Error('offline')))('Q1', 'en')).toBeNull();
  });
});

describe('extractRawFacts / formatFacts', () => {
  it('skips dates that are only known to the decade or century', () => {
    expect(extractRawFacts({ P571: [time('+1630-00-00T00:00:00Z', 8)] })).toEqual([]);
  });

  it('uses the user language phrases and joins two names', () => {
    const raw = extractRawFacts({ P84: [entityRef('Q1'), entityRef('Q2')] });
    const labels = new Map([
      ['Q1', 'A'],
      ['Q2', 'B'],
    ]);
    expect(formatFacts(raw, labels, 'de')).toEqual(['Entworfen von A und B.']);
  });

  it('prefers "built" over "opened" and "designed by" over "founded by"', () => {
    const raw = extractRawFacts({
      P571: [time('+1900-01-01T00:00:00Z')],
      P1619: [time('+1905-01-01T00:00:00Z')],
      P84: [entityRef('Q1')],
      P112: [entityRef('Q2')],
    });
    const labels = new Map([
      ['Q1', 'Architect'],
      ['Q2', 'Founder'],
    ]);
    expect(formatFacts(raw, labels, 'en')).toEqual(['Built in 1900.', 'Designed by Architect.']);
  });
});
