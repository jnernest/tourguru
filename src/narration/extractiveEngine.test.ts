import { describe, expect, it, vi } from 'vitest';

import { poiNorth } from '../testing/poiFactory';
import type { Translator } from '../translate/types';
import { opening } from '../i18n/openings';
import { ExtractiveEngine } from './extractiveEngine';
import { NO_CONTEXT } from './NarrationEngine';

const PALACE_NAME = 'Schönbrunn Palace, a palace in Vienna, Austria';

const orangerie = poiNorth('1', 0, {
  title: 'Orangerie',
  summary: 'Die Orangerie ist ein barockes Gebäude im Schlosspark Schönbrunn.',
  lang: 'de',
});

describe('ExtractiveEngine', () => {
  it('introduces the place in the chosen language', async () => {
    const poi = poiNorth('1', 0, { title: 'Frauenkirche', summary: 'Die Frauenkirche ist eine Kirche in München.', lang: 'de' });
    await expect(new ExtractiveEngine().narrate(poi, 'de')).resolves.toBe(
      `${opening('de', NO_CONTEXT, 'Frauenkirche', '1')} Die Frauenkirche ist eine Kirche in München.`,
    );
  });

  it('summarizes the full article when a loader is given', async () => {
    const loadText = vi.fn(async () => 'Frauenkirche is a church in Munich.\nHistory\nIts two towers are a landmark of the city.');
    const poi = poiNorth('1', 0, { title: 'Frauenkirche', summary: 'Short lead.' });
    const text = await new ExtractiveEngine({ loadText }).narrate(poi, 'en');
    expect(text).toContain('Its two towers are a landmark');
    expect(loadText).toHaveBeenCalledWith(poi);
  });

  it('translates a foreign-language summary on the device', async () => {
    const translator: Translator = {
      translate: vi.fn(async () => 'The Orangery is a baroque building in Schönbrunn Palace Park.'),
    };
    const text = await new ExtractiveEngine({ translator }).narrate(orangerie, 'en');
    expect(text).toBe(`${opening('en', NO_CONTEXT, 'Orangerie', '1')} The Orangery is a baroque building in Schönbrunn Palace Park.`);
    expect(translator.translate).toHaveBeenCalledWith(expect.stringContaining('barockes'), 'de', 'en');
  });

  it('never reads the foreign text with the wrong voice when translation fails or is missing', async () => {
    const failing: Translator = { translate: async () => Promise.reject(new Error('model not downloaded')) };
    for (const engine of [new ExtractiveEngine({ translator: failing }), new ExtractiveEngine()]) {
      const text = await engine.narrate(orangerie, 'en');
      expect(text).toBe("Wikipedia only describes Orangerie in another language, and I can't translate it right now.");
      expect(text).not.toContain('Gebäude');
    }
  });

  it('falls back to the Wikidata name and description when translation fails', async () => {
    const describe = vi.fn(async () => ({
      label: 'Orangery of Schönbrunn',
      description: 'orangery in Vienna, Austria',
      facts: [],
    }));
    const failing: Translator = { translate: () => Promise.reject(new Error('model not downloaded')) };
    const text = await new ExtractiveEngine({ translator: failing, describe }).narrate(orangerie, 'en');
    expect(text).toBe(opening('en', NO_CONTEXT, 'Orangery of Schönbrunn, an orangery in Vienna, Austria', '1'));
    expect(describe).toHaveBeenCalledWith(orangerie.id, 'en');
  });

  describe('key points', () => {
    const palace = poiNorth('Q131330', 0, { title: 'Schloss Schönbrunn', lang: 'de' });
    const article = [
      'Das Schloss Schönbrunn ist die ehemalige Sommerresidenz der Habsburger in Wien.',
      'Die Anlage mit 1441 Räumen zählt zu den bedeutendsten Barockbauten Österreichs und des Schlosses.',
    ].join(' ');
    const describePalace = async () => ({
      label: 'Schönbrunn Palace',
      description: 'palace in Vienna, Austria',
      facts: ['Built in 1638.', 'Designed by Johann Bernhard Fischer von Erlach.', 'Its style is Baroque.'],
    });

    it('says what it is, the key facts and one translated highlight instead of the article', async () => {
      const translator: Translator = {
        translate: vi.fn(async () => 'With 1,441 rooms it is one of the most important Baroque buildings in Austria.'),
      };
      const text = await new ExtractiveEngine({
        loadText: async () => article,
        describe: describePalace,
        translator,
      }).narrate(palace, 'en');
      expect(text).toBe(
        `${opening('en', NO_CONTEXT, PALACE_NAME, 'Q131330')} Built in 1638. Designed by Johann Bernhard Fischer von Erlach. ` +
          'Its style is Baroque. With 1,441 rooms it is one of the most important Baroque buildings in Austria.',
      );
      expect(translator.translate).toHaveBeenCalledTimes(1);
      expect(translator.translate).toHaveBeenCalledWith(expect.stringContaining('1441 Räumen'), 'de', 'en');
    });

    it('still gives the key facts in English when translation fails', async () => {
      const failing: Translator = { translate: () => Promise.reject(new Error('model not downloaded')) };
      const text = await new ExtractiveEngine({ loadText: async () => article, describe: describePalace, translator: failing }).narrate(
        palace,
        'en',
      );
      expect(text).toBe(
        `${opening('en', NO_CONTEXT, PALACE_NAME, 'Q131330')} Built in 1638. Designed by Johann Bernhard Fischer von Erlach. Its style is Baroque.`,
      );
      expect(text).not.toMatch(/Räumen|Habsburger/);
    });

    it('uses the summary when Wikidata has fewer than two facts', async () => {
      const poi = poiNorth('Q1', 0, { title: 'Old Tower', summary: 'Old Tower is a tower. It is old.' });
      const text = await new ExtractiveEngine({
        describe: async () => ({ label: 'Old Tower', description: 'tower', facts: ['Built in 1500.'] }),
      }).narrate(poi, 'en');
      expect(text).toBe(`${opening('en', NO_CONTEXT, 'Old Tower', 'Q1')} Old Tower is a tower. It is old.`);
    });
  });

  describe('story mode ("Tell me more")', () => {
    const article = [
      'Karlstor is a city gate in Munich.',
      '== History ==',
      'In 1857 the gunpowder stocks stored in an annex to the main tower exploded and damaged the tower badly.',
      'The gate was first mentioned in documents in the year 1302, early in the building of the second wall.',
      '== Legends ==',
      'According to legend, a ghost of a gatekeeper still walks the arch on stormy nights in winter.',
    ].join('\n');
    const gate = poiNorth('Q1', 0, { title: 'Karlstor' });

    it('tells the history in order, then a fun fact', async () => {
      const text = await new ExtractiveEngine({ loadText: async () => article }).narrate(gate, 'en', {
        ...NO_CONTEXT,
        depth: 'story',
      });
      expect(text).toMatch(/^Here is the story of Karlstor\. The gate was first mentioned .*1302.* In 1857 .* Fun fact: According to legend/);
    });

    it('points the place out first when told while walking', async () => {
      const text = await new ExtractiveEngine({ loadText: async () => article }).narrate(gate, 'en', {
        distanceM: 40,
        direction: 'left',
        depth: 'story',
      });
      expect(text).toMatch(/^(On your left is|Look to your left:) Karlstor\.? The gate was first mentioned/);
    });

    it('admits when the article has no history to tell', async () => {
      const text = await new ExtractiveEngine({ loadText: async () => 'Karlstor is a gate.' }).narrate(gate, 'en', {
        ...NO_CONTEXT,
        depth: 'story',
      });
      expect(text).toBe('I do not know much more about the history of Karlstor.');
    });

    it('announces a story-like highlight as a fun fact in brief mode too', async () => {
      const describe = async () => ({ label: 'Karlstor', description: 'gate in Munich', facts: ['Built in 1302.', 'Its style is Gothic.'] });
      const text = await new ExtractiveEngine({ loadText: async () => article, describe }).narrate(gate, 'en');
      expect(text).toContain('Fun fact: According to legend');
    });
  });

  it('reports why translation failed, including the native error code', async () => {
    const nativeError = Object.assign(new Error('Failed to download model'), { code: 'TEXT_TRANSLATE_FAILED' });
    const onTranslationFailed = vi.fn();
    await new ExtractiveEngine({ translator: { translate: () => Promise.reject(nativeError) }, onTranslationFailed }).narrate(
      orangerie,
      'en',
    );
    expect(onTranslationFailed).toHaveBeenCalledWith('TEXT_TRANSLATE_FAILED: Failed to download model');
    const missing = vi.fn();
    await new ExtractiveEngine({ onTranslationFailed: missing }).narrate(orangerie, 'en');
    expect(missing).toHaveBeenCalledWith('on-device translation is not available in this build');
  });

  it('admits when there is nothing to say', async () => {
    const poi = poiNorth('1', 0, { title: 'Mystery', summary: '(only a note)' });
    await expect(new ExtractiveEngine().narrate(poi, 'en')).resolves.toBe("I don't have much information about Mystery.");
  });
});
