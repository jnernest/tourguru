import { describe, expect, it } from 'vitest';

import { historyText, parseSections } from '../content/sections';
import { splitSentences } from '../text/sentences';
import { standsAlone } from '../text/storyCues';
import { funFact, historyTimeline, sentenceYear } from './history';

const ARTICLE = `Karlstor is a city gate in Munich.

== History ==
In 1857 the gunpowder stocks stored in an annex to the main tower exploded and damaged the tower badly.
The gate was first mentioned in documents in the year 1302, early in the building of the second wall.
Beginning in the 16th century, the inner town wall was gradually removed except for the old gate towers.
=== Modern times ===
Since 1972 the square in front of the gate has been part of the pedestrian zone of the old town.

== Legends ==
According to legend, a ghost of a gatekeeper still walks the arch on stormy nights in winter.
Their combination is unique and incomparable in Europe, as the guidebooks like to point out.

== References ==
- Some book
`;

describe('sections', () => {
  it('finds the history section including its subsections', () => {
    const history = historyText(parseSections(ARTICLE));
    expect(history).toContain('gunpowder');
    expect(history).toContain('pedestrian zone');
    expect(history).not.toContain('ghost');
  });

  it('recognises "History" in other languages', () => {
    const de = parseSections('Lead.\n== Geschichte ==\nIm Jahr 1612 geschah etwas Wichtiges in der Stadt.\n== Lage ==\nX.\n');
    expect(historyText(de)).toContain('1612');
    expect(historyText(parseSections('Lead.\n== Lage ==\nNothing.\n'))).toBe('');
  });
});

describe('historyTimeline', () => {
  it('tells the history in chronological order, starting with the earliest event', () => {
    const timeline = historyTimeline(ARTICLE, 'Karlstor');
    expect(timeline.map(sentenceYear)).toEqual([...timeline.map(sentenceYear)].sort((a, b) => (a ?? 0) - (b ?? 0)));
    expect(timeline[0]).toContain('1302');
    expect(timeline.join(' ')).toContain('1857');
  });
});

describe('sentenceYear', () => {
  it.each([
    ['It was finished in 1488 by the builders.', 1488],
    ['Built in the 15th century by the town.', 1450],
    ['Erbaut im 17. Jahrhundert von Leopold.', 1650],
    ['No date here at all.', null],
  ])('%s → %s', (s, year) => {
    expect(sentenceYear(s)).toBe(year);
  });
});

describe('funFact', () => {
  it('picks a legend that makes sense on its own', () => {
    expect(funFact(ARTICLE)).toMatch(/^According to legend, a ghost/);
  });

  it('rejects weak or dangling "facts"', () => {
    expect(standsAlone('Their combination is unique and incomparable in Europe.')).toBe(false);
    expect(funFact('Lead sentence about the place.\nTheir combination is unique and incomparable in Europe, really.')).toBe('');
  });
});

describe('sentence splitting of company abbreviations', () => {
  it('keeps "m. b. H." inside the sentence', () => {
    expect(splitSentences('Verwaltet von der Betriebsgesellschaft m. b. H. seit 1992. Danach mehr.').map((s) => s.trim())).toEqual([
      'Verwaltet von der Betriebsgesellschaft m. b. H. seit 1992.',
      'Danach mehr.',
    ]);
  });
});
