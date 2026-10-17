import { describe, expect, it, vi } from 'vitest';

import deFixture from '../__fixtures__/marienplatz-de.json';
import enFixture from '../__fixtures__/marienplatz-en.json';
import {
  buildGeoQueryUrl,
  createWikipediaSource,
  parseGeoQueryResponse,
  type FetchLike,
} from './wikipediaSource';

const MARIENPLATZ = { lat: 48.1374, lon: 11.5755 };

describe('buildGeoQueryUrl', () => {
  it('targets the language subdomain and encodes the coordinate pipe', () => {
    const url = buildGeoQueryUrl(MARIENPLATZ, 500, 'de');
    expect(url.startsWith('https://de.wikipedia.org/w/api.php?')).toBe(true);
    expect(url).toContain('ggscoord=48.1374%7C11.5755');
    expect(url).toContain('ggsradius=500');
    expect(url).toContain('prop=coordinates%7Cextracts%7Cinfo%7Cpageprops');
    expect(url).toContain('colimit=20');
    expect(url).toContain('pithumbsize=500');
  });

  it('rejects anything but a plain language code before it reaches the hostname', () => {
    for (const bad of ['evil.com/x', 'DE', 'de.', '', 'abcd']) {
      expect(() => buildGeoQueryUrl(MARIENPLATZ, 500, bad)).toThrow('Invalid Wikipedia language code');
    }
  });

  it('caps the radius at the MediaWiki maximum', () => {
    expect(buildGeoQueryUrl(MARIENPLATZ, 50_000, 'en')).toContain('ggsradius=10000');
  });
});

describe('parseGeoQueryResponse', () => {
  it('maps recorded English results to POIs keyed by Wikidata id', () => {
    const pois = parseGeoQueryResponse(enFixture, 'en');
    expect(pois.length).toBeGreaterThan(10);
    const frauenkirche = pois.find((p) => p.id === 'Q167193');
    expect(frauenkirche).toMatchObject({
      title: 'Frauenkirche, Munich',
      lang: 'en',
      url: expect.stringMatching(/^https:\/\/en\.wikipedia\.org\/\?curid=\d+$/),
    });
    expect(frauenkirche?.summary.length).toBeGreaterThan(50);
  });

  it('keeps the article picture from Wikimedia', () => {
    const frauenkirche = parseGeoQueryResponse(enFixture, 'en').find((p) => p.id === 'Q167193');
    expect(frauenkirche?.image).toMatchObject({
      url: expect.stringMatching(/^https:\/\/[a-z]+\.wikimedia\.org\//),
      width: 500,
    });
    const withImages = parseGeoQueryResponse(enFixture, 'en').filter((p) => p.image);
    expect(withImages.length).toBeGreaterThan(10);
  });

  it('ignores pictures from anywhere but Wikimedia', () => {
    const body = {
      query: {
        pages: [
          {
            pageid: 1,
            title: 'X',
            coordinates: [{ lat: 1, lon: 2 }],
            extract: 'Text.',
            thumbnail: { source: 'http://evil.example/x.jpg', width: 500, height: 300 },
          },
        ],
      },
    };
    expect(parseGeoQueryResponse(body, 'en')[0].image).toBeNull();
  });

  it('throws on MediaWiki error responses instead of reporting no places', () => {
    const body = { error: { code: 'ratelimited', info: 'Too many requests' } };
    expect(() => parseGeoQueryResponse(body, 'de')).toThrow('Wikipedia API error (de): ratelimited Too many requests');
  });

  it('gives the same place the same id across languages', () => {
    const en = new Set(parseGeoQueryResponse(enFixture, 'en').map((p) => p.id));
    const de = parseGeoQueryResponse(deFixture, 'de').map((p) => p.id);
    expect(de.some((id) => en.has(id))).toBe(true);
  });

  it('drops pages without coordinates or text, and tolerates empty bodies', () => {
    const body = {
      query: {
        pages: [
          { pageid: 1, title: 'No coords', extract: 'Text.' },
          { pageid: 2, title: 'No text', coordinates: [{ lat: 1, lon: 2 }], extract: '  ' },
          { pageid: 3, title: 'Kept', coordinates: [{ lat: 1, lon: 2 }], extract: 'Text.' },
        ],
      },
    };
    expect(parseGeoQueryResponse(body, 'en').map((p) => p.title)).toEqual(['Kept']);
    expect(parseGeoQueryResponse({}, 'en')).toEqual([]);
    expect(parseGeoQueryResponse(body, 'en')[0].id).toBe('enwiki:3');
  });
});

describe('createWikipediaSource', () => {
  it('sends a descriptive User-Agent', async () => {
    const fetchFn = vi.fn<FetchLike>(async () => ({
      ok: true,
      status: 200,
      json: async () => enFixture,
    }));
    await createWikipediaSource(fetchFn).nearby(MARIENPLATZ, 500, 'en');
    const headers = fetchFn.mock.calls[0][1].headers;
    expect(headers['User-Agent']).toMatch(/^WalkGuide\/\S+ \(.*contact/);
  });

  it('throws on HTTP errors', async () => {
    const fetchFn: FetchLike = async () => ({ ok: false, status: 429, json: async () => ({}) });
    await expect(createWikipediaSource(fetchFn).nearby(MARIENPLATZ, 500, 'en')).rejects.toThrow(
      'HTTP 429',
    );
  });
});
