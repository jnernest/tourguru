import { describe, expect, it } from 'vitest';

import { relativeDirection } from '../geo/geo';
import { LANGUAGE_CODES } from './languages';
import { FAR_THRESHOLD_M, nameWithDescription, opening, openingKind, spokenDistance } from './openings';

describe('relativeDirection', () => {
  it.each([
    [10, 0, 'ahead'],
    [350, 0, 'ahead'],
    [90, 0, 'right'],
    [270, 0, 'left'],
    [180, 0, 'behind'],
    [0, 180, 'behind'],
    [100, 10, 'right'],
  ])('a place at %d° while walking towards %d° is %s', (bearing, heading, expected) => {
    expect(relativeDirection(bearing, heading)).toBe(expected);
  });
});

describe('opening', () => {
  it('points the place out by direction instead of a fixed "Nearby:"', () => {
    expect(opening('en', { distanceM: 40, direction: 'right' }, 'X', 'a')).toMatch(/right/);
    expect(opening('en', { distanceM: 40, direction: 'left' }, 'X', 'a')).toMatch(/left/);
    expect(opening('en', { distanceM: 40, direction: 'behind' }, 'X', 'a')).toMatch(/passed|Behind/);
    expect(opening('en', { distanceM: 40, direction: null }, 'X', 'a')).toMatch(/here|Close by/);
    expect(opening('de', { distanceM: 40, direction: 'right' }, 'X', 'a')).toMatch(/rechts/);
  });

  it('says how far away a distant place is (e.g. tapped in the list)', () => {
    expect(opening('en', { distanceM: FAR_THRESHOLD_M + 150, direction: 'right' }, 'X', 'a')).toBe(
      'About 400 metres from here is X.',
    );
  });

  it('varies the wording between places but keeps it stable for one place', () => {
    const ctx = { distanceM: 30, direction: 'ahead' as const };
    const wordings = new Set(['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'].map((id) => opening('en', ctx, 'X', id)));
    expect(wordings.size).toBeGreaterThan(1);
    expect(opening('en', ctx, 'X', 'Q1')).toBe(opening('en', ctx, 'X', 'Q1'));
  });

  it('never starts with "Nearby" in any language or position', () => {
    for (const lang of LANGUAGE_CODES) {
      for (const direction of ['ahead', 'right', 'left', 'behind', null] as const) {
        expect(opening(lang, { distanceM: 30, direction }, 'X', 'Q1')).not.toMatch(/^(Nearby|In der Nähe:)/);
      }
    }
  });

  it('classifies distance before direction', () => {
    expect(openingKind({ distanceM: 1_000, direction: 'ahead' })).toBe('far');
    expect(openingKind({ distanceM: null, direction: null })).toBe('near');
  });
});

describe('spokenDistance', () => {
  it('rounds to what a person would say', () => {
    expect(spokenDistance('en', 87)).toBe('90 metres');
    expect(spokenDistance('en', 1_260)).toBe('1.3 kilometres');
    expect(spokenDistance('de', 1_260)).toBe('1,3 Kilometer');
  });
});

describe('nameWithDescription', () => {
  it('adds the right English article to a Wikidata description', () => {
    expect(nameWithDescription('en', 'Schönbrunn Palace', 'palace in Vienna, Austria')).toBe(
      'Schönbrunn Palace, a palace in Vienna, Austria',
    );
    expect(nameWithDescription('en', 'Orangerie', 'orangery in Vienna')).toBe('Orangerie, an orangery in Vienna');
    expect(nameWithDescription('en', 'TU Wien', 'university in Vienna')).toBe('TU Wien, a university in Vienna');
    expect(nameWithDescription('en', "St. Peter's", 'a church in Munich')).toBe("St. Peter's, a church in Munich");
  });

  it('leaves proper-noun descriptions and other languages without an article', () => {
    expect(nameWithDescription('en', 'X', 'UNESCO site')).toBe('X, UNESCO site');
    expect(nameWithDescription('de', 'Schloss Schönbrunn', 'Schloss in Wien')).toBe('Schloss Schönbrunn, Schloss in Wien');
    expect(nameWithDescription('en', 'X', null)).toBe('X');
  });
});
