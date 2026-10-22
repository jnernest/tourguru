import { historyText, parseSections } from '../content/sections';
import { contentWords, proseOnly, splitSentences, stripParentheticals } from '../text/sentences';
import { isFunFact, standsAlone, storyBonus } from '../text/storyCues';
import { wordFrequencies } from './summarizer';

/** A "tell me more" story: ~1–2 minutes of speech. */
const MAX_TIMELINE_SENTENCES = 5;
const MAX_STORY_CHARS = 900;
const MIN_SENTENCE_CHARS = 40;
const MAX_SENTENCE_CHARS = 280;
/** Legends often take a long sentence to tell. */
const MAX_FUN_FACT_CHARS = 360;
const MAX_PER_CENTURY = 2;

const YEAR = /\b(1\d{3}|20\d{2})\b/;
const CENTURY = /\b(\d{1,2})(?:st|nd|rd|th)\s+century|\b(\d{1,2})\.\s*Jahrhundert|\bs(?:iècle|iglo|ecolo)\s+(\d{1,2})\b/i;

/** The year a sentence is about (first year mentioned, or the middle of a century), or null. */
export function sentenceYear(sentence: string): number | null {
  const year = YEAR.exec(sentence);
  if (year) return Number(year[1]);
  const century = CENTURY.exec(sentence);
  const n = century ? Number(century[1] ?? century[2] ?? century[3]) : NaN;
  return Number.isFinite(n) ? (n - 1) * 100 + 50 : null;
}

function proseSentences(text: string, maxChars = MAX_SENTENCE_CHARS): string[] {
  return splitSentences(stripParentheticals(proseOnly(text)))
    .map((s) => s.trim())
    .filter((s) => s.length >= MIN_SENTENCE_CHARS && s.length <= maxChars);
}

const century = (year: number) => Math.floor(year / 100);

/**
 * The place's history as a few dated sentences in chronological order, picked from the
 * article's History section (or the whole article when it has none).
 */
export function historyTimeline(article: string, title: string): string[] {
  const history = historyText(parseSections(article));
  const dated = proseSentences(history || article)
    .map((s, i) => ({ s, i, year: sentenceYear(s) }))
    .filter((c): c is { s: string; i: number; year: number } => c.year !== null);
  const freq = wordFrequencies(dated.map((c) => c.s));
  const titleWords = new Set(contentWords(title));
  const score = (s: string) => {
    const words = [...new Set(contentWords(s))];
    const centrality = words.reduce((sum, w) => sum + (freq.get(w) ?? 0), 0) / Math.sqrt(words.length || 1);
    return centrality * storyBonus(s) * (words.some((w) => titleWords.has(w)) ? 1.2 : 1);
  };

  // The story starts at the beginning (earliest event), then the best-scoring events, at most
  // two per century so it spans the whole history rather than one busy decade.
  const earliest = [...dated].sort((a, b) => a.year - b.year || a.i - b.i)[0];
  const ranked = [...dated].sort((a, b) => score(b.s) - score(a.s));
  const chosen: typeof dated = [];
  const perCentury = new Map<number, number>();
  let chars = 0;
  for (const c of earliest ? [earliest, ...ranked.filter((r) => r !== earliest)] : []) {
    if (chosen.length >= MAX_TIMELINE_SENTENCES) break;
    const inCentury = perCentury.get(century(c.year)) ?? 0;
    if (inCentury >= MAX_PER_CENTURY || chars + c.s.length > MAX_STORY_CHARS) continue;
    chosen.push(c);
    perCentury.set(century(c.year), inCentury + 1);
    chars += c.s.length + 1;
  }
  return chosen.sort((a, b) => a.year - b.year || a.i - b.i).map((c) => c.s);
}

/**
 * The most story-like sentence in the article (a legend, anecdote or record that makes sense
 * on its own), or '' if there is none.
 */
export function funFact(article: string, exclude: string[] = []): string {
  const used = new Set(exclude);
  const best = proseSentences(article, MAX_FUN_FACT_CHARS)
    .filter((s) => !used.has(s) && isFunFact(s) && standsAlone(s))
    .map((s) => ({ s, bonus: storyBonus(s) }))
    .sort((a, b) => b.bonus - a.bonus || a.s.length - b.s.length)[0];
  return best?.s ?? '';
}

export function isStoryLike(sentence: string): boolean {
  return isFunFact(sentence) && standsAlone(sentence);
}
