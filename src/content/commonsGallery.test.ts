import { describe, expect, it, vi } from 'vitest';

import type { FetchLike } from '../pois/wikipediaSource';
import { buildCommonsSearchUrl, createGalleryLoader, parseGallery, yearOf } from './commonsGallery';

const page = (title: string, date: string | undefined, artist = '<a href="x">Georg Böttger</a>') => ({
  title,
  imageinfo: [
    {
      thumburl: `https://upload.wikimedia.org/${title}.jpg`,
      thumbwidth: 640,
      thumbheight: 480,
      descriptionurl: `https://commons.wikimedia.org/wiki/${title}`,
      extmetadata: { DateTimeOriginal: date ? { value: date } : undefined, Artist: { value: artist }, LicenseShortName: { value: 'Public domain' } },
    },
  ],
});

describe('yearOf', () => {
  it('finds the year in plain and HTML dates', () => {
    expect(yearOf('1858')).toBe(1858);
    expect(yearOf('<time datetime="1902-05-01">1 May 1902</time>')).toBe(1902);
    expect(yearOf('circa 1890s')).toBe(1890);
    expect(yearOf('unknown date')).toBeNull();
    expect(yearOf(undefined)).toBeNull();
  });
});

describe('parseGallery', () => {
  it('puts historic photos first, oldest first, then the newest modern ones', () => {
    const body = { query: { pages: [page('New', '2024-06-01'), page('Old', '1858'), page('Older', '1820'), page('Undated', undefined)] } };
    const photos = parseGallery(body);
    expect(photos.map((p) => [p.year, p.historic])).toEqual([
      [1820, true],
      [1858, true],
      [2024, false],
      [null, false],
    ]);
    expect(photos[0]).toMatchObject({ credit: 'Georg Böttger, Public domain', pageUrl: 'https://commons.wikimedia.org/wiki/Older' });
  });

  it('merges several searches without duplicates', () => {
    const a = { query: { pages: [page('Old', '1858')] } };
    expect(parseGallery(a, a)).toHaveLength(1);
  });
});

describe('createGalleryLoader', () => {
  it('reads the Commons category from Wikidata and searches it and its subcategories', async () => {
    const fetchFn = vi.fn<FetchLike>(async (url) => ({
      ok: true,
      status: 200,
      json: async () =>
        url.includes('wikidata')
          ? { entities: { Q1: { claims: { P373: [{ mainsnak: { datavalue: { value: 'Frauenkirche (München)' } } }] } } } }
          : { query: { pages: [page('Old', '1858')] } },
    }));
    expect(await createGalleryLoader(fetchFn)('Q1')).toHaveLength(1);
    expect(fetchFn.mock.calls[1][0]).toBe(buildCommonsSearchUrl('Frauenkirche (München)', true));
    expect(decodeURIComponent(fetchFn.mock.calls[2][0])).toContain('postcard');
  });

  it('returns nothing for places without a Wikidata id or Commons category', async () => {
    const fetchFn = vi.fn<FetchLike>(async () => ({ ok: true, status: 200, json: async () => ({ entities: { Q2: {} } }) }));
    expect(await createGalleryLoader(fetchFn)('osm:node/1')).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(await createGalleryLoader(fetchFn)('Q2')).toEqual([]);
  });
});
