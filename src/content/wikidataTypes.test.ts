import { describe, expect, it, vi } from 'vitest';

import type { FetchLike } from '../pois/wikipediaSource';
import { businessQuery, createBusinessLookup } from './wikidataTypes';

describe('createBusinessLookup', () => {
  it('asks once for all ids and returns the businesses', async () => {
    const fetchFn = vi.fn<FetchLike>(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ results: { bindings: [{ item: { value: 'http://www.wikidata.org/entity/Q2' } }] } }),
    }));
    expect(await createBusinessLookup(fetchFn)(['Q1', 'Q2', 'dewiki:5'])).toEqual(new Set(['Q2']));
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(decodeURIComponent(fetchFn.mock.calls[0][0])).toContain('VALUES ?item { wd:Q1 wd:Q2 }');
  });

  it('treats failures as "no businesses" so walks are never blocked', async () => {
    expect(await createBusinessLookup(() => Promise.reject(new Error('offline')))(['Q1'])).toEqual(new Set());
    const fetchFn = vi.fn<FetchLike>();
    expect(await createBusinessLookup(fetchFn)([])).toEqual(new Set());
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('builds a subclass-aware query', () => {
    expect(businessQuery(['Q1'])).toContain('wdt:P31/wdt:P279* wd:Q4830453');
  });
});
