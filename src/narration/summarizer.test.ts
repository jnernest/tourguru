import { describe, expect, it } from 'vitest';

import { splitSentences } from '../text/sentences';
import { highlight, MAX_SENTENCES, summarize, TARGET_CHARS } from './summarizer';

const ARTICLE = [
  'Schönbrunn Palace was the main summer residence of the Habsburg rulers in Vienna.',
  'The palace has 1,441 rooms and is one of the most important architectural monuments in Austria.',
  'Etymology',
  'The name Schönbrunn means beautiful spring and refers to a well on the palace grounds.',
  'The weather in the region is mild in summer and cold in winter months.',
  'Empress Maria Theresa made the palace the centre of court life in the eighteenth century.',
  'Today the palace and its gardens are a UNESCO World Heritage Site visited by millions.',
  'See also',
  '- Hofburg',
  'Bus routes run nearby every day of the week for visitors.',
].join('\n');

describe('summarize', () => {
  it('always starts with the first sentence, which defines the place', () => {
    expect(summarize(ARTICLE, 'Schönbrunn Palace')).toMatch(/^Schönbrunn Palace was the main summer residence/);
  });

  it('prefers sentences about the subject over off-topic ones', () => {
    const summary = summarize(ARTICLE, 'Schönbrunn Palace');
    expect(summary).toContain('palace');
    expect(summary).not.toContain('weather');
    expect(summary).not.toContain('Bus routes');
  });

  it('drops headings and list items', () => {
    const summary = summarize(ARTICLE, 'Schönbrunn Palace');
    expect(summary).not.toMatch(/Etymology|See also|Hofburg/);
  });

  it('keeps the original reading order', () => {
    const sentences = splitSentences(summarize(ARTICLE, 'Schönbrunn Palace')).map((s) => s.trim());
    const positions = sentences.map((s) => ARTICLE.indexOf(s));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('stays within the sentence and length budget', () => {
    const summary = summarize(ARTICLE, 'Schönbrunn Palace');
    expect(splitSentences(summary).length).toBeLessThanOrEqual(MAX_SENTENCES);
    expect(summary.length).toBeLessThanOrEqual(TARGET_CHARS + 100);
  });

  it('removes parentheticals such as pronunciations and dates', () => {
    expect(summarize('The Frauenkirche (German: [ˈfʁaʊ̯ənˌkɪʁçə]) is a church in Munich.', 'Frauenkirche')).toBe(
      'The Frauenkirche is a church in Munich.',
    );
  });

  it('handles Devanagari sentences ending in a danda', () => {
    const hi = 'यह मंदिर बहुत पुराना और प्रसिद्ध है। इस मंदिर को राजा ने बनवाया था।';
    expect(summarize(hi, 'मंदिर')).toBe(hi);
  });

  it('keeps short leads intact instead of reporting "no information"', () => {
    expect(summarize('A tower. It is old.', 'Old Tower')).toBe('A tower. It is old.');
  });

  it('picks the highlight that matches the listener interests', () => {
    const text = [
      'The Frauenkirche is a church in Munich.',
      'Its two towers were designed by the architect Jörg von Halsbach in late Gothic style.',
      'The church square hosts a large market with many stalls every year in winter.',
    ].join(' ');
    expect(highlight(text, 'Frauenkirche', ['architecture'])).toMatch(/architect/);
  });

  it('returns empty text when there is no usable prose', () => {
    expect(summarize('Etymology\nSee also\n- Hofburg', 'X')).toBe('');
  });
});
